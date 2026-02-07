import { DocType, Prisma } from '@prisma/client'
import { prisma } from './db'
import { cacheService } from './redis'
import { normalizeQuery, highlightSearchTerms, extractSnippet } from './utils'

export type SearchFilter = 'ALL' | 'DPA' | 'IRR' | 'ISSUANCE' | 'CIRCULAR' | 'ADVISORY' | 'ORDER' | 'DECISION' | 'RESOLUTION'

export interface SearchResult {
  id: string
  documentId: string
  documentType: DocType
  documentSubtype?: string  // For ISSUANCE: 'ADVISORY' | 'CIRCULAR' | 'ORDER' | 'DECISION' | 'RESOLUTION'
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
  page?: number
  pageSize?: number
  totalPages?: number
  cached: boolean
}

/**
 * Main search function with Redis caching
 */
export async function searchLegalDocuments(
  query: string,
  filter: SearchFilter = 'ALL',
  page: number = 1,
  pageSize: number = 20
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

  // Generate cache key with version to invalidate old caches after ranking changes
  const cacheKey = `silip:search:v14:${filter}:${normalizedQuery}:all`

  // Check cache first (cache all results, paginate from cache)
  const cached = await cacheService.get<{ results: SearchResult[] }>(cacheKey)

  let allResults: SearchResult[]

  if (cached) {
    allResults = cached.results
  } else {
    // Build database query
    const whereClause = buildWhereClause(normalizedQuery, filter)

    // Execute search - fetch all matching results
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
      // No limit - fetch all matching results for pagination
    })

    // Transform results with highlighting
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that',
      'the', 'to', 'was', 'will', 'with', 'do', 'i', 'me', 'my', 'we',
      'you', 'your', 'this', 'these', 'there', 'they', 'them', 'their'
    ])
    const lowerExpandedQuery = getExpandedQueryTerms(query).toLowerCase()
    const searchTerms = lowerExpandedQuery.split(/\s+/).filter((term) => term.length > 0)

    const results: SearchResult[] = sections
      .map((section) => {
        // Get expanded query terms including keyword variations
        const expandedQuery = getExpandedQueryTerms(query)

        const snippet = extractSnippet(section.content, expandedQuery, 300)
        // Only highlight non-stop words to avoid yellow highlighting of common words
        const highlightTerms = expandedQuery
          .split(/\s+/)
          .filter((term) => term.length > 0 && !stopWords.has(term.toLowerCase()))
          .join(' ')
        const highlightedContent = highlightSearchTerms(snippet, highlightTerms)

        // Calculate relevance score (pass both original and expanded query for exact phrase detection)
        const score = calculateRelevanceScore(section, searchTerms, query, expandedQuery)

        return {
          id: section.id,
          documentId: section.document.id,
          documentType: section.document.type,
          documentSubtype: extractDocumentSubtype(section.document.type, section.document.alias, section.document.title),
          documentAlias: section.document.alias,
          documentTitle: section.document.title,
          sectionNum: section.sectionNum,
          sectionTitle: section.title,
          content: section.content,
          highlightedContent,
          snippet,
          tags: section.tags,
          url: section.document.url,
          matchedTermCount: score.matchCount,
          totalOccurrences: score.totalOccurrences,
          hasExactPhrase: score.hasExactPhrase,
          hasExactPhraseInTitle: score.hasExactPhraseInTitle,
          hasKeywordInTitle: score.hasKeywordInTitle,
        } as SearchResult & { matchedTermCount: number; matchedTitleTermCount: number; totalOccurrences: number; hasExactPhrase: boolean; hasExactPhraseInTitle: boolean; hasKeywordInTitle: boolean }
      })
      // Sort by: 1) Strong Title relevance, 2) Exact phrase, 3) Document type, 4) Other factors
      .sort((a, b) => {
        // 1. Strong Title Relevance (3+ terms match) - Overrides everything
        const aTitleHigh = (a.matchedTitleTermCount || 0) >= 3
        const bTitleHigh = (b.matchedTitleTermCount || 0) >= 3
        if (aTitleHigh && !bTitleHigh) return -1
        if (bTitleHigh && !aTitleHigh) return 1
        if (aTitleHigh && bTitleHigh) {
          return (b.matchedTitleTermCount || 0) - (a.matchedTitleTermCount || 0)
        }

        // 2. Exact phrase matches in title - highest priority for relevance
        if (a.hasExactPhraseInTitle !== b.hasExactPhraseInTitle) {
          return b.hasExactPhraseInTitle ? 1 : -1
        }

        // 3. Exact phrase matches in content (any document)
        if (b.hasExactPhrase !== a.hasExactPhrase) {
          return b.hasExactPhrase ? 1 : -1
        }

        // 4. Within exact phrase matches, prioritize DPA/IRR over advisories
        // This ensures IRR with "data protection officer" ranks above advisory with same phrase
        if (a.hasExactPhrase && b.hasExactPhrase) {
          const aIsPrimary = a.documentType === 'DPA' || a.documentType === 'IRR'
          const bIsPrimary = b.documentType === 'DPA' || b.documentType === 'IRR'
          if (aIsPrimary !== bIsPrimary) {
            return bIsPrimary ? 1 : -1
          }
        }

        // 5. Primary source prioritization for non-exact matches
        const aIsPrimary = a.documentType === 'DPA' || a.documentType === 'IRR'
        const bIsPrimary = b.documentType === 'DPA' || b.documentType === 'IRR'
        if (aIsPrimary !== bIsPrimary) {
          return bIsPrimary ? 1 : -1
        }

        // 6. Within same document and same relevance level, sort by section number (ascending)
        // This ensures Section 26 appears before Section 47 when both match equally
        if (a.documentId === b.documentId && a.sectionNum !== undefined && b.sectionNum !== undefined) {
          return Number(a.sectionNum) - Number(b.sectionNum)
        }

        // 7. If both have exact phrase, prioritize ones where it's in the title
        if (b.hasExactPhrase !== a.hasExactPhrase) {
          return b.hasExactPhrase ? 1 : -1
        }

        // If both have exact phrase, prioritize ones where it's in the title
        if (a.hasExactPhrase && b.hasExactPhrase && a.hasExactPhraseInTitle !== b.hasExactPhraseInTitle) {
          return b.hasExactPhraseInTitle ? 1 : -1
        }

        // Prioritize DPA/IRR over other document types
        const typeOrder: Record<string, number> = { 'DPA': 0, 'IRR': 1, 'ISSUANCE': 2 }
        const aTypeOrder = typeOrder[a.documentType] ?? 999
        const bTypeOrder = typeOrder[b.documentType] ?? 999
        if (aTypeOrder !== bTypeOrder) {
          return aTypeOrder - bTypeOrder
        }

        // Within same document type (e.g., both IRR), if one has exact phrase and other doesn't, exact phrase wins
        if (a.documentType === b.documentType && a.hasExactPhrase !== b.hasExactPhrase) {
          return b.hasExactPhrase ? 1 : -1
        }

        // Within same document type with both having exact phrase, prioritize title match
        if (a.documentType === b.documentType && a.hasExactPhrase && b.hasExactPhrase && a.hasExactPhraseInTitle !== b.hasExactPhraseInTitle) {
          return b.hasExactPhraseInTitle ? 1 : -1
        }

        // Then sort by number of matched terms (more matches = higher priority)
        if (b.matchedTermCount !== a.matchedTermCount) {
          return b.matchedTermCount - a.matchedTermCount
        }

        // If same term count, prioritize sections where keywords appear in the title
        if (a.hasKeywordInTitle !== b.hasKeywordInTitle) {
          return b.hasKeywordInTitle ? 1 : -1
        }

        // If tied, sort by total occurrences (frequency) - for more relevant content
        if (b.totalOccurrences !== a.totalOccurrences) {
          return b.totalOccurrences - a.totalOccurrences
        }

        // Sort by section number (lower numbers first - meaningful sections, not boilerplate Section 1)
        const aSectionNum = parseInt(a.sectionNum) || 999
        const bSectionNum = parseInt(b.sectionNum) || 999
        if (aSectionNum !== bSectionNum) {
          return aSectionNum - bSectionNum
        }

        // Finally by title
        return a.sectionTitle.localeCompare(b.sectionTitle)
      })
    // Remove the temporary properties before returning
    // Remove the temporary properties before returning
    // .map(({ matchedTermCount, totalOccurrences, hasExactPhrase, ...result }) => result)

    // Cache all results
    await cacheService.set(cacheKey, { results: results }, 86400)
    allResults = results
  }

  // Apply pagination
  const totalResults = allResults.length
  const totalPages = Math.ceil(totalResults / pageSize)
  const startIdx = (page - 1) * pageSize
  const endIdx = startIdx + pageSize
  const paginatedResults = allResults.slice(startIdx, endIdx)

  const response: SearchResponse = {
    results: paginatedResults,
    query,
    filter,
    total: totalResults,
    page,
    pageSize,
    totalPages,
    cached: cached !== null,
  }

  return response
}

