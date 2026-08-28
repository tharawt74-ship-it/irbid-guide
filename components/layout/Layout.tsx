import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Store, 
  LogOut, 
  User as UserIcon, 
  Shield, 
  MapPin, 
  Mail, 
  Phone, 
  Menu, 
  X, 
  Newspaper, 
  Sparkles, 
  Briefcase, 
  Home as HomeIcon,
  Building,
  Building2,
  Info,
  Compass,
  PlusCircle,
  Flame,
  Percent,
  Bell,
  MessageSquare,
  ChevronDown,
  ChevronLeft,
  Search,
  Clock,
  Bus,
  Settings
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationDropdown } from '../notifications/NotificationDropdown';
import { HeaderSearchModal } from '../search/HeaderSearchModal';
import { PwaInstallBanner, triggerPwaInstallModal } from '../pwa/PwaInstallBanner';
import { BottomNavigation } from './BottomNavigation';
import { FloatingScrollToTop } from '../FloatingScrollToTop';
import { db } from '../../lib/firebase';
import { Smartphone, Download, Facebook, Instagram, Send, Globe } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { useCart } from '../../contexts/CartContext';
import { FloatingCartWidget } from '../cart/FloatingCartWidget';
import { CartConflictModal } from '../cart/CartConflictModal';
import { ShoppingBag } from 'lucide-react';

