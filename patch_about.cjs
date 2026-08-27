const fs = require('fs');
let code = fs.readFileSync('src/pages/BusinessDetail.tsx', 'utf-8');

code = code.replace(/<div className="p-6 md:p-10 bg-white">\s*<div className="prose prose-neutral max-w-none text-stone-600 mb-10 text-lg leading-relaxed">\s*<p>\{business\.description\}<\/p>\s*<\/div>\s*\{activeTab === 'about' && \(\s*<div className="grid grid-cols-1 md:grid-cols-2 gap-4">/, `<div className="p-6 md:p-10 bg-white">
              {activeTab === 'about' && (
                <>
                  <div className="prose prose-neutral max-w-none text-stone-600 mb-10 text-lg leading-relaxed">
                    <p>{business.description}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">`);

code = code.replace(/<\/span>\n                  <\/div>\n                \)}\n              <\/div>\n              \)}\n              \{activeTab === 'menu' && \(/, `</span>
                  </div>
                )}
              </div>
              </>
              )}
              {activeTab === 'menu' && (`);

fs.writeFileSync('src/pages/BusinessDetail.tsx', code);
