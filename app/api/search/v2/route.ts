import { NextRequest, NextResponse } from 'next/server'
import { searchLegalDocuments, type SearchFilter } from '@/lib/search'
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
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 100)

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

    // Perform paginated search with improved ranking
    const response = await searchLegalDocuments(query, filter, page, pageSize)

    return NextResponse.json(response)
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
