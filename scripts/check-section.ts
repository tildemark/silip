import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSection() {
  try {
    const sectionId = 'cml68hhgk000f9asyr28wsq0d'
    
    console.log(`🔍 Looking for section: ${sectionId}`)
    
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            type: true,
            subType: true,
          },
        },
        tags: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (section) {
      console.log('✅ Section found:')
      console.log(JSON.stringify(section, null, 2))
    } else {
      console.log('❌ Section NOT found')
      
      // Check if any sections exist at all
      const count = await prisma.section.count()
      console.log(`\n📊 Total sections in database: ${count}`)
      
      // Check recent sections with CCTV tag
      const cctvTag = await prisma.tag.findFirst({
        where: { name: 'CCTV' },
      })
      
      if (cctvTag) {
        console.log(`\n🏷️  Found CCTV tag: ${cctvTag.id}`)
        
        const sectionsWithCCTV = await prisma.section.findMany({
          where: {
            tags: {
              some: {
                id: cctvTag.id,
              },
            },
          },
          select: {
            id: true,
            title: true,
            document: {
              select: {
                title: true,
                type: true,
                subType: true,
              },
            },
          },
          take: 5,
        })
        
        console.log(`\n📋 Found ${sectionsWithCCTV.length} sections with CCTV tag:`)
        sectionsWithCCTV.forEach(s => {
          console.log(`  - ${s.id}: ${s.title} (${s.document.title})`)
        })
      }
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSection()
