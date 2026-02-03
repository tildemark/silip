#!/usr/bin/env node
const http = require('http');

console.log('\n📊 Testing BOTH endpoints:\n');

const endpoints = [
  { url: 'http://localhost:3000/api/search?q=data+protection+officer&filter=IRR', name: 'v1 (/api/search)' },
  { url: 'http://localhost:3000/api/search/v2?q=data+protection+officer&filter=IRR', name: 'v2 (/api/search/v2)' }
];

let completed = 0;

endpoints.forEach(endpoint => {
  http.get(endpoint.url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log(`\n${endpoint.name}:`);
        console.log(`Total results: ${json.results?.length || json.total || 0}`);
        
        const results = json.results || [];
        const topResult = results[0];
        if (topResult) {
          console.log(`TOP: Section ${topResult.sectionNum} - ${topResult.sectionTitle}`);
        }
        
        const sec26 = results.find(r => r.sectionNum === '26');
        if (sec26) {
          const idx = results.indexOf(sec26);
          console.log(`Section 26 at position: ${idx + 1}`);
        } else {
          console.log('Section 26: NOT FOUND');
        }
        
      } catch (e) {
        console.error(`ERROR in ${endpoint.name}:`, e.message);
      }
      
      completed++;
      if (completed === endpoints.length) {
        process.exit(0);
      }
    });
  }).on('error', (e) => {
    console.error(`Connection error for ${endpoint.name}:`, e.message);
    completed++;
    if (completed === endpoints.length) {
      process.exit(1);
    }
  });
});

setTimeout(() => {
  console.error('Timeout');
  process.exit(1);
}, 10000);
