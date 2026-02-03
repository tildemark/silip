const fetch = require('node-fetch');

(async () => {
  try {
    console.log('\n🔍 Fetching v2 endpoint: /api/search/v2?q=data+protection+officer&filter=IRR\n');
    
    const res = await fetch('http://localhost:3000/api/search/v2?q=data+protection+officer&filter=IRR');
    const json = await res.json();
    
    if (!json.results) {
      console.log('ERROR: No results in response:', json);
      process.exit(1);
    }
    
    console.log(`✅ Got ${json.results.length} results\n`);
    console.log('TOP 10 SECTIONS:');
    json.results.slice(0, 10).forEach((r, i) => {
      console.log(`  ${i+1}. Section ${r.sectionNum}: ${r.sectionTitle.substring(0, 60)}`);
    });
    
    const sec26Index = json.results.findIndex(r => r.sectionNum === '26');
    console.log(`\nSection 26 position: ${sec26Index >= 0 ? sec26Index + 1 : 'NOT FOUND'}`);
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