/**
 * Extract document subtype from alias for ISSUANCE documents
 */
function extractDocumentSubtype(documentType: DocType, alias: string, title: string): string | undefined {
  if (documentType !== 'ISSUANCE') {
    return undefined
  }

  const combined = `${alias} ${title}`.toLowerCase()

  if (combined.includes('advisory')) return 'ADVISORY'
  if (combined.includes('circular')) return 'CIRCULAR'
  if (combined.includes('order')) return 'ORDER'
  if (combined.includes('decision')) return 'DECISION'
  if (combined.includes('resolution')) return 'RESOLUTION'

  return 'ISSUANCE'
}

/**
 * Build the Prisma where clause for search
 */
function buildWhereClause(query: string, filter: SearchFilter): Prisma.SectionWhereInput {
  // Stop words to exclude from search
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that',
    'the', 'to', 'was', 'will', 'with', 'do', 'i', 'me', 'my', 'we',
    'you', 'your', 'this', 'these', 'there', 'they', 'them', 'their'
  ])

  // Expand query terms to include synonyms
  const expandedQuery = getExpandedQueryTerms(query)

  // IMPORTANT: Search for BOTH original query AND expanded form
  // This ensures we match both abbreviations (e.g., "DPO") and full terms (e.g., "data protection officer")
  const combinedQuery = query.toLowerCase() !== expandedQuery.toLowerCase()
    ? `${query} ${expandedQuery}` // Include both if different
    : expandedQuery // Use expanded only if same

  // Split combined query into terms for multi-word search, excluding stop words
  const searchTerms = combinedQuery
    .split(/\s+/)
    .filter((term) => term.length > 0 && !stopWords.has(term.toLowerCase()))
    // Remove duplicates
    .filter((term, index, self) => self.findIndex(t => t.toLowerCase() === term.toLowerCase()) === index)

  // If no meaningful terms remain after filtering stop words, return empty results
  if (searchTerms.length === 0) {
    return {
      id: { equals: 'none' }, // Match nothing
    }
  }

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
 * Calculate relevance score based on term matches and frequency
 * Returns { matchCount, totalOccurrences } for sorting
 */
