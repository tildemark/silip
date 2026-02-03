#!/usr/bin/env node
const http = require('http');

const query = 'data+protection+officer';
const filter = 'IRR';
const url = `http://localhost:3000/api/search/v2?q=${query}&filter=${filter}`;

console.log(`\n🔍 Fetching: ${url}\n`);

http.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(`✅ Results: ${json.results.length} found\n`);
      
      console.log('TOP 10 RESULTS:');
      json.results.slice(0, 10).forEach((r, i) => {
        console.log(`${i+1}. IRR Section ${r.sectionNum}: ${r.sectionTitle}`);
      });
      
      console.log(`\n✅ Section 26 should be first or very high in the list.`);
      
      const sec26Index = json.results.findIndex(r => r.sectionNum === '26');
      if (sec26Index === 0) {
        console.log('✅ CORRECT: Section 26 is at position 1 (has 3/3 matched terms)');
      } else if (sec26Index > 0) {
        console.log(`⚠️  Section 26 is at position ${sec26Index + 1} (expected position 1)`);
      } else {
        console.log('❌ Section 26 not found in results');
      }
      
      process.exit(0);
    } catch (e) {
      console.error('Parse error:', e.message);
      console.error('Raw response:', data.substring(0, 200));
      process.exit(1);
    }
  });
}).on('error', (e) => {
  console.error('Connection error:', e.message);
  process.exit(1);
});

setTimeout(() => {
  console.error('Timeout waiting for server');
  process.exit(1);
}, 5000);
