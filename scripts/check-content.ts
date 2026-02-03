import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkContent() {
  try {
    const sectionId = 'cml6atrt1001uzm0soadzvkfp'
    
    const section = await prisma.section.findUnique({
      where: { id: sectionId },
      select: {
        title: true,
        content: true,
        document: {
          select: {
            title: true,
            type: true,
          },
        },
      },
    })

    if (section) {
      console.log('📄 Document:', section.document.title)
      console.log('📝 Section:', section.title)
      console.log('\n' + '='.repeat(80))
      console.log('CONTENT (first 1000 characters):')
      console.log('='.repeat(80))
      console.log(section.content.substring(0, 1000))
      console.log('\n' + '='.repeat(80))
      console.log('CONTENT (next 1000 characters):')
      console.log('='.repeat(80))
      console.log(section.content.substring(1000, 2000))
      
      // Check for common garbling issues
      console.log('\n' + '='.repeat(80))
      console.log('DIAGNOSTICS:')
      console.log('='.repeat(80))
      console.log('Total length:', section.content.length)
      console.log('Has line breaks:', section.content.includes('\n'))
      console.log('Has multiple spaces:', /\s{3,}/.test(section.content))
      console.log('Has special chars:', /[^\x00-\x7F]/.test(section.content))
    } else {
      console.log('❌ Section not found')
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkContent()
