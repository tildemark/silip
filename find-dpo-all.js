const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Search across ALL documents
    console.log('Searching for "data protection officer" in ALL documents...\n');
    
    const sections = await prisma.section.findMany({
      where: {
        OR: [
          { title: { contains: 'data protection officer', mode: 'insensitive' } },
          { content: { contains: 'data protection officer', mode: 'insensitive' } },
        ]
      },
      include: { document: true },
      take: 10
    });

    if (sections.length === 0) {
      console.log('❌ No sections found with "data protection officer"');
      
      // Try partial match
      console.log('\nTrying partial match for "officer"...');
      const officer = await prisma.section.findMany({
        where: {
          OR: [
            { content: { contains: 'officer', mode: 'insensitive' } },
          ]
        },
        select: { sectionNum: true, title: true, document: { select: { type: true } } },
        take: 5
      });
      
      console.log(`Found ${officer.length} sections with "officer":`);
      officer.forEach(o => {
        console.log(`  - ${o.document.type} Section ${o.sectionNum}: ${o.title}`);
      });
    } else {
      console.log(`✅ Found ${sections.length} sections with "data protection officer"`);
      sections.forEach(s => {
        console.log(`\n${s.document.type} Section ${s.sectionNum}: ${s.title}`);
        console.log(`Preview: ${s.content.substring(0, 250)}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
