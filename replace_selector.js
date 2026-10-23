const fs = require('fs');
const content = fs.readFileSync('src/pages/Profile.tsx', 'utf-8');
const lines = content.split('\n');

const startIdx = lines.findIndex(l => l.includes('{/* Hierarchical Business & Branch Selector */}'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('            {/* Currently Selected Store WorkSpace */}'));

if (startIdx !== -1 && endIdx !== -1) {
  lines.splice(startIdx, endIdx - startIdx, '            {/* Hierarchical Business & Branch Selector */}', '            {businesses.length > 0 && (() => {', '              // BUSINESS_SELECTOR_PLACEHOLDER', '              return null;', '            })()}');
  fs.writeFileSync('src/pages/Profile.tsx', lines.join('\n'));
  console.log('Replaced block with placeholder');
} else {
  console.log('Could not find bounds', startIdx, endIdx);
}
