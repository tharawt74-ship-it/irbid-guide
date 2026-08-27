const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(/import \{ AdminDashboard \} from '\.\/pages\/AdminDashboard';/, `import { AdminDashboard } from './pages/AdminDashboard';\nimport { Profile } from './pages/Profile';`);
code = code.replace(/<Route path="admin" element=\{<AdminDashboard \/>\} \/>/, `<Route path="admin" element={<AdminDashboard />} />\n            <Route path="profile" element={<Profile />} />`);
fs.writeFileSync('src/App.tsx', code);