function calculateRelevanceScore(section: any, searchTerms: string[], originalQuery: string, expandedQuery: string): { matchCount: number; matchedTitleTermCount: number; totalOccurrences: number; hasExactPhrase: boolean; hasExactPhraseInTitle: boolean; hasKeywordInTitle: boolean } {
  let matchCount = 0
  let matchedTitleTermCount = 0
  let totalOccurrences = 0
  let hasKeywordInTitle = false
  const contentLower = section.content.toLowerCase()
  const titleLower = section.title.toLowerCase()

  // Check for exact phrase match in BOTH original query AND expanded query variations
  // This ensures "dpo" search matches IRR sections containing "data protection officer"
  const originalPhrase = originalQuery.toLowerCase()

  // Split expanded query into individual phrases and check each one
  // e.g., "dpo data protection officer privacy officer" -> ["dpo", "data", "protection", "officer", "privacy"]
  // We need to check for multi-word phrases like "data protection officer"
  const expandedPhrases = expandedQuery.toLowerCase().split(/\s+/)

  // Check if content/title contains original phrase OR any significant multi-word phrase from expansions
  // For "dpo", we want to match "data protection officer" as a phrase, not individual words
  let hasExactPhrase = contentLower.includes(originalPhrase) || titleLower.includes(originalPhrase)
  let hasExactPhraseInTitle = titleLower.includes(originalPhrase)

  // Also check for common multi-word expansions (3+ words together)
  // This catches phrases like "data protection officer" when searching for "dpo"
  if (!hasExactPhrase && expandedPhrases.length >= 3) {
    // Try to find 3-word phrases in the expanded query
    for (let i = 0; i <= expandedPhrases.length - 3; i++) {
      const threeWordPhrase = `${expandedPhrases[i]} ${expandedPhrases[i + 1]} ${expandedPhrases[i + 2]}`
      if (contentLower.includes(threeWordPhrase) || titleLower.includes(threeWordPhrase)) {
        hasExactPhrase = true
        if (titleLower.includes(threeWordPhrase)) {
          hasExactPhraseInTitle = true
        }
        break
      }
    }
  }

  for (const term of searchTerms) {
    const termLower = term.toLowerCase()

    // Check if term appears at all
    if (contentLower.includes(termLower) || titleLower.includes(termLower)) {
      matchCount++

      // Count total occurrences (more occurrences = more relevant)
      const contentMatches = (contentLower.match(new RegExp(`\\b${termLower}\\b`, 'g')) || []).length
      const titleMatches = (titleLower.match(new RegExp(`\\b${termLower}\\b`, 'g')) || []).length

      // Title matches are worth more than content matches
      totalOccurrences += titleMatches * 3 + contentMatches

      // Track if any search term appears in title
      if (titleMatches > 0) {
        hasKeywordInTitle = true
        matchedTitleTermCount++
      }
    }
  }

  return { matchCount, matchedTitleTermCount, totalOccurrences, hasExactPhrase, hasExactPhraseInTitle, hasKeywordInTitle }
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
    'dpo': ['dpo', 'data protection officer', 'privacy officer', 'compliance officer'],
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
    // take: 50, // Fetch all matches to ensure relevant sections aren't cut off by ID sort
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

  // Create map of vector ranks
  const vectorRankMap = new Map<string, number>()
  vectorResults.forEach((r, index) => {
    vectorRankMap.set(r.id, index)
  })

  // Merge results (deduplicate by ID, prefer keyword matches)
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
  const lowerExpandedQuery = getExpandedQueryTerms(query).toLowerCase()
  const searchTerms = lowerExpandedQuery.split(/\s+/).filter((term) => term.length > 0)

  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'or', 'that',
    'the', 'to', 'was', 'will', 'with', 'do', 'i', 'me', 'my', 'we',
    'you', 'your', 'this', 'these', 'there', 'they', 'them', 'their'
  ])

  const sortedResults = Array.from(mergedMap.values())
    .map((section) => {
      const expandedQuery = getExpandedQueryTerms(query)
      const snippet = extractSnippet(section.content, expandedQuery, 300)
      // Only highlight non-stop words to avoid yellow highlighting of common words
      const highlightTerms = expandedQuery
        .split(/\s+/)
        .filter((term) => term.length > 0 && !stopWords.has(term.toLowerCase()))
        .join(' ')
      const highlightedContent = highlightSearchTerms(snippet, highlightTerms)

      // Calculate relevance score based on matched terms and frequency
      const score = calculateRelevanceScore(section, searchTerms, query, expandedQuery)

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
        matchedTermCount: score.matchCount,
        matchedTitleTermCount: score.matchedTitleTermCount,
        totalOccurrences: score.totalOccurrences,
        hasExactPhrase: score.hasExactPhrase,
        hasExactPhraseInTitle: score.hasExactPhraseInTitle,
        hasKeywordInTitle: score.hasKeywordInTitle,
        vectorRank: vectorRankMap.get(section.id) ?? 999,
      } as any
    })
    // Sort by: 1) Strong Title, 2) Vector Rank, 3) Exact Phrase
    .sort((a, b) => {
      // 1. Strong Title Relevance (3+ terms match) - Overrides everything
      const aTitleHigh = (a.matchedTitleTermCount || 0) >= 3
      const bTitleHigh = (b.matchedTitleTermCount || 0) >= 3
      if (aTitleHigh && !bTitleHigh) return -1
      if (bTitleHigh && !aTitleHigh) return 1
      if (aTitleHigh && bTitleHigh) {
        return (b.matchedTitleTermCount || 0) - (a.matchedTitleTermCount || 0)
      }

      // 2. Boost highly relevant vector matches (Top 5 Semantically)
      if ((a.vectorRank || 999) <= 5 && (b.vectorRank || 999) > 5) return -1
      if ((b.vectorRank || 999) <= 5 && (a.vectorRank || 999) > 5) return 1

      // Sort by: 1) exact phrase in DPA/IRR, 2) matched title terms, 3) matched total terms
      // Prioritize DPA/IRR with exact phrase matches above all others
      const aIsPrimaryWithExact = (a.documentType === 'DPA' || a.documentType === 'IRR') && a.hasExactPhrase
      const bIsPrimaryWithExact = (b.documentType === 'DPA' || b.documentType === 'IRR') && b.hasExactPhrase

      if (aIsPrimaryWithExact !== bIsPrimaryWithExact) {
        return bIsPrimaryWithExact ? 1 : -1
      }

      // Then, exact phrase matches in any document
      if (b.hasExactPhrase !== a.hasExactPhrase) {
        return b.hasExactPhrase ? 1 : -1
      }

      // Prioritize DPA/IRR over other document types
      const typeOrder: Record<string, number> = { 'DPA': 0, 'IRR': 1, 'ISSUANCE': 2 }
      const aTypeOrder = typeOrder[a.documentType] ?? 999
      const bTypeOrder = typeOrder[b.documentType] ?? 999
      if (aTypeOrder !== bTypeOrder) {
        return aTypeOrder - bTypeOrder
      }

      // Within same document type (e.g., both IRR), if one has exact phrase and other doesn't, exact phrase wins
      if (a.documentType === b.documentType && a.hasExactPhrase !== b.hasExactPhrase) {
        return b.hasExactPhrase ? 1 : -1
      }

      // Sort by matched terms in TITLE (prioritize title relevance)
      const titleTermDiff = (b.matchedTitleTermCount || 0) - (a.matchedTitleTermCount || 0)
      if (titleTermDiff !== 0) {
        return titleTermDiff
      }

      // Then sort by number of matched terms (content + title)
      const termDiff = (b.matchedTermCount || 0) - (a.matchedTermCount || 0)
      if (termDiff !== 0) {
        return termDiff
      }

      // If same number of terms matched, sort by total occurrences (frequency) - this is the relevance tiebreaker
      const occurrenceDiff = (b.totalOccurrences || 0) - (a.totalOccurrences || 0)
      if (occurrenceDiff !== 0) {
        return occurrenceDiff
      }

      // Sort by section number (lower numbers first - meaningful sections, not boilerplate Section 1)
      const aSectionNum = parseInt(a.sectionNum) || 999
      const bSectionNum = parseInt(b.sectionNum) || 999
      if (aSectionNum !== bSectionNum) {
        return aSectionNum - bSectionNum
      }

      // Finally by title
      return a.sectionTitle.localeCompare(b.sectionTitle)
    })
    // Remove the temporary properties before returning
    // .map(({ matchedTermCount, totalOccurrences, hasExactPhrase, ...result }) => result)
    .slice(0, limit)

  return sortedResults
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

