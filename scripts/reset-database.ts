import { PrismaClient } from '@prisma/client'
import { cacheService } from '../lib/redis'

const prisma = new PrismaClient()

async function resetDatabase() {
  try {
    console.log('🗑️  Deleting all data...\n')

    // Delete in correct order due to foreign key constraints
    console.log('Deleting section-tag relations...')
    await prisma.$executeRaw`DELETE FROM "_SectionToTag"`
    
    console.log('Deleting ingestion logs...')
    await prisma.ingestionLog.deleteMany()
    
    console.log('Deleting sections...')
    await prisma.section.deleteMany()
    
    console.log('Deleting legal documents...')
    await prisma.legalDocument.deleteMany()
    
    // Keep tags - no need to delete and recreate
    console.log('Keeping tags intact...')
    
    console.log('\n🔄 Invalidating cache...')
    await cacheService.invalidateSearchCache()
    
    console.log('\n✅ Database reset complete!')
    console.log('\nNow run ingestion scripts in this order:')
    console.log('  1. npm run ingest:dpa-pdf')
    console.log('  2. npm run ingest:irr-pdf')
    console.log('  3. npm run ingest:advisories')
    console.log('  4. npm run ingest:circulars')
    console.log('  5. npm run ingest:decisions')
    console.log('  6. npm run ingest:orders')
    console.log('  7. npm run ingest:resolutions')
    
  } catch (error) {
    console.error('❌ Error resetting database:', error)
  } finally {
    await prisma.$disconnect()
    await cacheService.disconnect()
  }
}

resetDatabase()
