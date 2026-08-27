const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf-8');
code = code.replace(/createdAt: number;/, `createdAt: number;\n  userId?: string;\n  ownerName?: string;`);
fs.writeFileSync('src/types.ts', code);
