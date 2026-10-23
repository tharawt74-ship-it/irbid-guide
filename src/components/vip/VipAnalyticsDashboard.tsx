import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, Eye, Phone, MessageSquare, MapPin, 
  Store, Share2, Sparkles, Crown, ArrowUpRight, 
  BarChart3, Calendar, Users, Zap, ShieldCheck, 
  Clock, Target, Flame, Lightbulb, CheckCircle2,
  PieChart, Layers, ArrowLeft, RefreshCw
} from 'lucide-react';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import { Business, BusinessAnalytics, MarketingRequest } from '../../types';
import { getDefaultAnalytics } from '../../lib/analyticsTracker';
import { getJordanNow, getJordanDateISO } from '../../lib/jordanTime';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { MarketingAnalyticsSection } from '../analytics/MarketingAnalyticsSection';

interface VipAnalyticsDashboardProps {
  business: Business;
  isOwner?: boolean;
  onOpenMarketingHub?: () => void;
}

const ARABIC_DAYS_OF_WEEK = [
  { key: 'sat', name: 'السبت', jsDay: 6 },
  { key: 'sun', name: 'الأحد', jsDay: 0 },
  { key: 'mon', name: 'الإثنين', jsDay: 1 },
  { key: 'tue', name: 'الثلاثاء', jsDay: 2 },
  { key: 'wed', name: 'الأربعاء', jsDay: 3 },
  { key: 'thu', name: 'الخميس', jsDay: 4 },
  { key: 'fri', name: 'الجمعة', jsDay: 5 },
] as const;

function formatDateKey(d: Date): string {
  return getJordanDateISO(d);
}

