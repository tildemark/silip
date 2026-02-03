const http = require('http');

// Test search on IRR instead of DPA
http.get('http://localhost:3000/api/search/v2?q=data+protection+officer&filter=IRR', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('\n✅ Search Results for "data protection officer" (IRR filter):');
      console.log(`Total results: ${json.total}`);
      if (json.results.length > 0) {
        json.results.slice(0, 3).forEach((r, i) => {
          console.log(`\n${i+1}. IRR Section ${r.sectionNum}: ${r.sectionTitle}`);
          console.log(`   Snippet: ${r.snippet}`);
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
  process.exit(1);
});
