import { PrismaClient } from '@prisma/client'
import { cacheService } from '../lib/redis'
import { createIngestionLog, completeIngestionLog, autoTagSection, cleanText, calculateChecksum } from './ingestion-utils'
import * as fs from 'fs'
import * as path from 'path'
import pdfParse from 'pdf-parse'

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
 * DPA 2012 Ingestion from PDF
 * 
 * This script parses the official Data Privacy Act PDF document
 * 
 * Place your PDF file at: data/dpa-2012.pdf
 */

const PDF_PATH = path.join(process.cwd(), 'data', 'dpa-2012.pdf')

interface ParsedSection {
  sectionNum: string
  title: string
  content: string
}

async function extractTextFromPDF(): Promise<string> {
  console.log(`📄 Reading PDF from ${PDF_PATH}...`)

  if (!fs.existsSync(PDF_PATH)) {
    throw new Error(`PDF file not found at: ${PDF_PATH}\n\nPlease download the DPA PDF and place it at: data/dpa-2012.pdf`)
  }

  try {
    const dataBuffer = fs.readFileSync(PDF_PATH)
    const data = await pdfParse(dataBuffer)

    console.log(`✓ PDF parsed successfully`)
    console.log(`  - Pages: ${data.numpages}`)
    console.log(`  - Text length: ${data.text.length} characters`)

    return data.text
  } catch (error) {
    console.error('Failed to parse PDF:', error)
    throw error
  }
}

function parseDPAText(text: string): ParsedSection[] {
  console.log('🔍 Parsing DPA sections from text...')
  const sections: ParsedSection[] = []

  // Split by section headers - adjust regex based on actual PDF format
  // Common patterns: "Section 1.", "SEC. 1.", "SECTION 1", etc.
  const sectionPattern = /(?:SECTION|Section|SEC\.?)\s+(\d+[a-z]?)\.\s*([^\n]+)/gi

  let matches = [...text.matchAll(sectionPattern)]

  console.log(`  Found ${matches.length} potential sections`)

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const nextMatch = matches[i + 1]

    const sectionNum = match[1].trim()
    const title = cleanText(match[2] || 'Untitled Section')

    // Extract content between this section and the next
    const startPos = match.index! + match[0].length
    const endPos = nextMatch ? nextMatch.index! : text.length

    let content = text.slice(startPos, endPos).trim()

    // Clean up the content
    content = cleanText(content)

    // Remove page numbers, headers, footers (common patterns)
    content = content.replace(/Page \d+ of \d+/gi, '')
    content = content.replace(/\f/g, '') // Form feed characters
    content = content.replace(/\s{3,}/g, '\n\n') // Multiple spaces to paragraphs

    // Only include sections with substantial content
    if (content.length > 50) {
      sections.push({
        sectionNum,
        title,
        content: content.slice(0, 10000), // Limit to 10KB per section
      })

      console.log(`  ✓ Section ${sectionNum}: ${title.slice(0, 60)}...`)
    }
  }

  console.log(`✓ Parsed ${sections.length} sections successfully`)
  return sections
}

async function ingestDPAFromPDF() {
  console.log('🚀 Starting DPA 2012 PDF ingestion...')

  // Create ingestion log
  const log = await createIngestionLog({
    source: 'Data Privacy Act of 2012 (PDF)',
    sourceUrl: 'data/dpa-2012.pdf',
    docType: 'DPA',
    metadata: {
      version: '2.0.0',
      type: 'pdf-extraction',
      parser: 'pdf-parse',
    },
  })

  console.log(`📝 Created ingestion log: ${log.id}`)

  try {
    // Extract text from PDF
    const text = await extractTextFromPDF()

    // Parse sections
    const parsedSections = parseDPAText(text)

    if (parsedSections.length === 0) {
      throw new Error('No sections found in PDF. The PDF format may need custom parsing.')
    }

    // Calculate checksum
    const fileBuffer = fs.readFileSync(PDF_PATH)
    const checksum = calculateChecksum(fileBuffer)

    // Find or create the DPA document
    const dpaDoc = await prisma.legalDocument.upsert({
      where: { alias: 'DPA 2012' },
      update: {
        title: 'Data Privacy Act of 2012',
        type: 'DPA',
        url: '/api/download/dpa-irr/dpa-2012.pdf',
        checksum,
        lastSync: new Date(),
      },
      create: {
        title: 'Data Privacy Act of 2012',
        alias: 'DPA 2012',
        type: 'DPA',
        url: '/api/download/dpa-irr/dpa-2012.pdf',
        checksum,
        lastSync: new Date(),
      },
    })

    console.log(`✅ Created/found document: ${dpaDoc.alias}`)

    // Ingest each section
    let ingestedCount = 0
    for (const section of parsedSections) {
      // Check if section already exists
      const existing = await prisma.section.findFirst({
        where: {
          documentId: dpaDoc.id,
          sectionNum: section.sectionNum,
        },
      })

      if (existing) {
        console.log(`⏭️  Skipping existing section: ${section.sectionNum}`)
        continue
      }

      // Create section
      const created = await prisma.section.create({
        data: {
          documentId: dpaDoc.id,
          sectionNum: section.sectionNum,
          title: section.title,
          content: section.content,
        },
      })

      // Auto-tag the section
      await autoTagSection(created.id, created.content, created.title)

      ingestedCount++
      console.log(`✅ Ingested: Section ${section.sectionNum} - ${section.title}`)
    }

    console.log(`\n🎉 PDF ingestion completed!`)
    console.log(`📊 Summary:`)
    console.log(`   - Document: ${dpaDoc.alias}`)
    console.log(`   - New sections: ${ingestedCount}`)
    console.log(`   - Skipped: ${parsedSections.length - ingestedCount}`)

    // Update ingestion log
    await completeIngestionLog(log.id, ingestedCount, 'COMPLETED')
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
ingestDPAFromPDF()
  .catch((e) => {
    console.error('❌ Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await cacheService.disconnect()
  })
