import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, Eye, Phone, MessageSquare, MapPin, 
  Store, Share2, Sparkles, Crown, ArrowUpRight, 
  BarChart3, Calendar, Users, Zap, ShieldCheck, 
  Clock, Target, Flame, Award, Lightbulb, TrendingDown, Star, CheckCircle2
} from 'lucide-react';
import { Business, BusinessAnalytics } from '../../types';
import { getDefaultAnalytics } from '../../lib/analyticsTracker';

interface VipAnalyticsDashboardProps {
  business: Business;
  isOwner?: boolean;
}

const ARABIC_DAYS_OF_WEEK = [
  { key: 'sat', name: 'السبت', jsDay: 6, isWeekendPeak: false },
  { key: 'sun', name: 'الأحد', jsDay: 0, isWeekendPeak: false },
  { key: 'mon', name: 'الإثنين', jsDay: 1, isWeekendPeak: false },
  { key: 'tue', name: 'الثلاثاء', jsDay: 2, isWeekendPeak: false },
  { key: 'wed', name: 'الأربعاء', jsDay: 3, isWeekendPeak: false },
  { key: 'thu', name: 'الخميس', jsDay: 4, isWeekendPeak: true },
  { key: 'fri', name: 'الجمعة', jsDay: 5, isWeekendPeak: true },
] as const;

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DAY_NAMES_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function VipAnalyticsDashboard({ business }: VipAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('all');

  const rawAnalytics: BusinessAnalytics = business.analytics || getDefaultAnalytics(business.views);
  const dailyStats = rawAnalytics.dailyStats || {};
  const dayOfWeekStats = rawAnalytics.dayOfWeekStats || {};

  // Compute exact metrics based on selected time range
  const {
    views,
    whatsapp,
    calls,
    directions,
    menuViews,
    shares,
    weeklyBars,
    timeRangeLabel,
  } = useMemo(() => {
    const today = new Date();

    if (timeRange === '7d') {
      // Past 7 calendar days up to today
      const past7Days: {
        dateStr: string;
        dayName: string;
        formattedDate: string;
        views: number;
        calls: number;
        interactions: number;
        isPeak: boolean;
      }[] = [];

      let sumViews = 0;
      let sumWhatsapp = 0;
      let sumCalls = 0;
      let sumDirections = 0;
      let sumMenus = 0;
      let sumShares = 0;

      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateKey = formatDateKey(d);
        const dayIdx = d.getDay();
        const dayName = DAY_NAMES_AR[dayIdx];
        const formattedDate = `${d.getDate()}/${d.getMonth() + 1}`;
        const stat = dailyStats[dateKey] || {};

        const dViews = stat.view || stat.views || 0;
        const dWhatsapp = stat.whatsapp || 0;
        const dCalls = stat.call || stat.calls || 0;
        const dDirections = stat.direction || stat.directions || 0;
        const dMenus = stat.menu || stat.menus || 0;
        const dShares = stat.share || stat.shares || 0;
        const dInteractions = dWhatsapp + dCalls + dDirections + dMenus + dShares;

        sumViews += dViews;
        sumWhatsapp += dWhatsapp;
        sumCalls += dCalls;
        sumDirections += dDirections;
        sumMenus += dMenus;
        sumShares += dShares;

        past7Days.push({
          dateStr: dateKey,
          dayName,
          formattedDate,
          views: dViews,
          calls: dCalls,
          interactions: dInteractions,
          isPeak: dayName === 'الخميس' || dayName === 'الجمعة',
        });
      }

      return {
        views: sumViews,
        whatsapp: sumWhatsapp,
        calls: sumCalls,
        directions: sumDirections,
        menuViews: sumMenus,
        shares: sumShares,
        weeklyBars: past7Days.map(d => ({
          label: d.dayName,
          subLabel: d.formattedDate,
          views: d.views,
          calls: d.calls,
          interactions: d.interactions,
          isPeak: d.isPeak,
        })),
        timeRangeLabel: 'خلال آخر 7 أيام',
      };
    }

    if (timeRange === '30d') {
      // Past 30 calendar days
      let sumViews = 0;
      let sumWhatsapp = 0;
      let sumCalls = 0;
      let sumDirections = 0;
      let sumMenus = 0;
      let sumShares = 0;

      // Group into days of week
      const dayTotals: Record<number, { views: number; calls: number; interactions: number }> = {
        0: { views: 0, calls: 0, interactions: 0 },
        1: { views: 0, calls: 0, interactions: 0 },
        2: { views: 0, calls: 0, interactions: 0 },
        3: { views: 0, calls: 0, interactions: 0 },
        4: { views: 0, calls: 0, interactions: 0 },
        5: { views: 0, calls: 0, interactions: 0 },
        6: { views: 0, calls: 0, interactions: 0 },
      };

      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateKey = formatDateKey(d);
        const dayIdx = d.getDay();
        const stat = dailyStats[dateKey] || {};

        const dViews = stat.view || stat.views || 0;
        const dWhatsapp = stat.whatsapp || 0;
        const dCalls = stat.call || stat.calls || 0;
        const dDirections = stat.direction || stat.directions || 0;
        const dMenus = stat.menu || stat.menus || 0;
        const dShares = stat.share || stat.shares || 0;

        sumViews += dViews;
        sumWhatsapp += dWhatsapp;
        sumCalls += dCalls;
        sumDirections += dDirections;
        sumMenus += dMenus;
        sumShares += dShares;

        dayTotals[dayIdx].views += dViews;
        dayTotals[dayIdx].calls += dCalls;
        dayTotals[dayIdx].interactions += (dWhatsapp + dCalls + dDirections + dMenus + dShares);
      }

      const bars = ARABIC_DAYS_OF_WEEK.map(d => ({
        label: d.name,
        subLabel: 'تراكمي 30 يوم',
        views: dayTotals[d.jsDay].views,
        calls: dayTotals[d.jsDay].calls,
        interactions: dayTotals[d.jsDay].interactions,
        isPeak: d.isWeekendPeak,
      }));

      return {
        views: sumViews,
        whatsapp: sumWhatsapp,
        calls: sumCalls,
        directions: sumDirections,
        menuViews: sumMenus,
        shares: sumShares,
        weeklyBars: bars,
        timeRangeLabel: 'خلال آخر 30 يوماً',
      };
    }

    // Default 'all' - Full all-time recorded counters
    const allViews = rawAnalytics.views ?? business.views ?? 0;
    const allWhatsapp = rawAnalytics.whatsappClicks ?? 0;
    const allCalls = rawAnalytics.callClicks ?? 0;
    const allDirections = rawAnalytics.directionClicks ?? 0;
    const allMenus = rawAnalytics.menuViews ?? 0;
    const allShares = rawAnalytics.shareClicks ?? 0;

    const bars = ARABIC_DAYS_OF_WEEK.map(d => {
      const recorded = dayOfWeekStats[d.key];
      const dayViews = recorded?.views ?? 0;
      const dayCalls = recorded?.calls ?? 0;
      const dayInteractions = recorded?.interactions ?? 0;
      return {
        label: d.name,
        subLabel: '',
        views: dayViews,
        calls: dayCalls,
        interactions: dayInteractions,
        isPeak: d.isWeekendPeak,
      };
    });

    return {
      views: allViews,
      whatsapp: allWhatsapp,
      calls: allCalls,
      directions: allDirections,
      menuViews: allMenus,
      shares: allShares,
      weeklyBars: bars,
      timeRangeLabel: 'إجمالي المشاهدات والتفاعلات المسجلة',
    };
  }, [timeRange, rawAnalytics, business.views, dailyStats, dayOfWeekStats]);

  const totalInteractions = whatsapp + calls + directions + menuViews;
  const conversionRate = views > 0 ? ((totalInteractions / views) * 100).toFixed(1) : '0';

  const maxDayViews = Math.max(...weeklyBars.map(b => b.views), 0);
  const totalWeeklyRecordedViews = weeklyBars.reduce((acc, b) => acc + b.views, 0);

  return (
    <div className="space-y-6 text-right" dir="rtl" id="vip-analytics-dashboard">
      
      {/* Header with VIP Banner */}
      <div className="bg-gradient-to-l from-amber-500 via-yellow-500 to-amber-600 rounded-3xl p-6 sm:p-7 text-white shadow-lg relative overflow-hidden">
        <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 bg-black/20 text-white px-3 py-1 rounded-full text-xs font-black backdrop-blur-md">
              <Crown className="h-3.5 w-3.5 text-yellow-200" />
              <span>لوحة التحليلات الحصرية • الباقة الذهبية VIP</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black">إحصائيات وتفاعل زبائن "{business.name}"</h2>
            <p className="text-xs sm:text-sm text-amber-100 font-medium">
              القراءات والأرقام الحقيقية المسجلة لمشاهدات وتفاعلات محلّك بدقة لحظية وبدون أرقام تقديرية
            </p>
          </div>

          {/* Time Range Filter Buttons */}
          <div className="flex bg-black/25 backdrop-blur-md p-1 rounded-2xl border border-white/20 self-start sm:self-center">
            <button
              type="button"
              id="analytics-filter-7d"
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                timeRange === '7d' ? 'bg-white text-amber-900 shadow-sm' : 'text-white/80 hover:text-white'
              }`}
            >
              آخر 7 أيام
            </button>
            <button
              type="button"
              id="analytics-filter-30d"
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                timeRange === '30d' ? 'bg-white text-amber-900 shadow-sm' : 'text-white/80 hover:text-white'
              }`}
            >
              آخر 30 يوم
            </button>
            <button
              type="button"
              id="analytics-filter-all"
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                timeRange === 'all' ? 'bg-white text-amber-900 shadow-sm' : 'text-white/80 hover:text-white'
              }`}
            >
              إجمالي التسجيل
            </button>
          </div>
        </div>
      </div>

      {/* Time Range Context Banner */}
      <div className="bg-stone-50 border border-stone-200/80 rounded-2xl px-4 py-2.5 flex items-center justify-between text-xs text-stone-600">
        <span className="font-bold flex items-center gap-1.5 text-stone-800">
          <Calendar className="h-4 w-4 text-[#1a4d2e]" />
          <span>نطاق البيانات المعروضة: <strong className="text-[#1a4d2e]">{timeRangeLabel}</strong></span>
        </span>
        <span className="text-[11px] text-stone-500 font-medium">
          يتم تسجيل كل نقرة وزيارة لحظياً ومباشرة في قاعدة البيانات
        </span>
      </div>

      {/* 6 Key Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
        
        {/* Total Views */}
        <div className="bg-white border border-[#e5e1da] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#1a4d2e]/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">مشاهدات الصفحة</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#2d2a26]">{views.toLocaleString('ar-JO')}</div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-2">
            <TrendingUp className="h-3 w-3" />
            <span>مشاهدات مسجلة وموثوقة</span>
          </div>
        </div>

        {/* WhatsApp Inquiries */}
        <div className="bg-white border border-[#e5e1da] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">نقرات محادثة الواتساب</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700">{whatsapp.toLocaleString('ar-JO')}</div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-stone-500 mt-2">
            <span>استفسارات وطلبات مباشرة</span>
          </div>
        </div>

        {/* Phone Calls */}
        <div className="bg-white border border-[#e5e1da] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">نقرات الاتصال الهاتفي</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Phone className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#2d2a26]">{calls.toLocaleString('ar-JO')}</div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-stone-500 mt-2">
            <span>اتصالات مباشرة من زبائن إربد</span>
          </div>
        </div>

        {/* Maps Directions */}
        <div className="bg-white border border-[#e5e1da] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-rose-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">طلب الاتجاهات والخريطة</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <MapPin className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#2d2a26]">{directions.toLocaleString('ar-JO')}</div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-stone-500 mt-2">
            <span>زبائن فتحوا موقع المحل على الخريطة</span>
          </div>
        </div>

        {/* Digital Menu Views */}
        <div className="bg-white border border-[#e5e1da] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">استعراض المنيو والمنتجات</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Store className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-700">{menuViews.toLocaleString('ar-JO')}</div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-stone-500 mt-2">
            <span>تصفح الأسعار والكتالوج</span>
          </div>
        </div>

        {/* Share count */}
        <div className="bg-white border border-[#e5e1da] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-sky-500/30 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">مشاركات الرابط</span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
              <Share2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#2d2a26]">{shares.toLocaleString('ar-JO')}</div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-stone-500 mt-2">
            <span>مشاركات وتوصيات بين الأصدقاء</span>
          </div>
        </div>

      </div>

      {/* Advanced Performance & Weekly Trend Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Activity Visualizer (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#e5e1da] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#1a4d2e]" />
              <h3 className="font-black text-[#2d2a26] text-base">
                {timeRange === '7d' ? 'الزيارات اليومية الفعلية (آخر 7 أيام)' : 'توزيع التفاعل والزيارات الأسبوعية'}
              </h3>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              إحصاء دقيق لحظي
            </span>
          </div>

          {/* Interactive Bars */}
          <div className="pt-2 space-y-3">
            <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-44 sm:h-52 pt-4 px-1">
              {weeklyBars.map((item, index) => {
                const heightPercent = maxDayViews > 0 
                  ? Math.max(Math.round((item.views / maxDayViews) * 100), 8) 
                  : (item.views > 0 ? 8 : 4);

                return (
                  <div key={index} className="flex flex-col items-center gap-1.5 h-full justify-end group relative">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-stone-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg pointer-events-none whitespace-nowrap z-20 shadow-md">
                      {item.views} مشاهدة • {item.calls || 0} نقرة اتصال
                    </div>

                    <div className={`text-[11px] font-black transition-colors ${
                      item.views > 0 ? 'text-stone-800 group-hover:text-[#1a4d2e]' : 'text-stone-400'
                    }`}>
                      {item.views}
                    </div>

                    <div className="w-full max-w-[36px] bg-stone-100 rounded-t-xl overflow-hidden h-full flex items-end">
                      <div 
                        style={{ height: item.views > 0 ? `${heightPercent}%` : '4px' }}
                        className={`w-full rounded-t-xl transition-all duration-700 ${
                          item.views === 0
                            ? 'bg-stone-200'
                            : item.isPeak 
                              ? 'bg-gradient-to-t from-amber-500 to-yellow-400 group-hover:brightness-110' 
                              : 'bg-gradient-to-t from-[#1a4d2e] to-[#2d7d4e] group-hover:brightness-110'
                        }`}
                      ></div>
                    </div>

                    <span className="text-[11px] font-bold text-stone-700 whitespace-nowrap">
                      {item.label}
                    </span>
                    {item.subLabel ? (
                      <span className="text-[9px] font-semibold text-stone-400 -mt-1">
                        {item.subLabel}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Note / Empty state explanation */}
            {totalWeeklyRecordedViews === 0 && (
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-center text-xs text-amber-900 font-medium">
                ✨ ستبدأ الأعمدة بالارتفاع بدقة لحظية عند تسجيل أولى الزيارات اليومية لبطاقة المحل.
              </div>
            )}

            <div className="flex items-center justify-center gap-4 text-xs font-bold text-stone-500 pt-3 border-t border-stone-100">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#1a4d2e]"></span>
                <span>الأيام العادية</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span>عطلة نهاية الأسبوع (الخميس والجمعة)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Benchmarks & Insights Card (1 col) */}
        <div className="bg-stone-50/80 rounded-3xl border border-[#e5e1da] p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-200/80 pb-3">
              <Target className="h-5 w-5 text-amber-600" />
              <h3 className="font-black text-[#2d2a26] text-base">مؤشرات الأداء الفعلية</h3>
            </div>

            {/* Conversion Rate */}
            <div className="bg-white p-4 rounded-2xl border border-[#e5e1da] space-y-1">
              <span className="text-xs text-stone-500 font-bold block">معدل تحويل الزائرين لزبائن:</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#1a4d2e]">{conversionRate}%</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  parseFloat(conversionRate) >= 15 
                    ? 'text-emerald-700 bg-emerald-50' 
                    : parseFloat(conversionRate) > 0 
                      ? 'text-amber-700 bg-amber-50' 
                      : 'text-stone-500 bg-stone-100'
                }`}>
                  {parseFloat(conversionRate) >= 15 ? 'أداء ممتاز ⭐' : parseFloat(conversionRate) > 0 ? 'أداء جيد' : 'جديد'}
                </span>
              </div>
              <p className="text-[11px] text-stone-400">نسبة الزوار الذين ضغطوا على الاتصال أو الواتساب أو الخريطة.</p>
            </div>

            {/* Real Rating & Reviews Indicator in Irbid */}
            <div className="bg-white p-4 rounded-2xl border border-[#e5e1da] space-y-1">
              <span className="text-xs text-stone-500 font-bold block">تقييم المحل في دليل إربد:</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-amber-600">⭐ {business.rating ? `${business.rating} / 5` : 'جديد'}</span>
                <span className="text-xs text-stone-600">({business.reviewCount || 0} تقييم مسجل)</span>
              </div>
              <p className="text-[11px] text-stone-400">تقييمات زوار وراد المحل المعتمدة.</p>
            </div>

            {/* Peak Hours */}
            <div className="bg-white p-4 rounded-2xl border border-[#e5e1da] space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-stone-500 font-bold">
                <Clock className="h-3.5 w-3.5 text-[#ff9f1c]" />
                <span>أوقات ذروة طلب الزبائن في إربد:</span>
              </div>
              <div className="text-sm font-black text-[#2d2a26]">5:30 مساءً - 11:00 ليلاً</div>
              <p className="text-[11px] text-stone-400">الفترة الأكثر نشاطاً لطلب الخدمات والمأكولات في إربد.</p>
            </div>
          </div>

          <div className="pt-2 text-center">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/70 px-3 py-1 rounded-full border border-amber-200">
              <Sparkles className="h-3 w-3 text-amber-600" />
              <span>ميزة حصرية للمشتركين في الباقة الذهبية VIP</span>
            </span>
          </div>
        </div>

      </div>

      {/* 4️⃣ لوحة معايير الأداء ونصائح النمو */}
      <div className="bg-gradient-to-b from-stone-50 to-white rounded-3xl border border-[#e5e1da] p-5 sm:p-7 shadow-xs space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-emerald-50 p-2 rounded-xl text-emerald-800 border border-emerald-100">
              <Flame className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-black text-[#2d2a26] text-base">معايير أداء السوق والنمو التجاري</h3>
              <p className="text-xs text-stone-500">مقارنة أداء محلّك بالمعايير القياسية لدليل إربد التجاري</p>
            </div>
          </div>
          
          <div className="inline-flex items-center gap-1.5 bg-[#1a4d2e]/10 text-[#1a4d2e] px-3 py-1 rounded-full text-xs font-black">
            <span>النشاط: {business.category || 'تجاري'}</span>
          </div>
        </div>

        {/* Realistic Standard Benchmarks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 1. conversion benchmark */}
          <div className="bg-white p-4.5 rounded-2xl border border-[#e5e1da] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-stone-700">معدل تحويل الزائر إلى متصل</span>
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-emerald-800">محلّك الحالي</span>
                  <span className="font-black text-stone-900">{conversionRate}%</span>
                </div>
                <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${Math.min(100, (parseFloat(conversionRate) / 25) * 100)}%` }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-stone-500">
                  <span>المتوسط القياسي للسوق</span>
                  <span>10% - 15%</span>
                </div>
                <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-stone-400 h-full rounded-full" style={{ width: '50%' }}></div>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-stone-400">يقيس مدى قدرة الصفحة على تحويل الزائر إلى اتصال مباشر.</p>
          </div>

          {/* 2. digital menu engagement */}
          <div className="bg-white p-4.5 rounded-2xl border border-[#e5e1da] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-stone-700">تفاعل القائمة والكتالوج الرقمي</span>
              <Store className="h-4 w-4 text-purple-500" />
            </div>
            
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-purple-800">مشاهدات الكتالوج</span>
                  <span className="font-black text-stone-900">{menuViews}</span>
                </div>
                <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-purple-600 h-full rounded-full" style={{ width: `${Math.min(100, (menuViews / Math.max(1, views)) * 100)}%` }}></div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-stone-500">
                  <span>نسبة تصفح الأصناف</span>
                  <span>{views > 0 ? Math.round((menuViews / views) * 100) : 0}%</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-stone-400">إضافة صور وأسعار الأصناف يضاعف رغبة الزبون بالشراء.</p>
          </div>

          {/* 3. profile completeness */}
          <div className="bg-white p-4.5 rounded-2xl border border-[#e5e1da] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-stone-700">اكتمال وجاهزية البطاقة التجارية</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            
            <div className="space-y-3 pt-1">
              {(() => {
                let score = 0;
                if (business.name) score += 20;
                if (business.phone) score += 20;
                if (business.address) score += 20;
                if (business.logoUrl || business.imageUrl) score += 20;
                if (business.menuItems && business.menuItems.length > 0) score += 20;
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-emerald-800">مستوى الجاهزية</span>
                      <span className="font-black text-stone-900">{score}%</span>
                    </div>
                    <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${score}%` }}></div>
                    </div>
                  </div>
                );
              })()}
            </div>
            <p className="text-[11px] text-stone-400">البطاقات الكاملة تنال ثقة أعلى ونسبة نقر أكبر من الزبائن.</p>
          </div>

        </div>

        {/* Actionable Recommendations Coach */}
        <div className="bg-[#1a4d2e]/5 p-5 rounded-2xl border border-[#1a4d2e]/15 flex items-start gap-4">
          <div className="p-3 bg-emerald-50 text-[#1a4d2e] rounded-xl shrink-0">
            <Lightbulb className="h-6 w-6 text-emerald-700" />
          </div>
          <div className="space-y-2 text-right">
            <span className="text-xs font-black text-[#1a4d2e] block uppercase tracking-wider">
              نصائح موجهة لزيادة مبيعاتك في إربد:
            </span>
            <ul className="text-xs text-stone-700 space-y-1.5 list-disc pr-4 font-medium">
              {(!business.menuItems || business.menuItems.length === 0) && (
                <li>🍽️ <strong className="text-stone-900">إضافة المنيو والأسعار:</strong> زبائن إربد يفضلون تصفح الأسعار والوجبات قبل الاتصال، تفعيل المنيو يزيد الاتصالات بوضوح.</li>
              )}
              {(!business.logoUrl || !business.imageUrl) && (
                <li>🖼️ <strong className="text-stone-900">إضافة صور واضحة وشعار المحل:</strong> يمنح بطاقتك مظهراً احترافياً وموثوقاً بين المحلات المنافسة.</li>
              )}
              {(!business.workingHours?.openTime) && (
                <li>⏰ <strong className="text-stone-900">تحديد ساعات العمل:</strong> يساعد الزبائن على معرفة أوقات دوامك بدقة وتجنب الاتصال في غير أوقات الدوام.</li>
              )}
              <li>📢 <strong className="text-stone-900">إطلاق عروض خاصة:</strong> نشر العروض الترويجية أيام الخميس والجمعة يرفع عدد الزيارات خلال أوقات الذروة.</li>
            </ul>
          </div>
        </div>

      </div>

    </div>
  );
}
