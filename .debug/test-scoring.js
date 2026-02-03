// Test the scoring logic directly
const section26 = {
  content: 'data '.repeat(35) + 'protection '.repeat(10) + 'officer '.repeat(7),
  title: 'Organizational Security Measures'
};

const section48 = {
  content: 'data '.repeat(17) + 'protection '.repeat(1) + 'officer '.repeat(1),
  title: 'Notification of Automated Processing'
};

const searchTerms = ['data', 'protection', 'officer'];

function calculateRelevanceScore(section, searchTerms) {
  let matchCount = 0;
  let totalOccurrences = 0;
  const contentLower = section.content.toLowerCase();
  const titleLower = section.title.toLowerCase();
  
  for (const term of searchTerms) {
    const termLower = term.toLowerCase();
    
    if (contentLower.includes(termLower) || titleLower.includes(termLower)) {
      matchCount++;
      
      const contentMatches = (contentLower.match(new RegExp(termLower, 'g')) || []).length;
      const titleMatches = (titleLower.match(new RegExp(termLower, 'g')) || []).length;
      
      totalOccurrences += titleMatches * 3 + contentMatches;
    }
  }
  
  return { matchCount, totalOccurrences };
}

const score26 = calculateRelevanceScore(section26, searchTerms);
const score48 = calculateRelevanceScore(section48, searchTerms);

console.log('\nSection 26 score:', score26);
console.log('Section 48 score:', score48);

if (score26.matchCount > score48.matchCount) {
  console.log('\n✅ Section 26 wins (more matched terms)');
} else if (score26.matchCount === score48.matchCount) {
  if (score26.totalOccurrences > score48.totalOccurrences) {
    console.log('\n✅ Section 26 wins (same terms, higher frequency)');
  } else {
    console.log('\n❌ Section 48 wins (higher frequency)');
  }
} else {
  console.log('\n❌ Section 48 wins (more matched terms)');
}
