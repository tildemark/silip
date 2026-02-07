import * as cheerio from 'cheerio'
import { PrismaClient, DocType, IngestionStatus } from '@prisma/client'
import { cacheService } from '../lib/redis'
import { generateEmbedding } from '../lib/ai'

const prisma = new PrismaClient()

/**
 * Create an ingestion log entry
 */
export async function createIngestionLog(data: {
  source: string
  sourceUrl?: string
  docType: DocType
  metadata?: any
}) {
  return prisma.ingestionLog.create({
    data: {
      ...data,
      status: 'IN_PROGRESS',
      metadata: data.metadata || {},
    },
  })
}

/**
 * Update ingestion log with completion status
 */
export async function completeIngestionLog(
  logId: string,
  sectionsCount: number,
  status: 'COMPLETED' | 'FAILED' = 'COMPLETED',
  errorMessage?: string
) {
  return prisma.ingestionLog.update({
    where: { id: logId },
    data: {
      status,
      sectionsCount,
      errorMessage,
      completedAt: new Date(),
    },
  })
}

/**
 * Auto-tagging utility (optimized version)
 * 
 * This function analyzes section content and automatically assigns
 * relevant tags based on keyword matching.
 * 
 * @param sectionId - Section ID to tag
 * @param content - Section content
 * @param title - Section title
 * @param allTags - Pre-loaded tags array (optional, will load if not provided)
 */
export async function autoTagSection(
  sectionId: string,
  content: string,
  title: string,
  allTags?: Array<{ id: string; name: string }>
): Promise<void> {
  // Load tags if not provided (for backward compatibility)
  if (!allTags) {
    allTags = await prisma.tag.findMany()
  }

  const lowerContent = content.toLowerCase()
  const lowerTitle = title.toLowerCase()
  const matchedTags: string[] = []

  for (const tag of allTags) {
    const lowerTagName = tag.name.toLowerCase()

    // Check for exact or partial matches in content or title
    // For multi-word tags, check if all words are present
    const tagWords = lowerTagName.split(/\s+/)
    const allWordsPresent = tagWords.every(word =>
      lowerContent.includes(word) || lowerTitle.includes(word)
    )

    // Also check for the full tag name
    const fullTagPresent = lowerContent.includes(lowerTagName) || lowerTitle.includes(lowerTagName)

    // Special handling for common variations
    const variations: Record<string, string[]> = {
      'cctv': ['cctv', 'surveillance', 'video surveillance', 'camera', 'monitoring'],
      'children': ['child', 'children', 'minor', 'parental'],
      'artificial intelligence': ['ai', 'artificial intelligence', 'machine learning', 'automated decision'],
      'data breach': ['breach', 'security incident', 'unauthorized access', 'pdbn'],
      'consent': ['consent', 'permission', 'authorization'],
      'cross-border transfer': ['cross-border', 'international transfer', 'transborder'],
      'privacy enhancing technologies': ['pet', 'pets', 'privacy enhancing', 'encryption'],
      'biometric data': ['biometric', 'fingerprint', 'facial recognition', 'iris scan'],
      'employee data': ['employee', 'employment', 'hr', 'human resource'],
      'videoconferencing': ['videoconference', 'videoconferencing', 'virtual appearance', 'remote meeting'],
      'elections': ['election', 'campaign', 'political', 'voter'],
      'deceptive design': ['dark pattern', 'deceptive design', 'manipulative'],
      'insurance': ['insurance', 'insurer', 'policy holder'],
    }

    const tagVariations = variations[lowerTagName] || []
    const hasVariation = tagVariations.some(variant =>
      lowerContent.includes(variant) || lowerTitle.includes(variant)
    )

    if (fullTagPresent || allWordsPresent || hasVariation) {
      matchedTags.push(tag.id)
    }
  }

  // Connect tags to section
  if (matchedTags.length > 0) {
    await prisma.section.update({
      where: { id: sectionId },
      data: {
        tags: {
          connect: matchedTags.map((tagId) => ({ id: tagId })),
        },
      },
    })
  }

  console.log(
    `  🏷️  Auto-tagged with ${matchedTags.length} tag(s): ${allTags
      .filter((t) => matchedTags.includes(t.id))
      .map((t) => t.name)
      .join(', ')}`
  )
}

