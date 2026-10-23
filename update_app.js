const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const imports = `import { Terms } from './pages/Terms';\nimport { Privacy } from './pages/Privacy';\nimport { AboutUs } from './pages/AboutUs';\n`;

code = code.replace(/import { NotFound } from '\.\/pages\/NotFound';/, `import { NotFound } from './pages/NotFound';\n${imports}`);

const routes = `<Route path="/terms" element={<Terms />} />\n                <Route path="/privacy" element={<Privacy />} />\n                <Route path="/about" element={<AboutUs />} />\n`;

code = code.replace(/<Route path="\*" element={<NotFound \/>} \/>/, `${routes}                <Route path="*" element={<NotFound />} />`);

fs.writeFileSync('src/App.tsx', code);