export function Layout() {
  const { currentUser, isAdmin, isSupervisor, isStaff, isMerchant, userRole, logout } = useAuth();
  const { globalSettings } = useSystemSettings();
  const { totalCount } = useCart();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [showMenuTooltip, setShowMenuTooltip] = useState(false);
  const [showDesktopMoreTooltip, setShowDesktopMoreTooltip] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const closeMenu = () => {
    setMobileMenuOpen(false);
    setMoreMenuOpen(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;
    if (deltaX > 45) {
      closeMenu();
    }
    setTouchStartX(null);
  };

  const handleDismissTooltip = () => {
    setShowMenuTooltip(false);
  };

  const handleDismissDesktopTooltip = () => {
    setShowDesktopMoreTooltip(false);
  };

  // Guidance popup for mobile menu - triggers on every page refresh after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mobileMenuOpen) {
        setShowMenuTooltip(true);
      }
    }, 2000); // Appear in 2 seconds

    const autoHideTimer = setTimeout(() => {
      setShowMenuTooltip(false);
    }, 14000); // Dismiss after visibility duration

    return () => {
      clearTimeout(timer);
      clearTimeout(autoHideTimer);
    };
  }, [mobileMenuOpen]);

  // Guidance popup for desktop 'المزيد' button - triggers on every page refresh after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!moreMenuOpen) {
        setShowDesktopMoreTooltip(true);
      }
    }, 2000); // Appear in 2 seconds

    const autoHideTimer = setTimeout(() => {
      setShowDesktopMoreTooltip(false);
    }, 14000); // Dismiss after visibility duration

    return () => {
      clearTimeout(timer);
      clearTimeout(autoHideTimer);
    };
  }, [moreMenuOpen]);

  // Keyboard shortcut (Ctrl+K, Cmd+K, or /) to open quick search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(prev => !prev);
      } else if (
        e.key === '/' && 
        !isSearchModalOpen &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable)
      ) {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen]);

  useEffect(() => {
    const path = location.pathname;
    if (path !== '/login' && path !== '/register') {
      sessionStorage.setItem('lastNonAuthPath', path + location.search);
    }
  }, [location]);

  useEffect(() => {
    if (!currentUser || !db) {
      setHasUnreadMessages(false);
      return;
    }

    let unsubUser = () => {};
    let unsubOwner = () => {};

    try {
      const qUser = query(collection(db, 'chatRooms'), where('userId', '==', currentUser.uid));
      unsubUser = onSnapshot(qUser, (snapUser) => {
        const userUnreads = snapUser.docs.some(docSnap => docSnap.data().unreadByUser === true);
        
        const qOwner = query(collection(db, 'chatRooms'), where('businessOwnerId', '==', currentUser.uid));
        unsubOwner = onSnapshot(qOwner, (snapOwner) => {
          const ownerUnreads = snapOwner.docs.some(docSnap => docSnap.data().unreadByBusiness === true);
          setHasUnreadMessages(userUnreads || ownerUnreads);
        }, (err) => {
          console.error("Error reading owner unreads:", err);
        });
      }, (err) => {
        console.error("Error reading user unreads:", err);
      });
    } catch (e) {
      console.error("Error setting up unreads listener:", e);
    }

    return () => {
      unsubUser();
      unsubOwner();
    };
  }, [currentUser]);

  const navItems = [
    { path: '/', label: 'الرئيسية', icon: HomeIcon },
    { path: '/offers', label: 'عروض وخصومات', icon: Flame, isSpecial: true },
    { path: '/jobs', label: 'الوظائف', icon: Briefcase, isHot: true },
    { path: '/housing', label: 'سكنات وعقارات', icon: Building },
    { path: '/packages', label: 'الباقات', icon: Sparkles },
  ];

  const moreItems = [
    { path: '/housing', label: 'سكنات وعقارات إربد', icon: Building },
    { path: '/packages', label: 'باقات الترويج والإعلانات', icon: Sparkles },
    { path: '/transportation', label: 'دليل المواصلات والمجمعات', icon: Bus },
    { path: '/news', label: 'أخبار إربد', icon: Newspaper },
    { path: '/tourism', label: 'أماكن سياحية وترفيهية', icon: Compass },
    { path: '/prayer-times', label: 'مواقيت الصلاة', icon: Clock },
  ];

  return (
    <div className="min-h-screen bg-[#fdfcfb] flex flex-col font-sans text-[#2d2a26] overflow-x-clip" dir="rtl">
      {/* Top Navigation Bar - Sticky at all scroll depths */}
      <header className="h-[64px] md:h-[72px] px-2.5 sm:px-4 lg:px-6 2xl:px-8 border-b border-stone-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-50 transition-all duration-200 shadow-2xs w-full max-w-full">
        {/* Desktop Header Layout */}
        <div className="hidden lg:flex w-full max-w-7xl mx-auto h-full items-center justify-between gap-1.5 sm:gap-2 lg:gap-3 flex-nowrap min-w-0">
          
          {/* Right Area (RTL): Brand Logo & Navigation */}
          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 xl:gap-3.5 flex-nowrap shrink-0 min-w-0">
            {/* Brand Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-1.5 md:gap-2 group shrink-0 focus:outline-none" 
              onClick={closeMenu}
            >
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-[#1a4d2e] to-[#133b22] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-all duration-300 shrink-0">
                <Store className="h-4 w-4 md:h-4.5 md:w-4.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm md:text-base xl:text-lg font-black tracking-tight text-[#1a4d2e] leading-none whitespace-nowrap">
                  {globalSettings.siteName}
                </span>
                <span className="text-[8px] md:text-[9px] font-bold text-stone-400 mt-0.5 hidden sm:block whitespace-nowrap">{globalSettings.siteSubtitle}</span>
              </div>
            </Link>
            
            {/* Desktop Navigation Links */}
            <nav className="flex items-center gap-1 xl:gap-1.5 text-xs xl:text-[13px] font-bold flex-nowrap shrink-0">
              <Link
                to="/offers"
                className={cn(
                  "flex items-center gap-1 px-2 xl:px-2.5 py-1.5 rounded-xl transition-all duration-300 relative group cursor-pointer shrink-0",
                  location.pathname === '/offers'
                    ? "bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-white shadow-md font-black scale-105"
                    : "bg-gradient-to-r from-orange-50 via-amber-50 to-red-50 text-orange-950 border border-orange-200/90 hover:border-orange-400 shadow-2xs hover:shadow-xs"
                )}
              >
                <Flame className={cn("h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110", location.pathname === '/offers' ? "text-yellow-300 animate-bounce" : "text-red-500 animate-pulse")} />
                <span className="font-black tracking-tight whitespace-nowrap">عروض وخصومات</span>
              </Link>

              <Link
                to="/jobs"
                className={cn(
                  "flex items-center gap-1 px-2 xl:px-2.5 py-1.5 rounded-xl transition-all duration-200 relative shrink-0",
                  location.pathname === '/jobs'
                    ? "bg-[#1a4d2e] text-white shadow-xs font-black"
                    : "text-stone-600 hover:text-[#1a4d2e] hover:bg-stone-100/90"
                )}
              >
                <Briefcase className={cn("h-3.5 w-3.5 shrink-0", location.pathname === '/jobs' ? "text-white" : "text-stone-400 group-hover:text-[#1a4d2e]")} />
                <span className="whitespace-nowrap">الوظائف</span>
                {location.pathname !== '/jobs' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                )}
              </Link>

              <Link
                to="/housing"
                className={cn(
                  "flex items-center gap-1 px-2 xl:px-2.5 py-1.5 rounded-xl transition-all duration-200 relative shrink-0",
                  location.pathname === '/housing'
                    ? "bg-[#1a4d2e] text-white shadow-xs font-black"
                    : "text-stone-600 hover:text-[#1a4d2e] hover:bg-stone-100/90"
                )}
              >
                <Building className={cn("h-3.5 w-3.5 shrink-0", location.pathname === '/housing' ? "text-white" : "text-stone-400 group-hover:text-[#1a4d2e]")} />
                <span className="whitespace-nowrap">سكنات وعقارات</span>
              </Link>

              <Link
                to="/packages"
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all duration-200 relative shrink-0",
                  (location.pathname === '/packages' || location.pathname === '/pricing')
                    ? "bg-[#1a4d2e] text-white shadow-xs font-black"
                    : "text-stone-600 hover:text-[#1a4d2e] hover:bg-stone-100/90"
                )}
              >
                <Sparkles className={cn("h-3.5 w-3.5 shrink-0", (location.pathname === '/packages' || location.pathname === '/pricing') ? "text-white" : "text-stone-400 group-hover:text-[#1a4d2e]")} />
                <span className="whitespace-nowrap">الباقات</span>
              </Link>

              {/* More Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(!moreMenuOpen);
                    handleDismissDesktopTooltip();
                  }}
                  className={cn(
                    "flex items-center gap-1 px-2 xl:px-2.5 py-1.5 rounded-xl transition-all font-bold cursor-pointer shrink-0 border whitespace-nowrap",
                    (location.pathname === '/transportation' || location.pathname === '/news' || location.pathname === '/tourism' || location.pathname === '/prayer-times' || location.pathname === '/housing' || location.pathname === '/packages' || location.pathname === '/pricing')
                      ? "bg-[#1a4d2e] text-white border-[#1a4d2e]"
                      : "bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200"
                  )}
                >
                  <span>المزيد</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", moreMenuOpen && "rotate-180")} />
                </button>

                {showDesktopMoreTooltip && !moreMenuOpen && (
                  <div className="absolute top-[46px] -right-2 sm:-right-6 w-64 bg-white/98 backdrop-blur-md rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.12)] border border-stone-200/95 p-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-300 text-right" style={{ direction: 'rtl' }}>
                    <div className="absolute -top-1.5 right-6 w-3 h-3 bg-white border-t border-r border-stone-200/90 rotate-[-45deg]" />
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-amber-600">
                          <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                          <span className="text-xs font-black text-stone-900">أقسام وخدمات إضافية!</span>
                        </div>
                        <button onClick={handleDismissDesktopTooltip} className="text-stone-400 hover:text-stone-600 hover:bg-stone-100 p-1 rounded-lg transition-all duration-200 cursor-pointer">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-[11px] text-stone-600 font-medium leading-relaxed">
                        اضغط هنا لاستعراض <span className="font-bold text-[#1a4d2e]">دليل المواصلات</span>، <span className="font-bold text-blue-600">سكنات إربد</span>، <span className="font-bold text-emerald-700">مواقيت الصلاة</span> و<span className="font-bold text-amber-700">أخبار المدينة</span>!
                      </p>
                      <div className="flex justify-end pt-1">
                        <button onClick={() => { setMoreMenuOpen(true); handleDismissDesktopTooltip(); }} className="text-[10px] font-bold text-white bg-[#1a4d2e] hover:bg-[#133b22] px-2.5 py-1 rounded-lg shadow-3xs transition-all duration-200 cursor-pointer">
                          استكشف المزيد
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {moreMenuOpen && (
                  <div className="absolute top-full mt-2 right-0 w-56 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in zoom-in-95">
                    {moreItems.map((mItem) => {
                      const MIcon = mItem.icon;
                      const isMActive = location.pathname === mItem.path;
                      return (
                        <Link
                          key={mItem.path}
                          to={mItem.path}
                          onClick={() => setMoreMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold transition-colors",
                            isMActive ? "bg-[#1a4d2e]/10 text-[#1a4d2e]" : "text-stone-700 hover:bg-stone-50"
                          )}
                        >
                          <MIcon className="h-4 w-4 text-[#1a4d2e] shrink-0" />
                          <span>{mItem.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Left Area (RTL): Desktop Actions */}
          <div className="flex items-center gap-1.5 lg:gap-2 flex-nowrap shrink-0 min-w-0">
            <button
              type="button"
              onClick={() => setIsSearchModalOpen(true)}
              className="relative w-8.5 h-8.5 rounded-xl transition-all duration-200 cursor-pointer focus:outline-none flex items-center justify-center shrink-0 border bg-stone-50 hover:bg-stone-100 text-stone-600 hover:text-[#1a4d2e] border-stone-200 shadow-2xs hover:shadow-xs group"
              title="البحث السريع (Ctrl+K)"
            >
              <Search className="h-4 w-4 transition-transform group-hover:scale-110" />
            </button>

            <NotificationDropdown />

            {currentUser && (
              <Link 
                to="/messages" 
                className={cn(
                  "relative w-8.5 h-8.5 rounded-xl transition-colors flex items-center justify-center shrink-0 border",
                  location.pathname === '/messages' ? "bg-[#1a4d2e] text-white border-[#1a4d2e]" : "bg-stone-50 hover:bg-stone-100 text-stone-600 border-stone-200"
                )}
              >
                <MessageSquare className="h-4 w-4" />
                {hasUnreadMessages && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full border border-white animate-pulse" />
                )}
              </Link>
            )}

            {totalCount > 0 ? (
              <Link
                to="/cart"
                className="flex h-8.5 items-center justify-center gap-1.5 text-xs font-black px-3 rounded-xl transition-all shadow-xs border border-amber-600 bg-amber-500 hover:bg-amber-600 text-white cursor-pointer shrink-0 relative"
                title="سلة التسوّق وقائمة الحجز"
              >
                <ShoppingBag className="h-3.5 w-3.5 text-amber-200" />
                <span>السلة</span>
                <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full min-w-[16px] text-center">
                  {totalCount}
                </span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={triggerPwaInstallModal}
                className="flex h-8.5 items-center justify-center gap-1 text-xs font-black bg-stone-900 hover:bg-stone-800 text-emerald-400 border border-stone-800 px-2.5 rounded-xl transition-all shadow-2xs cursor-pointer"
              >
                <Smartphone className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                <span>تنزيل التطبيق</span>
              </button>
            )}

            <Link 
              to="/contact" 
              className="flex h-8.5 items-center gap-1 text-xs font-bold bg-[#1a4d2e] hover:bg-[#133b22] text-white px-2.5 rounded-xl transition-all shadow-xs"
            >
              <PlusCircle className="h-3.5 w-3.5 text-[#ff9f1c]" />
              <span>أضف محلك</span>
            </Link>

            {isStaff && (
              <Link 
                to="/admin" 
                className={cn(
                  "flex h-8.5 items-center justify-center gap-1 text-xs font-bold px-2 rounded-xl transition-colors border",
                  isAdmin ? "bg-amber-50 text-amber-900 border-amber-300" : "bg-blue-50 text-blue-900 border-blue-200"
                )}
              >
                <Shield className="h-3.5 w-3.5" />
                <span>{isAdmin ? "الإدارة" : "الإشراف"}</span>
              </Link>
            )}

            {currentUser ? (
              <div className="flex h-8.5 items-center gap-0.5 bg-stone-50 border border-stone-200 px-1 rounded-xl shadow-2xs">
                <Link to="/profile" className="text-xs text-stone-800 font-bold flex items-center gap-1 px-1">
                  <div className="w-5 h-5 rounded-lg bg-[#1a4d2e] text-white flex items-center justify-center text-[9px] font-bold">
                    {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span>{currentUser.displayName?.split(' ')[0] || currentUser.email?.split('@')[0]}</span>
                </Link>
                <Link to="/profile/settings" className="w-6 h-6 flex items-center justify-center text-stone-500 hover:text-stone-900 rounded-lg">
                  <Settings className="h-3 w-3" />
                </Link>
                <button onClick={logout} className="w-6 h-6 flex items-center justify-center text-red-600 rounded-lg">
                  <LogOut className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Link to="/login" className="h-8.5 px-2 flex items-center justify-center text-xs font-bold text-stone-700 hover:bg-stone-100 rounded-xl">دخول</Link>
                <Link to="/register" className="h-8.5 px-2.5 flex items-center justify-center text-xs font-bold bg-[#1a4d2e] text-white rounded-xl">تسجيل</Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Header Layout (LG and below) - Centered Logo and Menu button ONLY */}
        <div className="lg:hidden w-full h-full flex items-center justify-between px-2 min-w-0 relative">
          
          {/* Menu Button on the Right */}
          <div className="relative">
            <button 
              className="w-9 h-9 flex items-center justify-center text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors focus:outline-none cursor-pointer border border-stone-200 shrink-0"
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
                handleDismissTooltip();
              }}
              aria-label="قائمة التصفح"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Premium Mobile Menu Guidance Talk Bubble (Tooltip) */}
            {showMenuTooltip && !mobileMenuOpen && (
              <div 
                className="absolute top-[48px] right-0 w-64 bg-white/98 backdrop-blur-md rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-stone-200/90 p-3.5 z-50 animate-in fade-in slide-in-from-top-3 duration-300 text-right"
                style={{ direction: 'rtl' }}
              >
                {/* Visual Arrow pointing to menu button */}
                <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white border-t border-r border-stone-200/90 rotate-[-45deg]"></div>
                
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-600">
                      <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                      <span className="text-xs font-black text-stone-900">تصفّح أقسام إربد!</span>
                    </div>
                    <button 
                      onClick={handleDismissTooltip}
                      className="text-stone-400 hover:text-stone-600 hover:bg-stone-100 p-1 rounded-lg transition-all duration-200 cursor-pointer"
                      title="إغلاق"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-[11px] text-stone-600 font-medium leading-relaxed">
                    انقر هنا لمشاهدة <span className="font-bold text-orange-600">العروض والخصومات %</span>، <span className="font-bold text-[#1a4d2e]">الوظائف الشاغرة</span>، و<span className="font-bold text-blue-600">سكنات وعقارات</span> المدينة!
                  </p>
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(true);
                        handleDismissTooltip();
                      }}
                      className="text-[10px] font-bold text-white bg-[#1a4d2e] hover:bg-[#133b22] px-2.5 py-1 rounded-lg shadow-3xs transition-all duration-200 cursor-pointer"
                    >
                      استكشف الآن
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Centered Logo absolutely aligned to the middle */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto">
            <Link 
              to="/" 
              className="flex items-center gap-1.5 group shrink-0 focus:outline-none" 
              onClick={closeMenu}
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1a4d2e] to-[#133b22] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-all duration-300 shrink-0">
                <Store className="h-4 w-4" />
              </div>
              <div className="flex flex-col text-right">
                <span className="text-sm font-black tracking-tight text-[#1a4d2e] leading-none whitespace-nowrap">
                  {globalSettings.siteName}
                </span>
                <span className="text-[8px] font-bold text-stone-400 mt-0.5 whitespace-nowrap">{globalSettings.siteSubtitle}</span>
              </div>
            </Link>
          </div>

          {/* Cart & Notification Buttons on the Left */}
          <div className="relative z-10 flex items-center gap-1.5">
            {totalCount > 0 && (
              <Link
                to="/cart"
                className="relative w-8.5 h-8.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-2xs border border-amber-600 transition-colors"
                title="سلة التسوّق وقائمة الحجز"
              >
                <ShoppingBag className="h-4 w-4" />
                <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white">
                  {totalCount}
                </span>
              </Link>
            )}

            <NotificationDropdown />
          </div>
        </div>
      </header>

      {/* Clean Mobile Menu Overlay with Smooth Entry and Exit Animations */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop Fade In/Out */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="fixed inset-0 bg-stone-950/70 backdrop-blur-sm"
              onClick={closeMenu}
            />

            {/* Drawer Container Slide In/Out with Smooth Spring Physics */}
            <motion.div 
              initial={{ x: '100%', opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.9 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280, mass: 0.8 }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="fixed inset-y-0 right-0 w-full max-w-[320px] bg-stone-50 shadow-2xl flex flex-col h-full max-h-screen z-50 relative" 
              dir="rtl"
            >
            {/* Visual Drag Indicator Handle for Swipe to Dismiss */}
            <div className="absolute top-1/2 -left-2.5 -translate-y-1/2 w-1.5 h-14 rounded-full bg-stone-300/80 shadow-xs pointer-events-none md:hidden" />
            
            {/* Scrollable Content Wrapper */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 min-h-0">
              
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-200/80">
                <Link to="/" onClick={closeMenu} className="flex items-center gap-2.5 font-black text-lg text-[#2d2a26]">
                  <div className="w-8 h-8 rounded-xl bg-[#1a4d2e] flex items-center justify-center text-white shadow-xs">
                    <Store className="h-4 w-4 text-[#ff9f1c]" />
                  </div>
                  <span>{globalSettings.siteName}</span>
                </Link>

                <button
                  onClick={closeMenu}
                  className="p-2 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-200/70 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* User Account / Welcome Header Bar */}
              {currentUser ? (
                <div className="bg-white p-3.5 rounded-2xl border border-stone-200/90 shadow-2xs flex items-center justify-between gap-2 hover:border-[#1a4d2e]/40 transition-colors">
                  <Link 
                    to="/profile" 
                    onClick={closeMenu} 
                    className="flex items-center gap-2.5 min-w-0 flex-1 group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#1a4d2e] text-white font-black flex items-center justify-center text-sm shadow-2xs group-hover:scale-105 transition-transform shrink-0">
                      {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-stone-800 truncate group-hover:text-[#1a4d2e] transition-colors">
                        {currentUser.displayName || currentUser.email?.split('@')[0]}
                      </p>
                      <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                        <span>الملف الشخصي والحساب</span>
                        <ChevronLeft className="h-3 w-3" />
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      to="/profile/settings"
                      onClick={closeMenu}
                      className="p-2 text-stone-400 hover:text-[#1a4d2e] hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                      title="إعدادات الحساب"
                    >
                      <Settings className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => {
                        closeMenu();
                        logout();
                      }}
                      className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      title="تسجيل الخروج"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-stone-900 to-[#1a4d2e] p-3.5 rounded-2xl text-white shadow-xs flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-black text-white">أهلاً بك في إربد! 👋</p>
                    <p className="text-[10px] text-stone-300">سجل حسابك لحفظ المفضلات والرسائل</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      to="/login"
                      onClick={closeMenu}
                      className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-stone-950 text-xs font-black rounded-xl transition-colors"
                    >
                      دخول
                    </Link>
                    <Link
                      to="/register"
                      onClick={closeMenu}
                      className="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      تسجيل
                    </Link>
                  </div>
                </div>
              )}

              {/* Action 1: App Download Banner */}
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  triggerPwaInstallModal();
                }}
                className="w-full p-3 rounded-2xl bg-gradient-to-r from-stone-900 via-stone-800 to-[#1a4d2e] text-white flex items-center justify-between border border-stone-800 shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                    <Smartphone className="h-4 w-4 animate-pulse" />
                  </div>
                  <span className="text-xs font-black text-emerald-300">تنزيل تطبيق الهاتف مجاناً</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-extrabold px-2 py-0.5 rounded-md border border-emerald-500/30">
                  تثبيت 📲
                </span>
              </button>

              {/* Action 2: Quick Search Bar Button */}
              <button
                type="button"
                onClick={() => {
                  closeMenu();
                  setIsSearchModalOpen(true);
                }}
                className="w-full p-2.5 rounded-2xl bg-white text-stone-600 hover:text-stone-900 border border-stone-200/90 shadow-2xs flex items-center justify-between transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Search className="h-4 w-4 text-[#1a4d2e]" />
                  <span className="text-xs font-bold">عن ماذا تبحث في إربد؟</span>
                </div>
                <span className="text-[10px] bg-stone-100 text-stone-500 font-bold px-2 py-0.5 rounded-lg border border-stone-200">
                  بحث
                </span>
              </button>

              {/* Section: Communications (Notifications & Messages) */}
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/notifications"
                  onClick={closeMenu}
                  className="p-2.5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:border-emerald-300 transition-all flex items-center gap-2"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#1a4d2e] flex items-center justify-center shrink-0">
                    <Bell className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-black text-stone-800 truncate">الإشعارات</span>
                    <span className="text-[9px] text-stone-500 font-bold truncate">تنبيهات عاجلة</span>
                  </div>
                </Link>

                <Link
                  to="/messages"
                  onClick={closeMenu}
                  className="p-2.5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:border-emerald-300 transition-all flex items-center gap-2 relative"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#1a4d2e] flex items-center justify-center shrink-0">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-black text-stone-800 truncate">المحادثات</span>
                    <span className="text-[9px] text-stone-500 font-bold truncate">دردشة ورسائل</span>
                  </div>
                  {hasUnreadMessages && (
                    <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  )}
                </Link>
              </div>

              {/* Section: Main App Grid */}
              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-black text-stone-400 px-1">تصفح أقسام المنصة</p>
                <nav className="grid grid-cols-2 gap-2">
                  <Link
                    to="/"
                    onClick={closeMenu}
                    className="p-3 rounded-2xl bg-[#1a4d2e] text-white flex items-center gap-2 font-black text-xs shadow-2xs transition-all hover:bg-[#143d24]"
                  >
                    <Store className="h-4 w-4 text-[#ff9f1c]" />
                    <span>الرئيسية</span>
                  </Link>

                  <Link
                    to="/offers"
                    onClick={closeMenu}
                    className="p-3 rounded-2xl bg-gradient-to-r from-amber-500 to-red-600 text-white flex items-center justify-between font-black text-xs shadow-2xs transition-all hover:brightness-105"
                  >
                    <div className="flex items-center gap-1.5">
                      <Flame className="h-4 w-4 text-amber-200" />
                      <span>عروض وخصومات</span>
                    </div>
                  </Link>

                  <Link
                    to="/jobs"
                    onClick={closeMenu}
                    className="p-3 rounded-2xl bg-white border border-stone-200/90 text-stone-800 hover:bg-stone-100 flex items-center gap-2 font-bold text-xs transition-all"
                  >
                    <Briefcase className="h-4 w-4 text-emerald-700" />
                    <span>الوظائف</span>
                  </Link>

                  <Link
                    to="/housing"
                    onClick={closeMenu}
                    className="p-3 rounded-2xl bg-white border border-stone-200/90 text-stone-800 hover:bg-stone-100 flex items-center gap-2 font-bold text-xs transition-all"
                  >
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span>سكنات وعقارات</span>
                  </Link>

                  <Link
                    to="/transportation"
                    onClick={closeMenu}
                    className="p-3 rounded-2xl bg-white border border-stone-200/90 text-stone-800 hover:bg-stone-100 flex items-center gap-2 font-bold text-xs transition-all col-span-2"
                  >
                    <Bus className="h-4 w-4 text-amber-600" />
                    <span>دليل المواصلات والمجمعات</span>
                  </Link>

                  <Link
                    to="/news"
                    onClick={closeMenu}
                    className="p-3 rounded-2xl bg-white border border-stone-200/90 text-stone-800 hover:bg-stone-100 flex items-center gap-2 font-bold text-xs transition-all"
                  >
                    <Newspaper className="h-4 w-4 text-purple-600" />
                    <span>أخبار إربد</span>
                  </Link>

                  <Link
                    to="/tourism"
                    onClick={closeMenu}
                    className="p-3 rounded-2xl bg-white border border-stone-200/90 text-stone-800 hover:bg-stone-100 flex items-center gap-2 font-bold text-xs transition-all"
                  >
                    <Compass className="h-4 w-4 text-teal-600" />
                    <span>أماكن سياحية</span>
                  </Link>

                  <Link
                    to="/prayer-times"
                    onClick={closeMenu}
                    className="p-3 rounded-2xl bg-white border border-stone-200/90 text-stone-800 hover:bg-stone-100 flex items-center gap-2 font-bold text-xs transition-all"
                  >
                    <Clock className="h-4 w-4 text-indigo-600" />
                    <span>مواقيت الصلاة</span>
                  </Link>

                  <Link
                    to="/packages"
                    onClick={closeMenu}
                    className="p-3 rounded-2xl bg-white border border-stone-200/90 text-stone-800 hover:bg-stone-100 flex items-center gap-2 font-bold text-xs transition-all"
                  >
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>باقات VIP</span>
                  </Link>

                  {currentUser && (
                    <Link
                      to="/profile"
                      onClick={closeMenu}
                      className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-[#1a4d2e] border border-emerald-200/80 flex items-center justify-between font-black text-xs transition-all col-span-2"
                    >
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-[#1a4d2e]" />
                        <span>الملف الشخصي والحساب</span>
                      </div>
                      <ChevronLeft className="h-3.5 w-3.5 text-[#1a4d2e]" />
                    </Link>
                  )}
                </nav>
              </div>

              {/* Section: Admin or Add Business Button */}
              {isAdmin ? (
                <Link
                  to="/admin"
                  onClick={closeMenu}
                  className="w-full p-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Shield className="h-4 w-4" />
                  <span>لوحة التحكم والإدارة</span>
                </Link>
              ) : (
                <Link
                  to="/contact"
                  onClick={closeMenu}
                  className="w-full p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-[#1a4d2e] border border-emerald-200/80 font-black text-xs flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2">
                    <PlusCircle className="h-4 w-4 text-[#1a4d2e]" />
                    <span>هل تملك محلاً في إربد؟</span>
                  </div>
                  <span className="text-[10px] bg-[#1a4d2e] text-white font-bold px-2 py-0.5 rounded-md">
                    أضف مجاناً
                  </span>
                </Link>
              )}

              {/* Footer info links */}
              <div className="flex items-center justify-around pt-3 text-[11px] font-bold text-stone-500 border-t border-stone-200/80">
                <Link to="/about" onClick={closeMenu} className="hover:text-stone-900 transition-colors flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" />
                  <span>عن المنصة</span>
                </Link>
                <span className="text-stone-300">•</span>
                <Link to="/contact" onClick={closeMenu} className="hover:text-stone-900 transition-colors flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  <span>اتصل بنا</span>
                </Link>
              </div>

              {/* Drawer Version Note */}
              <div className="pt-2 text-center border-t border-stone-100 mt-2">
                <p className="text-[10px] text-stone-400 font-bold">
                  دليل "{globalSettings.siteName}" الرقمي 📱
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
      
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:py-12 flex flex-col">
        <Outlet />
      </main>
      
      <footer className="bg-white border-t border-[#e5e1da] mt-auto">
        <div className="max-w-[1200px] mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <Link to="/" className="text-2xl font-black tracking-tighter text-[#1a4d2e] flex items-center gap-2 mb-4">
                <Store className="h-6 w-6 text-[#ff9f1c]" />
                <span>{globalSettings.siteName}</span>
              </Link>
              <p className="text-stone-500 text-sm leading-relaxed max-w-sm mb-4">
                {globalSettings.footerDescription || "المنصة الأولى لاكتشاف أفضل المطاعم والمقاهي والمحلات التجارية في عروس الشمال. دليلك الشامل لكل ما تحتاجه في إربد."}
              </p>
              <button
                type="button"
                onClick={triggerPwaInstallModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-emerald-400 font-bold text-xs rounded-xl shadow-xs border border-stone-800 transition-all cursor-pointer active:scale-98"
              >
                <Smartphone className="h-4 w-4 text-emerald-400 animate-pulse" />
                <span>تنزيل تطبيق الهاتف مجاناً 📱</span>
              </button>
            </div>
            <div>
              <h3 className="font-bold text-[#2d2a26] mb-4">روابط سريعة</h3>
              <ul className="space-y-3 text-sm text-stone-500">
                <li><Link to="/" className="hover:text-[#ff9f1c] transition-colors">الرئيسية</Link></li>
                <li><Link to="/transportation" className="hover:text-[#ff9f1c] transition-colors font-bold text-[#1a4d2e] flex items-center gap-1"><Bus className="h-3.5 w-3.5 text-[#ff9f1c]" /> دليل المواصلات والمجمعات</Link></li>
                <li><Link to="/notifications" className="hover:text-[#ff9f1c] transition-colors flex items-center gap-1 font-bold text-stone-700"><Bell className="h-3.5 w-3.5 text-[#ff9f1c]" /> مركز الإشعارات</Link></li>
                <li><Link to="/offers" className="hover:text-[#ff9f1c] transition-colors font-black text-orange-600">عروض وخصومات إربد</Link></li>
                <li><Link to="/jobs" className="hover:text-[#ff9f1c] transition-colors font-bold text-[#1a4d2e]">وظائف وشواغر إربد</Link></li>
                <li><Link to="/packages" className="hover:text-[#ff9f1c] transition-colors font-bold text-[#1a4d2e]">باقات الاشتراك والترويج</Link></li>
                <li><Link to="/contact" className="hover:text-[#ff9f1c] transition-colors">أضف محلك</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-[#2d2a26] mb-4">تواصل معنا</h3>
              <ul className="space-y-3 text-sm text-stone-500 mb-4">
                <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#ff9f1c]" /> إربد، الأردن</li>
                <li className="flex items-center gap-2" dir="ltr"><Mail className="h-4 w-4 text-[#ff9f1c]" /> {globalSettings.contactEmail || "info@shoof-irbid.com"}</li>
                <li className="flex items-center gap-2" dir="ltr"><Phone className="h-4 w-4 text-[#ff9f1c]" /> {globalSettings.contactPhone || "+962 7 0000 0000"}</li>
              </ul>
              {/* Social Media Icon-Only Buttons */}
              <div className="flex items-center gap-2 pt-1">
                {globalSettings.facebookUrl && (
                  <a
                    href={globalSettings.facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="فيسبوك"
                    aria-label="فيسبوك"
                    className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center hover:scale-110 hover:bg-blue-100 transition-all shadow-3xs"
                  >
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {globalSettings.instagramUrl && (
                  <a
                    href={globalSettings.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="إنستغرام"
                    aria-label="إنستغرام"
                    className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 border border-pink-200 flex items-center justify-center hover:scale-110 hover:bg-pink-100 transition-all shadow-3xs"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {globalSettings.whatsappNumber && (
                  <a
                    href={`https://wa.me/${globalSettings.whatsappNumber}`}
                    target="_blank"
                    rel="noreferrer"
                    title="واتساب"
                    aria-label="واتساب"
                    className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center hover:scale-110 hover:bg-emerald-100 transition-all shadow-3xs"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-[#e5e1da] text-center text-sm font-medium text-stone-400 flex flex-col md:flex-row justify-between items-center gap-4">
            <div>© {new Date().getFullYear()} {globalSettings.siteName}. جميع الحقوق محفوظة.</div>
            <div className="flex gap-4">
              <Link to="/about" className="hover:text-[#1a4d2e] transition-colors">من نحن</Link>
              <Link to="/terms" className="hover:text-[#1a4d2e] transition-colors">الشروط والأحكام</Link>
              <Link to="/privacy" className="hover:text-[#1a4d2e] transition-colors">سياسة الخصوصية</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Global Quick Search Modal Dialog */}
      <HeaderSearchModal 
        isOpen={isSearchModalOpen} 
        onClose={() => setIsSearchModalOpen(false)} 
      />

      {/* Progressive Web App Install Banner */}
      <PwaInstallBanner />

      {/* Floating Mobile Scroll To Top Button */}
      <FloatingScrollToTop />

      {/* Floating Cart & Cart Conflict Resolution Modal */}
      <FloatingCartWidget />
      <CartConflictModal />

      {/* Mobile Fixed Bottom Navigation Bar */}
      <BottomNavigation 
        onOpenSearch={() => setIsSearchModalOpen(true)} 
        hasUnreadMessages={hasUnreadMessages} 
        onToggleMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        isMenuOpen={mobileMenuOpen}
      />
    </div>
  );
}
