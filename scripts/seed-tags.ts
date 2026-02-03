import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Seed common tags for Philippine Data Privacy law
 */

const COMMON_TAGS = [
  {
    name: 'Consent',
    description: 'Topics related to obtaining and managing consent for data processing',
  },
  {
    name: 'Data Breach',
    description: 'Security breaches, incidents, and notification requirements',
  },
  {
    name: 'Personal Information',
    description: 'General personal information and data processing',
  },
  {
    name: 'Sensitive Personal Information',
    description: 'Sensitive data requiring special protection',
  },
  {
    name: 'Data Subject Rights',
    description: 'Rights of individuals regarding their personal data',
  },
  {
    name: 'Security Measures',
    description: 'Technical and organizational security requirements',
  },
  {
    name: 'National Privacy Commission',
    description: 'Functions, powers, and structure of the NPC',
  },
  {
    name: 'Penalties',
    description: 'Fines, sanctions, and criminal liabilities',
  },
  {
    name: 'Compliance',
    description: 'Compliance requirements and obligations',
  },
  {
    name: 'CCTV',
    description: 'Video surveillance and monitoring systems',
  },
  {
    name: 'Data Processing',
    description: 'Collection, storage, use, and disposal of personal data',
  },
  {
    name: 'Data Controller',
    description: 'Obligations and responsibilities of data controllers',
  },
  {
    name: 'Data Processor',
    description: 'Obligations and responsibilities of data processors',
  },
  {
    name: 'Data Portability',
    description: 'Right to transfer data between services',
  },
  {
    name: 'Privacy Policy',
    description: 'Privacy notices and transparency requirements',
  },
  {
    name: 'Cross-Border Transfer',
    description: 'International data transfers and sharing',
  },
  {
    name: 'Accountability',
    description: 'Accountability principle and documentation requirements',
  },
  {
    name: 'Government Agencies',
    description: 'Special provisions for government entities',
  },
  {
    name: 'Lawful Processing',
    description: 'Legal basis and criteria for processing personal data',
  },
  {
    name: 'Subcontracting',
    description: 'Third-party processing and outsourcing',
  },
  {
    name: 'Children',
    description: 'Child privacy and parental consent requirements',
  },
  {
    name: 'Artificial Intelligence',
    description: 'AI systems and automated decision-making',
  },
  {
    name: 'Biometric Data',
    description: 'Fingerprints, facial recognition, and other biometric information',
  },
  {
    name: 'Employee Data',
    description: 'Employment and HR data processing',
  },
  {
    name: 'Marketing',
    description: 'Direct marketing and promotional communications',
  },
  {
    name: 'Registration',
    description: 'Data protection officer and system registration requirements',
  },
  {
    name: 'Videoconferencing',
    description: 'Remote meetings and virtual appearances',
  },
  {
    name: 'Elections',
    description: 'Election campaigning and political data processing',
  },
  {
    name: 'Transparency',
    description: 'Transparency requirements and data subject information',
  },
  {
    name: 'Deceptive Design',
    description: 'Dark patterns and manipulative interfaces',
  },
  {
    name: 'Contractual Clauses',
    description: 'Standard contractual clauses for data transfers',
  },
  {
    name: 'Insurance',
    description: 'Insurance industry specific requirements',
  },
  {
    name: 'Privacy Enhancing Technologies',
    description: 'PETs, encryption, and privacy-preserving tools',
  },
  {
    name: 'ASEAN',
    description: 'Regional cooperation and ASEAN framework',
  },
  {
    name: 'Public Officers',
    description: 'Personal data of government officials and public servants',
  },
]

async function seedTags() {
  console.log('🏷️  Starting tag seeding...')

  let created = 0
  let existing = 0

  for (const tag of COMMON_TAGS) {
    const result = await prisma.tag.upsert({
      where: { name: tag.name },
      update: {
        description: tag.description,
      },
      create: {
        name: tag.name,
        description: tag.description,
      },
    })

    if (result.createdAt === result.updatedAt) {
      created++
      console.log(`✅ Created: ${tag.name}`)
    } else {
      existing++
      console.log(`⏭️  Updated: ${tag.name}`)
    }
  }

  console.log(`\n🎉 Tag seeding completed!`)
  console.log(`📊 Summary:`)
  console.log(`   - Total tags: ${COMMON_TAGS.length}`)
  console.log(`   - Created: ${created}`)
  console.log(`   - Updated: ${existing}`)
}

// Run the seeding
seedTags()
  .catch((e) => {
    console.error('❌ Tag seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
