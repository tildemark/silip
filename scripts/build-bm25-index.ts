/**
 * BM25 Index Builder and Tester
 * 
 * This script builds the BM25 index and tests it with sample queries
 * to verify the implementation before integrating into the search API.
 */

import { bm25Engine } from '../lib/bm25'

async function main() {
    console.log('🚀 Building BM25 Index...\n')

    try {
        // Initialize the BM25 index
        await bm25Engine.initialize()

        // Get statistics
        const stats = bm25Engine.getStats()
        console.log(`\n📊 Index Statistics:`)
        console.log(`   - Documents indexed: ${stats.documentsIndexed}`)
        console.log(`   - Status: ${stats.initialized ? '✅ Ready' : '❌ Not initialized'}\n`)

        // Test queries
        const testQueries = [
            'consent',
            'data breach notification',
            'CCTV surveillance',
            'cross-border data transfer',
            'personal information controller',
            'sensitive personal information',
            'data protection officer',
        ]

        console.log('🔍 Testing BM25 Search with Sample Queries:\n')

        for (const query of testQueries) {
            console.log(`\n${'='.repeat(80)}`)
            console.log(`Query: "${query}"`)
            console.log('='.repeat(80))

            const results = await bm25Engine.search(query, { limit: 5 })

            if (results.length === 0) {
                console.log('   No results found.')
                continue
            }

            console.log(`\nTop ${results.length} Results:\n`)

            results.forEach((result, index) => {
                const doc = bm25Engine.getDocument(result.id)
                if (!doc) return

                console.log(`${index + 1}. [Score: ${result.score.toFixed(4)}] ${doc.documentType} - Section ${doc.sectionNum}`)
                console.log(`   Title: ${doc.sectionTitle}`)
                console.log(`   Preview: ${doc.content.substring(0, 150)}...`)
                console.log()
            })
        }

        console.log('\n✅ BM25 Index Test Complete!\n')
    } catch (error) {
        console.error('❌ Error building BM25 index:', error)
        process.exit(1)
    }
}

main()
