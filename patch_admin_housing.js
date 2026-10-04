const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminDashboard.tsx', 'utf8');

// Add states for editing housing prices
if (!code.includes('isEditingHousingPrices')) {
  code = code.replace(
    'const [isEditingPrices, setIsEditingPrices] = useState(false);',
    'const [isEditingPrices, setIsEditingPrices] = useState(false);\n  const [isEditingHousingPrices, setIsEditingHousingPrices] = useState(false);'
  );
}

// Add the UI
const housingPricingUI = `
          {/* Housing Pricing Editor */}
          <div className="bg-white p-6 rounded-3xl border border-[#e5e1da] shadow-xs mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-stone-900">أسعار إعلانات السكنات والعقارات</h3>
                <p className="text-xs text-stone-500 mt-1">تعديل أسعار إضافة مدة للإعلان وتمييز الإعلان</p>
              </div>
              {!isEditingHousingPrices ? (
                <button
                  onClick={() => {
                    setEditPricesData(appConfigState || {});
                    setIsEditingHousingPrices(true);
                  }}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                  تعديل الأسعار
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditingHousingPrices(false)}
                    className="bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await setAppConfig(editPricesData);
                        setAppConfigState(editPricesData);
                        setIsEditingHousingPrices(false);
                        showToast('تم حفظ أسعار العقارات بنجاح');
                      } catch (err) {
                        showToast('حدث خطأ أثناء حفظ الأسعار', 'error');
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                  >
                    حفظ التغييرات
                  </button>
                </div>
              )}
            </div>

            {!isEditingHousingPrices ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
                  <div className="text-[10px] font-bold text-stone-500 mb-1">تمديد الإعلان لأسبوع إضافي</div>
                  <div className="text-sm font-black text-[#1a4d2e]">{appConfigState?.priceHousingExtraWeek ?? 2} د.أ</div>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/60">
                  <div className="text-[10px] font-bold text-stone-500 mb-1">تمييز وتثبيت الإعلان (لكل 3 أيام)</div>
                  <div className="text-sm font-black text-[#1a4d2e]">{appConfigState?.priceHousingFeatured3Days ?? 1} د.أ</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-500">تمديد الإعلان لأسبوع إضافي (د.أ)</label>
                  <input
                    type="number"
                    value={editPricesData.priceHousingExtraWeek || 2}
                    onChange={(e) => setEditPricesData({ ...editPricesData, priceHousingExtraWeek: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-500">تمييز وتثبيت الإعلان (لكل 3 أيام) (د.أ)</label>
                  <input
                    type="number"
                    value={editPricesData.priceHousingFeatured3Days || 1}
                    onChange={(e) => setEditPricesData({ ...editPricesData, priceHousingFeatured3Days: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                  />
                </div>
              </div>
            )}
          </div>
`;

if (!code.includes('isEditingHousingPrices ?')) {
  code = code.replace(
    '{/* Quick Counter Cards */}',
    housingPricingUI + '\n          {/* Quick Counter Cards */}'
  );
}

fs.writeFileSync('src/pages/AdminDashboard.tsx', code);
