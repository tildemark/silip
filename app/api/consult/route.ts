import { NextRequest, NextResponse } from 'next/server'
import { hybridSearch } from '@/lib/search'
import { getConsultantResponse } from '@/lib/ai'

/**
 * POST /api/consult
 * 
 * Legal consultant endpoint that provides AI-powered advice with source citations
 * 
 * Request Body:
 *   - query: The legal question or request (required, max 2000 chars)
 * 
 * Response:
 *   - answer: The consultant's response
 *   - sources: Array of referenced sections with citations
 *   - query: The original query
 *   - confidence: Confidence score (low/medium/high) based on source quality
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      )
    }

    const trimmedQuery = query.trim()

    if (trimmedQuery.length === 0) {
      return NextResponse.json(
        { error: 'Query cannot be empty' },
        { status: 400 }
      )
    }

    if (trimmedQuery.length > 2000) {
      return NextResponse.json(
        { error: 'Query is too long (max 2000 characters)' },
        { status: 400 }
      )
    }

    // Rate limiting check (basic implementation)
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    // In production, use Redis for more sophisticated rate limiting
    // For now, we'll just log and proceed
    console.log(`Consult request from ${clientIp}: ${trimmedQuery.substring(0, 100)}...`)

    // Search for relevant sections
    const sources = await hybridSearch(trimmedQuery, 'ALL', 10)

    if (sources.length === 0) {
      return NextResponse.json({
        answer:
          'I could not find any relevant information in the legal documents to answer your question. Please try rephrasing your query or search for specific terms in the document archive.',
        sources: [],
        query: trimmedQuery,
        confidence: 'low',
        message: 'No relevant sources found',
      })
    }

    // Get top 3 sources for context
    const topSources = sources.slice(0, 3)

    // Format context for the consultant
    const consultantContext = topSources.map((source) => ({
      id: source.id,
      sectionNum: source.sectionNum,
      title: source.sectionTitle,
      content: source.snippet,
    }))

    try {
      // Get AI-generated response
      const response = await getConsultantResponse(trimmedQuery, consultantContext)

      // Extract and format sources with citation numbers
      const citationMap = new Map<string, number>()
      let citationCounter = 1

      // Map sections to citation numbers
      topSources.forEach((source) => {
        if (!citationMap.has(source.id)) {
          citationMap.set(source.id, citationCounter++)
        }
      })

      // Parse response to identify which sources are cited
      const citedSourceIds = new Set<string>()
      const citationPattern = /\[Source (\d+)\]/g
      let match
      while ((match = citationPattern.exec(response)) !== null) {
        const citationNum = parseInt(match[1])
        if (citationNum > 0 && citationNum <= topSources.length) {
          citedSourceIds.add(topSources[citationNum - 1].id)
        }
      }

      // Return cited sources only
      const citedSources = topSources.filter((s) => citedSourceIds.has(s.id))

      // Determine confidence based on number and relevance of sources
      let confidence: 'low' | 'medium' | 'high' = 'medium'
      if (citedSources.length >= 3) {
        confidence = 'high'
      } else if (citedSources.length === 0) {
        confidence = 'low'
      }

      return NextResponse.json({
        answer: response,
        sources: citedSources.map((source) => ({
          id: source.id,
          documentId: source.documentId,
          documentType: source.documentType,
          documentTitle: source.documentTitle,
          documentAlias: source.documentAlias,
          sectionNum: source.sectionNum,
          sectionTitle: source.sectionTitle,
          snippet: source.snippet,
          url: source.url,
          citationNum: citationMap.get(source.id),
        })),
        query: trimmedQuery,
        confidence,
        sourceCount: citedSources.length,
        message: `Response generated with ${citedSources.length} cited source(s)`,
      })
    } catch (consultError) {
      console.error('Consultant response generation failed:', consultError)

      // Fallback: return search results without AI response
      return NextResponse.json({
        answer:
          'I encountered an issue generating a detailed response. However, here are the most relevant documents that may help answer your question:',
        sources: topSources.map((source) => ({
          id: source.id,
          documentId: source.documentId,
          documentType: source.documentType,
          documentTitle: source.documentTitle,
          documentAlias: source.documentAlias,
          sectionNum: source.sectionNum,
          sectionTitle: source.sectionTitle,
          snippet: source.snippet,
          url: source.url,
        })),
        query: trimmedQuery,
        confidence: 'low',
        message: 'Fallback to search results due to response generation error',
      })
    }
  } catch (error) {
    console.error('Consult endpoint error:', error)

    return NextResponse.json(
      {
        error: 'Consultation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Swagger documentation for POST /api/consult
 */
export const CONSULT_SPEC = {
  tags: ['Consultant'],
  summary: 'AI legal consultant with source citations',
  description:
    'Asks an AI legal consultant a question and receives a response with citations to relevant legal documents.',
  requestBody: {
    required: true,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Legal question or inquiry',
              example: 'What are the requirements for data breach notification?',
            },
          },
          required: ['query'],
        },
      },
    },
  },
  responses: {
    '200': {
      description: 'Consultant response with cited sources',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              answer: { type: 'string', description: 'The consultant response' },
              sources: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    documentTitle: { type: 'string' },
                    sectionNum: { type: 'string' },
                    sectionTitle: { type: 'string' },
                    snippet: { type: 'string' },
                    citationNum: { type: 'number' },
                  },
                },
              },
              query: { type: 'string' },
              confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
              sourceCount: { type: 'number' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    '400': {
      description: 'Bad request - invalid query',
    },
    '500': {
      description: 'Server error',
    },
  },
}
