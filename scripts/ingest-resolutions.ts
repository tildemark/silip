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

interface ResolutionData {
  resolutionNumber: string
  title: string
  content: string
  filename: string
}

/**
 * Parse PDF resolution
 */
async function parseResolutionPDF(filePath: string): Promise<ResolutionData | null> {
  try {
    const dataBuffer = await fs.readFile(filePath)
    const data = await pdfParse.default(dataBuffer)
    
    const text = cleanText(data.text)
    const filename = path.basename(filePath, '.pdf')
    
    // Extract resolution number from filename
    // Patterns: resolution-2024-001.pdf, NPC-RESOLUTION-123.pdf, etc.
    const resolutionMatch = filename.match(/resolution[_-]?(\d+[a-z]?[-_]?\d*)/i)
    const resolutionNumber = resolutionMatch ? resolutionMatch[1] : filename
    
    // Try to extract title from first few lines
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    let title = `NPC Resolution ${resolutionNumber}`
    
    // Look for title in first 10 lines
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim()
      if (line.length > 20 && line.length < 200 && !line.match(/^(page|\d+|resolution)/i)) {
        title = line
        break
      }
    }
    
    return {
      resolutionNumber,
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
 * Parse HTML resolution
 */
async function parseResolutionHTML(filePath: string): Promise<ResolutionData | null> {
  try {
    const html = await fs.readFile(filePath, 'utf-8')
    const $ = cheerio.load(html)
    
    const filename = path.basename(filePath, '.html')
    
    // Extract resolution number from filename
    const resolutionMatch = filename.match(/resolution[_-]?(\d+[a-z]?[-_]?\d*)/i)
    const resolutionNumber = resolutionMatch ? resolutionMatch[1] : filename
    
    // Try to extract title and content
    let title = $('title').text().trim() || $('h1').first().text().trim() || `NPC Resolution ${resolutionNumber}`
    let content = $('body').text().trim()
    
    // Clean up the content
    content = cleanText(content)
    
    return {
      resolutionNumber,
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
 * Main ingestion function for NPC resolutions
 */
async function ingestResolutions() {
  console.log('🚀 Starting NPC Resolutions ingestion...\n')

  const resolutionsDir = path.join(process.cwd(), 'data', 'issuances', 'resolutions')
  
  // Check if directory exists
  try {
    await fs.access(resolutionsDir)
  } catch {
    console.error(`❌ Directory not found: ${resolutionsDir}`)
    console.log('Please create the directory and add resolution files.')
    process.exit(1)
  }

  // Get all PDF and HTML files
  const files = await fs.readdir(resolutionsDir)
  const resolutionFiles = files.filter(
    file => file.endsWith('.pdf') || file.endsWith('.html')
  )

  if (resolutionFiles.length === 0) {
    console.log('⚠️  No resolution files found in the directory.')
    return
  }

  console.log(`📄 Found ${resolutionFiles.length} resolution file(s)\n`)

  const log = await createIngestionLog({
    source: 'NPC Resolutions (Local Files)',
    sourceUrl: resolutionsDir,
    docType: 'ISSUANCE',
    metadata: {
      fileCount: resolutionFiles.length,
      directory: resolutionsDir,
    },
  })

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const file of resolutionFiles) {
    const filePath = path.join(resolutionsDir, file)
    console.log(`\n📄 Processing: ${file}`)

    try {
      // Parse based on file type
      let resolutionData: ResolutionData | null = null
      
      if (file.endsWith('.pdf')) {
        resolutionData = await parseResolutionPDF(filePath)
      } else if (file.endsWith('.html')) {
        resolutionData = await parseResolutionHTML(filePath)
      }

      if (!resolutionData) {
        console.log('  ⚠️  Could not parse file, skipping...')
        errorCount++
        continue
      }

      // Create or update the legal document
      const document = await prisma.legalDocument.upsert({
        where: { alias: resolutionData.filename },
        update: {
          type: 'ISSUANCE',
          subType: 'RESOLUTION',
          title: resolutionData.title,
          url: `/api/download/issuances/resolutions/${file}`,
        },
        create: {
          type: 'ISSUANCE',
          subType: 'RESOLUTION',
          title: resolutionData.title,
          alias: resolutionData.filename,
          url: `/api/download/issuances/resolutions/${file}`,
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
        console.log(`  ⏭️  Resolution "${resolutionData.title}" already exists, skipping...`)
        skipCount++
        continue
      }

      console.log(`  ✅ Created document: ${document.title}`)

      if (!existingSection) {
        // Create the section with auto-tagging
        await createSectionWithAutoTag({
          documentId: document.id,
          sectionNum: '1',
          title: resolutionData.title,
          content: resolutionData.content,
        })
        console.log(`  📝 Created section with ${resolutionData.content.length} characters`)
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
ingestResolutions().catch(console.error)
