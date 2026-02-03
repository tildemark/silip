const http = require('http');

console.log('\n📊 Testing /api/search/v2\n');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/search/v2?q=data+protection+officer&filter=IRR',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      
      if (!json.results) {
        console.log('❌ No results in response');
        console.log('Response:', JSON.stringify(json).substring(0, 200));
        process.exit(1);
      }
      
      console.log(`✅ Found ${json.results.length} results\n`);
      
      console.log('TOP 5:');
      json.results.slice(0, 5).forEach((r, i) => {
        console.log(`${i+1}. Section ${r.sectionNum}: ${r.sectionTitle.substring(0, 60)}`);
      });
      
      const idx = json.results.findIndex(r => r.sectionNum === '26');
      if (idx >= 0) {
        console.log(`\n✅ Section 26 is at position ${idx + 1}`);
        if (idx === 0) {
          console.log('✅✅✅ CORRECT - Section 26 at TOP (3/3 matched terms)!');
        } else {
          console.log(`⚠️  Expected position 1, got ${idx + 1}`);
        }
      } else {
        console.log('\n❌ Section 26 NOT FOUND');
      }
      
      process.exit(idx === 0 ? 0 : 1);
    } catch (e) {
      console.error('Parse error:', e.message);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('Request timeout');
  req.destroy();
  process.exit(1);
});

req.end();
