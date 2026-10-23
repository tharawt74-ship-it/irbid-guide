import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronRight, 
  ChevronLeft, 
  Megaphone, 
  Sparkles, 
  Clock, 
  Store, 
  Tag, 
  CheckCircle2, 
  AlertCircle, 
  CalendarDays,
  Flame,
  ArrowUpRight,
  Filter,
  Image as ImageIcon
} from 'lucide-react';
import { MarketingRequest, Business } from '../../types';

interface MarketingCalendarViewProps {
  marketingRequests: MarketingRequest[];
  businesses?: Business[];
  onOpenMarketingDetails?: (request: MarketingRequest) => void;
  showToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
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

export function MarketingCalendarView({
  marketingRequests,
  businesses = [],
  onOpenMarketingDetails,
  showToast
}: MarketingCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ day: number; events: any[] } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayEvents(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayEvents(null);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDayEvents(null);
  };

  // Prepare normalized campaign list
  const campaignsList = useMemo(() => {
    return marketingRequests.map(req => {
      const createdAt = req.createdAt ? new Date(req.createdAt) : new Date();
      const durationDays = (req as any).durationDays || 7;
      const startDate = (req as any).startDate ? new Date((req as any).startDate) : createdAt;
      const endDate = (req as any).endDate 
        ? new Date((req as any).endDate) 
        : new Date(startDate.getTime() + durationDays * 24 * 3600 * 1000);

      const matchedBusiness = businesses.find(b => b.id === req.businessId);

      return {
        id: req.id,
        raw: req,
        title: req.businessName || matchedBusiness?.name || 'حملة إعلانية',
        type: (req as any).requestType || 'banner',
        packageType: (req as any).packageType || 'standard',
        status: (req.status as string) || 'pending',
        startDate,
        endDate,
        durationDays,
        phone: req.contactPhone || req.phone || matchedBusiness?.phone || '',
        category: matchedBusiness?.category || 'عام'
      };
    }).filter(item => {
      if (filterType === 'all') return true;
      if (filterType === 'active') return item.status === 'approved' || item.status === 'completed' || item.status === 'active';
      if (filterType === 'pending') return item.status === 'pending';
      if (filterType === 'banner') return item.type === 'banner' || item.type === 'top_banner';
      if (filterType === 'story') return item.type === 'story' || item.type === 'social_post';
      return true;
    });
  }, [marketingRequests, businesses, filterType]);

