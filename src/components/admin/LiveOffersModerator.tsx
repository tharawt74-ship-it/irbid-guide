import React, { useState, useMemo } from 'react';
import { 
  Tag, 
  Search, 
  Store, 
  Trash2, 
  AlertTriangle, 
  PauseCircle, 
  PlayCircle, 
  CheckCircle2, 
  Eye, 
  Percent, 
  Clock, 
  Calendar,
  Sparkles
} from 'lucide-react';
import { Business } from '../../types';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface LiveOffersModeratorProps {
  businesses: Business[];
  showToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  onRefreshData?: () => void;
}

export function LiveOffersModerator({
  businesses,
  showToast,
  onRefreshData
}: LiveOffersModeratorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState<'all' | 'active' | 'paused'>('all');
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Flatten all offers from businesses
  const allOffers = useMemo(() => {
    const list: any[] = [];
    businesses.forEach(b => {
      const bizOffers = (b as any).offers;
      if (Array.isArray(bizOffers) && bizOffers.length > 0) {
        bizOffers.forEach((off, idx) => {
          list.push({
            uniqueId: `${b.id}_${off.id || idx}`,
            businessId: b.id,
            businessName: b.name,
            businessCategory: b.category,
            businessPhone: b.phone || (b as any).ownerPhone,
            offerIndex: idx,
            ...off
          });
        });
      }
    });
    return list;
  }, [businesses]);

  // Filter offers
  const filteredOffers = useMemo(() => {
    return allOffers.filter(item => {
      const isPaused = item.isPaused === true || item.status === 'paused';
      if (filterState === 'active' && isPaused) return false;
      if (filterState === 'paused' && !isPaused) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (item.title || item.name || '').toLowerCase().includes(q);
        const matchDesc = (item.description || '').toLowerCase().includes(q);
        const matchStore = (item.businessName || '').toLowerCase().includes(q);
        return matchTitle || matchDesc || matchStore;
      }
      return true;
    });
  }, [allOffers, filterState, searchQuery]);

  // Toggle Offer Status (Pause / Resume)
  const handleToggleOfferPause = async (item: any) => {
    if (!db) return;
    const targetBiz = businesses.find(b => b.id === item.businessId);
    const bizOffers = targetBiz ? (targetBiz as any).offers : null;
    if (!targetBiz || !Array.isArray(bizOffers)) return;

    setActionInProgressId(item.uniqueId);
    try {
      const currentPaused = item.isPaused === true || item.status === 'paused';
      const updatedOffers = bizOffers.map((off, idx) => {
        if (idx === item.offerIndex || off.id === item.id) {
          return {
            ...off,
            isPaused: !currentPaused,
            status: !currentPaused ? 'paused' : 'active'
          };
        }
        return off;
      });

      await updateDoc(doc(db, 'businesses', item.businessId), {
        offers: updatedOffers
      });

      showToast(currentPaused ? 'تمت إعادة تفعيل العرض' : 'تم إيقاف العرض مؤقتاً لحماية الزوار');
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Error updating offer:', err);
      showToast('فشل تعديل حالة العرض', 'error');
    } finally {
      setActionInProgressId(null);
    }
  };

  // Permanently Delete Violating Offer
  const handleDeleteViolatingOffer = async (item: any) => {
    if (!db) return;
    if (!window.confirm(`هل أنت متأكد من حذف العرض (${item.title || item.name}) التابع لـ (${item.businessName}) نهائياً لمخالفته شروط المنصة؟`)) {
      return;
    }

    setActionInProgressId(item.uniqueId);
    try {
      const targetBiz = businesses.find(b => b.id === item.businessId);
      const bizOffers = targetBiz ? (targetBiz as any).offers : null;
      if (!targetBiz || !Array.isArray(bizOffers)) return;

      const updatedOffers = bizOffers.filter((_, idx) => idx !== item.offerIndex);

      await updateDoc(doc(db, 'businesses', item.businessId), {
        offers: updatedOffers
      });

      showToast('تم حذف العرض المخالف نهائياً من دليل المحل');
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Error deleting offer:', err);
      showToast('فشل حذف العرض', 'error');
    } finally {
      setActionInProgressId(null);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-amber-50 text-amber-700 font-bold">
              <Tag className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-black text-stone-900">مراقبة وإيقاف العروض المخالفة</h3>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            متابعة فورية للعروض المنشورة من قبل المحلات مع إمكانية إيقاف أو حذف أي عرض مضلل أو مخالف لسياسات المنصة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-2xl text-xs font-bold">
            {allOffers.length} عروض إجمالية
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم المحل أو عنوان العرض أو الوصف..."
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
          />
        </div>

        <select
          value={filterState}
          onChange={e => setFilterState(e.target.value as any)}
          className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none w-full sm:w-auto"
        >
          <option value="all">كافة العروض ({allOffers.length})</option>
          <option value="active">العروض النشطة والمباشرة</option>
          <option value="paused">العروض الموقوفة مؤقتاً</option>
        </select>
      </div>

      {/* Offers Table */}
      {filteredOffers.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center space-y-2">
          <Tag className="h-10 w-10 text-stone-300 mx-auto" />
          <h4 className="text-sm font-black text-stone-700">لا توجد عروض مطابقة للبحث</h4>
          <p className="text-xs text-stone-400">كافة عروض المحلات تظهر هنا تلقائياً عند قيام التجار بإضافتها</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-black">
                <tr>
                  <th className="p-4">العرض والخصم</th>
                  <th className="p-4">اسم المحل</th>
                  <th className="p-4">التفاصيل والوصف</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-center">إجراءات الرقابة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOffers.map(item => {
                  const isPaused = item.isPaused === true || item.status === 'paused';
                  const inProgress = actionInProgressId === item.uniqueId;

                  return (
                    <tr key={item.uniqueId} className={`hover:bg-stone-50 transition-colors ${isPaused ? 'bg-amber-50/20 opacity-75' : ''}`}>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="font-black text-stone-900 flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5 text-[#1a4d2e]" />
                            <span>{item.title || item.name || 'عرض ترويجي'}</span>
                          </div>
                          {item.discount && (
                            <span className="inline-block bg-red-50 text-red-700 border border-red-200 text-[10px] font-black px-2 py-0.5 rounded-lg">
                              خصم {item.discount}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-stone-800 flex items-center gap-1">
                          <Store className="h-3.5 w-3.5 text-stone-400" />
                          <span>{item.businessName}</span>
                        </div>
                        <div className="text-[10px] text-stone-400">{item.businessCategory}</div>
                      </td>

                      <td className="p-4 max-w-xs">
                        <p className="text-stone-600 line-clamp-2 leading-relaxed text-[11px]">
                          {item.description || 'لا يوجد وصف تفصيلي'}
                        </p>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        {isPaused ? (
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-1 rounded-full">
                            موقوف للإشراف
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-1 rounded-full">
                            نشط ومباشر
                          </span>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleToggleOfferPause(item)}
                            disabled={inProgress}
                            className={`p-1.5 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1 ${
                              isPaused
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            }`}
                            title={isPaused ? 'إعادة التفعيل' : 'إيقاف مؤقت'}
                          >
                            {isPaused ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
                            <span className="hidden md:inline">{isPaused ? 'إعادة التفعيل' : 'إيقاف'}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteViolatingOffer(item)}
                            disabled={inProgress}
                            className="p-1.5 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors flex items-center gap-1"
                            title="حذف العرض المخالف نهائياً"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="hidden md:inline">حذف</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
