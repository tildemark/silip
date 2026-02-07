/**
 * Server warmup script
 * 
 * Run this on server startup to pre-initialize BM25 index
 * This prevents the first search from being slow
 * 
 * Usage in Next.js:
 * - Import in middleware.ts or a server component
 * - Call warmupServer() once on startup
 */

import { warmupBM25Index } from '../lib/bm25'

export async function warmupServer() {
    console.log('🚀 Starting server warmup...')

    try {
        // Warmup BM25 index
        await warmupBM25Index()

        console.log('✅ Server warmup complete')
    } catch (error) {
        console.error('⚠️  Server warmup failed:', error)
        // Don't throw - allow server to start even if warmup fails
    }
}

// Auto-run if executed directly
if (require.main === module) {
    warmupServer()
        .then(() => {
            console.log('Done')
            process.exit(0)
        })
        .catch((error) => {
            console.error('Fatal error:', error)
            process.exit(1)
        })
}
