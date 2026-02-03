import * as cheerio from 'cheerio'
import { PrismaClient } from '@prisma/client'
import { cacheService } from '../lib/redis'

const prisma = new PrismaClient()

/**
 * Auto-tagging utility
 * 
 * This function analyzes section content and automatically assigns
 * relevant tags based on keyword matching.
 */

export async function autoTagSection(
  sectionId: string,
  content: string,
  title: string
): Promise<void> {
  const allTags = await prisma.tag.findMany()
  
  const combinedText = `${title} ${content}`.toLowerCase()
  const matchedTags: string[] = []

  // Simple keyword matching
  // In production, you might use NLP or more sophisticated matching
  for (const tag of allTags) {
    const tagName = tag.name.toLowerCase()
    const keywords = [
      tagName,
      ...(tag.description?.toLowerCase().split(',') || []),
    ]

    const hasMatch = keywords.some((keyword) =>
      combinedText.includes(keyword.trim())
    )

    if (hasMatch) {
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
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
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
 * Example: Create a section with auto-tagging
 */
export async function createSectionWithAutoTag(data: {
  documentId: string
  sectionNum: string
  title: string
  content: string
}) {
  const section = await prisma.section.create({
    data,
  })

  // Auto-tag the section
  await autoTagSection(section.id, data.content, data.title)

  return section
}
