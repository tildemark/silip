import { DocType, Prisma } from '@prisma/client'
import { prisma } from './db'
import { cacheService } from './redis'
import { normalizeQuery, highlightSearchTerms, extractSnippet } from './utils'

export type SearchFilter = 'ALL' | 'DPA' | 'IRR' | 'ISSUANCE' | 'CIRCULAR' | 'ADVISORY' | 'ORDER' | 'DECISION' | 'RESOLUTION'

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
    // Get expanded query terms including keyword variations
    const expandedQuery = getExpandedQueryTerms(query)
    
    const snippet = extractSnippet(section.content, expandedQuery, 300)
    const highlightedContent = highlightSearchTerms(snippet, expandedQuery)

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

  // Build search conditions - search only in content and title
  // Use OR logic so ANY term matching returns results (better for multi-word queries)
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
    ],
  }))

  // Base where clause with search conditions
  // Changed from AND to OR to allow matching ANY search term (e.g., "data protection officer" matches sections with any of these words)
  const whereClause: Prisma.SectionWhereInput = {
    OR: searchConditions,
  }

  // Add document type or subtype filter
  if (filter !== 'ALL') {
    if (filter === 'DPA' || filter === 'IRR' || filter === 'ISSUANCE') {
      // Main document type filter
      whereClause.document = {
        type: filter,
      }
    } else if (filter === 'CIRCULAR' || filter === 'ADVISORY' || filter === 'ORDER' || filter === 'DECISION' || filter === 'RESOLUTION') {
      // Issuance subtype filter
      whereClause.document = {
        type: 'ISSUANCE',
        subType: filter,
      }
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
 * Expand query terms with keyword variations for better highlighting
 * For example: "cctv" expands to "cctv surveillance camera monitoring recording"
 */
function getExpandedQueryTerms(query: string): string {
  const lowerQuery = query.toLowerCase()
  const terms = lowerQuery.split(/\s+/)
  
  // Keyword variations mapping (matches auto-tagging in ingestion-utils.ts)
  const variations: Record<string, string[]> = {
    'cctv': ['cctv', 'surveillance', 'video surveillance', 'camera', 'monitoring', 'recording', 'closed circuit'],
    'consent': ['consent', 'authorization', 'permission', 'agreement', 'approval'],
    'breach': ['breach', 'data breach', 'security incident', 'unauthorized access', 'leak', 'compromise'],
    'cross-border': ['cross-border', 'cross border', 'transborder', 'international transfer', 'data transfer'],
    'children': ['children', 'child', 'minor', 'minors', 'youth', 'parental consent'],
    'biometric': ['biometric', 'biometrics', 'fingerprint', 'facial recognition', 'iris scan', 'retina'],
    'ai': ['artificial intelligence', 'ai', 'machine learning', 'automated decision', 'algorithm'],
    'marketing': ['marketing', 'direct marketing', 'advertising', 'promotional', 'advertisement'],
    'employee': ['employee', 'employment', 'worker', 'personnel', 'hr', 'human resources'],
    'health': ['health', 'medical', 'healthcare', 'patient', 'hospital', 'clinical'],
    'financial': ['financial', 'bank', 'banking', 'credit', 'payment', 'transaction'],
    'government': ['government', 'public sector', 'agency', 'agencies', 'authorities', 'state'],
    'encryption': ['encryption', 'encrypted', 'cryptographic', 'cipher', 'encode'],
    'processor': ['processor', 'data processor', 'third party', 'service provider'],
    'controller': ['controller', 'data controller', 'pic', 'personal information controller'],
    'portability': ['portability', 'data portability', 'transfer', 'export'],
    'privacy policy': ['privacy policy', 'privacy notice', 'transparency', 'disclosure'],
    'accountability': ['accountability', 'documentation', 'record', 'compliance'],
    'lawful': ['lawful', 'legal basis', 'legitimate', 'justified'],
    'subcontracting': ['subcontracting', 'outsourcing', 'third party', 'contractor'],
    'registration': ['registration', 'dpo', 'data protection officer', 'register'],
    'videoconferencing': ['videoconferencing', 'video conference', 'zoom', 'virtual meeting', 'remote meeting'],
    'election': ['election', 'electoral', 'campaign', 'political', 'voter'],
    'transparency': ['transparency', 'disclosure', 'notice', 'information'],
    'deceptive': ['deceptive', 'dark pattern', 'manipulative', 'misleading'],
    'contractual': ['contractual', 'contract', 'agreement', 'clause', 'scc', 'standard contractual'],
    'insurance': ['insurance', 'insurer', 'policy', 'premium', 'claim'],
    'pet': ['privacy enhancing', 'pet', 'anonymization', 'pseudonymization'],
    'asean': ['asean', 'regional', 'southeast asia', 'asia pacific'],
    'public officer': ['public officer', 'government official', 'civil servant', 'public servant'],
    'sensitive': ['sensitive', 'sensitive personal information', 'spi', 'special category'],
    'security': ['security', 'security measure', 'safeguard', 'protection'],
    'npc': ['npc', 'national privacy commission', 'commission', 'privacy commission'],
    'penalty': ['penalty', 'fine', 'sanction', 'liability', 'punishment'],
    'compliance': ['compliance', 'obligation', 'requirement', 'duty'],
  }
  
  // Collect all expanded terms
  const expandedTerms = new Set<string>()
  
  for (const term of terms) {
    expandedTerms.add(term) // Add original term
    
    // Check if this term has variations
    for (const [key, keywords] of Object.entries(variations)) {
      if (term.includes(key) || key.includes(term)) {
        keywords.forEach(keyword => expandedTerms.add(keyword))
      }
    }
  }
  
  return Array.from(expandedTerms).join(' ')
}

/**
 * Hybrid search: combines keyword search with vector search
 * Returns top candidates before re-ranking
 */
export async function hybridSearch(
  query: string,
  filter: SearchFilter = 'ALL',
  limit: number = 20
): Promise<SearchResult[]> {
  const normalizedQuery = normalizeQuery(query)

  if (!normalizedQuery) {
    return []
  }

  // Build where clause for keyword matching
  const whereClause = buildWhereClause(normalizedQuery, filter)

  // 1. Keyword search
  const keywordResults = await prisma.section.findMany({
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
    take: 50,
  })

  // 2. Vector search (if embeddings are available)
  // Note: This requires raw SQL because Prisma doesn't support pgvector operators yet
  let vectorResults: typeof keywordResults = []
  
  try {
    const { generateEmbedding } = await import('./ai')
    const queryEmbedding = await generateEmbedding(query)
    const embeddingJson = JSON.stringify(queryEmbedding)

    // Use raw SQL for cosine similarity search
    let rawVectorResults: Array<{
      id: string
      documentId: string
      sectionNum: string
      title: string
      content: string
    }> = []

    if (filter !== 'ALL') {
      const docTypes = filter === 'DPA' || filter === 'IRR' || filter === 'ISSUANCE' 
        ? [filter] 
        : filter === 'CIRCULAR' || filter === 'ADVISORY' || filter === 'ORDER' || filter === 'DECISION' || filter === 'RESOLUTION'
        ? ['ISSUANCE']
        : []

      rawVectorResults = await prisma.$queryRaw<typeof rawVectorResults>`
        SELECT 
          s.id, s."documentId", s."sectionNum", s.title, s.content
        FROM "Section" s
        JOIN "LegalDocument" d ON s."documentId" = d.id
        WHERE s.embedding IS NOT NULL
        AND d.type = ANY(${docTypes}::"DocType"[])
        ORDER BY (s.embedding <-> ${embeddingJson}::vector)
        LIMIT 50
      `
    } else {
      rawVectorResults = await prisma.$queryRaw<typeof rawVectorResults>`
        SELECT 
          id, "documentId", "sectionNum", title, content
        FROM "Section"
        WHERE embedding IS NOT NULL
        ORDER BY (embedding <-> ${embeddingJson}::vector)
        LIMIT 50
      `
    }

    // Fetch full section data for vector results
    if (rawVectorResults && rawVectorResults.length > 0) {
      vectorResults = await prisma.section.findMany({
        where: {
          id: {
            in: rawVectorResults.map((r) => r.id),
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
      })
    }
  } catch (error) {
    console.warn('Vector search unavailable, using keyword results only:', error)
    vectorResults = []
  }

  // 3. Merge results (deduplicate by ID, prefer keyword matches)
  const mergedMap = new Map<string, (typeof keywordResults)[0]>()

  // Add keyword results first (higher priority)
  keywordResults.forEach((r) => mergedMap.set(r.id, r))

  // Add vector results that aren't already in keyword results
  vectorResults.forEach((r) => {
    if (!mergedMap.has(r.id)) {
      mergedMap.set(r.id, r)
    }
  })

  // Convert to SearchResult format
  const mergedResults = Array.from(mergedMap.values())
    .map((section) => {
      const expandedQuery = getExpandedQueryTerms(query)
      const snippet = extractSnippet(section.content, expandedQuery, 300)
      const highlightedContent = highlightSearchTerms(snippet, expandedQuery)

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
    // Sort by document type priority: DPA and IRR first, then others
    .sort((a, b) => {
      const priorityMap: Record<string, number> = { 'DPA': 0, 'IRR': 1, 'ISSUANCE': 2 }
      const priorityA = priorityMap[a.documentType] ?? 3
      const priorityB = priorityMap[b.documentType] ?? 3
      return priorityA - priorityB
    })
    .slice(0, limit)

  return mergedResults
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

