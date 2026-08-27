import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Crown, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  Phone, 
  MessageSquare, 
  Search, 
  Filter, 
  Building2, 
  Plus, 
  ChevronRight,
  ShieldCheck,
  Send
} from 'lucide-react';
import { Business } from '../../types';
import { getBusinessVipStatus } from '../../lib/vipHelper';

interface AdminSubscriptionsOverviewProps {
  businesses: Business[];
  onOpenVipModal: (business: Business) => void;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export function AdminSubscriptionsOverview({
  businesses,
  onOpenVipModal,
  onShowToast
}: AdminSubscriptionsOverviewProps) {
  const [tierFilter, setTierFilter] = useState<'all' | 'gold' | 'silver' | 'bronze' | 'free'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Package prices in JOD
  const TIER_PRICES: Record<string, number> = {
    gold: 50,    // 50 JOD / month
    silver: 25,  // 25 JOD / month
    bronze: 10,  // 10 JOD / month
    free: 0
  };

  // Compute stats
  const stats = useMemo(() => {
    let goldCount = 0;
    let silverCount = 0;
    let bronzeCount = 0;
    let freeCount = 0;
    let totalMRR = 0;
    let expiringSoonCount = 0;

    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 3600 * 1000;

    businesses.forEach(b => {
      const vip = getBusinessVipStatus(b);
      if (vip.isVip) {
        if (vip.tier === 'gold') {
          goldCount++;
          totalMRR += TIER_PRICES.gold;
        } else if (vip.tier === 'silver') {
          silverCount++;
          totalMRR += TIER_PRICES.silver;
        } else if (vip.tier === 'bronze') {
          bronzeCount++;
          totalMRR += TIER_PRICES.bronze;
        } else {
          goldCount++;
          totalMRR += TIER_PRICES.gold;
        }

        if (vip.expiresAt && (vip.expiresAt - now < sevenDaysMs) && vip.expiresAt > now) {
          expiringSoonCount++;
        }
      } else {
        freeCount++;
      }
    });

    const totalVipCount = goldCount + silverCount + bronzeCount;

    return {
      goldCount,
      silverCount,
      bronzeCount,
      freeCount,
      totalVipCount,
      totalMRR,
      expiringSoonCount,
      totalARR: totalMRR * 12
    };
  }, [businesses]);

  // Filtered List
  const filteredSubscribers = useMemo(() => {
    return businesses.filter(b => {
      const vip = getBusinessVipStatus(b);
      if (tierFilter !== 'all') {
        if (tierFilter === 'free' && vip.isVip) return false;
        if (tierFilter !== 'free' && (!vip.isVip || vip.tier !== tierFilter)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = b.name?.toLowerCase().includes(q);
        const matchOwner = b.ownerName?.toLowerCase().includes(q);
        const matchPhone = b.phone?.includes(q);
        return matchName || matchOwner || matchPhone;
      }
      return true;
    });
  }, [businesses, tierFilter, searchQuery]);

  const handleSendWhatsappReminder = (b: Business) => {
    const vip = getBusinessVipStatus(b);
    const expDateStr = vip.expiresAt ? new Date(vip.expiresAt).toLocaleDateString('ar-JO') : 'قريباً';
    const message = `مرحباً بك صاحب محل "${b.name}" 🌸\nنود تذكيركم باشتراك الباقة الإعلانية المميزة (${vip.badgeLabel}) في منصة "شو في بإربد؟".\nتاريخ الانتهاء التقديري: ${expDateStr}.\nللتجديد والاستمرار بالظهور في صدارة النتائج يسعدنا تواصلكم معنا.`;
    
    let phone = b.phone?.replace(/[^0-9]/g, '') || '';
    if (phone.startsWith('07')) {
      phone = '962' + phone.substring(1);
    }
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    onShowToast(`تم فتح تطبيق الواتساب لإرسال تذكير التجديد لمحل ${b.name}`);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Title & Revenue Summary Cards */}
      <div className="bg-gradient-to-l from-emerald-950 via-[#1a4d2e] to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg border border-emerald-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-[#ff9f1c] font-bold">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">إحصائيات الإعلانات وأرباح الباقات</h2>
              <p className="text-xs text-emerald-200">تقرير الأداء المالي، أعداد الاشتراكات والتجديدات القادمة</p>
            </div>
          </div>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-1">
            <span className="text-[11px] font-bold text-emerald-200 block">العائد الشهري المتكرر (MRR)</span>
            <div className="text-2xl sm:text-3xl font-black font-sans text-[#ff9f1c]">
              {stats.totalMRR} <span className="text-xs font-normal">د.أ / شهر</span>
            </div>
            <span className="text-[10px] text-emerald-300 block">إجمالي أرباح الباقات المفعّلة</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-1">
            <span className="text-[11px] font-bold text-emerald-200 block">العائد السنوي التقديري (ARR)</span>
            <div className="text-2xl sm:text-3xl font-black font-sans text-white">
              {stats.totalARR} <span className="text-xs font-normal">د.أ / سنة</span>
            </div>
            <span className="text-[10px] text-emerald-300 block">تقدير الدخل السنوي الإجمالي</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-1">
            <span className="text-[11px] font-bold text-emerald-200 block">المحلات المميزة النشطة</span>
            <div className="text-2xl sm:text-3xl font-black font-sans text-white">
              {stats.totalVipCount} <span className="text-xs font-normal">محل</span>
            </div>
            <span className="text-[10px] text-emerald-300 block">من أصل {businesses.length} محل مسجّل</span>
          </div>

          <div className="bg-amber-500/20 backdrop-blur-md rounded-2xl p-4 border border-amber-400/30 space-y-1">
            <span className="text-[11px] font-bold text-amber-200 block">اشتركات قريبة من الانتهاء</span>
            <div className="text-2xl sm:text-3xl font-black font-sans text-amber-300">
              {stats.expiringSoonCount} <span className="text-xs font-normal">محل</span>
            </div>
            <span className="text-[10px] text-amber-200 block">تطلب التواصل والتجديد</span>
          </div>
        </div>
      </div>

      {/* Package Breakdown Distribution */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
              <Crown className="h-4 w-4 text-amber-600" />
              الباقة الذهبية (Gold VIP)
            </span>
            <span className="text-xs font-black text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-md">50 د.أ/شهر</span>
          </div>
          <div className="text-2xl font-black text-amber-950 font-sans">{stats.goldCount} <span className="text-xs text-amber-800">مشترك</span></div>
          <p className="text-[11px] text-amber-800 font-medium">إجمالي الإيراد: {stats.goldCount * 50} د.أ/شهرياً</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-slate-600" />
              الباقة الفضية (Silver VIP)
            </span>
            <span className="text-xs font-black text-slate-800 bg-slate-200/60 px-2 py-0.5 rounded-md">25 د.أ/شهر</span>
          </div>
          <div className="text-2xl font-black text-slate-950 font-sans">{stats.silverCount} <span className="text-xs text-slate-700">مشترك</span></div>
          <p className="text-[11px] text-slate-700 font-medium">إجمالي الإيراد: {stats.silverCount * 25} د.أ/شهرياً</p>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-3xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-stone-600" />
              الباقة البرونزية والمجانية
            </span>
            <span className="text-xs font-black text-stone-800 bg-stone-200/60 px-2 py-0.5 rounded-md">10 د.أ/شهر</span>
          </div>
          <div className="text-2xl font-black text-stone-950 font-sans">{stats.bronzeCount} <span className="text-xs text-stone-600">برونزي</span> | {stats.freeCount} <span className="text-xs text-stone-500">مجاني</span></div>
          <p className="text-[11px] text-stone-600 font-medium">فرص ترقية المحلات المجانية لزيادة الدخل</p>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <h3 className="font-black text-lg text-[#2d2a26]">جدول المحلات والاشتراكات التفصيلي</h3>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم المحل أو المالك..."
                className="bg-stone-50 text-stone-900 pr-9 pl-3 py-1.5 rounded-xl text-xs font-bold border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
            </div>

            <select
              value={tierFilter}
              onChange={e => setTierFilter(e.target.value as any)}
              className="bg-stone-50 border border-stone-200 text-stone-800 rounded-xl px-3 py-1.5 text-xs font-bold"
            >
              <option value="all">جميع المحلات (المميزة والمجانية)</option>
              <option value="gold">الباقة الذهبية (Gold VIP)</option>
              <option value="silver">الباقة الفضية (Silver VIP)</option>
              <option value="bronze">الباقة البرونزية (Bronze VIP)</option>
              <option value="free">المحلات المجانية فقط</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                <th className="p-3">المحل والمالك</th>
                <th className="p-3">الباقة الإعلانية</th>
                <th className="p-3">العائد الشهري</th>
                <th className="p-3">تاريخ الانتهاء</th>
                <th className="p-3">إجراءات الإدارة للتجديد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredSubscribers.map((b) => {
                const vip = getBusinessVipStatus(b);
                const price = vip.tier === 'gold' ? 50 : vip.tier === 'silver' ? 25 : vip.tier === 'bronze' ? 10 : 0;
                
                return (
                  <tr key={b.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="p-3">
                      <div className="font-black text-stone-900 text-sm">{b.name}</div>
                      <div className="text-stone-400 text-[11px]">{b.ownerName || 'مالك المحل'} • {b.phone || 'بدون هاتف'}</div>
                    </td>

                    <td className="p-3">
                      {vip.isVip ? (
                        <span className={`inline-flex items-center gap-1 font-black px-2.5 py-1 rounded-full border text-[11px] ${
                          vip.tier === 'gold' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                          vip.tier === 'silver' ? 'bg-slate-100 text-slate-800 border-slate-300' :
                          'bg-stone-100 text-stone-800 border-stone-300'
                        }`}>
                          <Crown className="h-3 w-3 text-amber-600" />
                          <span>{vip.badgeLabel}</span>
                        </span>
                      ) : (
                        <span className="text-stone-400 font-bold bg-stone-100 px-2 py-0.5 rounded-md text-[11px]">
                          باقة مجانية
                        </span>
                      )}
                    </td>

                    <td className="p-3 font-mono font-black text-stone-800">
                      {price} د.أ / شهر
                    </td>

                    <td className="p-3 text-stone-600 font-mono text-[11px]">
                      {vip.expiresAt ? new Date(vip.expiresAt).toLocaleDateString('ar-JO') : 'دائم / غير محدد'}
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onOpenVipModal(b)}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-xl font-black text-[11px] transition-colors cursor-pointer"
                        >
                          تعديل الباقة
                        </button>

                        {b.phone && (
                          <button
                            onClick={() => handleSendWhatsappReminder(b)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold text-[11px] transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>تذكير الواتساب</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
