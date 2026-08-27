const fs = require('fs');
let code = fs.readFileSync('src/pages/BusinessDetail.tsx', 'utf-8');

code = code.replace(/const \[submittingReview, setSubmittingReview\] = useState\(false\);/, `const [submittingReview, setSubmittingReview] = useState(false);
  const [activeTab, setActiveTab] = useState('about');`);

code = code.replace(/<div className="grid grid-cols-1 md:grid-cols-2 gap-4">/, `{activeTab === 'about' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">`);

code = code.replace(/<\/div>\n            <\/div>\n          <\/div>\n          <div className="space-y-6">/, `</div>
              )}
              {activeTab === 'menu' && (
                <div className="py-8 text-center bg-[#fdfcfb] rounded-2xl border border-[#e5e1da]">
                  <h3 className="text-xl font-bold text-stone-700 mb-2">المنيو الرقمي</h3>
                  <p className="text-stone-500">قريباً.. سيتمكن صاحب المطعم من إضافة المنيو هنا.</p>
                </div>
              )}
              {activeTab === 'specs' && (
                <div className="py-8 text-center bg-[#fdfcfb] rounded-2xl border border-[#e5e1da]">
                  <h3 className="text-xl font-bold text-stone-700 mb-2">مواصفات السكن</h3>
                  <p className="text-stone-500">قريباً.. سيتم عرض عدد الغرف، السعر، والتأمين هنا.</p>
                </div>
              )}
              {activeTab === 'products' && (
                <div className="py-8 text-center bg-[#fdfcfb] rounded-2xl border border-[#e5e1da]">
                  <h3 className="text-xl font-bold text-stone-700 mb-2">أبرز المنتجات</h3>
                  <p className="text-stone-500">قريباً.. سيتم عرض قائمة بأهم المنتجات وأسعارها.</p>
                </div>
              )}
              {activeTab === 'images' && (
                <div className="py-8 text-center bg-[#fdfcfb] rounded-2xl border border-[#e5e1da]">
                  <h3 className="text-xl font-bold text-stone-700 mb-2">معرض الصور</h3>
                  <p className="text-stone-500">قريباً.. صور إضافية للمكان.</p>
                </div>
              )}
              {activeTab === 'offers' && (
                <div className="py-8 text-center bg-red-50 rounded-2xl border border-red-100">
                  <h3 className="text-xl font-bold text-red-700 mb-2">عروض نشطة</h3>
                  <p className="text-red-500">لا يوجد عروض نشطة حالياً لهذا المحل.</p>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-6">`);

code = code.replace(/<div className="p-6 md:p-10 bg-white">/, `<div className="border-b border-[#e5e1da] px-6 md:px-10 flex overflow-x-auto gap-6 hide-scrollbar">
              <button 
                onClick={() => setActiveTab('about')}
                className={\`py-4 font-bold border-b-2 whitespace-nowrap transition-colors \${activeTab === 'about' ? 'border-[#1a4d2e] text-[#1a4d2e]' : 'border-transparent text-stone-500 hover:text-[#2d2a26]'}\`}
              >
                تفاصيل المكان
              </button>
              {(business.category.includes('مطاعم') || business.category.includes('مقاهي') || business.category.includes('مشروبات') || business.category.includes('حلويات')) && (
                <button 
                  onClick={() => setActiveTab('menu')}
                  className={\`py-4 font-bold border-b-2 whitespace-nowrap transition-colors \${activeTab === 'menu' ? 'border-[#1a4d2e] text-[#1a4d2e]' : 'border-transparent text-stone-500 hover:text-[#2d2a26]'}\`}
                >
                  المنيو الرقمي
                </button>
              )}
              {(business.category.includes('سكنات') || business.category.includes('شقق') || business.category.includes('عقارات')) && (
                <button 
                  onClick={() => setActiveTab('specs')}
                  className={\`py-4 font-bold border-b-2 whitespace-nowrap transition-colors \${activeTab === 'specs' ? 'border-[#1a4d2e] text-[#1a4d2e]' : 'border-transparent text-stone-500 hover:text-[#2d2a26]'}\`}
                >
                  مواصفات السكن
                </button>
              )}
              {(!business.category.includes('مطاعم') && !business.category.includes('مقاهي') && !business.category.includes('سكنات') && !business.category.includes('شقق') && !business.category.includes('مشروبات') && !business.category.includes('حلويات')) && (
                <button 
                  onClick={() => setActiveTab('products')}
                  className={\`py-4 font-bold border-b-2 whitespace-nowrap transition-colors \${activeTab === 'products' ? 'border-[#1a4d2e] text-[#1a4d2e]' : 'border-transparent text-stone-500 hover:text-[#2d2a26]'}\`}
                >
                  أبرز المنتجات
                </button>
              )}
              <button 
                onClick={() => setActiveTab('images')}
                className={\`py-4 font-bold border-b-2 whitespace-nowrap transition-colors \${activeTab === 'images' ? 'border-[#1a4d2e] text-[#1a4d2e]' : 'border-transparent text-stone-500 hover:text-[#2d2a26]'}\`}
              >
                الصور
              </button>
              <button 
                onClick={() => setActiveTab('offers')}
                className={\`py-4 font-bold border-b-2 whitespace-nowrap transition-colors \${activeTab === 'offers' ? 'border-red-500 text-red-600' : 'border-transparent text-red-400 hover:text-red-500'}\`}
              >
                العروض النشطة
              </button>
            </div>
            
            <div className="p-6 md:p-10 bg-white">`);

fs.writeFileSync('src/pages/BusinessDetail.tsx', code);
