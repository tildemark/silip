import { PrismaClient } from '@prisma/client'
import { cacheService } from '../lib/redis'
import { createIngestionLog, completeIngestionLog, autoTagSection } from './ingestion-utils'
import * as cheerio from 'cheerio'

const prisma = new PrismaClient()

/**
 * Real DPA 2012 Ingestion from privacy.gov.ph
 * 
 * This script scrapes the actual Data Privacy Act from the official NPC website
 * 
 * Source: https://www.privacy.gov.ph/data-privacy-act/
 */

const DPA_URL = 'https://www.privacy.gov.ph/data-privacy-act/'

async function fetchDPAContent(): Promise<string> {
  console.log(`📡 Fetching content from ${DPA_URL}...`)
  
  try {
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const response = await fetch(DPA_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0',
        'Referer': 'https://www.privacy.gov.ph/',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const html = await response.text()
    console.log('✓ Content fetched successfully')
    return html
  } catch (error) {
    console.error('Failed to fetch DPA content:', error)
    console.log('\n⚠️  The website may be blocking automated requests.')
    console.log('📝 Alternative options:')
    console.log('   1. Use the sample data: npm run ingest:sample')
    console.log('   2. Download the PDF manually from https://www.privacy.gov.ph/')
    console.log('   3. Create a custom ingestion script with manual content')
    console.log('   4. Use a headless browser (Puppeteer/Playwright) for scraping')
    throw error
  }
}

interface ParsedSection {
  sectionNum: string
  title: string
  content: string
}

function parseDPAHTML(html: string): ParsedSection[] {
  console.log('🔍 Parsing HTML content...')
  const $ = cheerio.load(html)
  const sections: ParsedSection[] = []

  // This is a template - adjust selectors based on actual website structure
  // You'll need to inspect the actual HTML structure of privacy.gov.ph
  
  // Example parsing logic (adjust to actual structure):
  $('.section-content, .law-section, article').each((_, element) => {
    const $el = $(element)
    
    // Try to extract section number and title
    let sectionNum = ''
    let title = ''
    let content = ''

    // Look for section headers
    const header = $el.find('h2, h3, .section-header, .section-title').first()
    if (header.length) {
      const headerText = header.text().trim()
      // Extract section number (e.g., "Section 3", "Sec. 13")
      const secMatch = headerText.match(/(?:Section|Sec\.?)\s+(\d+[a-z]?)/i)
      if (secMatch) {
        sectionNum = `Section ${secMatch[1]}`
        // The rest is the title
        title = headerText.replace(secMatch[0], '').replace(/[.:\-–—]/g, '').trim()
      }
    }

    // Extract content
    content = $el.text().trim()

    if (sectionNum && content.length > 50) {
      sections.push({
        sectionNum,
        title: title || 'Untitled Section',
        content: content.slice(0, 10000), // Limit to 10KB per section
      })
    }
  })

  console.log(`✓ Parsed ${sections.length} sections`)
  return sections
}

async function ingestDPA() {
  console.log('🚀 Starting DPA 2012 ingestion from official source...')

  // Create ingestion log
  const log = await createIngestionLog({
    source: 'Data Privacy Act of 2012',
    sourceUrl: DPA_URL,
    docType: 'DPA',
    metadata: {
      version: '2.0.0',
      type: 'live-scrape',
      scraper: 'cheerio',
    },
  })

  console.log(`📝 Created ingestion log: ${log.id}`)

  try {
    // Fetch HTML content
    const html = await fetchDPAContent()

    // Parse sections
    const parsedSections = parseDPAHTML(html)

    if (parsedSections.length === 0) {
      throw new Error('No sections found - HTML structure may have changed')
    }

    // Create or get the DPA document
    const dpaDoc = await prisma.legalDocument.upsert({
      where: { alias: 'DPA 2012' },
      update: {
        url: DPA_URL,
      },
      create: {
        type: 'DPA',
        title: 'Republic Act No. 10173 - Data Privacy Act of 2012',
        alias: 'DPA 2012',
        url: DPA_URL,
      },
    })

    console.log('✅ Document record created/updated:', dpaDoc.alias)

    // Get all tags for auto-tagging
    const allTags = await prisma.tag.findMany()
    console.log(`📑 Loaded ${allTags.length} tags for auto-tagging`)

    // Insert sections with auto-tagging
    let insertedCount = 0
    for (const section of parsedSections) {
      const sectionId = `${dpaDoc.id}-${section.sectionNum.toLowerCase().replace(/\s+/g, '-')}`

      const createdSection = await prisma.section.upsert({
        where: { id: sectionId },
        update: {
          title: section.title,
          content: section.content,
        },
        create: {
          id: sectionId,
          documentId: dpaDoc.id,
          sectionNum: section.sectionNum,
          title: section.title,
          content: section.content,
        },
      })

      // Auto-tag the section
      await autoTagSection(createdSection.id, section.content, section.title)

      insertedCount++
      console.log(`✅ [${insertedCount}/${parsedSections.length}] ${section.sectionNum} - ${section.title}`)
    }

    console.log('\n🎉 DPA ingestion completed!')
    console.log('📊 Summary:')
    console.log(`   - Document: ${dpaDoc.alias}`)
    console.log(`   - Sections: ${insertedCount}`)

    // Update ingestion log
    await completeIngestionLog(log.id, insertedCount, 'COMPLETED')
    console.log('✅ Ingestion log updated')

    // Invalidate search cache
    console.log('\n🔄 Invalidating search cache...')
    await cacheService.invalidateSearchCache()
    console.log('✅ Cache invalidated')

  } catch (error) {
    console.error('❌ Ingestion failed:', error)
    
    // Mark log as failed
    await completeIngestionLog(
      log.id,
      0,
      'FAILED',
      error instanceof Error ? error.message : 'Unknown error'
    )
    
    throw error
  }
}

// Run the ingestion
ingestDPA()
  .catch((e) => {
    console.error('❌ Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await cacheService.disconnect()
  })
