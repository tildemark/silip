import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSection() {
  try {
    const sectionId = 'cml6bmt1f000jpv255ilkq0my'
    
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      select: {
        title: true,
        content: true,
        tags: {
          select: {
            name: true,
          },
        },
      },
    })

    if (section) {
      console.log('📄 TITLE:', section.title)
      console.log('\n🏷️  TAGS:', section.tags.map(t => t.name).join(', '))
      console.log('\n📝 CONTENT (first 800 chars):\n')
      console.log(section.content.substring(0, 800))
      console.log('\n' + '='.repeat(80))
      console.log('🔍 Searching for CCTV-related terms...')
      console.log('='.repeat(80))
      
      const lower = section.content.toLowerCase()
      console.log('Contains "cctv":', lower.includes('cctv'))
      console.log('Contains "surveillance":', lower.includes('surveillance'))
      console.log('Contains "camera":', lower.includes('camera'))
      console.log('Contains "video":', lower.includes('video'))
      console.log('Contains "monitoring":', lower.includes('monitoring'))
      console.log('Contains "recording":', lower.includes('recording'))
      
      // Find where these terms appear
      if (lower.includes('surveillance')) {
        const idx = lower.indexOf('surveillance')
        console.log('\n📍 Found "surveillance" at position', idx)
        console.log('Context:', section.content.substring(Math.max(0, idx - 50), idx + 100))
      }
    } else {
      console.log('❌ Section not found')
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSection()
