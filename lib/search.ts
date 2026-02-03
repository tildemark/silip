import { DocType, Prisma } from '@prisma/client'
import { prisma } from './db'
import { cacheService } from './redis'
import { normalizeQuery, highlightSearchTerms, extractSnippet } from './utils'

export type SearchFilter = 'ALL' | 'DPA' | 'IRR' | 'ISSUANCE'

export interface SearchResult {
  id: string
  documentId: string
  documentType: DocType
  documentAlias: string
  documentTitle: string
  sectionNum: string
  sectionTitle: string
  content: string
  highlightedContent: string
  snippet: string
  tags: Array<{ id: string; name: string }>
  url: string | null
}

export interface SearchResponse {
  results: SearchResult[]
  query: string
  filter: SearchFilter
  total: number
  cached: boolean
}

/**
 * Main search function with Redis caching
 */
export async function searchLegalDocuments(
  query: string,
  filter: SearchFilter = 'ALL'
): Promise<SearchResponse> {
  // Normalize query for consistent caching
  const normalizedQuery = normalizeQuery(query)

  if (!normalizedQuery) {
    return {
      results: [],
      query,
      filter,
      total: 0,
      cached: false,
    }
  }

  // Generate cache key
  const cacheKey = `silip:search:${filter}:${normalizedQuery}`

  // Check cache first
  const cached = await cacheService.get<SearchResponse>(cacheKey)
  if (cached) {
    return { ...cached, cached: true }
  }

  // Build database query
  const whereClause = buildWhereClause(normalizedQuery, filter)

  // Execute search
  const sections = await prisma.section.findMany({
    where: whereClause,
    include: {
      document: {
        select: {
          id: true,
          type: true,
          title: true,
          alias: true,
          url: true,
        },
      },
      tags: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    take: 50, // Limit results
    orderBy: [
      // Prioritize exact matches in title
      {
        title: 'asc',
      },
    ],
  })

  // Transform results with highlighting
  const results: SearchResult[] = sections.map((section) => {
    const snippet = extractSnippet(section.content, query, 300)
    const highlightedContent = highlightSearchTerms(snippet, query)

    return {
      id: section.id,
      documentId: section.document.id,
      documentType: section.document.type,
      documentAlias: section.document.alias,
      documentTitle: section.document.title,
      sectionNum: section.sectionNum,
      sectionTitle: section.title,
      content: section.content,
      highlightedContent,
      snippet,
      tags: section.tags,
      url: section.document.url,
    }
  })

  const response: SearchResponse = {
    results,
    query,
    filter,
    total: results.length,
    cached: false,
  }

  // Cache the results for 24 hours (86400 seconds)
  await cacheService.set(cacheKey, response, 86400)

  return response
}

/**
 * Build the Prisma where clause for search
 */
function buildWhereClause(query: string, filter: SearchFilter): Prisma.SectionWhereInput {
  // Split query into terms for multi-word search
  const searchTerms = query.split(/\s+/).filter((term) => term.length > 0)

  // Build search conditions
  const searchConditions: Prisma.SectionWhereInput[] = searchTerms.map((term) => ({
    OR: [
      {
        content: {
          contains: term,
          mode: 'insensitive' as Prisma.QueryMode,
        },
      },
      {
        title: {
          contains: term,
          mode: 'insensitive' as Prisma.QueryMode,
        },
      },
      {
        tags: {
          some: {
            name: {
              contains: term,
              mode: 'insensitive' as Prisma.QueryMode,
            },
          },
        },
      },
    ],
  }))

  // Base where clause with search conditions
  const whereClause: Prisma.SectionWhereInput = {
    AND: searchConditions,
  }

  // Add document type filter if not ALL
  if (filter !== 'ALL') {
    const docTypeMap: Record<Exclude<SearchFilter, 'ALL'>, DocType> = {
      DPA: 'DPA',
      IRR: 'IRR',
      ISSUANCE: 'ISSUANCE',
    }

    whereClause.document = {
      type: docTypeMap[filter],
    }
  }

  return whereClause
}

/**
 * Get related sections by tag
 */
export async function getRelatedSections(
  sectionId: string,
  limit: number = 5
): Promise<SearchResult[]> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: {
      tags: true,
    },
  })

  if (!section || section.tags.length === 0) {
    return []
  }

  const tagIds = section.tags.map((tag) => tag.id)

  const related = await prisma.section.findMany({
    where: {
      id: {
        not: sectionId,
      },
      tags: {
        some: {
          id: {
            in: tagIds,
          },
        },
      },
    },
    include: {
      document: {
        select: {
          id: true,
          type: true,
          title: true,
          alias: true,
          url: true,
        },
      },
      tags: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    take: limit,
  })

  return related.map((sec) => ({
    id: sec.id,
    documentId: sec.document.id,
    documentType: sec.document.type,
    documentAlias: sec.document.alias,
    documentTitle: sec.document.title,
    sectionNum: sec.sectionNum,
    sectionTitle: sec.title,
    content: sec.content,
    highlightedContent: sec.content,
    snippet: extractSnippet(sec.content, '', 300),
    tags: sec.tags,
    url: sec.document.url,
  }))
}

/**
 * Get all available tags
 */
export async function getAllTags() {
  return prisma.tag.findMany({
    orderBy: {
      name: 'asc',
    },
  })
}
