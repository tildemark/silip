/**
 * BM25 Search Implementation for SILIP
 * 
 * Provides BM25 (Okapi BM25) ranking for legal document sections.
 * BM25 improves upon basic term frequency by:
 * - Normalizing for document length (prevents long docs from dominating)
 * - Using inverse document frequency (prioritizes rare/specific terms)
 * - Tunable parameters for optimization
 */

// @ts-ignore - wink-bm25-text-search doesn't have TypeScript definitions
import bm25 from 'wink-bm25-text-search'
import { prisma } from './db'
import { DocType } from '@prisma/client'

export interface BM25Document {
    id: string
    title: string
    content: string
    documentId: string
    documentType: DocType
    sectionNum: string
    sectionTitle: string
}

export interface BM25Result {
    id: string
    score: number
}

export interface BM25SearchOptions {
    filter?: 'ALL' | 'DPA' | 'IRR' | 'ISSUANCE'
    limit?: number
}

/**
 * BM25 Search Engine
 * Singleton instance that manages the in-memory BM25 index
 */
class BM25SearchEngine {
    private index: any = null
    private documents: Map<string, BM25Document> = new Map()
    private initialized: boolean = false

    /**
     * Initialize the BM25 index with all sections from the database
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return
        }

        console.log('🔍 Initializing BM25 search index...')

        // Create BM25 instance
        this.index = bm25()

        // Configure BM25 parameters
        // k1: Controls term frequency saturation (1.2 is standard)
        // b: Controls length normalization (0.75 is standard)
        this.index.defineConfig({
            fldWeights: {
                title: 3,    // Title matches are 3x more important
                content: 1,  // Content matches have base weight
            },
            bm25Params: {
                k1: 1.2,  // Term frequency saturation
                b: 0.75,  // Length normalization
                k: 1,     // Query term frequency saturation
            },
        })

        // Define document preprocessing tasks
        // These are standard text processing steps for search
        this.index.definePrepTasks([
            // Define the preparation pipeline using wink-nlp-utils
            // For simplicity, we'll use basic tokenization
            (text: string) => text.toLowerCase(),
            (text: string) => text.replace(/[^\w\s]/g, ' '),
            (text: string) => text.split(/\s+/).filter((t: string) => t.length > 0),
        ])

        // Load all sections from database
        const sections = await prisma.section.findMany({
            include: {
                document: {
                    select: {
                        id: true,
                        type: true,
                        title: true,
                        alias: true,
                    },
                },
            },
        })

        console.log(`📚 Loading ${sections.length} sections into BM25 index...`)

        // Add each section to the index
        for (const section of sections) {
            const doc: BM25Document = {
                id: section.id,
                title: section.title,
                content: section.content,
                documentId: section.document.id,
                documentType: section.document.type,
                sectionNum: section.sectionNum,
                sectionTitle: section.title,
            }

            // Store document for later retrieval
            this.documents.set(section.id, doc)

            // Add to BM25 index
            this.index.addDoc(
                {
                    title: section.title,
                    content: section.content,
                },
                section.id
            )
        }

        // Consolidate the index for searching
        this.index.consolidate()

        this.initialized = true
        console.log(`✅ BM25 index initialized with ${sections.length} sections`)
    }

    /**
     * Search the BM25 index
     * @param query - Search query
     * @param options - Search options (filter, limit)
     * @returns Array of results with BM25 scores
     */
    async search(query: string, options: BM25SearchOptions = {}): Promise<BM25Result[]> {
        // Ensure index is initialized
        if (!this.initialized) {
            await this.initialize()
        }

        const { filter = 'ALL', limit = 100 } = options

        // Perform BM25 search
        const results = this.index.search(query, limit * 2) // Get more results for filtering

        // Convert results to our format and apply document type filter
        const scoredResults: BM25Result[] = results
            .map((result: any) => {
                const doc = this.documents.get(result[0])
                if (!doc) return null

                // Apply document type filter
                if (filter !== 'ALL') {
                    if (doc.documentType !== filter) {
                        return null
                    }
                }

                return {
                    id: result[0],
                    score: result[1],
                }
            })
            .filter((r: BM25Result | null): r is BM25Result => r !== null)
            .slice(0, limit)

        return scoredResults
    }

    /**
     * Get document by ID
     */
    getDocument(id: string): BM25Document | undefined {
        return this.documents.get(id)
    }

    /**
     * Get index statistics
     */
    getStats() {
        return {
            documentsIndexed: this.documents.size,
            initialized: this.initialized,
        }
    }

    /**
     * Reset the index (for testing or reindexing)
     */
    reset(): void {
        this.index = null
        this.documents.clear()
        this.initialized = false
    }
}

// Export singleton instance
export const bm25Engine = new BM25SearchEngine()

/**
 * Warmup function to pre-initialize BM25 index on server startup
 * Call this in your server initialization code
 */
export async function warmupBM25Index(): Promise<void> {
    console.log('🔥 Warming up BM25 index...')
    try {
        await bm25Engine.initialize()
        const stats = bm25Engine.getStats()
        console.log(`✅ BM25 index ready with ${stats.documentsIndexed} documents`)
    } catch (error) {
        console.error('⚠️  BM25 warmup failed:', error)
        // Don't throw - allow server to start even if warmup fails
    }
}
