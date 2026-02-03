const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  console.log('\n=== TESTING RANKING LOGIC DIRECTLY ===\n');
  
  const query = 'data protection officer';
  const filter = 'IRR';
  const normalizedQuery = query.toLowerCase().trim();
  const searchTerms = normalizedQuery.split(/\s+/).filter(t => t.length > 0);
  
  console.log('Query:', query);
  console.log('Terms:', searchTerms);
  console.log('Filter:', filter);
  
  // Build the WHERE clause (OR logic)
  const whereClause = {
    OR: [
      { content: { contains: 'data', mode: 'insensitive' } },
      { title: { contains: 'data', mode: 'insensitive' } },
      { content: { contains: 'protection', mode: 'insensitive' } },
      { title: { contains: 'protection', mode: 'insensitive' } },
      { content: { contains: 'officer', mode: 'insensitive' } },
      { title: { contains: 'officer', mode: 'insensitive' } },
    ],
    document: { type: filter }
  };
  
  // Get raw results from database
  const sections = await prisma.section.findMany({
    where: whereClause,
    select: {
      id: true,
      sectionNum: true,
      title: true,
      content: true,
      document: { select: { type: true } }
    },
    take: 50
  });
  
  console.log(`\nDatabase returned ${sections.length} sections\n`);
  
  // Apply ranking logic
  const results = sections
    .map(section => {
      let matchCount = 0;
      const contentLower = section.content.toLowerCase();
      const titleLower = section.title.toLowerCase();
      
      for (const term of searchTerms) {
        const termLower = term.toLowerCase();
        if (contentLower.includes(termLower) || titleLower.includes(termLower)) {
          matchCount++;
        }
      }
      
      return {
        sectionNum: section.sectionNum,
        title: section.title,
        matchCount
      };
    })
    .sort((a, b) => {
      // Sort by matched term count (descending)
      if (b.matchCount !== a.matchCount) {
        return b.matchCount - a.matchCount;
      }
      return a.sectionNum.localeCompare(b.sectionNum);
    });
  
  console.log('RANKED RESULTS:');
  results.slice(0, 10).forEach((r, i) => {
    console.log(`${i+1}. Section ${r.sectionNum} (${r.matchCount}/3 matches): ${r.title.substring(0, 60)}`);
  });
  
  await prisma.$disconnect();
})();
