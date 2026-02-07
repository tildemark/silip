import { PrismaClient } from '@prisma/client'
import { cacheService } from '../lib/redis'
import { createIngestionLog, completeIngestionLog, autoTagSection, cleanText, createSectionWithEmbedding } from './ingestion-utils'
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
 * IRR 2016 Ingestion from PDF
 * 
 * This script parses the Implementing Rules and Regulations PDF document
 * 
 * Place your PDF file at: data/dpa-irr-2016.pdf
 */

const PDF_PATH = path.join(process.cwd(), 'data', 'dpa-irr-2016.pdf')

interface ParsedSection {
  sectionNum: string
  title: string
  content: string
}

async function extractTextFromPDF(): Promise<string> {
  console.log(`📄 Reading PDF from ${PDF_PATH}...`)

  if (!fs.existsSync(PDF_PATH)) {
    throw new Error(`PDF file not found at: ${PDF_PATH}\n\nPlease download the IRR PDF and place it at: data/dpa-irr-2016.pdf`)
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

function parseIRRText(text: string): ParsedSection[] {
  console.log('🔍 Parsing IRR sections from text...')
  const sections: ParsedSection[] = []

  // IRR might use different patterns like "Rule", "Section", "Article"
  // Adjust regex based on actual PDF format
  const sectionPattern = /(?:Rule|RULE|Section|SECTION|SEC\.?|Article|ARTICLE)\s+(\d+[a-z]?)\.\s*([^\n]+)/gi

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

async function ingestIRRFromPDF() {
  console.log('🚀 Starting IRR 2016 PDF ingestion...')

  // Create ingestion log
  const log = await createIngestionLog({
    source: 'Implementing Rules and Regulations of 2016',
    sourceUrl: 'data/dpa-irr-2016.pdf',
    docType: 'IRR',
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
    const parsedSections = parseIRRText(text)

    if (parsedSections.length === 0) {
      throw new Error('No sections found in PDF. The PDF format may need custom parsing.')
    }

    // Find or create the IRR document
    const irrDoc = await prisma.legalDocument.upsert({
      where: { alias: 'IRR 2016' },
      update: {
        title: 'Implementing Rules and Regulations of 2016',
        type: 'IRR',
        url: '/api/download/dpa-irr/irr-2016.pdf',
      },
      create: {
        title: 'Implementing Rules and Regulations of 2016',
        alias: 'IRR 2016',
        type: 'IRR',
        url: '/api/download/dpa-irr/irr-2016.pdf',
      },
    })

    console.log(`✅ Created/found document: ${irrDoc.alias}`)

    // Load tags once for all sections (optimization)
    console.log('\n📑 Loading tags for auto-tagging...')
    const allTags = await prisma.tag.findMany()
    console.log(`✓ Loaded ${allTags.length} tags`)

    // Ingest each section
    let ingestedCount = 0
    for (const section of parsedSections) {
      // Check if section already exists
      const existing = await prisma.section.findFirst({
        where: {
          documentId: irrDoc.id,
          sectionNum: section.sectionNum,
        },
      })

      if (existing) {
        console.log(`⏭️  Skipping existing section: ${section.sectionNum}`)
        continue
      }

      // Create section with embedding and auto-tagging
      await createSectionWithEmbedding({
        documentId: irrDoc.id,
        sectionNum: section.sectionNum,
        title: section.title,
        content: section.content,
        allTags,
      })

      ingestedCount++
      console.log(`✅ Ingested: Section ${section.sectionNum} - ${section.title}`)
    }

    console.log(`\n🎉 PDF ingestion completed!`)
    console.log(`📊 Summary:`)
    console.log(`   - Document: ${irrDoc.alias}`)
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
ingestIRRFromPDF()
  .catch((e) => {
    console.error('❌ Fatal error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await cacheService.disconnect()
  })
