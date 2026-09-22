import React, { useEffect, useState, useMemo } from 'react';
import { 
  Store, 
  Clock, 
  Megaphone, 
  Briefcase, 
  Star, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  ArrowUpRight,
  DollarSign,
  Sparkles,
  Eye,
  Activity,
  Plus
} from 'lucide-react';
import { Business, MarketingRequest, JobOffer } from '../../types';
import { getAppConfig } from '../../lib/demoDataHelper';
import { getJordanNow, formatJordanDateArabic } from '../../lib/jordanTime';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  BarChart, Bar, Legend, Cell
} from 'recharts';

interface AdminStatsOverviewProps {
  businesses: Business[];
  requests: any[];
  marketingRequests: MarketingRequest[];
  jobs: JobOffer[];
  onNavigateTab: (tab: string) => void;
  onOpenAddBusiness: () => void;
  onOpenBroadcastModal: () => void;
}

const MONTH_NAMES_AR = [
  'كانون الثاني (يناير)',
  'شباط (فبراير)',
  'آذار (مارس)',
  'نيسان (أبريل)',
  'أيار (مايو)',
  'حزيران (يونيو)',
  'تموز (يوليو)',
  'آب (أغسطس)',
  'أيلول (سبتمبر)',
  'تشرين الأول (أكتوبر)',
  'تشرين الثاني (نوفمبر)',
  'كانون الأول (ديسمبر)'
];

