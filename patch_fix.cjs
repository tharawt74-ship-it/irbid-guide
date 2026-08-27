const fs = require('fs');
let code = fs.readFileSync('src/pages/BusinessDetail.tsx', 'utf-8');

code = code.replace(/<div className="p-6 md:p-10 bg-white">[\s\S]*?\{currentUser \? \(/, `<div className="p-6 md:p-10 bg-white">
              {activeTab === 'about' && (
                <>
                  <div className="prose prose-neutral max-w-none text-stone-600 mb-10 text-lg leading-relaxed">
                    <p>{business.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4 text-[#2d2a26] bg-[#fdfcfb] border border-[#e5e1da] p-5 rounded-2xl group hover:border-[#1a4d2e]/30 transition-colors">
                      <div className="bg-[#1a4d2e]/10 p-3 rounded-xl group-hover:bg-[#1a4d2e] group-hover:text-white transition-colors text-[#1a4d2e]">
                        <MapPin className="h-6 w-6" />
                      </div>
                      <span className="font-medium text-lg">{business.address}</span>
                    </div>
                    {business.phone && (
                      <div className="flex items-center gap-4 text-[#2d2a26] bg-[#fdfcfb] border border-[#e5e1da] p-5 rounded-2xl group hover:border-[#1a4d2e]/30 transition-colors">
                        <div className="bg-[#1a4d2e]/10 p-3 rounded-xl group-hover:bg-[#1a4d2e] group-hover:text-white transition-colors text-[#1a4d2e]">
                          <Phone className="h-6 w-6" />
                        </div>
                        <span dir="ltr" className="font-bold text-xl">{business.phone}</span>
                      </div>
                    )}
                  </div>
                </>
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
          
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-6">
              <MessageSquare className="h-6 w-6 text-stone-800" />
              <h2 className="text-2xl font-bold text-stone-900">التقييمات والآراء</h2>
            </div>
            
            {currentUser ? (`);

fs.writeFileSync('src/pages/BusinessDetail.tsx', code);
