const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('\n📊 Checking sections matching search terms:\n');
  
  const searchTerms = ['data', 'protection', 'officer'];
  
  // Check each doc type
  for (const docType of ['DPA', 'IRR', 'ISSUANCE']) {
    console.log(`\n${docType}:`);
    
    const sections = await prisma.section.findMany({
      where: {
        document: { type: docType },
        OR: [
          { content: { contains: 'data', mode: 'insensitive' } },
          { content: { contains: 'protection', mode: 'insensitive' } },
          { content: { contains: 'officer', mode: 'insensitive' } },
          { title: { contains: 'data', mode: 'insensitive' } },
          { title: { contains: 'protection', mode: 'insensitive' } },
          { title: { contains: 'officer', mode: 'insensitive' } },
        ]
      },
      select: {
        sectionNum: true,
        title: true,
        content: true
      },
      take: 10
    });
    
    for (const s of sections) {
      let matchCount = 0;
      const content = s.content.toLowerCase();
      const title = s.title.toLowerCase();
      const matches = [];
      
      for (const term of searchTerms) {
        if (content.includes(term) || title.includes(term)) {
          matchCount++;
          matches.push(term);
        }
      }
      
      if (matchCount >= 1) {
        console.log(`  Section ${s.sectionNum} (${matchCount}/3 matches: ${matches.join(', ')}): ${s.title.substring(0, 60)}`);
      }
    }
  }
  
  await prisma.$disconnect();
})();