const ARABIC_DAYS_SHORT = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function AdminStatsOverview({
  businesses,
  requests,
  marketingRequests,
  jobs,
  onNavigateTab,
  onOpenAddBusiness,
  onOpenBroadcastModal,
}: AdminStatsOverviewProps) {
  const [config, setConfig] = useState<any>(null);

  // Month selector for daily analytics starting strictly from August 2026 (Month of platform launch)
  const nowJordan = getJordanNow();
  const currentMonthVal = `${nowJordan.getFullYear()}-${String(nowJordan.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthVal);

  const monthOptions = useMemo(() => {
    const now = getJordanNow();
    const options = [
      { value: 'overall', label: '📊 المنحنى الشامل (منذ الانطلاق - أغسطس 2026)' }
    ];

    const currentY = now.getFullYear();
    const currentM = now.getMonth();

    // Loop back from current month down to August 2026 (Year 2026, Month Index 7)
    for (let y = currentY; y >= 2026; y--) {
      const startM = (y === 2026) ? 7 : 11;
      const endM = (y === currentY) ? currentM : 11;

      for (let m = endM; m >= startM; m--) {
        const val = `${y}-${String(m + 1).padStart(2, '0')}`;
        const label = `📅 ${MONTH_NAMES_AR[m]} ${y}`;
        options.push({ value: val, label });
      }
    }
    return options;
  }, []);

  useEffect(() => {
    getAppConfig().then(c => setConfig(c));
  }, []);

  const getServicePrice = (serviceType: string) => {
    if (!config) {
      if (serviceType === 'sponsored') return 15;
      if (serviceType === 'push_notifications') return 10;
      if (serviceType === 'homepage_banner') return 25;
      if (serviceType === 'premium_messaging') return 5;
      return 15;
    }
    if (serviceType === 'sponsored') return config.priceSponsored ?? 15;
    if (serviceType === 'push_notifications') return config.pricePushNotifications ?? 10;
    if (serviceType === 'homepage_banner') return config.priceHomepageBanner ?? 25;
    if (serviceType === 'premium_messaging') return config.priceMessaging1Month ?? 5;
    return 15;
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const featuredBusinesses = businesses.filter(b => b.isFeatured);
  const pendingMarketing = marketingRequests.filter(m => m.status === 'pending');
  const completedMarketing = marketingRequests.filter(m => m.status === 'completed' || m.status === 'approved');
  const urgentJobs = jobs.filter(j => j.isUrgent);

  // Approximate Estimated Marketing Revenue (Dynamic based on settings)
  const calculateEstimatedRevenue = () => {
    let total = 0;
    completedMarketing.forEach(req => {
      total += getServicePrice(req.serviceType);
    });
    return total;
  };

  // Comprehensive analytics calculation (daily curve vs overall) strictly from real Firestore data starting August 2026
  const chartDetails = useMemo(() => {
    const now = getJordanNow();

    if (selectedMonth === 'overall') {
      // Build months list strictly from August 2026 up to current month
      const overallMonthsList: { year: number; monthIdx: number; label: string; key: string }[] = [];
      const currentY = now.getFullYear();
      const currentM = now.getMonth();

      for (let y = 2026; y <= currentY; y++) {
        const startM = (y === 2026) ? 7 : 0;
        const endM = (y === currentY) ? currentM : 11;

        for (let m = startM; m <= endM; m++) {
          const key = `${y}-${String(m + 1).padStart(2, '0')}`;
          const label = `${MONTH_NAMES_AR[m].split(' ')[0]} ${y}`;
          overallMonthsList.push({ year: y, monthIdx: m, label, key });
        }
      }

      let cumulativeShops = 0;
      let cumulativeViews = 0;

      const data = overallMonthsList.map(({ year, monthIdx, label, key }) => {
        let monthShopsCount = 0;
        let monthViewsCount = 0;

        businesses.forEach((b) => {
          // Check creation date
          if (b.createdAt) {
            const cd = new Date(b.createdAt);
            if (cd.getFullYear() === year && cd.getMonth() === monthIdx) {
              monthShopsCount += 1;
            }
          }

          // Sum real dailyStats views for this month
          if (b.analytics?.dailyStats) {
            Object.entries(b.analytics.dailyStats).forEach(([dateKey, statObj]: [string, any]) => {
              if (dateKey.startsWith(key)) {
                monthViewsCount += Number(statObj.view || statObj.views || 0);
              }
            });
          }
        });

        cumulativeShops += monthShopsCount;
        cumulativeViews += monthViewsCount;

        return {
          name: label,
          'المحلات النشطة': cumulativeShops,
          'زيارات الدليل': cumulativeViews
        };
      });

      return {
        isDaily: false,
        summaryText: `إجمالي المحلات المسجلة: ${cumulativeShops} | إجمالي الزيارات المسجلة: ${cumulativeViews.toLocaleString('en-US')}`,
        stats: null,
        data
      };
    }

    // Daily breakdown for chosen YYYY-MM
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const monthIdx = parseInt(monthStr, 10) - 1;
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const monthNameAr = MONTH_NAMES_AR[monthIdx] || `${monthStr}/${yearStr}`;

    let totalMonthRecordedViews = 0;
    let totalMonthShopsAdded = 0;

    const dailyRealViewsMap: { [day: number]: number } = {};
    const dailyRealShopsMap: { [day: number]: number } = {};

    for (let d = 1; d <= daysInMonth; d++) {
      dailyRealViewsMap[d] = 0;
      dailyRealShopsMap[d] = 0;
    }

    businesses.forEach((b) => {
      if (b.createdAt) {
        const cd = new Date(b.createdAt);
        if (cd.getFullYear() === year && cd.getMonth() === monthIdx) {
          const day = cd.getDate();
          if (dailyRealShopsMap[day] !== undefined) {
            dailyRealShopsMap[day] += 1;
            totalMonthShopsAdded += 1;
          }
        }
      }

      if (b.analytics?.dailyStats) {
        Object.entries(b.analytics.dailyStats).forEach(([dateKey, statObj]: [string, any]) => {
          if (dateKey.startsWith(`${yearStr}-${monthStr}`)) {
            const dayNum = parseInt(dateKey.split('-')[2], 10);
            const v = Number(statObj.view || statObj.views || 0);
            if (dayNum >= 1 && dayNum <= daysInMonth) {
              dailyRealViewsMap[dayNum] += v;
              totalMonthRecordedViews += v;
            }
          }
        });
      }
    });

    const isCurrentMonth = (now.getFullYear() === year && now.getMonth() === monthIdx);
    const currentDayLimit = isCurrentMonth ? now.getDate() : daysInMonth;

    const chartData = [];
    let sumMonthViews = 0;
    let maxDayViews = 0;
    let peakDayName = 'لا توجد زيارات بعد';

    for (let d = 1; d <= currentDayLimit; d++) {
      const dateObj = new Date(year, monthIdx, d);
      const dayOfWeek = dateObj.getDay();
      const dayNameAr = ARABIC_DAYS_SHORT[dayOfWeek];

      const dayViews = dailyRealViewsMap[d] || 0; // Strictly real views only!
      const dayShops = dailyRealShopsMap[d] || 0; // Strictly real shops created on this day!

      sumMonthViews += dayViews;
      if (dayViews > maxDayViews) {
        maxDayViews = dayViews;
        peakDayName = `${dayNameAr} ${d}`;
      }

      chartData.push({
        dayNumber: d,
        name: `${d}`,
        fullLabel: `${dayNameAr} ${d} ${monthNameAr.split(' ')[0]} ${year}`,
        'زيارات اليوم': dayViews,
        'المحلات المضافة': dayShops
      });
    }

    const avgDailyViews = currentDayLimit > 0 ? Math.round(sumMonthViews / currentDayLimit) : 0;

    return {
      isDaily: true,
      summaryText: `الزيارات اليومية لـ ${monthNameAr} ${year}`,
      stats: {
        totalViews: sumMonthViews,
        avgDailyViews,
        maxDayViews,
        peakDayName: maxDayViews > 0 ? peakDayName : '—',
        totalShopsAdded: totalMonthShopsAdded,
        activeDays: currentDayLimit
      },
      data: chartData
    };
  }, [businesses, selectedMonth]);

  // Marketing revenues per service distribution
  const marketingDistributionData = useMemo(() => {
    const services = [
      { type: 'sponsored', label: 'إعلان ممول' },
      { type: 'push_notifications', label: 'إشعار دفع' },
      { type: 'homepage_banner', label: 'بنر رئيسي' },
      { type: 'premium_messaging', label: 'نظام الرسائل' }
    ];
    return services.map(s => {
      const count = marketingRequests.filter(m => m.serviceType === s.type && (m.status === 'completed' || m.status === 'approved')).length;
      const price = getServicePrice(s.type);
      return {
        name: s.label,
        'عدد الطلبات': count,
        'الإيرادات المتوقعة (د.أ)': count * price
      };
    });
  }, [marketingRequests, config]);

  // Category counts
  const categoryCounts = businesses.reduce((acc: { [key: string]: number }, b) => {
    const cat = b.category || 'أخرى';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="space-y-6">
      
      {/* 6 Key Performance Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
        
        {/* Total Businesses */}
        <div 
          onClick={() => onNavigateTab('businesses')}
          className="bg-white p-4.5 rounded-2xl border border-[#e5e1da] hover:border-[#1a4d2e]/40 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#1a4d2e] flex items-center justify-center group-hover:scale-110 transition-transform">
              <Store className="h-5 w-5" />
            </div>
            <ArrowUpRight className="h-4 w-4 text-stone-300 group-hover:text-[#1a4d2e]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-[#2d2a26]">{businesses.length}</div>
            <div className="text-xs font-bold text-stone-500 mt-0.5">محلات في الدليل</div>
          </div>
          <div className="mt-2 text-[10px] text-emerald-700 font-bold bg-emerald-50/70 px-2 py-0.5 rounded-md inline-block">
            {featuredBusinesses.length} مميزة ⭐
          </div>
        </div>

        {/* Pending Requests */}
        <div 
          onClick={() => onNavigateTab('requests')}
          className="bg-white p-4.5 rounded-2xl border border-[#e5e1da] hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
        >
          {pendingRequests.length > 0 && (
            <span className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
          )}
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="h-5 w-5" />
            </div>
            <ArrowUpRight className="h-4 w-4 text-stone-300 group-hover:text-amber-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-amber-600">{pendingRequests.length}</div>
            <div className="text-xs font-bold text-stone-500 mt-0.5">طلبات بانتظار المراجعة</div>
          </div>
          <div className="mt-2 text-[10px] text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md inline-block">
            {requests.length} إجمالي الطلبات
          </div>
        </div>

        {/* Marketing Requests */}
        <div 
          onClick={() => onNavigateTab('marketing')}
          className="bg-white p-4.5 rounded-2xl border border-[#e5e1da] hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Megaphone className="h-5 w-5" />
            </div>
            <ArrowUpRight className="h-4 w-4 text-stone-300 group-hover:text-purple-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-purple-700">{marketingRequests.length}</div>
            <div className="text-xs font-bold text-stone-500 mt-0.5">خدمات تسويقية</div>
          </div>
          <div className="mt-2 text-[10px] text-purple-800 font-bold bg-purple-50 px-2 py-0.5 rounded-md inline-block">
            {pendingMarketing.length} قيد المتابعة
          </div>
        </div>

        {/* Active Jobs */}
        <div 
          onClick={() => onNavigateTab('jobs')}
          className="bg-white p-4.5 rounded-2xl border border-[#e5e1da] hover:border-sky-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Briefcase className="h-5 w-5" />
            </div>
            <ArrowUpRight className="h-4 w-4 text-stone-300 group-hover:text-sky-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-sky-700">{jobs.length}</div>
            <div className="text-xs font-bold text-stone-500 mt-0.5">وظائف وشواغر</div>
          </div>
          <div className="mt-2 text-[10px] text-sky-800 font-bold bg-sky-50 px-2 py-0.5 rounded-md inline-block">
            {urgentJobs.length} شواغر عاجلة 🔥
          </div>
        </div>

        {/* Featured Places */}
        <div 
          onClick={() => onNavigateTab('businesses')}
          className="bg-white p-4.5 rounded-2xl border border-[#e5e1da] hover:border-yellow-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Star className="h-5 w-5" />
            </div>
            <ArrowUpRight className="h-4 w-4 text-stone-300 group-hover:text-yellow-600" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-stone-800">{featuredBusinesses.length}</div>
            <div className="text-xs font-bold text-stone-500 mt-0.5">محلات في البانر والصدارة</div>
          </div>
          <div className="mt-2 text-[10px] text-yellow-800 font-bold bg-yellow-50 px-2 py-0.5 rounded-md inline-block">
            صدارة البحث والبانر
          </div>
        </div>

        {/* Marketing Revenue */}
        <div 
          onClick={() => onNavigateTab('marketing')}
          className="bg-gradient-to-br from-emerald-800 to-[#1a4d2e] p-4.5 rounded-2xl text-white shadow-md hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-white/15 text-[#ff9f1c] flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="h-5 w-5" />
            </div>
            <DollarSign className="h-4 w-4 text-emerald-300" />
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-white">{calculateEstimatedRevenue()} <span className="text-xs font-normal">د.أ</span></div>
            <div className="text-xs font-bold text-emerald-200 mt-0.5">عائدات الحملات النشطة</div>
          </div>
          <div className="mt-2 text-[10px] text-emerald-100 font-bold bg-white/10 px-2 py-0.5 rounded-md inline-block">
            {completedMarketing.length} حملة معتمدة
          </div>
        </div>

      </div>

      {/* Two Column Grid: Categories Breakdown + Quick Action & Notifications Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Categories Distribution */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-[#e5e1da] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#1a4d2e] flex items-center justify-center font-bold">
                <Activity className="h-4 w-4" />
              </div>
              <h3 className="font-black text-base text-[#2d2a26]">توزيع المحلات حسب الأقسام</h3>
            </div>
            <button
              onClick={() => onNavigateTab('businesses')}
              className="text-xs font-bold text-[#1a4d2e] hover:underline"
            >
              عرض الكل
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {sortedCategories.map(([category, count]) => {
              const percentage = (businesses.length > 0 && !isNaN(count)) ? Math.round((count / businesses.length) * 100) : 0;
              const validPercentage = isNaN(percentage) ? 0 : Math.max(percentage, 5);
              return (
                <div key={category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-stone-700">{category}</span>
                    <span className="text-stone-500">{count} محل ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-l from-[#ff9f1c] to-[#1a4d2e] h-full rounded-full transition-all duration-700"
                      style={{ width: `${validPercentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}

            {sortedCategories.length === 0 && (
              <p className="text-xs text-stone-400 text-center py-6">لا توجد محلات مسجلة بعد.</p>
            )}
          </div>
        </div>

        {/* Quick Management Shortcuts */}
        <div className="bg-white p-6 rounded-3xl border border-[#e5e1da] shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-[#ff9f1c]/10 text-[#ff9f1c] flex items-center justify-center font-bold">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="font-black text-base text-[#2d2a26]">إجراءات فورية سريعة</h3>
            </div>

            <div className="space-y-2">
              <button
                onClick={onOpenAddBusiness}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-stone-50 hover:bg-emerald-50 hover:text-[#1a4d2e] border border-stone-200 transition-all text-xs font-bold text-stone-700 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-[#1a4d2e]" />
                  <span>إضافة وتوثيق محل فوري</span>
                </div>
                <Plus className="h-4 w-4" />
              </button>

              <button
                onClick={onOpenBroadcastModal}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-stone-50 hover:bg-purple-50 hover:text-purple-700 border border-stone-200 transition-all text-xs font-bold text-stone-700 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-purple-600" />
                  <span>بث إشعار عاجل أو عرض</span>
                </div>
                <ArrowUpRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => onNavigateTab('requests')}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-stone-50 hover:bg-amber-50 hover:text-amber-700 border border-stone-200 transition-all text-xs font-bold text-stone-700 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>مراجعة طلبات الانضمام المعلقة</span>
                </div>
                <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {pendingRequests.length} طلب
                </span>
              </button>

              <button
                onClick={() => onNavigateTab('marketing')}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-stone-50 hover:bg-emerald-50 hover:text-emerald-700 border border-stone-200 transition-all text-xs font-bold text-stone-700 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span>متابعة إعلانات أصحاب المحلات</span>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {pendingMarketing.length} جديد
                </span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-stone-500 text-[11px] leading-relaxed">
            <span className="font-bold text-stone-800 block mb-0.5">💡 نصيحة المشرف:</span>
            توثيق المحلات وتفعيل شارة "مميز ⭐" يرفع ترتيب ظهور المحل في الصفحة الرئيسية ومحركات البحث.
          </div>
        </div>

      </div>

      {/* Time-Series & Marketing Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Over Time */}
        <div className="bg-white p-6 rounded-3xl border border-[#e5e1da] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3 flex-wrap gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#1a4d2e] flex items-center justify-center font-bold border border-emerald-100/80 shrink-0">
                <Activity className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base text-[#2d2a26]">منحنى نمو تسجيل المحلات وزيارات المنصة</h3>
                <p className="text-[11px] text-stone-500 font-bold mt-0.5">{chartDetails.summaryText}</p>
              </div>
            </div>

            {/* Month Selection Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 text-xs font-black rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent outline-none cursor-pointer transition-all shadow-3xs"
              >
                {monthOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Stats Banner for Daily View */}
          {chartDetails.isDaily && chartDetails.stats && (
            <div className="grid grid-cols-3 gap-2 bg-gradient-to-r from-stone-50 via-emerald-50/40 to-stone-50 p-2.5 rounded-2xl border border-stone-200/80 text-center">
              <div className="space-y-0.5">
                <span className="text-[10px] text-stone-500 font-bold block">مجموع زيارات الشهر</span>
                <span className="text-xs sm:text-sm font-black text-[#1a4d2e]">{chartDetails.stats.totalViews.toLocaleString('en-US')}</span>
              </div>
              <div className="space-y-0.5 border-r border-stone-200">
                <span className="text-[10px] text-stone-500 font-bold block">المعدل اليومي</span>
                <span className="text-xs sm:text-sm font-black text-amber-600">{chartDetails.stats.avgDailyViews.toLocaleString('en-US')} / يوم</span>
              </div>
              <div className="space-y-0.5 border-r border-stone-200">
                <span className="text-[10px] text-stone-500 font-bold block">أعلى يوم ({chartDetails.stats.peakDayName})</span>
                <span className="text-xs sm:text-sm font-black text-blue-600">{chartDetails.stats.maxDayViews.toLocaleString('en-US')}</span>
              </div>
            </div>
          )}

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartDetails.data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorShop" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a4d2e" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#1a4d2e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff9f1c" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#ff9f1c" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#a0a0a0" fontSize={11} tickLine={false} />
                <YAxis stroke="#a0a0a0" fontSize={11} tickLine={false} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const dataItem = payload[0].payload;
                      return (
                        <div className="bg-stone-900 text-white p-3 rounded-2xl shadow-xl text-xs space-y-1.5 border border-stone-800 text-right dir-rtl">
                          <p className="font-bold text-amber-400 border-b border-stone-800 pb-1">
                            {dataItem.fullLabel || `يوم ${dataItem.name}`}
                          </p>
                          {payload.map((entry: any, index: number) => (
                            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
                              <span className="flex items-center gap-1.5 font-medium text-stone-300">
                                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
                                {entry.name}:
                              </span>
                              <span className="font-black text-stone-100">{Number(entry.value).toLocaleString('en-US')}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                {chartDetails.isDaily ? (
                  <>
                    <Area type="monotone" dataKey="زيارات اليوم" stroke="#ff9f1c" strokeWidth={2.5} fillOpacity={1} fill="url(#colorViews)" />
                    <Area type="monotone" dataKey="المحلات المضافة" stroke="#1a4d2e" strokeWidth={2} fillOpacity={1} fill="url(#colorShop)" />
                  </>
                ) : (
                  <>
                    <Area type="monotone" dataKey="المحلات النشطة" stroke="#1a4d2e" strokeWidth={2.5} fillOpacity={1} fill="url(#colorShop)" />
                    <Area type="monotone" dataKey="زيارات الدليل" stroke="#ff9f1c" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Marketing Revenues distribution */}
        <div className="bg-white p-6 rounded-3xl border border-[#e5e1da] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <TrendingUp className="h-4 w-4" />
              </div>
              <h3 className="font-black text-base text-[#2d2a26]">توزيع إيرادات الخدمات التسويقية (د.أ)</h3>
            </div>
            <span className="text-[10px] bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-black">أسعار اشتراكات مرنة</span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marketingDistributionData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#a0a0a0" fontSize={11} tickLine={false} />
                <YAxis stroke="#a0a0a0" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e1da', fontFamily: 'sans-serif' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                <Bar dataKey="الإيرادات المتوقعة (د.أ)" fill="#1a4d2e" radius={[6, 6, 0, 0]}>
                  {marketingDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#1a4d2e' : '#ff9f1c'} />
                  ))}
                </Bar>
                <Bar dataKey="عدد الطلبات" fill="#9ca3af" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
}
