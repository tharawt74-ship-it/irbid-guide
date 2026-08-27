const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf-8');

code = code.replace(/const \[categoryFilter, setCategoryFilter\] = useState\(''\);/, `const [categoryFilter, setCategoryFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');`);

code = code.replace(/import { MapPin, Star, Search, Store } from 'lucide-react';/, `import { MapPin, Star, Search, Store, Filter } from 'lucide-react';`);

code = code.replace(/const filteredBusinesses = businesses\.filter\(b => \{([\s\S]*?)return matchesSearch && matchesCategory;\n  \}\);/, `const filteredBusinesses = businesses.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter ? b.category === categoryFilter : true;
    const matchesRegion = regionFilter ? b.address.includes(regionFilter) : true;
    const matchesRating = ratingFilter ? (b.rating || 0) >= parseFloat(ratingFilter) : true;
    return matchesSearch && matchesCategory && matchesRegion && matchesRating;
  });`);

code = code.replace(/<div className="relative w-full max-w-2xl mx-auto">([\s\S]*?)<\/div>\n        <\/div>\n      <\/div>/, `<div className="relative w-full max-w-2xl mx-auto mb-4">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 h-5 w-5" />
            <input 
              type="text"
              className="w-full bg-white border border-[#e5e1da] rounded-full py-4 pr-12 pl-12 text-[#2d2a26] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:border-[#1a4d2e] shadow-sm transition-all"
              placeholder="عن ماذا تبحث اليوم؟ (مثال: شاورما، ملابس، صيدلية)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-full p-1.5 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3 max-w-3xl mx-auto">
            <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-full border border-[#e5e1da] shadow-sm">
              <MapPin className="h-4 w-4 text-stone-500" />
              <select 
                className="bg-transparent border-none text-sm font-bold text-stone-700 focus:outline-none focus:ring-0 cursor-pointer"
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
              >
                <option value="">كل المناطق</option>
                <option value="شارع الجامعة">شارع الجامعة</option>
                <option value="شارع الهاشمي">شارع الهاشمي</option>
                <option value="الحي الشرقي">الحي الشرقي</option>
                <option value="الحي الجنوبي">الحي الجنوبي</option>
                <option value="إيدون">إيدون</option>
                <option value="الحصن">الحصن</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-full border border-[#e5e1da] shadow-sm">
              <Star className="h-4 w-4 text-stone-500" />
              <select 
                className="bg-transparent border-none text-sm font-bold text-stone-700 focus:outline-none focus:ring-0 cursor-pointer"
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
              >
                <option value="">كل التقييمات</option>
                <option value="4">4 نجوم فما فوق</option>
                <option value="4.5">4.5 نجوم فما فوق</option>
              </select>
            </div>
          </div>
        </div>
      </div>`);

fs.writeFileSync('src/pages/Home.tsx', code);