/**
 * Clean and normalize text content
 */
export function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\t/g, ' ') // Replace tabs with spaces
    .replace(/ +/g, ' ') // Normalize multiple spaces to single space
    .replace(/\n +/g, '\n') // Remove leading spaces on lines
    .replace(/ +\n/g, '\n') // Remove trailing spaces on lines
    .replace(/\n{4,}/g, '\n\n\n') // Limit consecutive newlines to max 3
    .trim()
}

/**
 * Parse HTML content using Cheerio
 * 
 * Example for scraping structured government websites
 */
export function parseHTMLContent(html: string): {
  sections: Array<{ sectionNum: string; title: string; content: string }>
} {
  const $ = cheerio.load(html)
  const sections: Array<{ sectionNum: string; title: string; content: string }> = []

  // This is a sample structure - adjust selectors based on actual website
  $('.section').each((_, element) => {
    const sectionNum = $(element).find('.section-number').text().trim()
    const title = $(element).find('.section-title').text().trim()
    const content = $(element).find('.section-content').text().trim()

    if (sectionNum && title && content) {
      sections.push({
        sectionNum,
        title,
        content: cleanText(content),
      })
    }
  })

  return { sections }
}

/**
 * Batch invalidate cache after ingestion
 */
export async function invalidateCacheAfterIngestion(): Promise<void> {
  console.log('\n🔄 Invalidating search cache...')
  await cacheService.invalidateSearchCache()
  console.log('✅ Search cache cleared')
}

/**
 * Example: Create a legal document record
 */
export async function createDocument(data: {
  type: 'DPA' | 'IRR' | 'ISSUANCE'
  title: string
  alias: string
  url?: string
}) {
  return prisma.legalDocument.create({
    data,
  })
}

/**
 * Create a section with embedding and auto-tagging
 */
export async function createSectionWithEmbedding(data: {
  documentId: string
  sectionNum: string
  title: string
  content: string
  allTags?: Array<{ id: string; name: string }>
}) {
  // Generate embedding
  const embeddingText = `${data.title} ${data.content}`.slice(0, 5000)
  let embedding: number[] | null = null

  try {
    embedding = await generateEmbedding(embeddingText)
  } catch (error) {
    console.warn(`⚠️  Failed to generate embedding: ${error}`)
  }

  // Create section with embedding using raw SQL
  const section = await prisma.section.create({
    data: {
      documentId: data.documentId,
      sectionNum: data.sectionNum,
      title: data.title,
      content: data.content,
    },
  })

  // Update with embedding if generated
  if (embedding) {
    await prisma.$executeRaw`
      UPDATE "Section"
      SET embedding = ${JSON.stringify(embedding)}::vector
      WHERE id = ${section.id}
    `
  }

  // Auto-tag the section
  await autoTagSection(section.id, data.content, data.title, data.allTags)

  return section
}

/**
 * Batch generate embeddings with rate limiting
 */
export async function batchGenerateEmbeddings(
  sections: Array<{ id: string; text: string }>,
  batchSize: number = 5,
  delayMs: number = 1000
): Promise<Map<string, number[]>> {
  const embeddings = new Map<string, number[]>()

  for (let i = 0; i < sections.length; i += batchSize) {
    const batch = sections.slice(i, i + batchSize)

    console.log(`🔄 Processing embeddings batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(sections.length / batchSize)}`)

    const results = await Promise.allSettled(
      batch.map(async (section) => {
        const embedding = await generateEmbedding(section.text)
        return { id: section.id, embedding }
      })
    )

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        embeddings.set(result.value.id, result.value.embedding)
      } else {
        console.warn(`⚠️  Failed embedding for section ${batch[idx].id}`)
      }
    })

    // Rate limiting delay
    if (i + batchSize < sections.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  return embeddings
}

/**
 * Retry utility with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      console.warn(`⚠️  Retry ${i + 1}/${maxRetries} after error:`, error)
      await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)))
    }
  }
  throw new Error('Unreachable')
}

/**
 * Legacy function for backward compatibility
 */
export async function createSectionWithAutoTag(data: {
  documentId: string
  sectionNum: string
  title: string
  content: string
}) {
  return createSectionWithEmbedding(data)
}
