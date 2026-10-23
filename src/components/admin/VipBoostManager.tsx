import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  TrendingUp, 
  Search, 
  Calendar, 
  ShieldAlert, 
  Clock, 
  CheckCircle, 
  Sliders, 
  Star, 
  Sparkles 
} from 'lucide-react';

interface VipBoostManagerProps {
  showToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export function VipBoostManager({ showToast }: VipBoostManagerProps) {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'boosted' | 'vip'>('all');
  
  // Selection / Edit State
  const [selectedBiz, setSelectedBiz] = useState<any | null>(null);
  const [boostWeight, setBoostWeight] = useState<number>(3); // Default 3x priority
  const [boostDurationDays, setBoostDurationDays] = useState<number>(30); // Default 30 days
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      if (!db) return;
      const q = query(
        collection(db, 'businesses'),
        orderBy('name', 'asc'),
        limit(100)
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBusinesses(docs);
    } catch (error) {
      console.error('Error fetching businesses for boost manager:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyBoost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBiz || !db) return;

    try {
      setSaving(true);
      const docRef = doc(db, 'businesses', selectedBiz.id);
      
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + boostDurationDays);

      const updateData = {
        searchBoostActive: true,
        searchBoostWeight: boostWeight,
        searchBoostExpiry: expiryDate.toISOString(),
        isVip: true, // Auto-escalate to VIP structure if boosted
        searchBoostStartDate: new Date().toISOString()
      };

      await updateDoc(docRef, updateData);
      
      showToast(`تم تفعيل صدارة البحث بنسبة ${boostWeight}x بنجاح للمحل`, 'success');
      setSelectedBiz(null);
      fetchBusinesses();
    } catch (error) {
      console.error('Error updating boost state:', error);
      showToast('حدث خطأ أثناء حفظ الإعدادات', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelBoost = async (bizId: string) => {
    if (!db) return;
    try {
      const docRef = doc(db, 'businesses', bizId);
      await updateDoc(docRef, {
        searchBoostActive: false,
        searchBoostWeight: 1,
        searchBoostExpiry: null
      });
      showToast('تم إلغاء صدارة البحث وتنشيط الوضع العادي', 'info');
      fetchBusinesses();
    } catch (error) {
      console.error('Error canceling boost:', error);
      showToast('حدث خطأ أثناء إلغاء التعزيز', 'error');
    }
  };

  const filteredBusinesses = businesses.filter(biz => {
    const matchesSearch = biz.name?.toLowerCase().includes(searchTerm.toLowerCase());
    if (filterType === 'boosted') {
      return matchesSearch && biz.searchBoostActive;
    }
    if (filterType === 'vip') {
      return matchesSearch && biz.isVip;
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Overview stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-stone-200/60 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-400">إجمالي المحلات المعززة حالياً</h4>
            <p className="text-xl font-black text-stone-800">
              {businesses.filter(b => b.searchBoostActive).length} منشأة
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200/60 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
            <Star className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-400">الترقيات النشطة لأول مرة</h4>
            <p className="text-xl font-black text-stone-800">
              {businesses.filter(b => b.isVip && !b.searchBoostActive).length} منشأة
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200/60 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-400">المعاملات التي تحتاج متابعة</h4>
            <p className="text-xl font-black text-stone-800">نشط وتلقائي</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main interactive controls */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-stone-200/60 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-black text-base text-stone-800">إدارة صدارة ترتيب البحث والدعم الترحيبي</h3>
              <p className="text-xs text-stone-400">التحكم في قوة ونطاق ظهور المنشآت المتميزة والمحلات في واجهة نتائج البحث</p>
            </div>
            
            <div className="flex items-center gap-1.5 bg-stone-50 p-1 rounded-xl border border-stone-200/50">
              <button 
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterType === 'all' ? 'bg-white text-stone-800 shadow-3xs border border-stone-200/50' : 'text-stone-500 hover:text-stone-800'}`}
              >
                الكل
              </button>
              <button 
                onClick={() => setFilterType('boosted')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterType === 'boosted' ? 'bg-white text-stone-800 shadow-3xs border border-stone-200/50' : 'text-stone-500 hover:text-stone-800'}`}
              >
                المدعومة صدارتها
              </button>
              <button 
                onClick={() => setFilterType('vip')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterType === 'vip' ? 'bg-white text-stone-800 shadow-3xs border border-stone-200/50' : 'text-stone-500 hover:text-stone-800'}`}
              >
                الأعضاء VIP
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="البحث باسم المحل لتنشيط خوارزميات الدعم الصداري..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
            />
          </div>

          {loading ? (
            <div className="py-12 text-center text-stone-400 font-bold">جاري تحميل بيانات المنشآت...</div>
          ) : filteredBusinesses.length === 0 ? (
            <div className="py-12 text-center text-stone-400 font-bold">لا توجد منشآت مطابقة للخيارات المحددة</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-stone-100 text-stone-400 font-bold">
                    <th className="py-3 px-2">اسم المنشأة</th>
                    <th className="py-3 px-2">الحالة</th>
                    <th className="py-3 px-2">وزن الظهور بالبحث</th>
                    <th className="py-3 px-2">صلاحية الخدمة (البدء / الانتهاء)</th>
                    <th className="py-3 px-2 text-left">التحكم والعمليات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-bold text-stone-700">
                  {filteredBusinesses.map(biz => (
                    <tr key={biz.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="py-3.5 px-2">
                        <div className="font-black text-stone-800">{biz.name}</div>
                        <div className="text-[10px] text-stone-400">{biz.category}</div>
                      </td>
                      <td className="py-3.5 px-2">
                        {biz.searchBoostActive ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px]">
                            <TrendingUp className="h-3 w-3" />
                            <span>صدارة نشطة</span>
                          </span>
                        ) : biz.isVip ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full text-[10px]">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span>عضو VIP عادي</span>
                          </span>
                        ) : (
                          <span className="text-stone-400">مجاني عادي</span>
                        )}
                      </td>
                      <td className="py-3.5 px-2 font-mono">
                        {biz.searchBoostActive ? (
                          <span className="text-emerald-600 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded-md text-[11px]">
                            {biz.searchBoostWeight || 3}x صدارة
                          </span>
                        ) : (
                          <span className="text-stone-400">1x طبيعي</span>
                        )}
                      </td>
                      <td className="py-3.5 px-2 text-stone-500 text-[11px] font-mono leading-normal">
                        {biz.searchBoostActive || biz.isVip ? (
                          <div className="space-y-0.5">
                            <div className="text-emerald-700">
                              <span className="text-[9px] font-bold text-stone-400">البدء: </span>
                              {biz.searchBoostStartDate ? new Date(biz.searchBoostStartDate).toLocaleDateString('ar-JO') : 
                               biz.vipStartDate ? new Date(biz.vipStartDate).toLocaleDateString('ar-JO') : 
                               biz.createdAt ? new Date(biz.createdAt).toLocaleDateString('ar-JO') : '-'}
                            </div>
                            <div className="text-rose-600">
                              <span className="text-[9px] font-bold text-stone-400">الانتهاء: </span>
                              {biz.searchBoostExpiry ? (
                                new Date(biz.searchBoostExpiry) > new Date() ? (
                                  new Date(biz.searchBoostExpiry).toLocaleDateString('ar-JO')
                                ) : (
                                  <span className="text-rose-600 font-bold">منتهي</span>
                                )
                              ) : biz.vipSubscriptionExpiresAt ? (
                                new Date(biz.vipSubscriptionExpiresAt) > new Date() ? (
                                  new Date(biz.vipSubscriptionExpiresAt).toLocaleDateString('ar-JO')
                                ) : (
                                  <span className="text-rose-600 font-bold">منتهي</span>
                                )
                              ) : (
                                <span className="text-stone-400 font-bold">تلقائي ومستمر</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-stone-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-2 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedBiz(biz)}
                            className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-colors"
                          >
                            تحديث التعزيز
                          </button>
                          {biz.searchBoostActive && (
                            <button
                              onClick={() => handleCancelBoost(biz.id)}
                              className="bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1.5 rounded-lg text-[11px] transition-colors"
                              title="إلغاء وضع الصدارة الفائقة"
                            >
                              إلغاء
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Floating Side Action Card */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200/60 shadow-xs h-fit space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-black text-base text-stone-800">لوحة ضبط صدارة المحل</h3>
            <p className="text-xs text-stone-400">اختر محلاً من القائمة الجانبية لتنشيط معالج الدعم الصداري المتقدم</p>
          </div>

          {selectedBiz ? (
            <form onSubmit={handleApplyBoost} className="space-y-4 text-xs font-bold">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/50">
                <span className="text-[10px] text-stone-400 block mb-0.5">المحل المحدد حالياً</span>
                <span className="text-sm font-black text-stone-800 block truncate">{selectedBiz.name}</span>
                <span className="text-[11px] text-stone-500 block mt-0.5">{selectedBiz.category}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-stone-600 block">قوة ومضاعف الصدارة بالبحث</label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 3, 4, 5].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setBoostWeight(val)}
                      className={`py-2 border rounded-xl text-center font-mono font-black text-sm transition-all ${
                        boostWeight === val
                          ? 'bg-[#1a4d2e] border-[#1a4d2e] text-white shadow-3xs'
                          : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      {val}x
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-stone-400 block mt-1 leading-relaxed">
                  يحدد هذا المعامل مدى أولوية ظهور المحل في صدارة النتائج عند قيام الزوار بالبحث
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-stone-600 block">فترة الصلاحية المجانية</label>
                <select
                  value={boostDurationDays}
                  onChange={e => setBoostDurationDays(Number(e.target.value))}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                >
                  <option value={15}>15 يوماً (دعم ترحيبي مبسط)</option>
                  <option value={30}>30 يوماً (دعم ترحيبي قياسي)</option>
                  <option value={60}>60 يوماً (دعم شركاء المنصة)</option>
                  <option value={90}>90 يوماً (مستوى مميز فائق)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#1a4d2e] hover:bg-[#133b22] text-white py-2.5 rounded-xl font-black transition-colors text-center disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'جاري الحفظ والتعميم...' : 'تنشيط الصدارة المجانية'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBiz(null)}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-600 px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          ) : (
            <div className="py-12 text-center text-stone-400 border border-dashed border-stone-200 rounded-2xl">
              <Sliders className="h-8 w-8 mx-auto mb-2 text-stone-300" />
              <p className="text-xs">يرجى تحديد منشأة من القائمة لعرض أدوات التحكم وتعيين مستويات البحث</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
