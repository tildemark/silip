import { NextRequest, NextResponse } from 'next/server'
import { bm25Engine } from '@/lib/bm25'
import { prisma } from '@/lib/db'
import { cacheService } from '@/lib/redis'
import type { SearchFilter } from '@/lib/search'

/**
 * GET /api/search/bm25
 * 
 * BM25 relevance-based search endpoint
 * Pure ranking based on term frequency and document length normalization
 * No legal document prioritization or custom business rules
 * 
 * Query Parameters:
 *   - q: Search query (required)
 *   - filter: Document type filter (optional, defaults to ALL)
 *             Valid: ALL, DPA, IRR, ISSUANCE, CIRCULAR, ADVISORY, ORDER, DECISION, RESOLUTION
 *   - page: Page number (optional, defaults to 1)
 *   - pageSize: Results per page (optional, defaults to 20, max 100)
 * 
 * Response:
 *   - results: Array of search results with BM25 scores
 *   - total: Total number of matching results
 *   - page: Current page number
 *   - pageSize: Results per page
 *   - totalPages: Total number of pages
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

        // Normalize query
        const normalizedQuery = query.trim()

        // Generate cache key
        const cacheKey = `silip:bm25:v1:${filter}:${normalizedQuery}:all`

        // Check cache first
        const cached = await cacheService.get<{ results: any[] }>(cacheKey)

        let allResults: any[] = []

        if (cached) {
            allResults = cached.results
        } else {
            // Perform BM25 search (get more results than needed for pagination)
            // Convert SearchFilter to BM25SearchOptions filter type
            let bm25Filter: 'ALL' | 'DPA' | 'IRR' | 'ISSUANCE' = 'ALL'
            if (filter === 'DPA' || filter === 'IRR' || filter === 'ISSUANCE') {
                bm25Filter = filter
            }

            const bm25Results = await bm25Engine.search(normalizedQuery, {
                filter: bm25Filter,
                limit: 500, // Get top 500 for pagination
            })

            // Fetch full section details from database
            const sectionIds = bm25Results.map(r => r.id)

            if (sectionIds.length === 0) {
                return NextResponse.json({
                    results: [],
                    total: 0,
                    page,
                    pageSize,
                    totalPages: 0,
                    query: normalizedQuery,
                    mode: 'bm25',
                })
            }

            const sections = await prisma.section.findMany({
                where: {
                    id: {
                        in: sectionIds,
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

            // Create a map for quick lookup
            const sectionMap = new Map(sections.map(s => [s.id, s]))

            // Build results in BM25 score order
            allResults = bm25Results
                .map(bm25Result => {
                    const section = sectionMap.get(bm25Result.id)
                    if (!section) return null

                    // Create snippet (first 200 chars)
                    const snippet = section.content.substring(0, 200) + (section.content.length > 200 ? '...' : '')

                    return {
                        id: section.id,
                        documentId: section.document.id,
                        documentType: section.document.type,
                        documentAlias: section.document.alias,
                        documentTitle: section.document.title,
                        documentUrl: section.document.url,
                        sectionNum: section.sectionNum,
                        sectionTitle: section.title,
                        content: snippet,
                        tags: section.tags.map(t => ({ id: t.id, name: t.name })),
                        bm25Score: bm25Result.score,
                    }
                })
                .filter((r): r is NonNullable<typeof r> => r !== null)

            // Cache all results
            await cacheService.set(cacheKey, { results: allResults }, 3600) // 1 hour cache
        }

        // Paginate results
        const total = allResults.length
        const totalPages = Math.ceil(total / pageSize)
        const startIndex = (page - 1) * pageSize
        const endIndex = startIndex + pageSize
        const paginatedResults = allResults.slice(startIndex, endIndex)

        return NextResponse.json({
            results: paginatedResults,
            total,
            page,
            pageSize,
            totalPages,
            query: normalizedQuery,
            mode: 'bm25',
        })
    } catch (error) {
        console.error('BM25 search error:', error)
        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
