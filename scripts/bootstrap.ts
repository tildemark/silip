/**
 * Bootstrap script to initialize the database with all legal documents
 * Run this after deployment to populate the database
 */

import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function bootstrap() {
  console.log('🚀 Starting SILIP database bootstrap...\n')

  try {
    // Check database connection
    console.log('📊 Checking database connection...')
    await prisma.$connect()
    console.log('✅ Database connected\n')

    // Seed tags first
    console.log('🏷️  Seeding 35 privacy concept tags...')
    try {
      execSync('npx tsx prisma/seed.ts', {
        stdio: 'inherit',
        cwd: process.cwd(),
      })
      console.log('✅ Tags seeded\n')
    } catch (error) {
      console.error('❌ Tag seeding failed:', error)
      console.log()
    }

    // Check if data already exists
    const existingSections = await prisma.section.count()
    if (existingSections > 0) {
      console.log(`⚠️  Database already contains ${existingSections} sections`)
      console.log('   If you want to re-ingest, clear the database first.\n')
      
      const proceed = process.env.FORCE_REINGEST === 'true'
      if (!proceed) {
        console.log('   Skipping ingestion. Set FORCE_REINGEST=true to force re-ingestion.')
        await prisma.$disconnect()
        return
      }
      console.log('   FORCE_REINGEST enabled, proceeding with ingestion...\n')
    }

    const scripts = [
      { name: 'DPA 2012', script: 'scripts/ingest-dpa-pdf.ts', sections: 44 },
      { name: 'IRR 2016', script: 'scripts/ingest-irr-pdf.ts', sections: 72 },
      { name: 'Advisories', script: 'scripts/ingest-advisories.ts', sections: 21 },
      { name: 'Circulars', script: 'scripts/ingest-circulars.ts', sections: 32 },
      { name: 'Decisions', script: 'scripts/ingest-decisions.ts', sections: 92 },
      { name: 'Orders', script: 'scripts/ingest-orders.ts', sections: 73 },
      { name: 'Resolutions', script: 'scripts/ingest-resolutions.ts', sections: 140 },
    ]

    let successCount = 0
    let failCount = 0

    for (const { name, script, sections } of scripts) {
      console.log(`📄 Ingesting ${name} (~${sections} documents)...`)
      try {
        execSync(`npx tsx ${script}`, {
          stdio: 'inherit',
          cwd: process.cwd(),
        })
        successCount++
        console.log(`✅ ${name} ingestion completed\n`)
      } catch (error) {
        failCount++
        console.error(`❌ ${name} ingestion failed:`, error)
        console.log()
      }
    }

    console.log('='.repeat(50))
    console.log('📊 Bootstrap Summary:')
    console.log(`   ✅ Successful: ${successCount}/${scripts.length}`)
    console.log(`   ❌ Failed: ${failCount}/${scripts.length}`)
    console.log('='.repeat(50))

    // Verify final count
    const finalCount = await prisma.section.count()
    const documentCount = await prisma.legalDocument.count()
    
    console.log(`\n📈 Database Statistics:`)
    console.log(`   Documents: ${documentCount}`)
    console.log(`   Sections: ${finalCount}`)
    console.log(`\n🎉 Bootstrap completed!`)

  } catch (error) {
    console.error('❌ Bootstrap failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

bootstrap()
