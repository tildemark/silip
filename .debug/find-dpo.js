const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Search for "data protection officer"
    console.log('Searching for "data protection officer" in all DPA sections...\n');
    
    const sections = await prisma.section.findMany({
      where: {
        document: { type: 'DPA' },
        OR: [
          { title: { contains: 'protection', mode: 'insensitive' } },
          { content: { contains: 'protection', mode: 'insensitive' } },
        ]
      },
      select: { sectionNum: true, title: true, content: true }
    });

    console.log(`Found ${sections.length} sections mentioning "protection":\n`);
    
    sections.forEach(s => {
      const hasDPO = s.content.toLowerCase().includes('data protection officer') || 
                     s.title.toLowerCase().includes('data protection officer');
      console.log(`Section ${s.sectionNum}: ${s.title}`);
      if (hasDPO) {
        console.log('  ⭐ CONTAINS "data protection officer"');
        console.log(`  Preview: ${s.content.substring(0, 200)}`);
      }
      console.log();
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
