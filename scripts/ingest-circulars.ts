import { PrismaClient } from '@prisma/client'
import { cacheService } from '../lib/redis'
import { createIngestionLog, completeIngestionLog, autoTagSection, cleanText } from './ingestion-utils'
import * as fs from 'fs'
import * as path from 'path'
import pdfParse from 'pdf-parse'
import * as cheerio from 'cheerio'

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

/**
 * NPC Circulars Ingestion
 * 
 * This script ingests circulars from PDF and HTML files in data/issuances/circulars
 */

const CIRCULARS_DIR = path.join(process.cwd(), 'data', 'issuances', 'circulars')

interface ParsedSection {
  title: string
  content: string
}

async function extractTextFromPDF(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath)
  const data = await pdfParse(dataBuffer)
  return data.text
}

async function parseCircularHTML(htmlPath: string): Promise<ParsedSection> {
  console.log(`📄 Reading HTML from ${htmlPath}...`)
  
  const html = fs.readFileSync(htmlPath, 'utf-8')
  const $ = cheerio.load(html)
  
  // Extract title
  const title = $('h1, .entry-title, article h1, title').first().text().trim() || 
                'NPC Circular'
  
  // Extract main content - try multiple selectors
  let content = $('.entry-content, article .content, main article, article, .post-content, #content')
    .first()
    .text()
    .trim()
  
  if (!content || content.length < 100) {
    // Fallback: get body content and clean it up
    content = $('body').text().trim()
  }
  
  return {
    title: cleanText(title),
    content: cleanText(content).slice(0, 10000),
  }
}

async function parseCircularPDF(text: string, filename: string): Promise<ParsedSection> {
  // Extract circular number from filename
  const circularMatch = filename.match(/circular[_-]?(\d+[a-z]?[-_]?\d*)/i) ||
                       filename.match(/(\d{2,4}[-_]\d+)/i)
  
  const circularNum = circularMatch ? circularMatch[1] : 'Unknown'
  
  // Try to find title in the document
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  let title = `NPC Circular ${circularNum}`
  
  // Look for title patterns in first few lines
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i]
    if (line.length > 20 && line.length < 200 && !line.includes('Page') && !line.toLowerCase().includes('circular')) {
      title = cleanText(line)
      break
    }
  }
  
  // Clean up content
  let content = cleanText(text)
  content = content.replace(/Page \d+ of \d+/gi, '')
  content = content.replace(/\f/g, '')
  content = content.slice(0, 10000) // Limit to 10KB
  
  return {
    title,
    content,
  }
}

