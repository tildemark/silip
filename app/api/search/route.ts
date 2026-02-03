import { NextRequest, NextResponse } from 'next/server'
import { searchLegalDocuments, SearchFilter } from '@/lib/search'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/search
 * 
 * Query Parameters:
 * - q: Search query (required)
 * - filter: Document type filter (optional: ALL, DPA, IRR, ISSUANCE)
 * 
 * Example: /api/search?q=consent&filter=DPA
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const filter = (searchParams.get('filter') || 'ALL') as SearchFilter

    // Validate query parameter
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      )
    }

    // Validate filter parameter
    const validFilters: SearchFilter[] = ['ALL', 'DPA', 'IRR', 'ISSUANCE']
    if (!validFilters.includes(filter)) {
      return NextResponse.json(
        { error: 'Invalid filter. Must be one of: ALL, DPA, IRR, ISSUANCE' },
        { status: 400 }
      )
    }

    // Perform search
    const results = await searchLegalDocuments(query, filter)

    // Return results with cache header
    return NextResponse.json(results, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('Search API Error:', error)
    
    return NextResponse.json(
      { error: 'An error occurred while processing your search' },
      { status: 500 }
    )
  }
}
