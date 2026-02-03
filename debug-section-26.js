const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Check if section 26 exists
    const section = await prisma.section.findFirst({
      where: { 
        sectionNum: '26',
        document: { type: 'DPA' }
      },
      include: { document: true }
    });
    
    if (section) {
      console.log('\n✅ Section 26 FOUND:');
      console.log('Title:', section.title);
      console.log('Content length:', section.content.length);
      console.log('Has embedding:', !!section.embedding);
      console.log('First 150 chars:', section.content.substring(0, 150));
    } else {
      console.log('\n❌ Section 26 NOT FOUND');
      
      // List all DPA sections
      const dpaCount = await prisma.section.count({
        where: { document: { type: 'DPA' } }
      });
      console.log(`Total DPA sections: ${dpaCount}`);
      
      const samples = await prisma.section.findMany({
        where: { document: { type: 'DPA' } },
        take: 10,
        select: { sectionNum: true, title: true }
      });
      console.log('\nDPA sections:');
      samples.forEach(s => console.log(`  - Section ${s.sectionNum}: ${s.title}`));
    }

    // Now test the search logic
    console.log('\n--- Testing search query ---');
    const searchResults = await prisma.section.findMany({
      where: {
        OR: [
          { content: { contains: 'data', mode: 'insensitive' } },
          { title: { contains: 'data', mode: 'insensitive' } },
        ],
        document: { type: 'DPA' }
      },
      take: 3,
      select: { sectionNum: true, title: true }
    });
    
    console.log(`Found ${searchResults.length} sections with "data" in DPA`);
    searchResults.forEach(r => console.log(`  - Section ${r.sectionNum}: ${r.title}`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
