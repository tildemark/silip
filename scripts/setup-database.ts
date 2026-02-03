import { execSync } from 'child_process'

/**
 * Complete database setup script
 * Runs all necessary steps to set up a fresh database
 */

const steps = [
  {
    name: 'Generate Prisma Client',
    command: 'npx prisma generate',
  },
  {
    name: 'Push Database Schema',
    command: 'npx prisma db push',
  },
  {
    name: 'Seed Tags',
    command: 'tsx scripts/seed-tags.ts',
  },
  {
    name: 'Ingest Sample Data',
    command: 'tsx scripts/ingest-sample.ts',
  },
]

async function setupDatabase() {
  console.log('🚀 Starting complete database setup...\n')

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    console.log(`\n[${ i + 1}/${steps.length}] ${step.name}`)
    console.log('─'.repeat(50))

    try {
      execSync(step.command, {
        stdio: 'inherit',
        cwd: process.cwd(),
      })
      console.log(`✅ ${step.name} completed\n`)
    } catch (error) {
      console.error(`❌ ${step.name} failed`)
      process.exit(1)
    }
  }

  console.log('\n' + '═'.repeat(50))
  console.log('🎉 Database setup completed successfully!')
  console.log('═'.repeat(50))
  console.log('\n📝 Next steps:')
  console.log('   1. Start the dev server: npm run dev')
  console.log('   2. Visit: http://localhost:3000')
  console.log('   3. Ingest DPA PDF: npm run ingest:dpa-pdf')
  console.log('\n')
}

setupDatabase()