async function ingestCirculars() {
  console.log('🚀 Starting NPC Circulars ingestion...')

  // Create ingestion log
  const log = await createIngestionLog({
    source: 'NPC Circulars',
    sourceUrl: 'https://privacy.gov.ph/pips-and-pics/advisories-circulars/',
    docType: 'ISSUANCE',
    metadata: {
      version: '1.0.0',
      type: 'mixed',
      subType: 'CIRCULAR',
    },
  })

  console.log(`📝 Created ingestion log: ${log.id}`)

  try {
    let totalIngested = 0

    // Find all files in circulars directory
    if (!fs.existsSync(CIRCULARS_DIR)) {
      throw new Error(`Circulars directory not found: ${CIRCULARS_DIR}`)
    }

    const files = fs.readdirSync(CIRCULARS_DIR)
    const circularPDFs = files.filter(f => f.toLowerCase().endsWith('.pdf'))
    const circularHTMLs = files.filter(f => f.toLowerCase().endsWith('.html'))

    console.log(`\n📄 Found ${circularPDFs.length} circular PDF files`)
    console.log(`📄 Found ${circularHTMLs.length} circular HTML files`)

    // Ingest PDF circulars
    for (const filename of circularPDFs) {
      const filePath = path.join(CIRCULARS_DIR, filename)
      
      console.log(`\n📖 Processing: ${filename}`)
      
      try {
        // Extract text
        const text = await extractTextFromPDF(filePath)
        const parsed = await parseCircularPDF(text, filename)
        
        // Create document alias from filename
        const alias = filename.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ')
        
        // Create or find document
        const doc = await prisma.legalDocument.upsert({
          where: { alias },
          update: {
            title: parsed.title,
            type: 'ISSUANCE',
            subType: 'CIRCULAR',
            url: `/api/download/issuances/circulars/${filename}`,
          },
          create: {
            title: parsed.title,
            alias,
            type: 'ISSUANCE',
            subType: 'CIRCULAR',
            url: `/api/download/issuances/circulars/${filename}`,
          },
        })

        // Check if section already exists
        const existing = await prisma.section.findFirst({
          where: {
            documentId: doc.id,
            sectionNum: '1',
          },
        })

        if (!existing) {
          // Create section
          const created = await prisma.section.create({
            data: {
              documentId: doc.id,
              sectionNum: '1',
              title: parsed.title,
              content: parsed.content,
            },
          })

          // Auto-tag
          await autoTagSection(created.id, created.content, created.title)
          
          totalIngested++
          console.log(`✅ Ingested: ${parsed.title.slice(0, 60)}...`)
        } else {
          console.log(`⏭️  Skipped existing: ${parsed.title.slice(0, 60)}...`)
        }
      } catch (error) {
        console.error(`❌ Failed to process ${filename}:`, error)
      }
    }

    // Ingest HTML circulars
    for (const filename of circularHTMLs) {
      const filePath = path.join(CIRCULARS_DIR, filename)
      
      console.log(`\n📖 Processing: ${filename}`)
      
      try {
        // Parse HTML
        const parsed = await parseCircularHTML(filePath)
        
        // Create document alias from filename
        const alias = filename.replace(/\.html$/i, '').replace(/[_-]/g, ' ')
        
        // Create or find document
        const doc = await prisma.legalDocument.upsert({
          where: { alias },
          update: {
            title: parsed.title,
            type: 'ISSUANCE',
            subType: 'CIRCULAR',
            url: `/api/download/issuances/circulars/${filename}`,
          },
          create: {
            title: parsed.title,
            alias,
            type: 'ISSUANCE',
            subType: 'CIRCULAR',
            url: `/api/download/issuances/circulars/${filename}`,
          },
        })

        // Check if section already exists
        const existing = await prisma.section.findFirst({
          where: {
            documentId: doc.id,
            sectionNum: '1',
          },
        })

        if (!existing) {
          // Create section
          const created = await prisma.section.create({
            data: {
              documentId: doc.id,
              sectionNum: '1',
              title: parsed.title,
              content: parsed.content,
            },
          })

          // Auto-tag
          await autoTagSection(created.id, created.content, created.title)
          
          totalIngested++
          console.log(`✅ Ingested: ${parsed.title.slice(0, 60)}...`)
        } else {
          console.log(`⏭️  Skipped existing: ${parsed.title.slice(0, 60)}...`)
        }
      } catch (error) {
        console.error(`❌ Failed to process ${filename}:`, error)
      }
    }

    console.log(`\n🎉 Circulars ingestion completed!`)
    console.log(`📊 Summary:`)
    console.log(`   - PDF files found: ${circularPDFs.length}`)
    console.log(`   - HTML files found: ${circularHTMLs.length}`)
    console.log(`   - Total ingested: ${totalIngested}`)

    // Update ingestion log
    await completeIngestionLog(log.id, totalIngested, 'COMPLETED')
    console.log('✅ Ingestion log updated')

    // Invalidate search cache
    console.log('\n🔄 Invalidating search cache...')
    await cacheService.invalidateSearchCache()
    console.log('✅ Cache invalidated')

  } catch (error) {
    console.error('❌ Ingestion failed:', error)
    await completeIngestionLog(log.id, 0, 'FAILED', error instanceof Error ? error.message : 'Unknown error')
    throw error
  }
}

// Run the ingestion
ingestCirculars()
  .catch((e) => {
    console.error('❌ Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await cacheService.disconnect()
  })
