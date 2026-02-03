const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const sections = await prisma.section.findMany({
    where: {
      sectionNum: { in: ['26', '48'] },
      document: { type: 'IRR' }
    },
    select: { sectionNum: true, title: true, content: true }
  });
  
  const searchTerms = ['data', 'protection', 'officer'];
  
  sections.forEach(s => {
    console.log(`\n=== Section ${s.sectionNum} ===`);
    console.log(`Title: ${s.title}\n`);
    
    const content = s.content.toLowerCase();
    const title = s.title.toLowerCase();
    
    searchTerms.forEach(term => {
      const inContent = content.includes(term);
      const inTitle = title.includes(term);
      const occurrences = (content.match(new RegExp(term, 'gi')) || []).length;
      
      console.log(`"${term}": ${inContent || inTitle ? 'MATCH' : 'NO'} (${occurrences} occurrences in content)`);
    });
  });
  
  await prisma.$disconnect();
})();
