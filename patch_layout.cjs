const fs = require('fs');
let code = fs.readFileSync('src/components/layout/Layout.tsx', 'utf-8');

// Desktop link
code = code.replace(/<span className="text-sm text-stone-600 hidden sm:inline-block font-bold">\n                \{currentUser\.displayName\?\.split\(' '\)\[0\] \|\| currentUser\.email\?\.split\('@'\)\[0\]\}\n              <\/span>/, `<Link to="/profile" className="text-sm text-stone-600 hover:text-[#1a4d2e] hidden sm:inline-block font-bold transition-colors">
                {currentUser.displayName?.split(' ')[0] || currentUser.email?.split('@')[0]}
              </Link>`);

// Mobile menu link
code = code.replace(/<div className="text-stone-600 font-bold p-3 bg-stone-50 rounded-xl text-center">\n                  أهلاً بك، \{currentUser\.displayName \|\| currentUser\.email\?\.split\('@'\)\[0\]\}\n                <\/div>/, `<Link to="/profile" onClick={closeMenu} className="block text-stone-600 hover:bg-stone-100 font-bold p-3 bg-stone-50 rounded-xl text-center transition-colors">
                  أهلاً بك، {currentUser.displayName || currentUser.email?.split('@')[0]} (الملف الشخصي)
                </Link>`);

fs.writeFileSync('src/components/layout/Layout.tsx', code);
