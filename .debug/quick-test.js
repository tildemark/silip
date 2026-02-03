const http = require('http');

console.log('\n🔍 Testing search ranking for "data protection officer" (IRR)...\n');

http.get('http://localhost:3000/api/search/v2?q=data+protection+officer&filter=IRR', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(`✅ Results: ${json.results.length} found\n`);
      json.results.slice(0, 5).forEach((r, i) => {
        console.log(`${i+1}. IRR Section ${r.sectionNum}: ${r.sectionTitle}`);
      });
      process.exit(0);
    } catch (e) {
      console.error('Parse error:', e.message);
      process.exit(1);
    }
  });
}).on('error', (e) => {
  console.error('Connection error:', e.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('Timeout');
  process.exit(1);
}, 5000);
