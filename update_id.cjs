const fs = require('fs');

let code = fs.readFileSync('src/contexts/SystemSettingsContext.tsx', 'utf8');
code = code.replace(/id: 'on-demand'/g, "id: 'pay_per_use'");
fs.writeFileSync('src/contexts/SystemSettingsContext.tsx', code);

let code2 = fs.readFileSync('src/pages/Pricing.tsx', 'utf8');
code2 = code2.replace(/plan\.id === 'on-demand'/g, "plan.id === 'pay_per_use'");
fs.writeFileSync('src/pages/Pricing.tsx', code2);
