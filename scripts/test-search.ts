import { searchLegalDocuments } from '../lib/search'
import { cacheService } from '../lib/redis'
import { prisma } from '../lib/db'

async function testSearch() {
  try {
    console.log('Testing search: "consent" with filter "CIRCULAR"\n')
    
    const result = await searchLegalDocuments('consent', 'CIRCULAR')
    
    console.log('✅ Search successful!')
    console.log('Results:', result.total)
    console.log('Cached:', result.cached)
    
    if (result.results.length > 0) {
      console.log('\nFirst result:')
      console.log('Title:', result.results[0].sectionTitle)
      console.log('Document:', result.results[0].documentTitle)
      console.log('Snippet:', result.results[0].snippet.substring(0, 200))
    }
  } catch (error) {
    console.error('❌ Search failed:', error)
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }
  } finally {
    await prisma.$disconnect()
    await cacheService.disconnect()
  }
}

testSearch()
