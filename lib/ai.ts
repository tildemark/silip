/**
 * AI Utilities for SILIP v2.0
 * - Gemini embeddings for semantic search
 * - Re-ranking with semantic drift mitigation
 * - Legal consultant responses
 */

import { GoogleGenerativeAI } from '@google/generative-ai'

interface SectionSnippet {
  id: string
  sectionNum: string
  title: string
  content: string
}

interface RerankResult {
  id: string
  relevance_score: number
}

// Initialize Gemini client lazily
let genAI: GoogleGenerativeAI | null = null

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set')
    }
    genAI = new GoogleGenerativeAI(apiKey)
  }
  return genAI as GoogleGenerativeAI
}

/**
 * Helper to retry functions with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
  backoff = 2
): Promise<T> {
  try {
    return await fn()
  } catch (error: any) {
    if (retries === 0) throw error

    // Check if error is retryable (503 Service Unavailable, 429 Too Many Requests)
    // Note: GoogleGenerativeAIError might wrap the actual status
    const isRetryable =
      error.message?.includes('503') ||
      error.message?.includes('429') ||
      error.status === 503 ||
      error.status === 429

    if (!isRetryable && retries < 3) throw error // Only retry non-specific errors once or twice? No, strictly retry clear network/server limits.
    // Actually, for now, let's retry most errors except 400 (Bad Request) or 403 (Forbidden)
    const isFatal = error.message?.includes('400') || error.message?.includes('403') || error.status === 400 || error.status === 403
    if (isFatal) throw error

    console.log(`⚠️  API Request failed. Retrying in ${delay}ms... (Retries left: ${retries})`)
    await new Promise((resolve) => setTimeout(resolve, delay))
    return retryWithBackoff(fn, retries - 1, delay * backoff, backoff)
  }
}

/**
 * Generate embedding for text using Gemini text-embedding-004
 * @param text - Text to embed
 * @returns 768-dimensional embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = getGenAI().getGenerativeModel({ model: 'text-embedding-004' })

    const result = await model.embedContent(text)
    const embedding = result.embedding

    if (!embedding || !embedding.values) {
      throw new Error('No embedding values returned')
    }

    return embedding.values
  } catch (error) {
    console.error('Error generating embedding:', error)
    throw error
  }
}

/**
 * Re-rank search results using Gemini to eliminate semantic drift
 * @param query - User's search query
 * @param candidates - Top 20 candidate sections
 * @returns Re-ranked sections with relevance scores (filtered by score >= 6)
 */
export async function rerankResults(
  query: string,
  candidates: SectionSnippet[]
): Promise<SectionSnippet[]> {
  // Only re-rank if query is specific enough (> 3 words or looks specific)
  const words = query.trim().split(/\s+/)
  const isSpecific =
    words.length > 3 ||
    query.includes(':') ||
    /^\d{4}-\d{2}/.test(query) || // Circular format
    query.toLowerCase() !== 'law'

  if (!isSpecific || candidates.length === 0) {
    return candidates
  }

  try {
    const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' })

    const candidatesText = candidates
      .map(
        (c, i) =>
          `${i + 1}. ID: ${c.id} | Section: ${c.sectionNum} | Title: ${c.title}\n   Snippet: ${c.content.substring(0, 150)}...`
      )
      .join('\n')

    const prompt = `You are analyzing legal search results for relevance to a user query.

User Query: "${query}"

Task: Re-rank these Philippine Data Privacy law sections by EXACT relevance to the query.

CRITICAL RULE - Avoid Semantic Drift:
- If the query is about "CCTV", do NOT score "Compliance Monitoring" high just because it contains "monitor".
- If the query is about "Consent", do NOT score sections about "Concurrence" or "Agreement" if they're not about consent specifically.
- Only score high (7+) if the section is DIRECTLY relevant to the query.
- Score 0-3 for tangentially related sections.
- Score 4-6 for moderately related sections.

Candidates:
${candidatesText}

Return ONLY valid JSON array (no markdown, no extra text):
[{"id": "...", "relevance_score": N}, ...]`

    const response = await model.generateContent(prompt)
    const text = response.response.text()

    // Parse JSON response
    let rerankData: RerankResult[] = []
    try {
      // Try to extract JSON if wrapped in markdown code blocks
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        rerankData = JSON.parse(jsonMatch[0])
      } else {
        rerankData = JSON.parse(text)
      }
    } catch (parseError) {
      console.error('Failed to parse re-ranking response:', text)
      return candidates
    }

    // Create score map
    const scoreMap = new Map(rerankData.map((r) => [r.id, r.relevance_score]))

    // Filter and re-order by score
    return candidates
      .filter((c) => {
        const score = scoreMap.get(c.id) || 0
        return score >= 4
      })
      .sort((a, b) => (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0))
  } catch (error) {
    console.error('Error in re-ranking:', error)
    return candidates
  }
}

/**
 * Get consultant response using Gemini with legal context
 * @param query - User question
 * @param context - Relevant legal sections
 * @returns Consultant answer with proper citations
 */
export async function getConsultantResponse(
  query: string,
  context: SectionSnippet[]
): Promise<string> {
  try {
    const model = getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash' })

    const contextText = context
      .map((c, i) => `[Source ${i + 1}] - ${c.title} (Section ${c.sectionNum})\n${c.content}`)
      .join('\n\n---\n\n')

    const prompt = `You are a Philippine Data Privacy Consultant with deep expertise in the Data Privacy Act (DPA) of 2012 and its Implementing Rules and Regulations (IRR).

CRITICAL REQUIREMENTS:
1. Answer ONLY using the provided legal context below.
2. The context items are labeled "[Source 1]", "[Source 2]", etc.
3. You MUST cite the source using the format [Source N] for every claim (e.g., "According to the IRR [Source 1]...").
4. If the answer is not found in the context, say: "This information is not covered in the provided sections."
5. Be concise, clear, and use bullet points when appropriate.
6. Use professional but accessible language.

User Question: "${query}"

Legal Context:
${contextText}

Your Response:`

    // Use longer backoff for consultant response (3 retries, start at 5s, 2x backoff -> 5, 10, 20s) - actually need more for 42s
    // Let's try 4 retries, start 2s. 2, 4, 8, 16. Still not enough.
    // Try: 3 retries, start 10s. 10, 20, 40. Covers 42s.
    const response = await retryWithBackoff(() => model.generateContent(prompt), 3, 5000)
    return response.response.text()
  } catch (error) {
    console.error('Error getting consultant response:', error)
    throw error
  }
}

/**
 * Calculate cosine similarity between two vectors
 * Used for vector search filtering
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vector dimensions must match')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dotProduct / denominator
}
