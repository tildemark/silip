import { NextRequest, NextResponse } from 'next/server'
import { hybridSearch, type SearchResult, type SearchFilter } from '@/lib/search'
import { rerankResults } from '@/lib/ai'

/**
 * GET /api/search/v2
 * 
 * Hybrid search endpoint combining keyword and vector search with re-ranking
 * 
 * Query Parameters:
 *   - q: Search query (required)
 *   - filter: Document type filter (optional, defaults to ALL)
 *             Valid: ALL, DPA, IRR, ISSUANCE, CIRCULAR, ADVISORY, ORDER, DECISION, RESOLUTION
 *   - limit: Number of results to return (optional, defaults to 20, max 100)
 * 
 * Response:
 *   - results: Array of search results with re-ranking scores
 *   - count: Total number of results
 *   - query: The normalized search query
 *   - reranked: Boolean indicating if re-ranking was applied
 *   - message: Any warnings or info messages
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const filter = (searchParams.get('filter') as SearchFilter) || 'ALL'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      )
    }

    if (query.length > 1000) {
      return NextResponse.json(
        { error: 'Search query is too long (max 1000 characters)' },
        { status: 400 }
      )
    }

    // Perform hybrid search
    const candidates = await hybridSearch(query, filter, Math.min(limit * 3, 50))

    if (candidates.length === 0) {
      return NextResponse.json({
        results: [],
        count: 0,
        query,
        filter,
        reranked: false,
        message: 'No results found',
      })
    }

    // Determine if re-ranking should be applied
    // Re-ranking is beneficial for:
    // 1. Multi-word queries (potential semantic complexity)
    // 2. Specific legal terms that might have semantic drift
    const shouldRerank =
      query.split(/\s+/).length >= 3 || /cctv|surveillance|monitoring|compliance/i.test(query)

    let results: (SearchResult & { score?: number })[] = candidates.slice(0, limit)
    let reranked = false

    if (shouldRerank && candidates.length > 5) {
      try {
        // Convert to format expected by rerankResults
        const snippets = candidates.slice(0, Math.min(candidates.length, 20)).map((r) => ({
          id: r.id,
          sectionNum: r.sectionNum,
          title: r.sectionTitle,
          content: r.snippet,
        }))

        // Re-rank top candidates using AI to prevent semantic drift
        const rerankedSnippets = await rerankResults(query, snippets)

        if (rerankedSnippets.length > 0) {
          // Map back to full SearchResult objects
          const rerankedIds = rerankedSnippets.map((s) => s.id)
          results = candidates
            .filter((c) => rerankedIds.includes(c.id))
            .sort((a, b) => rerankedIds.indexOf(a.id) - rerankedIds.indexOf(b.id))
            .slice(0, limit)
            .map((r) => ({
              ...r,
              score: 8, // Placeholder - would need to return scores from rerankResults
            }))
          reranked = true
        }
      } catch (rerankError) {
        console.error('Re-ranking failed, using keyword results:', rerankError)
        // Fall back to keyword results if re-ranking fails
      }
    }

    return NextResponse.json({
      results,
      count: results.length,
      query,
      filter,
      reranked,
      message: reranked ? 'Results re-ranked using AI' : 'Results from hybrid search',
    })
  } catch (error) {
    console.error('Search v2 error:', error)

    return NextResponse.json(
      {
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Swagger documentation for GET /api/search/v2
 */
export const SEARCH_V2_SPEC = {
  tags: ['Search'],
  summary: 'Hybrid search with AI re-ranking (v2.0)',
  description:
    'Combines keyword and vector search with AI-powered re-ranking to prevent semantic drift. Supports filtering by document type.',
  parameters: [
    {
      name: 'q',
      in: 'query',
      required: true,
      description: 'Search query',
      schema: { type: 'string', example: 'data privacy requirements' },
    },
    {
      name: 'filter',
      in: 'query',
      description: 'Document type filter',
      schema: {
        type: 'string',
        enum: ['ALL', 'DPA', 'IRR', 'ISSUANCE', 'CIRCULAR', 'ADVISORY', 'ORDER', 'DECISION', 'RESOLUTION'],
        default: 'ALL',
      },
    },
    {
      name: 'limit',
      in: 'query',
      description: 'Maximum number of results to return (max 100)',
      schema: { type: 'integer', default: 20 },
    },
  ],
  responses: {
    '200': {
      description: 'Search results with re-ranking applied',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    documentId: { type: 'string' },
                    documentType: { type: 'string' },
                    documentTitle: { type: 'string' },
                    sectionNum: { type: 'string' },
                    sectionTitle: { type: 'string' },
                    snippet: { type: 'string' },
                    highlightedContent: { type: 'string' },
                    tags: { type: 'array' },
                    score: { type: 'number', description: 'Re-ranking score (0-10) if re-ranked' },
                  },
                },
              },
              count: { type: 'number' },
              query: { type: 'string' },
              filter: { type: 'string' },
              reranked: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    '400': {
      description: 'Bad request - missing or invalid parameters',
    },
    '500': {
      description: 'Server error',
    },
  },
}
