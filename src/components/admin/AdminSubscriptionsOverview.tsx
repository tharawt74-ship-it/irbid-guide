import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Crown, 
  Search, 
  Building2, 
  MessageSquare, 
  HelpCircle
} from 'lucide-react';
import { Business } from '../../types';
import { getBusinessVipStatus } from '../../lib/vipHelper';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';

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
  const { vipPlans } = useSystemSettings();
  const [tierFilter, setTierFilter] = useState<'all' | 'golden' | 'basic' | 'pay_per_use'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Get dynamic Golden package price from Firestore settings (default 29)
  const goldenPlan = vipPlans.find(p => p.id === 'golden');
  const goldenPrice = goldenPlan ? goldenPlan.price : 29;

  // Compute stats dynamically from real businesses
  const stats = useMemo(() => {
    let goldenCount = 0;
    let basicCount = 0;
    let payPerUseCount = 0;
    let totalMRR = 0;
    let expiringSoonCount = 0;

    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 3600 * 1000;

    businesses.forEach(b => {
      const vip = getBusinessVipStatus(b);
      const plan = b.packagePlan || (vip.isVip ? 'golden' : 'basic');

      if (plan === 'golden' || vip.isVip) {
        goldenCount++;
        totalMRR += goldenPrice;

        if (vip.expiresAt && (vip.expiresAt - now < sevenDaysMs) && vip.expiresAt > now) {
          expiringSoonCount++;
        }
      } else if (plan === 'pay_per_use') {
        payPerUseCount++;
      } else {
        basicCount++;
      }
    });

    return {
      goldenCount,
      basicCount,
      payPerUseCount,
      totalVipCount: goldenCount,
      totalMRR,
      expiringSoonCount,
      totalARR: totalMRR * 12
    };
  }, [businesses, goldenPrice]);

  // Filtered List
  const filteredSubscribers = useMemo(() => {
    return businesses.filter(b => {
      const vip = getBusinessVipStatus(b);
      const plan = b.packagePlan || (vip.isVip ? 'golden' : 'basic');

      if (tierFilter !== 'all') {
        if (tierFilter === 'golden' && !vip.isVip && plan !== 'golden') return false;
        if (tierFilter === 'basic' && plan !== 'basic') return false;
        if (tierFilter === 'pay_per_use' && plan !== 'pay_per_use') return false;
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
              <p className="text-xs text-emerald-200">تقرير الأداء المالي، أعداد الاشتراكات والتجديدات القادمة بناءً على قاعدة البيانات</p>
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
            <span className="text-[10px] text-emerald-300 block">إجمالي أرباح الباقات الذهبية المفعّلة</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-1">
            <span className="text-[11px] font-bold text-emerald-200 block">العائد السنوي التقديري (ARR)</span>
            <div className="text-2xl sm:text-3xl font-black font-sans text-white">
              {stats.totalARR} <span className="text-xs font-normal">د.أ / سنة</span>
            </div>
            <span className="text-[10px] text-emerald-300 block">تقدير الدخل السنوي الإجمالي</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-1">
            <span className="text-[11px] font-bold text-emerald-200 block">المحلات الذهبية المميزة</span>
            <div className="text-2xl sm:text-3xl font-black font-sans text-white">
              {stats.goldenCount} <span className="text-xs font-normal">محل</span>
            </div>
            <span className="text-[10px] text-emerald-300 block">من أصل {businesses.length} محل مسجّل</span>
          </div>

          <div className="bg-amber-500/20 backdrop-blur-md rounded-2xl p-4 border border-amber-400/30 space-y-1">
            <span className="text-[11px] font-bold text-amber-200 block">اشتراكات قريبة من الانتهاء</span>
            <div className="text-2xl sm:text-3xl font-black font-sans text-amber-300">
              {stats.expiringSoonCount} <span className="text-xs font-normal">محل</span>
            </div>
            <span className="text-[10px] text-amber-200 block">تطلب التواصل والتجديد</span>
          </div>
        </div>
      </div>

      {/* Package Breakdown Distribution (3 official tiers: Golden, Basic, Pay Per Use) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
              <Crown className="h-4 w-4 text-amber-600" />
              الباقة الذهبية (Golden VIP)
            </span>
            <span className="text-xs font-black text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-md">{goldenPrice} د.أ/شهر</span>
          </div>
          <div className="text-2xl font-black text-amber-950 font-sans">{stats.goldenCount} <span className="text-xs text-amber-800">مشترك</span></div>
          <p className="text-[11px] text-amber-800 font-medium">إجمالي الإيراد: {stats.goldenCount * goldenPrice} د.أ/شهرياً</p>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-slate-600" />
              الباقة الأساسية (Standard)
            </span>
            <span className="text-xs font-black text-slate-800 bg-slate-200/60 px-2 py-0.5 rounded-md">مجاناً</span>
          </div>
          <div className="text-2xl font-black text-slate-950 font-sans">{stats.basicCount} <span className="text-xs text-slate-700">محل</span></div>
          <p className="text-[11px] text-slate-700 font-medium">إدراج مجاني واعتيادي في الدليل</p>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-3xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-stone-600" />
              باقة عند الطلب (On Demand)
            </span>
            <span className="text-xs font-black text-stone-800 bg-stone-200/60 px-2 py-0.5 rounded-md">تسعير مخصص</span>
          </div>
          <div className="text-2xl font-black text-stone-950 font-sans">{stats.payPerUseCount} <span className="text-xs text-stone-600">طلب</span></div>
          <p className="text-[11px] text-stone-600 font-medium">خدمات وحملات تسويقية حسب الحاجة</p>
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
              <option value="all">جميع المحلات (كافة الباقات)</option>
              <option value="golden">الباقة الذهبية (Golden VIP)</option>
              <option value="basic">الباقة الأساسية (Basic)</option>
              <option value="pay_per_use">باقة عند الطلب (On Demand)</option>
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
                const plan = b.packagePlan || (vip.isVip ? 'golden' : 'basic');
                const priceDisplay = plan === 'golden' || vip.isVip ? `${goldenPrice} د.أ / شهر` : plan === 'pay_per_use' ? 'حسب الطلب' : 'مجاناً';
                
                return (
                  <tr key={b.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="p-3">
                      <div className="font-black text-stone-900 text-sm">{b.name}</div>
                      <div className="text-stone-400 text-[11px]">{b.ownerName || 'مالك المحل'} • {b.phone || 'بدون هاتف'}</div>
                    </td>

                    <td className="p-3">
                      {plan === 'golden' || vip.isVip ? (
                        <span className={`inline-flex items-center gap-1 font-black px-2.5 py-1 rounded-full border text-[11px] ${
                          vip.isTrial
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          <Crown className="h-3 w-3 text-amber-600" />
                          <span>{vip.isTrial ? `تجربة VIP مجانية (${vip.daysRemaining ?? 14}d)` : 'الباقة الذهبية'}</span>
                        </span>
                      ) : plan === 'pay_per_use' ? (
                        <span className="inline-flex items-center gap-1 font-black px-2.5 py-1 rounded-full border text-[11px] bg-blue-50 text-blue-700 border-blue-200">
                          <HelpCircle className="h-3 w-3 text-blue-500" />
                          <span>عند الطلب</span>
                        </span>
                      ) : (
                        <span className="text-stone-500 font-bold bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200 text-[11px]">
                          باقة أساسية
                        </span>
                      )}
                    </td>

                    <td className="p-3 font-mono font-black text-stone-800">
                      {priceDisplay}
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
