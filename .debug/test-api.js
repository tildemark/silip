// Quick test to verify search results ranking
const url = 'http://localhost:3000/api/search?q=data+protection+officer&filter=IRR';

fetch(url)
  .then(res => res.json())
  .then(data => {
    console.log('\n=== Search Results for "data protection officer" (IRR) ===\n');
    console.log(`Total results: ${data.total}`);
    console.log(`Cached: ${data.cached}\n`);
    
    data.results.slice(0, 5).forEach((result, index) => {
      console.log(`${index + 1}. Section ${result.sectionNum}: ${result.sectionTitle}`);
    });
    
    // Check if Section 26 is first
    if (data.results[0]?.sectionNum === '26') {
      console.log('\n✅ SUCCESS: Section 26 is ranked first!');
    } else {
      console.log(`\n❌ ISSUE: Section ${data.results[0]?.sectionNum} is ranked first (expected Section 26)`);
    }
  })
  .catch(err => console.error('Error:', err.message));