const DAY_NAMES_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function VipAnalyticsDashboard({ 
  business, 
  isOwner = true,
  onOpenMarketingHub 
}: VipAnalyticsDashboardProps) {
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<'page' | 'marketing'>('page');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('all');
  const [marketingRequests, setMarketingRequests] = useState<MarketingRequest[]>([]);
  const [loadingMarketing, setLoadingMarketing] = useState(false);

  // Fetch real marketing requests for this business from Firestore
  useEffect(() => {
    if (!business?.id || !db) return;
    const fetchMarketingRequests = async () => {
      setLoadingMarketing(true);
      try {
        const q = query(
          collection(db, 'marketingRequests'),
          where('businessId', '==', business.id)
        );
        const snapshot = await getDocs(q);
        const reqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MarketingRequest));
        setMarketingRequests(reqs);
      } catch (err) {
        console.warn('Note on marketing requests fetch:', err);
      } finally {
        setLoadingMarketing(false);
      }
    };

    fetchMarketingRequests();
  }, [business?.id]);

  const rawAnalytics: BusinessAnalytics = business.analytics || getDefaultAnalytics(business.views);
  const dailyStats = rawAnalytics.dailyStats || {};
  const dayOfWeekStats = rawAnalytics.dayOfWeekStats || {};

  // Compute exact metrics based on selected time range strictly from real recorded data
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
    const today = getJordanNow();

    if (timeRange === '7d') {
      const past7Days = [];
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
          label: dayName,
          subLabel: formattedDate,
          views: dViews,
          calls: dCalls,
          interactions: dInteractions,
        });
      }

      return {
        views: sumViews,
        whatsapp: sumWhatsapp,
        calls: sumCalls,
        directions: sumDirections,
        menuViews: sumMenus,
        shares: sumShares,
        weeklyBars: past7Days,
        timeRangeLabel: 'خلال آخر 7 أيام',
      };
    }

    if (timeRange === '30d') {
      let sumViews = 0;
      let sumWhatsapp = 0;
      let sumCalls = 0;
      let sumDirections = 0;
      let sumMenus = 0;
      let sumShares = 0;

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

    // Default 'all' - Full recorded counters
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
      timeRangeLabel: 'إجمالي السجل المسجل',
    };
  }, [timeRange, rawAnalytics, business.views, dailyStats, dayOfWeekStats]);

  const totalInteractions = whatsapp + calls + directions + menuViews + shares;
  const conversionRate = views > 0 ? ((totalInteractions / views) * 100).toFixed(1) : '0.0';

  const maxDayViews = Math.max(...weeklyBars.map(b => b.views), 0);
  const totalWeeklyRecordedViews = weeklyBars.reduce((acc, b) => acc + b.views, 0);

  // Determine actual peak day
  const peakDay = useMemo(() => {
    if (weeklyBars.length === 0) return 'لا توجد بيانات بعد';
    const sorted = [...weeklyBars].sort((a, b) => b.interactions - a.interactions);
    if (sorted[0] && sorted[0].interactions > 0) {
      return sorted[0].label;
    }
    return 'في انتظار التفاعلات';
  }, [weeklyBars]);

  return (
    <div className="space-y-6 text-right" dir="rtl" id="vip-analytics-dashboard">
      
      {/* Top Header Banner */}
      <div className="bg-gradient-to-l from-[#1a4d2e] via-[#163e25] to-stone-900 rounded-2xl sm:rounded-3xl p-5 sm:p-7 text-white shadow-sm relative overflow-hidden border border-[#1a4d2e]/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 bg-amber-400/20 text-amber-200 border border-amber-300/30 px-3 py-0.5 rounded-full text-xs font-black">
              <Crown className="h-3.5 w-3.5 text-amber-300" />
              <span>لوحة التحليلات التنفيذية • الباقة الذهبية VIP</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black">تقارير أداء وتفاعل "{business.name}"</h2>
            <p className="text-xs sm:text-sm text-stone-200 font-medium">
              متابعة مباشرة ودقيقة لمشاهدات الصفحة والتفاعلات المباشرة والخدمات التسويقية
            </p>
          </div>

          {/* Main Tab Navigation Buttons */}
          <div className="flex bg-black/30 backdrop-blur-md p-1.5 rounded-2xl border border-white/15 gap-1.5 self-start md:self-center">
            <button
              type="button"
              onClick={() => setActiveAnalyticsTab('page')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeAnalyticsTab === 'page' 
                  ? 'bg-white text-[#1a4d2e] shadow-xs' 
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Eye className="h-4 w-4" />
              <span>إحصائيات الصفحة والتفاعلات</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveAnalyticsTab('marketing')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeAnalyticsTab === 'marketing' 
                  ? 'bg-amber-400 text-stone-950 shadow-xs' 
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>إحصائيات الخدمات التسويقية</span>
            </button>
          </div>
        </div>
      </div>

      {activeAnalyticsTab === 'marketing' ? (
        <MarketingAnalyticsSection 
          business={business} 
          marketingRequests={marketingRequests} 
          isOwner={isOwner}
          onOpenMarketingHub={onOpenMarketingHub}
        />
      ) : (
        <div className="space-y-6">
          
          {/* Time Range Filter Bar */}
          <div className="bg-white border border-stone-200 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
              <Calendar className="h-4 w-4 text-[#1a4d2e]" />
              <span>نطاق العرض المعروض: <strong className="text-[#1a4d2e]">{timeRangeLabel}</strong></span>
            </div>

            <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-bold w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setTimeRange('7d')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  timeRange === '7d' ? 'bg-[#1a4d2e] text-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                آخر 7 أيام
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('30d')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  timeRange === '30d' ? 'bg-[#1a4d2e] text-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                آخر 30 يوماً
              </button>
              <button
                type="button"
                onClick={() => setTimeRange('all')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  timeRange === 'all' ? 'bg-[#1a4d2e] text-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                إجمالي السجل
              </button>
            </div>
          </div>

          {/* 6 Primary Key Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
            
            {/* Total Page Views */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500">مشاهدات الصفحة</span>
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                  <Eye className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl sm:text-3xl font-black text-stone-900">
                {views.toLocaleString('en-US')}
              </div>
              <p className="text-[11px] text-stone-400 font-medium">زيارات بطاقة المنشأة</p>
            </div>

            {/* WhatsApp Chats */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500">محادثات الواتساب</span>
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <MessageSquare className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl sm:text-3xl font-black text-stone-900">
                {whatsapp.toLocaleString('en-US')}
              </div>
              <p className="text-[11px] text-stone-400 font-medium">نقرات تواصل الواتساب المباشر</p>
            </div>

            {/* Phone Calls */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500">الاتصالات الهاتفية</span>
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Phone className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl sm:text-3xl font-black text-stone-900">
                {calls.toLocaleString('en-US')}
              </div>
              <p className="text-[11px] text-stone-400 font-medium">اتصالات مباشرة عبر الهاتف</p>
            </div>

            {/* Map Directions */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500">خرائط الاتجاهات</span>
                <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                  <MapPin className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl sm:text-3xl font-black text-stone-900">
                {directions.toLocaleString('en-US')}
              </div>
              <p className="text-[11px] text-stone-400 font-medium">طلب موقع المنشأة بالخريطة</p>
            </div>

            {/* Menu & Catalog Views */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500">تصفح القائمة والكتالوج</span>
                <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                  <Store className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl sm:text-3xl font-black text-stone-900">
                {menuViews.toLocaleString('en-US')}
              </div>
              <p className="text-[11px] text-stone-400 font-medium">استعراض المنيو والأصناف</p>
            </div>

            {/* Shares */}
            <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500">مشاركات البطاقة</span>
                <div className="p-2 bg-rose-50 text-rose-700 rounded-xl">
                  <Share2 className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl sm:text-3xl font-black text-stone-900">
                {shares.toLocaleString('en-US')}
              </div>
              <p className="text-[11px] text-stone-400 font-medium">مشاركة رابط الصفحة مع الآخرين</p>
            </div>

          </div>

          {/* Activity Visualizer & Channel Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Daily/Weekly Visualizer Chart (2 cols) */}
            <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#1a4d2e]" />
                  <h3 className="font-black text-stone-900 text-base">
                    مخطط النشاط والزيارات اليومية
                  </h3>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  سجل دقيق لحظي
                </span>
              </div>

              {/* Chart Bars */}
              <div className="pt-2 space-y-3">
                <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-44 sm:h-52 pt-4 px-1">
                  {weeklyBars.map((item, index) => {
                    const heightPercent = maxDayViews > 0 
                      ? Math.max(Math.round((item.views / maxDayViews) * 100), 8) 
                      : 8;

                    return (
                      <div key={index} className="flex flex-col items-center h-full justify-end group relative">
                        {/* Hover Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 bg-stone-900 text-white text-[10px] py-1 px-2.5 rounded-lg whitespace-nowrap shadow-md pointer-events-none z-20 space-y-0.5 text-center">
                          <div className="font-bold">{item.views} زيارة</div>
                          <div className="text-stone-300">{item.interactions} تفاعل مباشر</div>
                        </div>

                        {/* Bar Pillar */}
                        <div className="w-full max-w-[36px] bg-stone-100 rounded-t-xl overflow-hidden flex flex-col justify-end h-full p-0.5">
                          <div 
                            className="w-full bg-gradient-to-t from-[#1a4d2e] to-emerald-600 rounded-t-lg transition-all duration-500"
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>

                        <span className="text-[11px] font-bold text-stone-700 mt-2 truncate w-full text-center">
                          {item.label}
                        </span>
                        {item.subLabel && (
                          <span className="text-[9px] text-stone-400 font-medium">
                            {item.subLabel}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {totalWeeklyRecordedViews === 0 && (
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-center text-xs text-stone-600 font-medium">
                    ستظهر الأعمدة التفاعلية فور تسجيل أولى الزيارات في الفترة المحددة.
                  </div>
                )}
              </div>
            </div>

            {/* Direct Channel Breakdown (1 col) */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-2xs space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-stone-100 pb-3.5">
                  <PieChart className="h-5 w-5 text-purple-700" />
                  <h3 className="font-black text-stone-900 text-base">توزيع قنوات التواصل</h3>
                </div>

                {/* Overall Direct Conversion Rate */}
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-1">
                  <span className="text-xs text-stone-500 font-bold block">معدل تحويل الزائر إلى تواصل:</span>
                  <div className="text-2xl font-black text-[#1a4d2e]">%{conversionRate}</div>
                  <p className="text-[11px] text-stone-400 font-medium">
                    نسبة الزوار الذين قاموا بالاتصال أو الواتساب أو الخريطة.
                  </p>
                </div>

                {/* Channel Percentages */}
                <div className="space-y-3 pt-1">
                  {/* WhatsApp */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-stone-700">محادثات الواتساب</span>
                      <span className="text-stone-900">{totalInteractions > 0 ? Math.round((whatsapp / totalInteractions) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${totalInteractions > 0 ? (whatsapp / totalInteractions) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  {/* Calls */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-stone-700">الاتصالات الهاتفية</span>
                      <span className="text-stone-900">{totalInteractions > 0 ? Math.round((calls / totalInteractions) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${totalInteractions > 0 ? (calls / totalInteractions) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  {/* Directions */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-stone-700">طلب الخرائط والموقع</span>
                      <span className="text-stone-900">{totalInteractions > 0 ? Math.round((directions / totalInteractions) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${totalInteractions > 0 ? (directions / totalInteractions) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  {/* Menu Views */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-stone-700">تصفح القائمة والكتالوج</span>
                      <span className="text-stone-900">{totalInteractions > 0 ? Math.round((menuViews / totalInteractions) * 100) : 0}%</span>
                    </div>
                    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-purple-600 h-full rounded-full" style={{ width: `${totalInteractions > 0 ? (menuViews / totalInteractions) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Peak Day Summary */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-stone-600">
                <span>يوم الذروة المسجل:</span>
                <span className="text-[#1a4d2e] font-black">{peakDay}</span>
              </div>
            </div>

          </div>

          {/* Business Profile Readiness Score Checklist */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <h3 className="font-black text-stone-900 text-base">اكتمال وجاهزية بطاقة المنشأة</h3>
              </div>
              <span className="text-xs font-bold text-stone-500">
                تأثير مباشر على قرار الزبون بالاتصال
              </span>
            </div>

            {(() => {
              let score = 0;
              const checklist = [
                { title: 'اسم المنشأة والتصنيف الرئيسي', ok: Boolean(business.name && business.category) },
                { title: 'رقم الهاتف والواتساب المباشر', ok: Boolean(business.phone) },
                { title: 'العنوان الجغرافي والمنطقة في إربد', ok: Boolean(business.address) },
                { title: 'شعار وصورة واضحة للمنشأة', ok: Boolean(business.logoUrl || business.imageUrl) },
                { title: 'قائمة الخدمات أو المنيو الرقمي', ok: Boolean(business.menuItems && business.menuItems.length > 0) },
              ];

              checklist.forEach(item => { if (item.ok) score += 20; });

              return (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-black">
                      <span className="text-stone-700">نسبة التكتمال الحالية</span>
                      <span className="text-emerald-700">{score}%</span>
                    </div>
                    <div className="w-full bg-stone-100 h-3 rounded-full overflow-hidden p-0.5 border border-stone-200">
                      <div className="bg-gradient-to-r from-emerald-600 to-[#1a4d2e] h-full rounded-full transition-all duration-500" style={{ width: `${score}%` }}></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                    {checklist.map((item, idx) => (
                      <div key={idx} className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                        item.ok ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950 font-bold' : 'bg-stone-50 border-stone-200 text-stone-500 font-medium'
                      }`}>
                        <CheckCircle2 className={`h-4 w-4 shrink-0 ${item.ok ? 'text-emerald-600' : 'text-stone-300'}`} />
                        <span>{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

        </div>
      )}

    </div>
  );
}
