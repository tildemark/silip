// Debug script to check what sections are being returned
const query = 'data protection officer';
const filter = 'ALL';

fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(query)}&filter=${filter}`)
  .then(res => res.json())
  .then(data => {
    console.log('\n=== SEARCH DEBUG ===');
    console.log(`Query: "${query}" | Filter: ${filter}`);
    console.log(`Total: ${data.total} | Cached: ${data.cached}\n`);
    
    console.log('Top 15 Results:\n');
    data.results.slice(0, 15).forEach((r, i) => {
      console.log(`${i+1}. [${r.documentAlias}] Section ${r.sectionNum}`);
      console.log(`   Title: ${r.sectionTitle}`);
      console.log(`   Snippet: ${r.snippet?.substring(0, 100)}...`);
      console.log('');
    });
  })
  .catch(err => console.error('Error:', err.message));
