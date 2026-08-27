const fs = require('fs');
let code = fs.readFileSync('src/pages/Contact.tsx', 'utf-8');
code = code.replace(/import \{ Link \} from 'react-router';/, `import { Link } from 'react-router';\nimport { useAuth } from '../contexts/AuthContext';`);
code = code.replace(/export function Contact\(\) \{/, `export function Contact() {\n  const { currentUser } = useAuth();`);
code = code.replace(/await addDoc\(collection\(db, 'businessRequests'\), \{/, `await addDoc(collection(db, 'businessRequests'), {\n        userId: currentUser?.uid || null,`);
fs.writeFileSync('src/pages/Contact.tsx', code);
