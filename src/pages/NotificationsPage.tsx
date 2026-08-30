import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { 
  Bell, 
  Search, 
  CheckCheck, 
  Trash2, 
  Flame, 
  Briefcase, 
  Sparkles, 
  Newspaper, 
  Store, 
  Clock, 
  ExternalLink, 
  X, 
  Filter,
  Check,
  ChevronLeft,
  ArrowRight,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  MoreVertical,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotifications } from '../contexts/NotificationsContext';
import { useAuth } from '../contexts/AuthContext';
import { AppNotification } from '../types';
import { cn } from '../lib/utils';
import { formatArabicTimeAgo, NotificationAvatar } from '../components/notifications/NotificationDropdown';
import { requestPushPermission, getNotificationPermission, showNativeNotification } from '../lib/pushNotifications';

type CategoryFilter = 'all' | 'unread' | 'offer' | 'job' | 'marketing' | 'news' | 'system';

export function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpenMobile, setIsSearchOpenMobile] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [isActivatingPush, setIsActivatingPush] = useState(false);
  const [isPushBannerCollapsed, setIsPushBannerCollapsed] = useState(true);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setPushPermission(getNotificationPermission());
  }, []);

  const handleEnablePush = async () => {
    setIsActivatingPush(true);
    try {
      const res = await requestPushPermission(currentUser?.uid);
      setPushPermission(res.permission);
      if (res.permission === 'granted') {
        showNativeNotification(
          "تم تفعيل الإشعارات الفورية! 🎉",
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

  const filterCategories = [
    { key: 'all', label: 'الكل', count: notifications.length },
    { key: 'unread', label: 'غير مقروءة', count: unreadCount, highlight: unreadCount > 0 },
    { key: 'offer', label: 'عروض 🔥', count: notifications.filter(n => n.type === 'offer').length },
    { key: 'job', label: 'وظائف 💼', count: notifications.filter(n => n.type === 'job').length },
    { key: 'news', label: 'أخبار وتنبيهات 📢', count: notifications.filter(n => n.type === 'news' || n.type === 'system' || n.type === 'business').length },
    { key: 'marketing', label: 'تسويق 🚀', count: notifications.filter(n => n.type === 'marketing').length },
  ];

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // Category filter
      if (activeCategory === 'unread' && notif.isRead) return false;
      if (activeCategory === 'offer' && notif.type !== 'offer') return false;
      if (activeCategory === 'job' && notif.type !== 'job') return false;
      if (activeCategory === 'marketing' && notif.type !== 'marketing') return false;
      if (activeCategory === 'news' && notif.type !== 'news' && notif.type !== 'system' && notif.type !== 'business') return false;

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

  // Group notifications by date for native app feel
  const groupedNotifications = useMemo(() => {
    const today: AppNotification[] = [];
    const yesterday: AppNotification[] = [];
    const thisWeek: AppNotification[] = [];
    const earlier: AppNotification[] = [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart = todayStart - 86400000 * 6;

    filteredNotifications.forEach(n => {
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
  }, [filteredNotifications]);

  const getIconConfig = (type: AppNotification['type']) => {
    switch (type) {
      case 'offer':
        return {
          icon: Flame,
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
          tagText: 'باقات وتسويق',
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
      case 'system':
      default:
        return {
          icon: Store,
          colorClass: 'bg-gradient-to-br from-[#1a4d2e] to-[#133b22] text-white',
          tagText: 'تنبيه عام',
          tagClass: 'bg-green-50 text-green-700 border-green-200/80',
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
    <div className="w-full max-w-4xl mx-auto space-y-4 md:space-y-6 pb-20 animate-in fade-in duration-300 px-3 sm:px-4 md:px-0" dir="rtl">
      
      {/* Top Header Card (Optimized for Mobile & Desktop) */}
      <div className="bg-white p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-2xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#1a4d2e] to-[#133b22] text-white flex items-center justify-center shadow-xs shrink-0">
              <Bell className="h-4.5 w-4.5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-base sm:text-2xl font-black text-[#2d2a26] tracking-tight truncate">
                  مركز الإشعارات
                </h1>
                {unreadCount > 0 && (
                  <span className="bg-red-600 text-white text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full shadow-2xs shrink-0 animate-pulse">
                    {unreadCount} جديد
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-sm text-stone-500 mt-0.5 hidden sm:block">
                تابع أحدث العروض، الوظائف، وآخر الأخبار والإعلانات في إربد أولاً بأول.
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Mobile Search Toggle */}
            <button
              onClick={() => setIsSearchOpenMobile(!isSearchOpenMobile)}
              className={cn(
                "p-2 sm:hidden rounded-xl border text-stone-600 transition-all cursor-pointer",
                isSearchOpenMobile ? "bg-stone-800 text-white border-stone-800" : "bg-stone-50 border-stone-200 hover:bg-stone-100"
              )}
              title="بحث في الإشعارات"
            >
              <Search className="h-4 w-4" />
            </button>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#1a4d2e] text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 border border-emerald-200/90 cursor-pointer shadow-2xs active:scale-95"
                title="تحديد الكل كمقروء"
              >
                <CheckCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline sm:inline">قراءة الكل</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm("هل أنت متأكد من مسح جميع الإشعارات؟")) {
                    clearAll();
                  }
                }}
                className="p-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-stone-100 hover:bg-red-50 hover:text-red-700 text-stone-600 text-xs font-bold transition-all flex items-center gap-1.5 border border-stone-200 cursor-pointer active:scale-95"
                title="مسح الإشعارات"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">مسح الكل</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Input for Desktop & Expandable for Mobile */}
        <div className={cn("mt-3 pt-3 border-t border-stone-100", !isSearchOpenMobile && "hidden sm:block")}>
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-stone-400">
              <Search className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث في الإشعارات (عرض، وظيفة، باقات، إربد...)"
              className="w-full pr-10 pl-9 py-2 sm:py-2.5 bg-stone-50 hover:bg-stone-100/70 focus:bg-white border border-stone-200 focus:border-[#1a4d2e] rounded-xl text-xs sm:text-sm font-medium focus:outline-none transition-all shadow-inner placeholder:text-stone-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
                title="مسح البحث"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modern Compact Push Notifications Banner (Sleek and Non-Intrusive) */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-[#1a4d2e] text-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm border border-stone-800 transition-all">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/15">
              <Smartphone className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-white truncate">إشعارات الجهاز الفورية</span>
                {pushPermission === 'granted' ? (
                  <span className="bg-emerald-500/20 text-emerald-300 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-0.5">
                    <ShieldCheck className="h-2.5 w-2.5" /> مفعّلة
                  </span>
                ) : pushPermission === 'denied' ? (
                  <span className="bg-red-500/20 text-red-300 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded border border-red-500/30">
                    مرفوضة
                  </span>
                ) : (
                  <span className="bg-amber-500/20 text-amber-300 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/30">
                    غير مفعّلة
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-stone-300 truncate hidden xs:block">
                تنبيهات فورية بالعروض والوظائف على شاشة الهاتف مباشرة
              </p>
            </div>
          </div>

          {pushPermission !== 'granted' ? (
            <button
              onClick={handleEnablePush}
              disabled={isActivatingPush}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-black text-[11px] sm:text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <Bell className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>{isActivatingPush ? 'تفعيل...' : 'تفعيل'}</span>
            </button>
          ) : (
            <span className="text-[10px] text-emerald-400 font-bold hidden sm:inline">
              ✓ نشط على هذا المتصفح
            </span>
          )}
        </div>
      </div>

      {/* Category Filter Chips Bar (Smooth Horizontal Scroll for Mobile) */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none select-none -mx-1 px-1">
        {filterCategories.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(cat.key as CategoryFilter)}
              className={cn(
                "px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95",
                isActive
                  ? "bg-[#1a4d2e] text-white shadow-xs"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80"
              )}
            >
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
              {/* Timeline Header Pill */}
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
                  const isMenuOpen = activeActionMenuId === notif.id;

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
                              )}>
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
        </div>
      )}
    </div>
  );
}
