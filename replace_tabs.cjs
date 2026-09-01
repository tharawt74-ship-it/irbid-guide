const fs = require('fs');
const content = fs.readFileSync('src/pages/Profile.tsx', 'utf-8');
const lines = content.split('\n');

const startIdx = lines.findIndex(l => l.includes('{/* Dashboard Workspace Tab Navigation */}'));
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('                  {/* Active Panel Content */}'));

if (startIdx !== -1 && endIdx !== -1) {
  lines.splice(startIdx, endIdx - startIdx, '                  {/* Dashboard Workspace Tab Navigation */}', '                  // TABS_PLACEHOLDER');
  fs.writeFileSync('src/pages/Profile.tsx', lines.join('\n'));
  console.log('Replaced block with placeholder');
} else {
  console.log('Could not find bounds', startIdx, endIdx);
}
