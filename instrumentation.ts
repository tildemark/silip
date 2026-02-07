/**
 * Next.js Instrumentation
 * 
 * This file runs once when the Next.js server starts.
 * Perfect for initializing caches, warming up indexes, etc.
 * 
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
    // Only run on server (not in edge runtime)
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        console.log('🚀 Server instrumentation starting...')

        try {
            // Warmup BM25 index
            const { warmupBM25Index } = await import('./lib/bm25')
            await warmupBM25Index()

            console.log('✅ Server instrumentation complete')
        } catch (error) {
            console.error('⚠️  Server instrumentation failed:', error)
            // Don't throw - allow server to start even if warmup fails
        }
    }
}
