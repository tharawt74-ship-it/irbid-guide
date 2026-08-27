const fs = require('fs');
let code = fs.readFileSync('src/pages/Profile.tsx', 'utf-8');

code = code.replace(/const q = query\(collection\(db, 'businesses'\), where\('userId', '==', currentUser\.uid\)\);\n        const snapshot = await getDocs\(q\);\n        const userBusinesses: Business\[\] = \[\];\n        snapshot\.forEach\(doc => \{\n          userBusinesses\.push\(\{ id: doc\.id, \.\.\.doc\.data\(\) \} as Business\);\n        \}\);/, `let userBusinesses: Business[] = [];
        if (isAdmin) {
          const snapshot = await getDocs(collection(db, 'businesses'));
          snapshot.forEach(doc => {
            const data = doc.data();
            if (data.userId === currentUser.uid || data.ownerName === currentUser.displayName) {
              userBusinesses.push({ id: doc.id, ...data } as Business);
            }
          });
        } else {
          const q = query(collection(db, 'businesses'), where('userId', '==', currentUser.uid));
          const snapshot = await getDocs(q);
          snapshot.forEach(doc => {
            userBusinesses.push({ id: doc.id, ...doc.data() } as Business);
          });
        }`);

fs.writeFileSync('src/pages/Profile.tsx', code);
