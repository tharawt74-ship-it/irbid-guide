const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf-8');
code = code.replace(/const newBusiness = \{[\s\S]*?createdAt: Date\.now\(\)\n      \};/, `const newBusiness = {
        name: request.name || '',
        category: request.category || '',
        description: request.description || '',
        address: request.address || '',
        phone: request.phone || '',
        userId: request.userId || null,
        ownerName: request.ownerName || '',
        rating: 0,
        reviewCount: 0,
        createdAt: Date.now()
      };`);
fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
