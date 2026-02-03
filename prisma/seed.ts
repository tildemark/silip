import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with initial tags...')

  // Philippine Data Privacy specific tags
  const tags = [
    { name: 'Consent', description: 'Requirements and guidelines for obtaining consent' },
    { name: 'Sensitive Personal Information', description: 'Special category of personal data' },
    { name: 'Personal Information', description: 'General personal data' },
    { name: 'DPO', description: 'Data Protection Officer requirements' },
    { name: 'Rights of Data Subjects', description: 'Individual rights under DPA' },
    { name: 'Data Breach', description: 'Security breach and notification' },
    { name: 'CCTV', description: 'Video surveillance regulations' },
    { name: 'Biometrics', description: 'Biometric data processing' },
    { name: 'Health Information', description: 'Medical and health-related data' },
    { name: 'Privacy Impact Assessment', description: 'PIA requirements' },
    { name: 'Cross-Border Transfer', description: 'International data transfers' },
    { name: 'Retention', description: 'Data retention policies' },
    { name: 'Security Measures', description: 'Technical and organizational measures' },
    { name: 'Penalties', description: 'Fines and sanctions' },
    { name: 'Legitimate Interest', description: 'Legal basis for processing' },
    { name: 'Transparency', description: 'Notice and disclosure requirements' },
    { name: 'Access Request', description: 'Right to access personal data' },
    { name: 'Data Erasure', description: 'Right to be forgotten' },
    { name: 'Outsourcing', description: 'Third-party processing arrangements' },
    { name: 'Marketing', description: 'Direct marketing regulations' },
  ]

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    })
  }

  console.log('✅ Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
