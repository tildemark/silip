const http = require('http');

http.get('http://localhost:3000/api/search/v2?q=data+protection+officer&filter=DPA', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log('✅ Search Results for "data protection officer" (DPA filter):');
    console.log(`Total results: ${json.total}`);
    if (json.results.length > 0) {
      json.results.slice(0, 5).forEach((r, i) => {
        console.log(`${i+1}. Section ${r.sectionNum}: ${r.sectionTitle}`);
      });
    } else {
      console.log('No results found');
    }
  });
}).on('error', (e) => console.error('Error:', e.message));
