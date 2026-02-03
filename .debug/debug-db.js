// Check what sections contain the exact phrase "data protection officer"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  // Search for sections with exact phrase in content
  const sections = await prisma.section.findMany({
    where: {
      OR: [
        { content: { contains: 'data protection officer' } },
        { title: { contains: 'data protection officer' } }
      ]
    },
    include: {
      document: {
        select: { type: true, alias: true }
      }
    },
    orderBy: [
      { sectionNum: 'asc' }
    ],
    take: 30
  });

  console.log('\n=== Sections with exact phrase "data protection officer" ===\n');
  sections.forEach(s => {
    const hasInContent = s.content.toLowerCase().includes('data protection officer');
    const hasInTitle = s.title.toLowerCase().includes('data protection officer');
    
    console.log(`${s.document.alias} Section ${s.sectionNum}: ${s.title.substring(0, 60)}`);
    console.log(`  Phrase in Content: ${hasInContent ? 'YES' : 'no'}, Title: ${hasInTitle ? 'YES' : 'no'}`);
  });

  await prisma.$disconnect();
}

test().catch(console.error);
