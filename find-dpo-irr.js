const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // Find section 26 in IRR
    const section = await prisma.section.findFirst({
      where: { 
        sectionNum: '26',
        document: { type: 'IRR' }
      },
      include: { document: true }
    });
    
    if (section) {
      console.log('✅ Found Section 26 in IRR:');
      console.log('Title:', section.title);
      console.log('Preview:', section.content.substring(0, 300));
    } else {
      console.log('Section 26 not in IRR. Searching for Data Protection Officer in IRR...\n');
      
      const dpo = await prisma.section.findMany({
        where: {
          document: { type: 'IRR' },
          content: { contains: 'data protection officer', mode: 'insensitive' }
        },
        take: 5,
        select: { sectionNum: true, title: true, content: true }
      });
      
      if (dpo.length > 0) {
        console.log(`Found ${dpo.length} section(s) with "data protection officer" in IRR:\n`);
        dpo.forEach(d => {
          console.log(`Section ${d.sectionNum}: ${d.title}`);
          console.log(`Content: ${d.content.substring(0, 150)}...\n`);
        });
      } else {
        console.log('❌ No "data protection officer" found in IRR');
        
        // List all IRR sections
        const all = await prisma.section.findMany({
          where: { document: { type: 'IRR' } },
          take: 10,
          select: { sectionNum: true, title: true }
        });
        console.log('IRR sections:');
        all.forEach(s => console.log(`  Section ${s.sectionNum}: ${s.title}`));
      }
    }
    
    await prisma.$disconnect();
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
