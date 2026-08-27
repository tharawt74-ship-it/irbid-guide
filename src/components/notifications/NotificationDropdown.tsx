import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { 
  Bell, 
  CheckCheck, 
  Flame, 
  Briefcase, 
  Sparkles, 
  Newspaper, 
  Store, 
  ArrowLeft, 
  Clock, 
  Check, 
  ExternalLink,
  ChevronLeft
} from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationsContext';
import { AppNotification } from '../../types';
import { cn } from '../../lib/utils';

export function formatArabicTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffInSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));

  if (diffInSeconds < 60) return 'الآن';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    if (diffInMinutes === 1) return 'منذ دقيقة';
    if (diffInMinutes === 2) return 'منذ دقيقتين';
    if (diffInMinutes <= 10) return `منذ ${diffInMinutes} دقائق`;
    return `منذ ${diffInMinutes} دقيقة`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    if (diffInHours === 1) return 'منذ ساعة';
    if (diffInHours === 2) return 'منذ ساعتين';
    if (diffInHours <= 10) return `منذ ${diffInHours} ساعات`;
    return `منذ ${diffInHours} ساعة`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'أمس';
  if (diffInDays === 2) return 'منذ يومين';
  if (diffInDays <= 10) return `منذ ${diffInDays} أيام`;
  return `منذ ${diffInDays} يوم`;
}

function getNotificationIcon(type: AppNotification['type']) {
  switch (type) {
    case 'offer':
      return {
        icon: Flame,
        bgColor: 'bg-gradient-to-br from-red-500 to-orange-500 text-white',
        borderColor: 'border-red-200'
      };
    case 'job':
      return {
        icon: Briefcase,
        bgColor: 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white',
        borderColor: 'border-emerald-200'
      };
    case 'marketing':
      return {
        icon: Sparkles,
        bgColor: 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white',
        borderColor: 'border-purple-200'
      };
    case 'news':
      return {
        icon: Newspaper,
        bgColor: 'bg-gradient-to-br from-blue-600 to-sky-600 text-white',
        borderColor: 'border-blue-200'
      };
    case 'business':
    case 'system':
    default:
      return {
        icon: Store,
        bgColor: 'bg-gradient-to-br from-[#1a4d2e] to-[#133b22] text-white',
        borderColor: 'border-green-200'
      };
  }
}

export function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const displayedNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.isRead) 
    : notifications;

  const handleItemClick = (notif: AppNotification) => {
    markAsRead(notif.id);
    setIsOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleViewAll = () => {
    setIsOpen(false);
    navigate('/notifications');
  };

  const handleBellClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsOpen(false);
      navigate('/notifications');
    } else {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        type="button"
        onClick={handleBellClick}
        className={cn(
          "relative w-9 h-9 rounded-xl transition-all duration-200 cursor-pointer focus:outline-none flex items-center justify-center shrink-0 border",
          isOpen 
            ? "bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs" 
            : "bg-stone-50 hover:bg-stone-100 text-stone-600 border-stone-200"
        )}
        title="الإشعارات"
        aria-label="الإشعارات والتنبيهات"
      >
        <Bell className={cn("h-4 w-4 transition-transform", isOpen ? "scale-110" : "")} />
        
        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[11px] font-black min-w-[19px] h-[19px] px-1 rounded-full flex items-center justify-center shadow-xs animate-bounce border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Facebook-style Notification Popover Dropdown */}
      {isOpen && (
        <div 
          className="absolute left-0 sm:left-auto sm:-left-12 md:left-0 mt-2.5 w-[330px] sm:w-[380px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-stone-200/90 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-left"
          dir="rtl"
        >
          {/* Header */}
          <div className="p-4 bg-gradient-to-b from-stone-50 to-white border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-[#2d2a26] tracking-tight">الإشعارات</h3>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} جديدة
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="text-xs font-bold text-[#1a4d2e] hover:text-[#133b22] hover:bg-emerald-50 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="تحديد الكل كمقروء"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>تحديد الكل كمقروء</span>
              </button>
            )}
          </div>

          {/* Filter Tabs (الكل / غير المقروءة) */}
          <div className="px-4 py-2 border-b border-stone-100 flex items-center gap-2 bg-white">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-full transition-colors cursor-pointer",
                filter === 'all' 
                  ? "bg-[#1a4d2e] text-white shadow-2xs" 
                  : "text-stone-600 hover:bg-stone-100"
              )}
            >
              الكل ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={cn(
                "px-3 py-1 text-xs font-bold rounded-full transition-colors cursor-pointer",
                filter === 'unread' 
                  ? "bg-red-600 text-white shadow-2xs" 
                  : "text-stone-600 hover:bg-stone-100"
              )}
            >
              غير مقروءة ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-stone-100 overscroll-contain">
            {displayedNotifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 mx-auto flex items-center justify-center mb-3">
                  <Bell className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-stone-600 mb-1">
                  {filter === 'unread' ? 'لا توجد إشعارات غير مقروءة' : 'لا توجد إشعارات حالياً'}
                </p>
                <p className="text-xs text-stone-400">ستصلك أحدث العروض والوظائف والتنبيهات هنا فور نشرها.</p>
              </div>
            ) : (
              displayedNotifications.slice(0, 6).map((notif) => {
                const iconConfig = getNotificationIcon(notif.type);
                const IconComponent = iconConfig.icon;

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={cn(
                      "p-3.5 flex items-start gap-3 transition-colors cursor-pointer hover:bg-stone-50/90 relative group",
                      !notif.isRead ? "bg-emerald-50/30" : "bg-white"
                    )}
                  >
                    {/* Icon Avatar */}
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs", iconConfig.bgColor)}>
                      <IconComponent className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className={cn("text-xs font-bold truncate", !notif.isRead ? "text-stone-900 font-black" : "text-stone-700")}>
                          {notif.title}
                        </h4>
                        {!notif.isRead && (
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 shadow-xs" title="غير مقروء" />
                        )}
                      </div>
                      <p className="text-[11.5px] text-stone-500 line-clamp-2 leading-relaxed mb-1.5">
                        {notif.message}
                      </p>
                      <div className="flex items-center justify-between text-[10.5px] text-stone-400">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="h-3 w-3" />
                          {formatArabicTimeAgo(notif.createdAt)}
                        </span>
                        {notif.badge && (
                          <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-md">
                            {notif.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Dropdown Footer: عرض الكل */}
          <div className="p-3 bg-stone-50/80 border-t border-stone-100 text-center">
            <button
              type="button"
              onClick={handleViewAll}
              className="w-full py-2 px-4 rounded-xl bg-white hover:bg-stone-100 text-[#1a4d2e] font-bold text-xs border border-stone-200 shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>عرض كل الإشعارات</span>
              <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1 text-[#ff9f1c]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
