/**
 * Re-index all existing sections with embeddings
 * Run this after enabling pgvector support
 *
 * Usage: npx tsx scripts/reindex.ts
 */

import { PrismaClient } from '@prisma/client'
import { generateEmbedding } from '@/lib/ai'

const prisma = new PrismaClient()

async function reindex() {
  console.log('🚀 Starting SILIP semantic search re-indexing...')
  console.log('=====================================\n')

  try {
    // Get total count
    const totalSections = await prisma.section.count()
    console.log(`📊 Total sections to index: ${totalSections}\n`)

    if (totalSections === 0) {
      console.log('ℹ️  No sections found. Please ingest documents first.')
      return
    }

    // Process in batches to avoid memory issues
    const batchSize = 10
    let processed = 0
    let skipped = 0
    let errors = 0

    for (let i = 0; i < totalSections; i += batchSize) {
      const sections = await prisma.section.findMany({
        skip: i,
        take: batchSize,
        select: {
          id: true,
          title: true,
          content: true,
        },
      })

      for (const section of sections) {
        try {
          // Generate embedding for title + content
          const textToEmbed = `${section.title}: ${section.content}`

          console.log(
            `[${processed + 1}/${totalSections}] Embedding: ${section.title.substring(0, 50)}...`
          )

          const embedding = await generateEmbedding(textToEmbed)

          // Update section with embedding using raw SQL (Prisma doesn't support Unsupported types)
          await prisma.$executeRaw`
            UPDATE "Section"
            SET embedding = ${JSON.stringify(embedding)}::vector
            WHERE id = ${section.id}
          `

          processed++

          // Add delay to respect API rate limits
          await new Promise((resolve) => setTimeout(resolve, 100))
        } catch (error) {
          console.error(`❌ Error embedding section ${section.id}:`, error)
          errors++
        }
      }
    }

    console.log('\n=====================================')
    console.log('✅ Re-indexing complete!')
    console.log(`📈 Summary:`)
    console.log(`   - Processed: ${processed}`)
    console.log(`   - Errors: ${errors}`)
    console.log(`   - Skipped: ${skipped}`)
  } catch (error) {
    console.error('❌ Fatal error during re-indexing:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

reindex()
