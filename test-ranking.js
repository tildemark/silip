const http = require('http');

// Test search to see ranking by matched terms
http.get('http://localhost:3000/api/search/v2?q=data+protection+officer&filter=IRR', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('\n✅ Search Results: "data protection officer" (IRR filter)');
      console.log(`Total results: ${json.total}\n`);
      
      if (json.results.length > 0) {
        json.results.slice(0, 5).forEach((r, i) => {
          console.log(`${i+1}. IRR Section ${r.sectionNum}: ${r.sectionTitle}`);
          console.log(`   Snippet: ${r.snippet.substring(0, 120)}...`);
          console.log();
        });
      } else {
        console.log('❌ No results found');
      }
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });
}).on('error', (e) => {
  console.error('Connection error:', e.message);
  setTimeout(() => process.exit(1), 100);
});
