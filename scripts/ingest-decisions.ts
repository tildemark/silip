import { PrismaClient } from '@prisma/client'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as pdfParse from 'pdf-parse'
import * as cheerio from 'cheerio'
import { cacheService } from '../lib/redis'
import {
  createIngestionLog,
  completeIngestionLog,
  createSectionWithAutoTag,
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

interface DecisionData {
  decisionNumber: string
  title: string
  content: string
  filename: string
}

/**
 * Parse PDF decision
 */
async function parseDecisionPDF(filePath: string): Promise<DecisionData | null> {
  try {
    const dataBuffer = await fs.readFile(filePath)
    const data = await pdfParse.default(dataBuffer)
    
    const text = cleanText(data.text)
    const filename = path.basename(filePath, '.pdf')
    
    // Extract decision number from filename
    // Patterns: decision-2024-001.pdf, NPC-DECISION-123.pdf, etc.
    const decisionMatch = filename.match(/decision[_-]?(\d+[a-z]?[-_]?\d*)/i)
    const decisionNumber = decisionMatch ? decisionMatch[1] : filename
    
    // Try to extract title from first few lines
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    let title = `NPC Decision ${decisionNumber}`
    
    // Look for title in first 10 lines
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim()
      if (line.length > 20 && line.length < 200 && !line.match(/^(page|\d+|decision)/i)) {
        title = line
        break
      }
    }
    
    return {
      decisionNumber,
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
 * Parse HTML decision
 */
async function parseDecisionHTML(filePath: string): Promise<DecisionData | null> {
  try {
    const html = await fs.readFile(filePath, 'utf-8')
    const $ = cheerio.load(html)
    
    const filename = path.basename(filePath, '.html')
    
    // Extract decision number from filename
    const decisionMatch = filename.match(/decision[_-]?(\d+[a-z]?[-_]?\d*)/i)
    const decisionNumber = decisionMatch ? decisionMatch[1] : filename
    
    // Try to extract title and content
    let title = $('title').text().trim() || $('h1').first().text().trim() || `NPC Decision ${decisionNumber}`
    let content = $('body').text().trim()
    
    // Clean up the content
    content = cleanText(content)
    
    return {
      decisionNumber,
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
 * Main ingestion function for NPC decisions
 */
async function ingestDecisions() {
  console.log('🚀 Starting NPC Decisions ingestion...\n')

  const decisionsDir = path.join(process.cwd(), 'data', 'issuances', 'decisions')
  
  // Check if directory exists
  try {
    await fs.access(decisionsDir)
  } catch {
    console.error(`❌ Directory not found: ${decisionsDir}`)
    console.log('Please create the directory and add decision files.')
    process.exit(1)
  }

  // Get all PDF and HTML files
  const files = await fs.readdir(decisionsDir)
  const decisionFiles = files.filter(
    file => file.endsWith('.pdf') || file.endsWith('.html')
  )

  if (decisionFiles.length === 0) {
    console.log('⚠️  No decision files found in the directory.')
    return
  }

  console.log(`📄 Found ${decisionFiles.length} decision file(s)\n`)

  const log = await createIngestionLog({
    source: 'NPC Decisions (Local Files)',
    sourceUrl: decisionsDir,
    docType: 'ISSUANCE',
    metadata: {
      fileCount: decisionFiles.length,
      directory: decisionsDir,
    },
  })

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const file of decisionFiles) {
    const filePath = path.join(decisionsDir, file)
    console.log(`\n📄 Processing: ${file}`)

    try {
      // Parse based on file type
      let decisionData: DecisionData | null = null
      
      if (file.endsWith('.pdf')) {
        decisionData = await parseDecisionPDF(filePath)
      } else if (file.endsWith('.html')) {
        decisionData = await parseDecisionHTML(filePath)
      }

      if (!decisionData) {
        console.log('  ⚠️  Could not parse file, skipping...')
        errorCount++
        continue
      }

      // Create or update the legal document
      const document = await prisma.legalDocument.upsert({
        where: { alias: decisionData.filename },
        update: {
          type: 'ISSUANCE',
          subType: 'DECISION',
          title: decisionData.title,
          url: `/api/download/issuances/decisions/${file}`,
        },
        create: {
          type: 'ISSUANCE',
          subType: 'DECISION',
          title: decisionData.title,
          alias: decisionData.filename,
          url: `/api/download/issuances/decisions/${file}`,
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
        console.log(`  ⏭️  Decision "${decisionData.title}" already exists, skipping...`)
        skipCount++
        continue
      }

      console.log(`  ✅ Created document: ${document.title}`)

      if (!existingSection) {
        // Create the section with auto-tagging
        await createSectionWithAutoTag({
          documentId: document.id,
          sectionNum: '1',
          title: decisionData.title,
          content: decisionData.content,
        })
        console.log(`  📝 Created section with ${decisionData.content.length} characters`)
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
ingestDecisions().catch(console.error)
