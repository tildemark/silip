import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSection() {
  const section = await prisma.section.findUnique({
    where: { id: 'cml6bmxko0009sfix0rv1a8o2' },
    select: {
      sectionNum: true,
      title: true,
      document: {
        select: {
          title: true,
          alias: true,
          type: true,
          subType: true,
          url: true,
        },
      },
    },
  })
  
  console.log(JSON.stringify(section, null, 2))
  await prisma.$disconnect()
}

checkSection()