  // Generate calendar days for current month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    // Empty padding days before day 1
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: null, isCurrentMonth: false, events: [] });
    }

    // Days of current month
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayDate = new Date(year, month, day, 12, 0, 0);

      const eventsForDay = campaignsList.filter(camp => {
        const start = new Date(camp.startDate.getFullYear(), camp.startDate.getMonth(), camp.startDate.getDate());
        const end = new Date(camp.endDate.getFullYear(), camp.endDate.getMonth(), camp.endDate.getDate());
        const current = new Date(year, month, day);
        return current >= start && current <= end;
      });

      days.push({
        dayNumber: day,
        isCurrentMonth: true,
        isToday: new Date().toDateString() === dayDate.toDateString(),
        events: eventsForDay
      });
    }

    return days;
  }, [year, month, campaignsList]);

  // Key monthly stats
  const activeCount = campaignsList.filter(c => c.status === 'approved' || c.status === 'completed' || c.status === 'active').length;
  const pendingCount = campaignsList.filter(c => c.status === 'pending').length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-amber-50 text-amber-700 font-bold">
              <CalendarDays className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-black text-stone-900">تقويم وجدول الحملات الإعلانية</h3>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            جدولة مرئية لكافة البانرات والحملات الممولة النشطة والمجدولة لتنسيق المواعيد ومنع التضارب.
          </p>
        </div>

        {/* Stats Summary Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{activeCount} حملة نشطة</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-2xl text-xs font-bold text-amber-800 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>{pendingCount} قيد المراجعة</span>
          </div>
        </div>
      </div>

      {/* Calendar Header Controls */}
      <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-stone-100 rounded-xl transition-colors border border-stone-200 text-stone-700"
            title="الشهر السابق"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          
          <div className="px-4 py-1.5 bg-stone-50 border border-stone-200 rounded-2xl font-black text-stone-800 text-sm flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-[#1a4d2e]" />
            <span>{MONTH_NAMES_AR[month]} {year}</span>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-stone-100 rounded-xl transition-colors border border-stone-200 text-stone-700"
            title="الشهر القادم"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            onClick={handleToday}
            className="text-xs font-bold bg-[#1a4d2e]/10 text-[#1a4d2e] hover:bg-[#1a4d2e]/20 px-3 py-2 rounded-xl transition-colors mr-2"
          >
            اليوم
          </button>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-stone-400" />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-2xl px-3 py-1.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
          >
            <option value="all">كافة الحملات ({marketingRequests.length})</option>
            <option value="active">الحملات النشطة والمعتمدة</option>
            <option value="pending">طلبات بانتظار الاعتماد</option>
            <option value="banner">البانرات الإعلانية</option>
            <option value="story">الستوريات والقصص</option>
          </select>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50 text-center font-bold text-xs text-stone-600 py-3">
          {DAYS_AR.map(day => (
            <div key={day} className="truncate">{day}</div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-stone-100 divide-x-reverse">
          {calendarDays.map((col, idx) => {
            if (!col.isCurrentMonth) {
              return (
                <div key={`empty-${idx}`} className="bg-stone-50/50 min-h-[100px] sm:min-h-[120px] p-2"></div>
              );
            }

            const hasEvents = col.events.length > 0;
            const isSelected = selectedDayEvents?.day === col.dayNumber;

            return (
              <div
                key={`day-${col.dayNumber}`}
                onClick={() => {
                  if (hasEvents) {
                    setSelectedDayEvents({ day: col.dayNumber!, events: col.events });
                  } else {
                    setSelectedDayEvents(null);
                  }
                }}
                className={`min-h-[100px] sm:min-h-[120px] p-2 transition-all cursor-pointer relative ${
                  col.isToday ? 'bg-amber-50/40' : hasEvents ? 'hover:bg-emerald-50/20' : 'hover:bg-stone-50'
                } ${isSelected ? 'ring-2 ring-[#1a4d2e] bg-emerald-50/40' : ''}`}
              >
                {/* Day Number */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    col.isToday ? 'bg-[#ff9f1c] text-white font-black shadow-xs' : 'text-stone-700'
                  }`}>
                    {col.dayNumber}
                  </span>

                  {hasEvents && (
                    <span className="text-[10px] font-bold text-[#1a4d2e] bg-emerald-100/80 px-1.5 py-0.5 rounded-full">
                      {col.events.length}
                    </span>
                  )}
                </div>

                {/* Event Tags inside Day */}
                <div className="space-y-1 overflow-hidden">
                  {col.events.slice(0, 2).map((event: any, eIdx: number) => {
                    const isApproved = event.status === 'approved' || event.status === 'active';
                    return (
                      <div
                        key={`${event.id}-${eIdx}`}
                        className={`text-[10px] font-bold px-1.5 py-1 rounded-lg truncate border flex items-center gap-1 ${
                          isApproved
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                            : 'bg-amber-50 text-amber-900 border-amber-200'
                        }`}
                        title={event.title}
                      >
                        <Megaphone className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">{event.title}</span>
                      </div>
                    );
                  })}

                  {col.events.length > 2 && (
                    <div className="text-[9px] font-black text-stone-500 text-center bg-stone-100 rounded py-0.5">
                      +{col.events.length - 2} المزيد
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Events Drawer / Details */}
      {selectedDayEvents && (
        <div className="bg-emerald-50/60 p-5 rounded-3xl border border-emerald-200 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-[#1a4d2e]" />
              <h4 className="font-black text-stone-900 text-sm">
                حملات يوم {selectedDayEvents.day} {MONTH_NAMES_AR[month]} ({selectedDayEvents.events.length} حملات)
              </h4>
            </div>
            <button
              onClick={() => setSelectedDayEvents(null)}
              className="text-xs font-bold text-stone-500 hover:text-stone-800"
            >
              إغلاق
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedDayEvents.events.map((ev: any) => (
              <div key={ev.id} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-stone-900 truncate">{ev.title}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    ev.status === 'approved' || ev.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {ev.status === 'approved' || ev.status === 'active' ? 'نشطة' : 'بانتظار الموافقة'}
                  </span>
                </div>

                <div className="text-[11px] text-stone-500 space-y-1">
                  <div>المدة: <span className="font-bold text-stone-700">{ev.durationDays} أيام</span></div>
                  <div>الفترة: <span className="font-mono text-stone-600">{ev.startDate.toLocaleDateString('ar-JO')} إلى {ev.endDate.toLocaleDateString('ar-JO')}</span></div>
                </div>

                {onOpenMarketingDetails && (
                  <button
                    onClick={() => onOpenMarketingDetails(ev.raw)}
                    className="w-full mt-2 bg-[#1a4d2e] text-white hover:bg-[#133b22] py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                  >
                    <span>عرض وتعديل تفاصيل الحملة</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
