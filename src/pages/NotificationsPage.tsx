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
  AlertCircle
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationsContext';
import { useAuth } from '../contexts/AuthContext';
import { AppNotification } from '../types';
import { cn } from '../lib/utils';
import { formatArabicTimeAgo } from '../components/notifications/NotificationDropdown';
import { requestPushPermission, getNotificationPermission, showNativeNotification } from '../lib/pushNotifications';

type CategoryFilter = 'all' | 'unread' | 'offer' | 'job' | 'marketing' | 'news' | 'system';

export function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } = useNotifications();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [isActivatingPush, setIsActivatingPush] = useState(false);
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
    { key: 'all', label: 'جميع الإشعارات', count: notifications.length },
    { key: 'unread', label: 'غير مقروءة', count: unreadCount },
    { key: 'offer', label: 'عروض وتخفيضات 🔥', count: notifications.filter(n => n.type === 'offer').length },
    { key: 'job', label: 'وظائف وشواغر 💼', count: notifications.filter(n => n.type === 'job').length },
    { key: 'marketing', label: 'خدمات الترويج 🚀', count: notifications.filter(n => n.type === 'marketing').length },
    { key: 'news', label: 'أخبار وتحديثات 📢', count: notifications.filter(n => n.type === 'news' || n.type === 'system').length },
  ];

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      // Category filter
      if (activeCategory === 'unread' && notif.isRead) return false;
      if (activeCategory === 'offer' && notif.type !== 'offer') return false;
      if (activeCategory === 'job' && notif.type !== 'job') return false;
      if (activeCategory === 'marketing' && notif.type !== 'marketing') return false;
      if (activeCategory === 'news' && notif.type !== 'news' && notif.type !== 'system') return false;

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

  const getIconConfig = (type: AppNotification['type']) => {
    switch (type) {
      case 'offer':
        return {
          icon: Flame,
          colorClass: 'bg-gradient-to-br from-red-500 to-orange-500 text-white',
          tagText: 'عرض ترويجي',
          tagClass: 'bg-red-100 text-red-800'
        };
      case 'job':
        return {
          icon: Briefcase,
          colorClass: 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white',
          tagText: 'فرصة عمل',
          tagClass: 'bg-emerald-100 text-emerald-800'
        };
      case 'marketing':
        return {
          icon: Sparkles,
          colorClass: 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white',
          tagText: 'باقات وتسويق',
          tagClass: 'bg-purple-100 text-purple-800'
        };
      case 'news':
        return {
          icon: Newspaper,
          colorClass: 'bg-gradient-to-br from-blue-600 to-sky-600 text-white',
          tagText: 'أخبار وتحديثات',
          tagClass: 'bg-blue-100 text-blue-800'
        };
      case 'business':
      case 'system':
      default:
        return {
          icon: Store,
          colorClass: 'bg-gradient-to-br from-[#1a4d2e] to-[#133b22] text-white',
          tagText: 'تنبيه عام',
          tagClass: 'bg-green-100 text-green-800'
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
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Breadcrumb / Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-200/90 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1a4d2e] to-[#133b22] text-white flex items-center justify-center shadow-sm">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-[#2d2a26] tracking-tight">مركز الإشعارات والتنبيهات</h1>
              {unreadCount > 0 && (
                <span className="bg-red-600 text-white text-xs font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                  {unreadCount} غير مقروء
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              تابع أحدث العروض، الوظائف، وآخر الأخبار والإعلانات في إربد أولاً بأول.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#1a4d2e] text-xs font-bold transition-all flex items-center gap-1.5 border border-emerald-200 cursor-pointer shadow-2xs"
            >
              <CheckCheck className="h-4 w-4" />
              <span>تحديد الكل كمقروء</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={() => {
                clearAll();
              }}
              className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-red-50 hover:text-red-700 text-stone-600 text-xs font-bold transition-all flex items-center gap-1.5 border border-stone-200 cursor-pointer"
              title="مسح الإشعارات"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>مسح الكل</span>
            </button>
          )}
        </div>
      </div>

      {/* Device Push Notifications Settings Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-[#1a4d2e] text-white p-5 rounded-3xl shadow-lg border border-stone-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/20">
            <Smartphone className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white">الإشعارات الفورية على مستوى الجهاز (FCM Push)</h3>
              {pushPermission === 'granted' ? (
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> مفعّلة بنجاح
                </span>
              ) : pushPermission === 'denied' ? (
                <span className="bg-red-500/20 text-red-300 text-[10px] font-black px-2 py-0.5 rounded-md border border-red-500/30 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> مرفوضة بالمتصفح
                </span>
              ) : (
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-500/30">
                  غير مفعّلة
                </span>
              )}
            </div>
            <p className="text-xs text-stone-300 mt-0.5">
              احصل على التنبيهات والعروض الهامة فور إرسالها على شاشة هاتفك المحمول أو جهازك مباشرة.
            </p>
          </div>
        </div>

        {pushPermission !== 'granted' && (
          <button
            onClick={handleEnablePush}
            disabled={isActivatingPush}
            className="w-full md:w-auto px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-stone-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-98"
          >
            <Bell className="h-4 w-4" />
            <span>{isActivatingPush ? 'جاري التفعيل...' : 'تفعيل إشعارات الجهاز الآن 🔔'}</span>
          </button>
        )}
      </div>

      {/* Search Bar & Filters Section */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200/90 shadow-xs space-y-4">
        
        {/* Interactive Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-stone-400">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث في الإشعارات والتنبيهات (مثال: خصم، وظيفة، باقات، إربد...)"
            className="w-full pr-11 pl-10 py-3 bg-stone-50 hover:bg-stone-100/70 focus:bg-white border border-stone-200 focus:border-[#1a4d2e] rounded-2xl text-sm font-medium focus:outline-none transition-all shadow-inner placeholder:text-stone-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer"
              title="مسح البحث"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {filterCategories.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key as CategoryFilter)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0",
                  isActive
                    ? "bg-[#1a4d2e] text-white shadow-xs"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200/80 border border-stone-200/60"
                )}
              >
                <span>{cat.label}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-black",
                  isActive ? "bg-white/25 text-white" : "bg-stone-200 text-stone-700"
                )}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications Cards List */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
            <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center mb-4">
              <Search className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-stone-800 mb-1">لا توجد إشعارات مطابقة</h3>
            <p className="text-sm text-stone-400 max-w-md mx-auto mb-5">
              {searchTerm 
                ? `لم نجد أي إشعار يحتوي على كلمة "${searchTerm}". جرب البحث بكلمات أخرى.` 
                : 'لا توجد إشعارات في هذا القسم حالياً.'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                مسح كلمة البحث
              </button>
            )}
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const iconConfig = getIconConfig(notif.type);
            const IconComponent = iconConfig.icon;

            return (
              <div
                key={notif.id}
                className={cn(
                  "bg-white p-5 rounded-3xl border transition-all duration-200 flex flex-col sm:flex-row items-start justify-between gap-4 group shadow-2xs hover:shadow-xs",
                  !notif.isRead 
                    ? "border-emerald-200/90 bg-emerald-50/20" 
                    : "border-stone-200/80 hover:border-stone-300"
                )}
              >
                {/* Left side: Icon + Texts */}
                <div className="flex items-start gap-4 flex-1">
                  {/* Type Icon */}
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs", iconConfig.colorClass)}>
                    <IconComponent className="h-6 w-6" />
                  </div>

                  {/* Text Details */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={cn("text-base font-black tracking-tight", !notif.isRead ? "text-[#1a4d2e]" : "text-[#2d2a26]")}>
                        {notif.title}
                      </h3>
                      <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", iconConfig.tagClass)}>
                        {notif.badge || iconConfig.tagText}
                      </span>
                      {!notif.isRead && (
                        <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs animate-pulse">
                          جديد
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-stone-600 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-stone-400 pt-1">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock className="h-3.5 w-3.5 text-stone-400" />
                        {formatArabicTimeAgo(notif.createdAt)}
                      </span>
                      <span>•</span>
                      <span>{new Date(notif.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>

                {/* Right side: Action Buttons */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  {notif.link && (
                    <button
                      onClick={() => handleOpenNotification(notif)}
                      className="px-4 py-2 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer group-hover:scale-102"
                    >
                      <span>عرض التفاصيل</span>
                      <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    </button>
                  )}

                  <div className="flex items-center gap-1.5">
                    {!notif.isRead && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="p-2 text-stone-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="تحديد كمقروء"
                      >
                        <Check className="h-4 w-4" />
                        <span className="hidden sm:inline text-[11px]">مقروء</span>
                      </button>
                    )}

                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      title="حذف هذا الإشعار"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
