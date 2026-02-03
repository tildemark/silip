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
 * NPC Advisories Ingestion
 * 
 * This script ingests advisories from PDF files in data/issuances/advisories
 * and the one HTML advisory
 */

const ADVISORIES_DIR = path.join(process.cwd(), 'data', 'issuances', 'advisories')
const HTML_ADVISORY_URL = 'https://privacy.gov.ph/announcement-regarding-the-submission-of-personal-data-breach-notifications-pdbn-and-annual-security-incident-reports-asir-2/'

interface ParsedSection {
  title: string
  content: string
}

async function extractTextFromPDF(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath)
  const data = await pdfParse(dataBuffer)
  return data.text
}

async function fetchHTMLAdvisory(): Promise<ParsedSection> {
  console.log(`📡 Fetching HTML advisory from ${HTML_ADVISORY_URL}...`)
  
  try {
    const response = await fetch(HTML_ADVISORY_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, .menu, .navigation, aside, iframe').remove()
    
    // Extract title
    const title = $('h1, .entry-title, article h1').first().text().trim() || 
                  'Announcement Regarding Submission of PDBN and ASIR'
    
    // Extract main content - prioritize article/entry-content
    let contentEl = $('.entry-content, article .content, .post-content, main article, article').first()
    
    // Remove nested navigation and other unwanted elements from content
    contentEl.find('nav, .menu, .navigation, .sidebar, .widget, .share, .related, .comments').remove()
    
    // Get text and clean
    let content = contentEl.text().trim()
    
    // If content is too short or empty, try alternative selectors
    if (!content || content.length < 100) {
      content = $('main, #main, #content, .content').first().text().trim()
    }
    
    console.log(`✓ Fetched HTML advisory: ${title.slice(0, 60)}... (${content.length} chars)`)
    
    return {
      title: cleanText(title),
      content: cleanText(content),
    }
  } catch (error) {
    console.error('Failed to fetch HTML advisory:', error)
    throw error
  }
}

async function parseAdvisoryHTML(htmlPath: string): Promise<ParsedSection> {
  console.log(`📄 Reading HTML from ${htmlPath}...`)
  
  const html = fs.readFileSync(htmlPath, 'utf-8')
  const $ = cheerio.load(html)
  
  // Remove unwanted elements
  $('script, style, nav, header, footer, .menu, .navigation, aside, iframe').remove()
  
  // Extract title
  const title = $('h1, .entry-title, article h1, title').first().text().trim() || 
                'Announcement Regarding Submission of PDBN and ASIR'
  
  // Extract main content - try multiple selectors
  let contentEl = $('.entry-content, article .content, .post-content, main article, article, #content').first()
  
  // Remove nested unwanted elements from content
  contentEl.find('nav, .menu, .navigation, .sidebar, .widget, .share, .related, .comments').remove()
  
  let content = contentEl.text().trim()
  
  if (!content || content.length < 100) {
    // Fallback: get body content and clean it up
    $('body').find('nav, header, footer, .menu, .navigation, aside').remove()
    content = $('body').text().trim()
  }
  
  return {
    title: cleanText(title),
    content: cleanText(content).slice(0, 10000),
  }
}

async function parseAdvisoryPDF(text: string, filename: string): Promise<ParsedSection> {
  // Extract advisory number from filename
  const advisoryMatch = filename.match(/advisory[_-]?(\d+[a-z]?)/i) ||
                       filename.match(/(\d{4}[-_]\d+)/i)
  
  const advisoryNum = advisoryMatch ? advisoryMatch[1] : 'Unknown'
  
  // Try to find title in the document
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  let title = `NPC Advisory ${advisoryNum}`
  
  // Look for title patterns in first few lines
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i]
    if (line.length > 20 && line.length < 200 && !line.includes('Page') && !line.toLowerCase().includes('advisory')) {
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

async function ingestAdvisories() {
  console.log('🚀 Starting NPC Advisories ingestion...')

  // Create ingestion log
  const log = await createIngestionLog({
    source: 'NPC Advisories',
    sourceUrl: 'https://privacy.gov.ph/pips-and-pics/advisories-circulars/',
    docType: 'ISSUANCE',
    metadata: {
      version: '1.0.0',
      type: 'mixed',
      subType: 'ADVISORY',
    },
  })

  console.log(`📝 Created ingestion log: ${log.id}`)

  try {
    let totalIngested = 0

    // Find all PDF files in advisories directory
    if (!fs.existsSync(ADVISORIES_DIR)) {
      throw new Error(`Advisories directory not found: ${ADVISORIES_DIR}`)
    }

    const files = fs.readdirSync(ADVISORIES_DIR)
    const advisoryPDFs = files.filter(f => f.toLowerCase().endsWith('.pdf'))
    const advisoryHTMLs = files.filter(f => f.toLowerCase().endsWith('.html'))

    console.log(`\n📄 Found ${advisoryPDFs.length} advisory PDF files`)
    console.log(`📄 Found ${advisoryHTMLs.length} advisory HTML files`)

    // Ingest PDF advisories
    for (const filename of advisoryPDFs) {
      const filePath = path.join(ADVISORIES_DIR, filename)
      
      console.log(`\n📖 Processing: ${filename}`)
      
      try {
        // Extract text
        const text = await extractTextFromPDF(filePath)
        const parsed = await parseAdvisoryPDF(text, filename)
        
        // Create document alias from filename
        const alias = filename.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ')
        
        // Create or find document
        const doc = await prisma.legalDocument.upsert({
          where: { alias },
          update: {
            title: parsed.title,
            type: 'ISSUANCE',
            subType: 'ADVISORY',
            url: `/api/download/issuances/advisories/${filename}`,
          },
          create: {
            title: parsed.title,
            alias,
            type: 'ISSUANCE',
            subType: 'ADVISORY',
            url: `/api/download/issuances/advisories/${filename}`,
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

    // Ingest HTML advisories
    for (const filename of advisoryHTMLs) {
      const filePath = path.join(ADVISORIES_DIR, filename)
      
      console.log(`\n📖 Processing: ${filename}`)
      
      try {
        // Parse HTML
        const parsed = await parseAdvisoryHTML(filePath)
        
        // Create document alias from filename
        const alias = filename.replace(/\.html$/i, '').replace(/[_-]/g, ' ')
        
        // Create or find document
        const doc = await prisma.legalDocument.upsert({
          where: { alias },
          update: {
            title: parsed.title,
            type: 'ISSUANCE',
            subType: 'ADVISORY',
          },
          create: {
            title: parsed.title,
            alias,
            type: 'ISSUANCE',
            subType: 'ADVISORY',
            url: HTML_ADVISORY_URL,
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

    console.log(`\n🎉 Advisories ingestion completed!`)
    console.log(`📊 Summary:`)
    console.log(`   - PDF files found: ${advisoryPDFs.length}`)
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
ingestAdvisories()
  .catch((e) => {
    console.error('❌ Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await cacheService.disconnect()
  })
