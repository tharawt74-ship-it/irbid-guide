import { useConfirm } from '../contexts/ConfirmContext';
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { 
  Bell, 
  Search, 
  CheckCheck, 
  Trash2, 
  Tag, 
  Briefcase, 
  Sparkles, 
  Newspaper, 
  Store, 
  Clock, 
  X, 
  Check, 
  ChevronLeft, 
  ShieldCheck, 
  Inbox 
} from 'lucide-react';
import { VoiceSearchButton } from '../components/common/VoiceSearchButton';
import { useNotifications } from '../contexts/NotificationsContext';
import { useAuth } from '../contexts/AuthContext';
import { AppNotification } from '../types';
import { getJordanNow } from '../lib/jordanTime';
import { cn } from '../lib/utils';
import { formatArabicTimeAgo, NotificationAvatar } from '../components/notifications/NotificationDropdown';
import { requestPushPermission, getNotificationPermission, showNativeNotification } from '../lib/pushNotifications';
import { Pagination } from '../components/common/Pagination';

type CategoryFilter = 'all' | 'unread' | 'offer' | 'job' | 'news' | 'business' | 'system';

const NOTIFICATIONS_PER_PAGE = 30;

export function NotificationsPage() {
  const { confirm } = useConfirm();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  const { currentUser, userRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [isActivatingPush, setIsActivatingPush] = useState(false);
  const [isAnnouncementDismissed, setIsAnnouncementDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hide_push_announcement') === 'true';
    } catch {
      return false;
    }
  });
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchTerm]);

  useEffect(() => {
    setPushPermission(getNotificationPermission());
  }, []);

  const handleEnablePush = async () => {
    setIsActivatingPush(true);
    try {
      const res = await requestPushPermission(currentUser?.uid, userRole);
      setPushPermission(res.permission);
      if (res.permission === 'granted') {
        showNativeNotification(
          "تم تفعيل الإشعارات الفورية",
          "ستصلك أهم العروض والوظائف والتنبيهات الهامة مباشرة على شاشة جهازك."
        );
      } else if (res.permission === 'denied') {
        alert("تنبيه: تم رفض إذن الإشعارات من إعدادات المتصفح. يرجى تفعيل إذن الإشعارات للموقع من شريط العنوان لتصلك التنبيهات.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsActivatingPush(false);
    }
  };

  const handleTogglePush = async () => {
    if (pushPermission === 'granted') {
      showNativeNotification(
        "إشعارات الجهاز مفعّلة",
        "الإشعارات الفورية نشطة بالفعل على هذا الجهاز والمتصفح."
      );
      return;
    }
    await handleEnablePush();
  };

  const handleDismissAnnouncement = () => {
    setIsAnnouncementDismissed(true);
    try {
      localStorage.setItem('hide_push_announcement', 'true');
    } catch {}
  };

  const filterCategories = [
    { key: 'all', label: 'الكل', icon: Bell, count: notifications.length },
    { key: 'unread', label: 'غير مقروءة', icon: CheckCheck, count: unreadCount },
    { key: 'offer', label: 'العروض والخصومات', icon: Tag, count: notifications.filter(n => n.type === 'offer' || n.link?.includes('/offers')).length },
    { key: 'job', label: 'شواغر العمل', icon: Briefcase, count: notifications.filter(n => n.type === 'job' || n.link?.includes('/jobs')).length },
    { key: 'news', label: 'أخبار وفعاليات إربد', icon: Newspaper, count: notifications.filter(n => n.type === 'news' || n.link?.includes('/news')).length },
    { key: 'business', label: 'المنشآت والأماكن', icon: Store, count: notifications.filter(n => n.type === 'business' || n.type === 'marketing' || n.link?.includes('/business') || n.link?.includes('/medical')).length },
    { key: 'system', label: 'الطلبات والنظام', icon: ShieldCheck, count: notifications.filter(n => n.type === 'system' || n.link?.includes('/cart') || n.link?.includes('/orders') || n.link?.includes('/profile')).length },
  ];

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // Category filter
      if (activeCategory === 'unread' && notif.isRead) return false;
      if (activeCategory === 'offer' && notif.type !== 'offer' && !notif.link?.includes('/offers')) return false;
      if (activeCategory === 'job' && notif.type !== 'job' && !notif.link?.includes('/jobs')) return false;
      if (activeCategory === 'news' && notif.type !== 'news' && !notif.link?.includes('/news')) return false;
      if (activeCategory === 'business' && notif.type !== 'business' && notif.type !== 'marketing' && !notif.link?.includes('/business') && !notif.link?.includes('/medical')) return false;
      if (activeCategory === 'system' && notif.type !== 'system' && !notif.link?.includes('/cart') && !notif.link?.includes('/orders') && !notif.link?.includes('/profile')) return false;

      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesTitle = notif.title.toLowerCase().includes(query);
        const matchesMsg = notif.message.toLowerCase().includes(query);
        const matchesBadge = notif.badge?.toLowerCase().includes(query) || false;
        return matchesTitle || matchesMsg || matchesBadge;
      }

      return true;
    });
  }, [notifications, activeCategory, searchTerm]);

  const totalPages = Math.ceil(filteredNotifications.length / NOTIFICATIONS_PER_PAGE);

  const paginatedNotifications = useMemo(() => {
    const startIndex = (currentPage - 1) * NOTIFICATIONS_PER_PAGE;
    return filteredNotifications.slice(startIndex, startIndex + NOTIFICATIONS_PER_PAGE);
  }, [filteredNotifications, currentPage]);

  // Group notifications by date for native app feel
  const groupedNotifications = useMemo(() => {
    const today: AppNotification[] = [];
    const yesterday: AppNotification[] = [];
    const thisWeek: AppNotification[] = [];
    const earlier: AppNotification[] = [];

    const now = getJordanNow();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 86400000 * 6;

    paginatedNotifications.forEach(n => {
      const time = n.createdAt;
      if (time >= todayStart) {
        today.push(n);
      } else if (time >= yesterdayStart) {
        yesterday.push(n);
      } else if (time >= weekStart) {
        thisWeek.push(n);
      } else {
        earlier.push(n);
      }
    });

    const groups: { label: string; items: AppNotification[] }[] = [];
    if (today.length > 0) groups.push({ label: 'اليوم', items: today });
    if (yesterday.length > 0) groups.push({ label: 'أمس', items: yesterday });
    if (thisWeek.length > 0) groups.push({ label: 'هذا الأسبوع', items: thisWeek });
    if (earlier.length > 0) groups.push({ label: 'سابقاً', items: earlier });

    return groups;
  }, [paginatedNotifications]);

  const getIconConfig = (type: AppNotification['type']) => {
    switch (type) {
      case 'offer':
        return {
          icon: Tag,
          colorClass: 'bg-gradient-to-br from-red-500 to-orange-500 text-white',
          tagText: 'عرض ترويجي',
          tagClass: 'bg-red-50 text-red-700 border-red-200/80',
          dotColor: 'bg-red-500'
        };
      case 'job':
        return {
          icon: Briefcase,
          colorClass: 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white',
          tagText: 'فرصة عمل',
          tagClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          dotColor: 'bg-emerald-500'
        };
      case 'marketing':
        return {
          icon: Sparkles,
          colorClass: 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white',
          tagText: 'ترويج ونشاط',
          tagClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
          dotColor: 'bg-purple-500'
        };
      case 'news':
        return {
          icon: Newspaper,
          colorClass: 'bg-gradient-to-br from-blue-600 to-sky-600 text-white',
          tagText: 'أخبار وتحديثات',
          tagClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
          dotColor: 'bg-blue-500'
        };
      case 'business':
        return {
          icon: Store,
          colorClass: 'bg-gradient-to-br from-amber-600 to-orange-600 text-white',
          tagText: 'منشأة ومحل',
          tagClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
          dotColor: 'bg-amber-500'
        };
      case 'system':
      default:
        return {
          icon: ShieldCheck,
          colorClass: 'bg-gradient-to-br from-[#1a4d2e] to-[#133b22] text-white',
          tagText: 'تنبيه نظام',
          tagClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
          dotColor: 'bg-emerald-600'
        };
    }
  };

  const handleOpenNotification = (notif: AppNotification) => {
    markAsRead(notif.id);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 md:space-y-5 pb-20 animate-in fade-in duration-300 px-3 sm:px-4 md:px-0" dir="rtl">
      
      {/* 1. Polite Top Announcement Bar */}
      {!isAnnouncementDismissed && pushPermission !== 'granted' && (
        <div className="w-full bg-emerald-50/95 border border-emerald-200 text-emerald-950 px-3.5 sm:px-4 py-2.5 rounded-2xl flex items-center justify-between gap-3 shadow-2xs transition-all">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Bell className="h-3.5 w-3.5" />
            </div>
            <p className="text-xs sm:text-sm font-bold truncate">
              فعّل إشعارات جهازك لتصلك أحدث العروض والوظائف وتنبيهات إربد فور صدورها مباشرة.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={isActivatingPush}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-2xs whitespace-nowrap"
            >
              {isActivatingPush ? 'جاري التفعيل...' : 'تفعيل الآن'}
            </button>
            <button
              type="button"
              onClick={handleDismissAnnouncement}
              className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-emerald-100/60 transition-colors cursor-pointer"
              title="إغلاق التنبيه"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Top Header Row Card */}
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-2xs">
        <div className="flex items-center justify-between gap-3">
          
          {/* Right side: Bell icon + Title "مركز الإشعارات" + Toggle Switch */}
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 flex-wrap">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#1a4d2e] text-white flex items-center justify-center shadow-xs shrink-0">
              <Bell className="h-4.5 w-4.5 sm:h-5.5 sm:w-5.5" />
            </div>

            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-2xl font-black text-stone-900 tracking-tight truncate">
                مركز الإشعارات
              </h1>
              {unreadCount > 0 && (
                <span className="bg-red-600 text-white text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full shadow-2xs shrink-0 animate-pulse">
                  {unreadCount} جديد
                </span>
              )}
            </div>

            {/* 1. Desktop & Tablet: Pill-shaped box with label and border */}
            <button
              type="button"
              onClick={handleTogglePush}
              disabled={isActivatingPush}
              className={cn(
                "hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-full border shadow-2xs text-xs font-bold transition-all cursor-pointer select-none mr-2",
                pushPermission === 'granted'
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-600"
              )}
              title={pushPermission === 'granted' ? "إشعارات الجهاز مفعلة" : "تفعيل إشعارات الجهاز"}
            >
              <span className="text-[11px] font-bold">
                إشعارات الجهاز
              </span>
              <div
                className={cn(
                  "w-7 h-4 rounded-full p-0.5 transition-colors flex items-center shadow-xs",
                  pushPermission === 'granted' ? "bg-emerald-600 justify-end" : "bg-stone-300 justify-start"
                )}
              >
                <div
                  className={cn(
                    "w-3 h-3 rounded-full bg-white shadow-xs transition-transform",
                    isActivatingPush && "animate-spin"
                  )}
                />
              </div>
            </button>

            {/* 2. Mobile Phone ONLY: Bare enlarged toggle switch without any pill-shaped box */}
            <button
              type="button"
              onClick={handleTogglePush}
              disabled={isActivatingPush}
              className="flex md:hidden items-center p-0 m-0 bg-transparent border-0 outline-none shadow-none cursor-pointer select-none active:scale-95 transition-transform mr-1"
              title={pushPermission === 'granted' ? "إشعارات الجهاز مفعلة" : "تفعيل إشعارات الجهاز"}
              aria-label="تفعيل إشعارات الجهاز"
            >
              <div
                className={cn(
                  "w-11 h-6 rounded-full p-0.5 transition-colors flex items-center shadow-xs",
                  pushPermission === 'granted' ? "bg-emerald-600 justify-end" : "bg-stone-300 justify-start"
                )}
              >
                <div
                  className={cn(
                    "w-5 h-5 rounded-full bg-white shadow-xs transition-transform",
                    isActivatingPush && "animate-spin"
                  )}
                />
              </div>
            </button>
          </div>

          {/* Left side: Search Icon Toggle + Mark Read + Clear */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsSearchOpen(prev => !prev)}
              className={cn(
                "p-2 rounded-xl border text-stone-600 transition-all cursor-pointer shadow-2xs",
                isSearchOpen ? "bg-stone-900 text-white border-stone-900" : "bg-stone-50 border-stone-200 hover:bg-stone-100"
              )}
              title="بحث في الإشعارات"
            >
              <Search className="h-4 w-4" />
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#1a4d2e] text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 border border-emerald-200/90 cursor-pointer shadow-2xs active:scale-95"
                title="تحديد الكل كمقروء"
              >
                <CheckCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">قراءة الكل</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={async () => {
                  if ((await confirm({ message: "هل أنت متأكد من مسح جميع الإشعارات؟" }))) {
                    clearAll();
                  }
                }}
                className="p-1.5 sm:px-3 sm:py-2 rounded-xl bg-stone-100 hover:bg-red-50 hover:text-red-700 text-stone-600 text-xs font-bold transition-all flex items-center gap-1.5 border border-stone-200 cursor-pointer active:scale-95"
                title="مسح الإشعارات"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">مسح الكل</span>
              </button>
            )}
          </div>

        </div>

        {/* Expandable Search Input Bar (Shown when search icon clicked or search active) */}
        {(isSearchOpen || searchTerm) && (
          <div className="mt-3 pt-3 border-t border-stone-100 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-stone-400">
                <Search className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث في الإشعارات (عرض، وظيفة، محل، خبر...)"
                className="w-full pr-10 pl-18 py-2 sm:py-2.5 bg-stone-50 hover:bg-stone-100/70 focus:bg-white border border-stone-200 focus:border-[#1a4d2e] rounded-xl text-xs sm:text-sm font-medium focus:outline-none transition-all shadow-inner placeholder:text-stone-400"
              />
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center gap-1 z-10">
                <VoiceSearchButton
                  onTranscript={(text) => setSearchTerm(text)}
                  size="sm"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer rounded-full"
                    title="مسح البحث"
                  >
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Re-organized Notification Tabs based on platform services */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none select-none -mx-1 px-1">
        {filterCategories.map((cat) => {
          const isActive = activeCategory === cat.key;
          const CatIcon = cat.icon;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key as CategoryFilter)}
              className={cn(
                "px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 shadow-2xs",
                isActive
                  ? "bg-[#1a4d2e] text-white shadow-xs"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80"
              )}
            >
              <CatIcon className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-white" : "text-stone-500")} />
              <span>{cat.label}</span>
              {cat.count > 0 && (
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-black min-w-4 text-center",
                  isActive 
                    ? "bg-white/25 text-white" 
                    : cat.key === 'unread' && cat.count > 0 
                      ? "bg-red-500 text-white" 
                      : "bg-stone-100 text-stone-600"
                )}>
                  {cat.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notifications List Grouped by Timeline */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200/90 p-8 sm:p-12 text-center shadow-2xs">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-stone-100 text-stone-400 mx-auto flex items-center justify-center mb-3">
            <Inbox className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-stone-800 mb-1">لا توجد إشعارات حالياً</h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto mb-4">
            {searchTerm 
              ? `لم نجد أي إشعار يحتوي على كلمة "${searchTerm}".` 
              : 'صندوق الإشعارات فارغ في هذا القسم حالياً.'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              مسح كلمة البحث
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groupedNotifications.map((group) => (
            <div key={group.label} className="space-y-2">
              {/* Timeline Header */}
              <div className="flex items-center gap-2 px-1">
                <span className="text-[11px] font-black text-stone-400 uppercase tracking-wider">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-stone-200/80" />
                <span className="text-[10px] text-stone-400 font-bold">
                  {group.items.length}
                </span>
              </div>

              {/* Grouped Notification Cards */}
              <div className="space-y-2">
                {group.items.map((notif) => {
                  const iconConfig = getIconConfig(notif.type);

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleOpenNotification(notif)}
                      className={cn(
                        "relative bg-white rounded-2xl sm:rounded-3xl border transition-all duration-200 p-3 sm:p-4.5 cursor-pointer shadow-2xs hover:shadow-xs group active:scale-[0.99]",
                        !notif.isRead 
                          ? "border-emerald-300/80 bg-emerald-50/25 ring-1 ring-emerald-500/10" 
                          : "border-stone-200/85 hover:border-stone-300"
                      )}
                    >
                      {/* Unread Accent Left Bar & Dot */}
                      {!notif.isRead && (
                        <span className="absolute top-3.5 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                      )}

                      <div className="flex items-start gap-3 sm:gap-4">
                        {/* Avatar / Category Icon */}
                        <div className="shrink-0 pt-0.5">
                          <NotificationAvatar 
                            notif={notif} 
                            iconConfig={iconConfig} 
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl" 
                          />
                        </div>

                        {/* Middle Text Details */}
                        <div className="flex-1 min-w-0 space-y-1">
                          {/* Header Row: Title & Badge */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                              <h3 className={cn(
                                "text-xs sm:text-sm font-black tracking-tight truncate",
                                !notif.isRead ? "text-[#1a4d2e]" : "text-[#2d2a26]"
                              )}>
                                {notif.title}
                              </h3>
                              <span className={cn(
                                "text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md border",
                                iconConfig.tagClass
                              )}
                              >
                                {notif.badge || iconConfig.tagText}
                              </span>
                            </div>

                            {/* Relative Timestamp */}
                            <span className="text-[10px] text-stone-400 font-bold shrink-0 flex items-center gap-1">
                              <Clock className="h-3 w-3 text-stone-400" />
                              <span>{formatArabicTimeAgo(notif.createdAt)}</span>
                            </span>
                          </div>

                          {/* Message Body Preview */}
                          <p className="text-xs sm:text-[13px] text-stone-600 leading-relaxed line-clamp-2 sm:line-clamp-3">
                            {notif.message}
                          </p>

                          {/* Card Footer: Metadata & Actions */}
                          <div className="flex items-center justify-between pt-1.5 gap-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-2 text-[10px] text-stone-400 font-medium truncate">
                              <span>{new Date(notif.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</span>
                              {notif.link && (
                                <span className="text-[#1a4d2e] font-bold flex items-center gap-0.5 hover:underline">
                                  <span>تفاصيل</span>
                                  <ChevronLeft className="h-3 w-3" />
                                </span>
                              )}
                            </div>

                            {/* Quick Action Buttons (Read & Delete) */}
                            <div className="flex items-center gap-1 shrink-0">
                              {!notif.isRead && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notif.id);
                                  }}
                                  className="p-1 sm:px-2 sm:py-1 rounded-lg text-stone-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                  title="تحديد كمقروء"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  <span className="hidden sm:inline">مقروء</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notif.id);
                                }}
                                className="p-1 sm:p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="حذف"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(p) => {
                setCurrentPage(p);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              totalItems={filteredNotifications.length}
              itemsPerPage={NOTIFICATIONS_PER_PAGE}
            />
          )}
        </div>
      )}
    </div>
  );
}
