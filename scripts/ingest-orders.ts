import { PrismaClient } from '@prisma/client'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as pdfParse from 'pdf-parse'
import * as cheerio from 'cheerio'
import { cacheService } from '../lib/redis'
import {
  createIngestionLog,
  completeIngestionLog,
  createSectionWithEmbedding,
  invalidateCacheAfterIngestion,
  cleanText,
} from './ingestion-utils'

// Suppress pdf-parse warnings
const originalWarn = console.warn
console.warn = (...args: any[]) => {
  const msg = args[0]?.toString() || ''
  if (msg.includes('TT:') || msg.includes('undefined function')) {
    return // Suppress pdf-parse font warnings
  }
  originalWarn.apply(console, args)
}

const prisma = new PrismaClient()

interface OrderData {
  orderNumber: string
  title: string
  content: string
  filename: string
}

/**
 * Parse PDF order
 */
async function parseOrderPDF(filePath: string): Promise<OrderData | null> {
  try {
    const dataBuffer = await fs.readFile(filePath)
    const data = await pdfParse.default(dataBuffer)

    const text = cleanText(data.text)
    const filename = path.basename(filePath, '.pdf')

    // Extract order number from filename
    // Patterns: order-2024-001.pdf, NPC-ORDER-123.pdf, etc.
    const orderMatch = filename.match(/order[_-]?(\d+[a-z]?[-_]?\d*)/i)
    const orderNumber = orderMatch ? orderMatch[1] : filename

    // Try to extract title from first few lines
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    let title = `NPC Order ${orderNumber}`

    // Look for title in first 10 lines
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim()
      if (line.length > 20 && line.length < 200 && !line.match(/^(page|\d+|order)/i)) {
        title = line
        break
      }
    }

    return {
      orderNumber,
      title,
      content: text,
      filename,
    }
  } catch (error) {
    console.error(`Error parsing PDF ${filePath}:`, error)
    return null
  }
}

/**
 * Parse HTML order
 */
async function parseOrderHTML(filePath: string): Promise<OrderData | null> {
  try {
    const html = await fs.readFile(filePath, 'utf-8')
    const $ = cheerio.load(html)

    const filename = path.basename(filePath, '.html')

    // Extract order number from filename
    const orderMatch = filename.match(/order[_-]?(\d+[a-z]?[-_]?\d*)/i)
    const orderNumber = orderMatch ? orderMatch[1] : filename

    // Try to extract title and content
    let title = $('title').text().trim() || $('h1').first().text().trim() || `NPC Order ${orderNumber}`
    let content = $('body').text().trim()

    // Clean up the content
    content = cleanText(content)

    return {
      orderNumber,
      title,
      content,
      filename,
    }
  } catch (error) {
    console.error(`Error parsing HTML ${filePath}:`, error)
    return null
  }
}

/**
 * Main ingestion function for NPC orders
 */
async function ingestOrders() {
  console.log('🚀 Starting NPC Orders ingestion...\n')

  const ordersDir = path.join(process.cwd(), 'data', 'issuances', 'orders')

  // Check if directory exists
  try {
    await fs.access(ordersDir)
  } catch {
    console.error(`❌ Directory not found: ${ordersDir}`)
    console.log('Please create the directory and add order files.')
    process.exit(1)
  }

  // Get all PDF and HTML files
  const files = await fs.readdir(ordersDir)
  const orderFiles = files.filter(
    file => file.endsWith('.pdf') || file.endsWith('.html')
  )

  if (orderFiles.length === 0) {
    console.log('⚠️  No order files found in the directory.')
    return
  }

  console.log(`📄 Found ${orderFiles.length} order file(s)\n`)

  const log = await createIngestionLog({
    source: 'NPC Orders (Local Files)',
    sourceUrl: ordersDir,
    docType: 'ISSUANCE',
    metadata: {
      fileCount: orderFiles.length,
      directory: ordersDir,
    },
  })

  // Load tags once for all sections (optimization)
  console.log('\n📑 Loading tags for auto-tagging...')
  const allTags = await prisma.tag.findMany()
  console.log(`✓ Loaded ${allTags.length} tags`)

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const file of orderFiles) {
    const filePath = path.join(ordersDir, file)
    console.log(`\n📄 Processing: ${file}`)

    try {
      // Parse based on file type
      let orderData: OrderData | null = null

      if (file.endsWith('.pdf')) {
        orderData = await parseOrderPDF(filePath)
      } else if (file.endsWith('.html')) {
        orderData = await parseOrderHTML(filePath)
      }

      if (!orderData) {
        console.log('  ⚠️  Could not parse file, skipping...')
        errorCount++
        continue
      }

      // Create or update the legal document
      const document = await prisma.legalDocument.upsert({
        where: { alias: orderData.filename },
        update: {
          type: 'ISSUANCE',
          subType: 'ORDER',
          title: orderData.title,
          url: `/api/download/issuances/orders/${file}`,
        },
        create: {
          type: 'ISSUANCE',
          subType: 'ORDER',
          title: orderData.title,
          alias: orderData.filename,
          url: `/api/download/issuances/orders/${file}`,
        },
      })

      // Check if section already exists
      const existingSection = await prisma.section.findFirst({
        where: {
          documentId: document.id,
          sectionNum: '1',
        },
      })

      if (existingSection) {
        console.log(`  ⏭️  Order "${orderData.title}" already exists, skipping...`)
        skipCount++
        continue
      }

      console.log(`  ✅ Created document: ${document.title}`)

      if (!existingSection) {
        // Create the section with embedding and auto-tagging
        await createSectionWithEmbedding({
          documentId: document.id,
          sectionNum: '1',
          title: orderData.title,
          content: orderData.content,
          allTags,
        })
        console.log(`  📝 Created section with ${orderData.content.length} characters`)
      } else {
        console.log(`  ⏭️  Section already exists, skipping...`)
      }

      successCount++
    } catch (error) {
      console.error(`  ❌ Error processing ${file}:`, error)
      errorCount++
    }
  }

  // Complete the ingestion log
  await completeIngestionLog(
    log.id,
    successCount,
    errorCount > 0 ? 'COMPLETED' : 'COMPLETED'
  )

  // Invalidate cache
  await invalidateCacheAfterIngestion()

  console.log('\n' + '='.repeat(50))
  console.log('📊 Ingestion Summary:')
  console.log(`  ✅ Successfully ingested: ${successCount}`)
  console.log(`  ⏭️  Skipped (duplicates): ${skipCount}`)
  console.log(`  ❌ Errors: ${errorCount}`)
  console.log('='.repeat(50))

  await prisma.$disconnect()
  await cacheService.disconnect()
}

// Run the ingestion
ingestOrders().catch(console.error)
