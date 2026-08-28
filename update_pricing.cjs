const fs = require('fs');

let code = fs.readFileSync('src/pages/Pricing.tsx', 'utf8');

code = code.replace(
  /<div className="flex items-baseline gap-1 text-\[#2d2a26\]">\s*<span className="text-4xl font-black">\{plan\.price\}<\/span>\s*<span className="text-lg font-bold">د\.أ<\/span>\s*<span className="text-sm font-medium text-stone-500 mr-1">\/ \{plan\.period\}<\/span>\s*<\/div>/g,
  `{plan.id === 'basic' ? (
                <div className="flex items-baseline gap-1 text-[#2d2a26]">
                  <span className="text-4xl font-black">مجاناً</span>
                </div>
              ) : plan.id === 'on-demand' || plan.price === 0 ? (
                <div className="flex items-baseline gap-1 text-[#2d2a26]">
                  <span className="text-3xl font-black">حسب الطلب</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1 text-[#2d2a26]">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className="text-lg font-bold">د.أ</span>
                  <span className="text-sm font-medium text-stone-500 mr-1">/ {plan.period}</span>
                </div>
              )}`
);

fs.writeFileSync('src/pages/Pricing.tsx', code);
