import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { getJordanYear } from '../../lib/jordanTime';
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
  Settings,
  Bot,
  Stethoscope,
  QrCode,
  Crown,
  Zap,
  Utensils
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationDropdown } from '../notifications/NotificationDropdown';
// Removed HeaderSearchModal import
import { PwaInstallBanner, triggerPwaInstallModal } from '../pwa/PwaInstallBanner';
import { BottomNavigation } from './BottomNavigation';
import { FloatingScrollToTop } from '../FloatingScrollToTop';
import { db, auth } from '../../lib/firebase';
import { sendEmailVerification } from 'firebase/auth';
import { sendCustomVerificationEmail } from '../../lib/email';
import { Smartphone, Download, Facebook, Instagram, Send, Globe, Loader2, AlertCircle, CheckCircle2, RefreshCw, Hourglass } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { useCart } from '../../contexts/CartContext';
import { FloatingCartWidget } from '../cart/FloatingCartWidget';
import { CartConflictModal } from '../cart/CartConflictModal';
import { AiSiteAssistant } from '../ai/AiSiteAssistant';
import { ShoppingBag } from 'lucide-react';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import { ensurePushSubscription } from '../../lib/pushNotifications';

export function Layout() {
  const { currentUser, userProfile, refreshUserData, isAdmin, isSupervisor, isStaff, isMerchant, ownedBusinesses, userRole, logout } = useAuth();
  const { globalSettings, isSettingsLoaded } = useSystemSettings();
  const { totalCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [mobileProfileExpanded, setMobileProfileExpanded] = useState(false);

  const hasBusinessesOrMedical = Boolean(
    (ownedBusinesses && ownedBusinesses.length > 0) || 
    isMerchant || 
    userRole === 'merchant'
  );

  // Background Web Push Sync
  useEffect(() => {
    ensurePushSubscription(currentUser?.uid, userRole);
  }, [currentUser?.uid, userRole]);

  // Active businesses with gift code promotion enabled (strictly for merchants)
  const activeGiftBusinesses = (ownedBusinesses || []).filter(b => 
    b.giftCodeEnabled === true || (b as any).giftCodeEnabled === 'true'
  );

  // Check if owner of a Food and Beverage business
  const hasFoodAndDrinkBusiness = (ownedBusinesses || []).some(b => {
    if (!b.category) return false;
    const catLower = b.category.toLowerCase();
    return (
      catLower.includes('مأكولات') || 
      catLower.includes('مشروبات') || 
      catLower.includes('مطاعم') || 
      catLower.includes('كافيه') || 
      catLower.includes('حلويات') ||
      catLower.includes('شاورما') ||
      catLower.includes('برجر') ||
      catLower.includes('بيتزا') ||
      catLower.includes('فلافل') ||
      catLower.includes('قهوة')
    );
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    if (moreMenuOpen || profileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [moreMenuOpen, profileMenuOpen]);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendEmailSuccess, setResendEmailSuccess] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [showStatusSuccess, setShowStatusSuccess] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [showHeader, setShowHeader] = useState(true);

  useEffect(() => {
    const handleCustomVisibility = (e: Event) => {
      const customEvent = e as CustomEvent<{ visible: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.visible === 'boolean') {
        setShowHeader(customEvent.detail.visible);
      }
    };

    window.addEventListener('app-header-visibility', handleCustomVisibility);
    return () => window.removeEventListener('app-header-visibility', handleCustomVisibility);
  }, []);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (mobileMenuOpen) return;

      // Header on Search page is fixed
      const isSearchPage = location.pathname.startsWith('/search');
      if (isSearchPage) return;

      // Homepage and Housing page have their own sticky header coordinator
      if (location.pathname === '/' || location.pathname.startsWith('/housing')) return;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          
          if (window.innerWidth < 1024) {
            if (currentScrollY > lastScrollY && currentScrollY > 80) {
              setShowHeader(false);
              window.dispatchEvent(new CustomEvent('app-header-visibility', { detail: { visible: false } }));
            } else if (currentScrollY < lastScrollY || currentScrollY <= 40) {
              setShowHeader(true);
              window.dispatchEvent(new CustomEvent('app-header-visibility', { detail: { visible: true } }));
            }
          } else {
            setShowHeader(true);
            window.dispatchEvent(new CustomEvent('app-header-visibility', { detail: { visible: true } }));
          }
          
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mobileMenuOpen, location.pathname]);

  useEffect(() => {
    if (location.pathname.startsWith('/search')) {
      setShowHeader(true);
      window.dispatchEvent(new CustomEvent('app-header-visibility', { detail: { visible: true } }));
    }
  }, [location.pathname]);

  const [showMenuTooltip, setShowMenuTooltip] = useState(false);
  const [showDesktopMoreTooltip, setShowDesktopMoreTooltip] = useState(false);
  const [isEmergencyDismissed, setIsEmergencyDismissed] = useState(false);
  const isBootstrapAdmin = currentUser && ['princessofx2344@gmail.com'].includes(currentUser.email?.toLowerCase().trim() || '');
  const isEmailVerified = Boolean(
    currentUser?.emailVerified || 
    userProfile?.customEmailVerified || 
    userProfile?.emailVerified || 
    isBootstrapAdmin || 
    isStaff || 
    isMerchant || 
    userRole === 'merchant' || 
    userRole === 'super_admin' || 
    userRole === 'supervisor' || 
    (ownedBusinesses && ownedBusinesses.length > 0)
  );
  const isMedicalPage = location.pathname.startsWith('/medical');

  // Active polling to check verification status automatically every 3 seconds
  useEffect(() => {
    if (!currentUser || isEmailVerified) return;

    const interval = setInterval(async () => {
      try {
        if (auth?.currentUser) {
          await auth.currentUser.reload();
          await refreshUserData();
          const isVerifiedNow = auth.currentUser.emailVerified || userProfile?.customEmailVerified || userProfile?.emailVerified;
          if (isVerifiedNow) {
            clearInterval(interval);
            window.location.reload();
          }
        }
      } catch (e) {
        console.warn("Auto-polling reload error:", e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentUser, isEmailVerified, refreshUserData, userProfile]);

  const handleResendLockLink = async () => {
    if (!auth?.currentUser) return;
    setResendingEmail(true);
    setResendEmailSuccess(false);
    setVerificationError('');

    try {
      await sendCustomVerificationEmail({
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName
      });
      setResendEmailSuccess(true);
      setTimeout(() => setResendEmailSuccess(false), 6000);
    } catch (err: any) {
      console.warn("Resend lock link error:", err);
      setVerificationError(err.message || 'فشل إعادة إرسال الرابط. يرجى المحاولة مجدداً بعد قليل.');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleCheckEmailStatus = async () => {
    if (!auth?.currentUser) return;
    setCheckingEmail(true);
    setVerificationError('');
    try {
      await auth.currentUser.reload();
      await refreshUserData();
      const isVerifiedNow = auth.currentUser.emailVerified || userProfile?.customEmailVerified || userProfile?.emailVerified;
      if (isVerifiedNow) {
        setShowStatusSuccess(true);
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setVerificationError('البريد الإلكتروني لا يزال غير مفعل. يرجى الضغط على الرابط المرسل لبريدك الإلكتروني أولاً.');
      }
    } catch (err: any) {
      console.warn("Check email status error:", err);
      setVerificationError('حدث خطأ أثناء فحص حالة التفعيل. يرجى المحاولة مجدداً.');
    } finally {
      setCheckingEmail(false);
    }
  };

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      setShowHeader(true);
      window.dispatchEvent(new CustomEvent('app-header-visibility', { detail: { visible: true } }));
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const closeMenu = () => {
    setMobileMenuOpen(false);
    setMoreMenuOpen(false);
    setMobileProfileExpanded(false);
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
    sessionStorage.setItem('dismissed_menu_tooltip', 'true');
  };

  const handleDismissDesktopTooltip = () => {
    setShowDesktopMoreTooltip(false);
    sessionStorage.setItem('dismissed_desktop_tooltip', 'true');
  };

  // Guidance popup for mobile menu - triggers ONLY once per tab session (sessionStorage)
  useEffect(() => {
    const dismissed = sessionStorage.getItem('dismissed_menu_tooltip');
    if (dismissed === 'true') return;

    const timer = setTimeout(() => {
      if (!mobileMenuOpen) {
        setShowMenuTooltip(true);
        // Automatically mark as dismissed after we show it once, so it doesn't pop up again
        sessionStorage.setItem('dismissed_menu_tooltip', 'true');
      }
    }, 2000); // Appear in 2 seconds

    const autoHideTimer = setTimeout(() => {
      setShowMenuTooltip(false);
    }, 14000); // Dismiss after visibility duration

    return () => {
      clearTimeout(timer);
      clearTimeout(autoHideTimer);
    };
  }, []); // Run on mount only (once per tab session)

  // Guidance popup for desktop 'المزيد' button - triggers ONLY once per tab session (sessionStorage)
  useEffect(() => {
    const dismissed = sessionStorage.getItem('dismissed_desktop_tooltip');
    if (dismissed === 'true') return;

    const timer = setTimeout(() => {
      if (!moreMenuOpen) {
        setShowDesktopMoreTooltip(true);
        // Automatically mark as dismissed after we show it once, so it doesn't pop up again
        sessionStorage.setItem('dismissed_desktop_tooltip', 'true');
      }
    }, 2000); // Appear in 2 seconds

    const autoHideTimer = setTimeout(() => {
      setShowDesktopMoreTooltip(false);
    }, 14000); // Dismiss after visibility duration

    return () => {
      clearTimeout(timer);
      clearTimeout(autoHideTimer);
    };
  }, []); // Run on mount only (once per tab session)

  // Keyboard shortcut (Ctrl+K, Cmd+K, or /) to redirect to search page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        navigate('/search');
      } else if (
        e.key === '/' && 
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable)
      ) {
        e.preventDefault();
        navigate('/search');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  useEffect(() => {
    const path = location.pathname;
    if (path !== '/login' && path !== '/register') {
      sessionStorage.setItem('lastNonAuthPath', path + location.search);
    }
    closeMenu();
  }, [location]);

  useEffect(() => {
    if (!currentUser || !db) {
      setHasUnreadMessages(false);
      return;
    }

    let unsubUser = () => {};
    let unsubOwner = () => {};
    let userHasUnread = false;
    let ownerHasUnread = false;

    const updateCombined = () => {
      setHasUnreadMessages(userHasUnread || ownerHasUnread);
    };

    try {
      const qUser = query(collection(db, 'chatRooms'), where('userId', '==', currentUser.uid));
      unsubUser = onSnapshot(qUser, (snapUser) => {
        userHasUnread = snapUser.docs.some(docSnap => docSnap.data().unreadByUser === true);
        updateCombined();
      }, (err) => {
        console.warn("Could not read user unreads:", err);
      });

      const qOwner = query(collection(db, 'chatRooms'), where('businessOwnerId', '==', currentUser.uid));
      unsubOwner = onSnapshot(qOwner, (snapOwner) => {
        ownerHasUnread = snapOwner.docs.some(docSnap => docSnap.data().unreadByBusiness === true);
        updateCombined();
      }, (err) => {
        console.warn("Could not read owner unreads:", err);
      });
    } catch (e) {
      console.warn("Error setting up unreads listener:", e);
    }

    return () => {
      unsubUser();
      unsubOwner();
    };
  }, [currentUser]);

  const navItems = [
    { path: '/', label: 'الرئيسية', icon: HomeIcon },
    { path: '/offers', label: 'عروض وخصومات', icon: Flame, isSpecial: true },
    { path: '/products', label: 'المنتجات والخدمات', icon: ShoppingBag },
    { path: '/jobs', label: 'الوظائف', icon: Briefcase, isHot: true },
    { path: '/housing', label: 'سكنات وعقارات', icon: Building },
  ];

  const moreItems = [
    { path: '/packages', label: 'الباقات والاشتراكات', icon: Sparkles },
    { path: '/medical', label: 'الرعاية الطبية والصحة', icon: Stethoscope },
    { path: '/transportation', label: 'دليل المواصلات والمجمعات', icon: Bus },
    { path: '/news', label: 'أخبار إربد', icon: Newspaper },
    { path: '/tourism', label: 'أماكن سياحية وترفيهية', icon: Compass },
    { path: '/prayer-times', label: 'مواقيت الصلاة', icon: Clock },
  ];

  return (
    <div className={cn(
      "bg-[#fdfcfb] flex flex-col font-sans text-[#2d2a26] overflow-x-clip",
      location.pathname === '/messages' ? "h-screen overflow-hidden" : "min-h-screen"
    )} dir="rtl">
      {/* Live City Emergency / Weather / Event Announcement Banner */}
      {globalSettings.emergencyBanner?.enabled && !isEmergencyDismissed && (
        <aside 
          aria-label="تنبيه الطوارئ والأحوال الجوية"
          className={cn(
            "w-full z-[75] px-3 py-2 text-xs transition-all relative border-b",
            globalSettings.emergencyBanner.type === 'emergency' && "bg-gradient-to-r from-red-600 via-rose-700 to-red-800 text-white border-red-500",
            globalSettings.emergencyBanner.type === 'weather' && "bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-800 text-white border-sky-500",
            globalSettings.emergencyBanner.type === 'greeting' && "bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-white border-amber-400",
            (!globalSettings.emergencyBanner.type || globalSettings.emergencyBanner.type === 'announcement') && "bg-gradient-to-r from-emerald-700 via-[#1a4d2e] to-teal-800 text-white border-emerald-500"
          )}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {globalSettings.emergencyBanner.badgeText && (
                <span className="px-2 py-0.5 rounded-lg bg-white/20 text-white text-[10px] font-black shrink-0 border border-white/25">
                  {globalSettings.emergencyBanner.badgeText}
                </span>
              )}
              <span className="font-black truncate">{globalSettings.emergencyBanner.title}:</span>
              <span className="text-[11px] text-white/90 truncate hidden sm:inline">{globalSettings.emergencyBanner.message}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {globalSettings.emergencyBanner.linkText && globalSettings.emergencyBanner.linkUrl && (
                <Link
                  to={globalSettings.emergencyBanner.linkUrl}
                  className="px-2.5 py-1 rounded-lg bg-white/95 hover:bg-white text-stone-900 text-[10px] font-black transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <span>{globalSettings.emergencyBanner.linkText}</span>
                </Link>
              )}

              {globalSettings.emergencyBanner.showDismiss !== false && (
                <button
                  type="button"
                  onClick={() => setIsEmergencyDismissed(true)}
                  className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="إغلاق التنبيه"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* Top Navigation Bar - Sticky at all scroll depths */}
      <header className={cn(
        "h-[62px] sm:h-[68px] md:h-[72px] px-2.5 sm:px-4 lg:px-6 2xl:px-8 border-b border-stone-200/90 bg-white/95 backdrop-blur-md sticky z-[70] transition-all duration-300 shadow-2xs w-full max-w-full flex items-center",
        (showHeader || mobileMenuOpen) ? "top-0" : "-top-[62px] sm:-top-[68px] md:-top-[72px] lg:-top-[72px]"
      )}>
        {/* Desktop Header Layout */}
        <div className="hidden lg:flex w-full max-w-7xl mx-auto h-full items-center justify-between gap-1.5 sm:gap-2 lg:gap-3 flex-nowrap min-w-0 py-1">
          
          {/* Right Area (RTL): Brand Logo & Navigation */}
          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 xl:gap-3.5 flex-nowrap shrink-0 min-w-0">
            {/* Brand Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-2 group shrink-0 focus:outline-none py-0.5" 
              onClick={closeMenu}
            >
              {(globalSettings.logoUrl || '/logo.png') ? (
                <img 
                  src={globalSettings.logoUrl || '/logo.png'} 
                  alt={globalSettings.siteName} 
                  style={{ height: `${Math.min(64, Math.max(28, globalSettings.logoHeight || 52))}px` }}
                  className="max-h-[64px] max-w-[280px] md:max-w-[380px] object-contain group-hover:scale-102 transition-all duration-200" 
                />
              ) : !isSettingsLoaded ? (
                <div 
                  style={{ height: `${Math.min(64, Math.max(28, globalSettings.logoHeight || 52))}px` }}
                  className="w-32 opacity-0 pointer-events-none"
                />
              ) : (
                <>
                  <div 
                    style={{
                      width: `${Math.min(54, Math.max(34, Math.round((globalSettings.logoHeight || 52) * 0.8)))}px`,
                      height: `${Math.min(54, Math.max(34, Math.round((globalSettings.logoHeight || 52) * 0.8)))}px`
                    }}
                    className="rounded-2xl bg-gradient-to-br from-[#1a4d2e] to-[#133b22] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-all duration-300 shrink-0 overflow-hidden"
                  >
                    <Store className="h-5 w-5 md:h-6 md:w-6 text-[#ff9f1c]" />
                  </div>
                  <div className="flex flex-col">
                    <span 
                      style={{ fontSize: `${Math.min(22, Math.max(14, Math.round((globalSettings.logoHeight || 52) * 0.34)))}px` }}
                      className="font-black tracking-tight text-[#1a4d2e] leading-none whitespace-nowrap"
                    >
                      {globalSettings.siteName}
                    </span>
                    <span className="text-[9px] md:text-[10px] font-bold text-stone-400 mt-1 hidden sm:block whitespace-nowrap">{globalSettings.siteSubtitle}</span>
                  </div>
                </>
              )}
            </Link>
            
            {/* Desktop Navigation Links */}
            <nav className="flex items-center gap-1 xl:gap-1.5 text-xs xl:text-[13px] font-bold flex-nowrap shrink-0">
              <Link
                to="/offers"
                className={cn(
                  "h-9 flex items-center gap-1 px-2.5 xl:px-3 rounded-xl transition-all duration-300 relative group cursor-pointer shrink-0",
                  location.pathname === '/offers'
                    ? "bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-white shadow-md font-black scale-105"
                    : "bg-gradient-to-r from-orange-50 via-amber-50 to-red-50 text-orange-950 border border-orange-200/90 hover:border-orange-400 shadow-2xs hover:shadow-xs"
                )}
              >
                <Flame className={cn("h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110", location.pathname === '/offers' ? "text-yellow-300 animate-bounce" : "text-red-500 animate-pulse")} />
                <span className="font-black tracking-tight whitespace-nowrap">عروض وخصومات</span>
              </Link>

              <Link
                to="/products"
                className={cn(
                  "h-9 flex items-center gap-1 px-2.5 xl:px-3 rounded-xl transition-all duration-200 relative shrink-0",
                  (location.pathname === '/products' || location.pathname.startsWith('/products/') || location.pathname.startsWith('/product/'))
                    ? "bg-[#1a4d2e] text-white shadow-xs font-black"
                    : "text-stone-600 hover:text-[#1a4d2e] hover:bg-stone-100/90"
                )}
              >
                <ShoppingBag className={cn("h-3.5 w-3.5 shrink-0", (location.pathname === '/products' || location.pathname.startsWith('/products/')) ? "text-white" : "text-stone-400 group-hover:text-[#1a4d2e]")} />
                <span className="whitespace-nowrap">المنتجات والخدمات</span>
              </Link>

              <Link
                to="/jobs"
                className={cn(
                  "h-9 flex items-center gap-1 px-2.5 xl:px-3 rounded-xl transition-all duration-200 relative shrink-0",
                  location.pathname === '/jobs'
                    ? "bg-[#1a4d2e] text-white shadow-xs font-black"
                    : "text-stone-600 hover:text-[#1a4d2e] hover:bg-stone-100/90"
                )}
              >
                <Briefcase className={cn("h-3.5 w-3.5 shrink-0", location.pathname === '/jobs' ? "text-white" : "text-stone-400 group-hover:text-[#1a4d2e]")} />
                <span className="whitespace-nowrap">الوظائف</span>
              </Link>

              <Link
                to="/housing"
                className={cn(
                  "h-9 flex items-center gap-1 px-2.5 xl:px-3 rounded-xl transition-all duration-200 relative shrink-0",
                  location.pathname === '/housing'
                    ? "bg-[#1a4d2e] text-white shadow-xs font-black"
                    : "text-stone-600 hover:text-[#1a4d2e] hover:bg-stone-100/90"
                )}
              >
                <Building className={cn("h-3.5 w-3.5 shrink-0", location.pathname === '/housing' ? "text-white" : "text-stone-400 group-hover:text-[#1a4d2e]")} />
                <span className="whitespace-nowrap">سكنات وعقارات</span>
              </Link>

              {/* More Dropdown */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(!moreMenuOpen);
                    handleDismissDesktopTooltip();
                  }}
                  className={cn(
                    "h-9 flex items-center gap-1 px-2.5 xl:px-3 rounded-xl transition-all font-bold cursor-pointer shrink-0 border whitespace-nowrap",
                    (location.pathname === '/packages' || location.pathname === '/pricing' || location.pathname === '/medical' || location.pathname === '/transportation' || location.pathname === '/news' || location.pathname === '/tourism' || location.pathname === '/prayer-times')
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
                        اضغط هنا لاستعراض <span className="font-bold text-[#1a4d2e]">دليل المواصلات</span>، <span className="font-bold text-teal-600">أماكن سياحية</span>، <span className="font-bold text-emerald-700">مواقيت الصلاة</span> و<span className="font-bold text-amber-700">أخبار المدينة</span>!
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
                    
                    <div className="border-t border-stone-150 my-1.5" />
                    
                    <div className="px-3 py-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setMoreMenuOpen(false);
                          triggerPwaInstallModal();
                        }}
                        className="w-full flex h-9 items-center justify-center gap-1.5 text-[11px] font-black bg-stone-900 hover:bg-stone-800 text-emerald-400 border border-stone-800 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <Smartphone className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                        <span>تحميل التطبيق</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </nav>
          </div>

          {/* Left Area (RTL): Desktop Actions */}
          <div className="flex items-center gap-1.5 lg:gap-2 flex-nowrap shrink-0 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="relative w-9 h-9 rounded-xl transition-all duration-200 cursor-pointer focus:outline-none flex items-center justify-center shrink-0 border bg-stone-50 hover:bg-stone-100 text-stone-600 hover:text-[#1a4d2e] border-stone-200 shadow-2xs hover:shadow-xs group"
              title="البحث السريع (Ctrl+K)"
            >
              <Search className="h-4 w-4 transition-transform group-hover:scale-110" />
            </button>

            <NotificationDropdown />

            {currentUser && (
              <Link 
                to="/messages" 
                className={cn(
                  "relative w-9 h-9 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 border shadow-2xs hover:shadow-xs group",
                  location.pathname === '/messages' ? "bg-[#1a4d2e] text-white border-[#1a4d2e]" : "bg-stone-50 hover:bg-stone-100 text-stone-600 hover:text-[#1a4d2e] border-stone-200"
                )}
                title="الرسائل"
              >
                <MessageSquare className="h-4 w-4 transition-transform group-hover:scale-110" />
                {hasUnreadMessages && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full border border-white animate-pulse" />
                )}
              </Link>
            )}

            {totalCount > 0 && (
              <Link
                to="/cart"
                className="flex h-9 items-center justify-center gap-1.5 text-xs font-black px-3 rounded-xl transition-all shadow-xs border border-amber-600 bg-amber-500 hover:bg-amber-600 text-white cursor-pointer shrink-0 relative"
                title="سلة التسوّق وقائمة الحجز"
              >
                <ShoppingBag className="h-3.5 w-3.5 text-amber-200" />
                <span>السلة</span>
                <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full min-w-[16px] text-center">
                  {totalCount}
                </span>
              </Link>
            )}

            {isMedicalPage ? (
              <Link 
                to="/medical/register"
                className="flex h-9 items-center gap-1.5 text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white px-3 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Stethoscope className="h-4 w-4 text-emerald-200 animate-pulse" />
                <span>أضف منشأتك</span>
              </Link>
            ) : (
              <Link 
                to="/contact" 
                className="flex h-9 items-center gap-1 text-xs font-bold bg-[#1a4d2e] hover:bg-[#133b22] text-white px-2.5 rounded-xl transition-all shadow-xs"
              >
                <PlusCircle className="h-3.5 w-3.5 text-[#ff9f1c]" />
                <span>ضاعف زبائنك</span>
              </Link>
            )}

            {currentUser ? (
              <div className="relative" ref={profileMenuRef}>
                <div className="flex items-center gap-1 h-9">
                  <Link 
                    to="/profile" 
                    className="flex items-center gap-2 h-9 hover:opacity-90 transition-opacity"
                    title="فتح الملف الشخصي"
                  >
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt={currentUser.displayName || ''}
                        className="w-8 h-8 rounded-full object-cover border border-stone-200 shadow-2xs shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1a4d2e] to-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs border border-emerald-700/20 shrink-0">
                        {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs font-black text-stone-800 max-w-[120px] truncate">
                      {currentUser.displayName?.trim().split(/\s+/)[0] || currentUser.email?.split('@')[0]}
                    </span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    className="w-6 h-9 flex items-center justify-center text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                    title="خيارات الحساب"
                    aria-label="قائمة خيارات الحساب"
                  >
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", profileMenuOpen && "rotate-180")} />
                  </button>
                </div>

                {profileMenuOpen && (
                  <div className="absolute top-full mt-2 left-0 w-60 bg-white rounded-2xl shadow-xl border border-stone-200/90 py-2 z-50 animate-in fade-in zoom-in-95 text-right font-sans">
                    <Link
                      to="/profile"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors"
                    >
                      <UserIcon className="h-4 w-4 text-[#1a4d2e] shrink-0" />
                      <span>فتح الملف الشخصي</span>
                    </Link>

                    <Link
                      to="/profile/settings"
                      onClick={() => setProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-stone-500 shrink-0" />
                      <span>إعدادات الحساب</span>
                    </Link>

                    {hasBusinessesOrMedical && (
                      <Link
                        to="/profile?tab=dashboard"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors"
                      >
                        <Store className="h-4 w-4 text-[#ff9f1c] shrink-0" />
                        <span>لوحة التحكم</span>
                      </Link>
                    )}

                    {isStaff && (
                      <Link
                        to="/admin"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center justify-between px-4 py-2.5 text-xs font-bold text-amber-900 bg-amber-50/70 hover:bg-amber-100/80 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <Shield className="h-4 w-4 text-amber-600 shrink-0" />
                          <span>لوحة تحكم مدير الموقع</span>
                        </div>
                        <span className="text-[10px] font-black text-amber-800 bg-amber-200/60 px-1.5 py-0.5 rounded-md">
                          {isAdmin ? 'إدارة' : 'إشراف'}
                        </span>
                      </Link>
                    )}

                    <div className="border-t border-stone-150 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-right"
                    >
                      <LogOut className="h-4 w-4 text-red-500 shrink-0" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Link to="/login" className="h-9 px-2.5 flex items-center justify-center text-xs font-bold text-stone-700 hover:bg-stone-100 rounded-xl">دخول</Link>
                <Link to="/register" className="h-9 px-3 flex items-center justify-center text-xs font-bold bg-[#1a4d2e] text-white rounded-xl">تسجيل</Link>
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
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-auto max-w-[70%] h-full">
            <Link 
              to="/" 
              className="flex items-center gap-2 group shrink-0 focus:outline-none py-1 h-full max-h-full" 
              onClick={closeMenu}
            >
              {(globalSettings.logoUrl || '/logo.png') ? (
                <img 
                  src={globalSettings.logoUrl || '/logo.png'} 
                  alt={globalSettings.siteName} 
                  style={{ height: `${Math.min(48, Math.max(28, globalSettings.logoHeight || 42))}px` }}
                  className="max-h-[48px] max-w-[220px] object-contain group-hover:scale-102 transition-transform" 
                />
              ) : !isSettingsLoaded ? (
                <div 
                  style={{ height: `${Math.min(48, Math.max(28, globalSettings.logoHeight || 42))}px` }}
                  className="w-24 opacity-0 pointer-events-none"
                />
              ) : (
                <div className="flex items-center gap-2 flex-row-reverse text-right">
                  <div className="flex flex-col text-right justify-center">
                    <span 
                      className="font-black tracking-tight text-[#1a4d2e] leading-tight text-base sm:text-lg whitespace-nowrap"
                    >
                      {globalSettings.siteName}
                    </span>
                    <span className="text-[9px] font-bold text-stone-400 leading-tight whitespace-nowrap">
                      {globalSettings.siteSubtitle}
                    </span>
                  </div>
                  <div 
                    className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1a4d2e] to-[#133b22] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-all duration-300 shrink-0 overflow-hidden"
                  >
                    <Store className="h-4.5 w-4.5 text-[#ff9f1c]" />
                  </div>
                </div>
              )}
            </Link>
          </div>

          {/* Mobile Right Actions: Cart & Notification */}
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

      {/* Ultra-Modern 2026 Executive Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="lg:hidden fixed top-[62px] sm:top-[68px] md:top-[72px] inset-x-0 bottom-0 z-[65] bg-[#f8f7f3] flex flex-col overflow-hidden border-t border-stone-200/80 shadow-2xl" 
            dir="rtl"
          >
            {/* Scrollable Content Container with Staggered Animation */}
            <motion.div 
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.045,
                    delayChildren: 0.03
                  }
                },
                exit: {
                  opacity: 0,
                  transition: {
                    staggerChildren: 0.02,
                    staggerDirection: -1
                  }
                }
              }}
              className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-5 pb-32"
            >
              
              {/* 1. User Hero Profile Card / Guest Welcome Header */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 14, scale: 0.98 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 400, damping: 28 } },
                  exit: { opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.12 } }
                }}
              >
                {currentUser ? (
                  <div className="bg-white/80 border border-stone-200/90 rounded-2xl shadow-2xs overflow-hidden transition-all">
                    <div className="p-3 flex items-center justify-between gap-3">
                      <Link 
                        to="/profile" 
                        onClick={closeMenu} 
                        className="flex items-center gap-3 min-w-0 flex-1 group"
                      >
                        {currentUser.photoURL ? (
                          <img 
                            src={currentUser.photoURL} 
                            alt={currentUser.displayName || ''} 
                            className="w-11 h-11 rounded-full object-cover border border-stone-200 shadow-2xs shrink-0" 
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#1a4d2e] to-emerald-600 text-white font-black flex items-center justify-center text-base shadow-2xs border border-emerald-700/20 shrink-0">
                            {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 text-right">
                          <p className="text-sm font-black text-stone-900 truncate group-hover:text-emerald-700 transition-colors">
                            {currentUser.displayName || currentUser.email?.split('@')[0]}
                          </p>
                        </div>
                      </Link>

                      {/* Expand Arrow Button */}
                      <button
                        type="button"
                        onClick={() => setMobileProfileExpanded(!mobileProfileExpanded)}
                        className="w-9 h-9 flex items-center justify-center text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-all cursor-pointer shrink-0"
                        title="خيارات الحساب"
                        aria-label="توسيع خيارات الحساب"
                      >
                        <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", mobileProfileExpanded && "rotate-180")} />
                      </button>
                    </div>

                    {/* Expandable Menu Items */}
                    {mobileProfileExpanded && (
                      <div className="border-t border-stone-150 bg-stone-50/70 p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                        <Link
                          to="/profile"
                          onClick={closeMenu}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-stone-700 hover:bg-white transition-colors"
                        >
                          <UserIcon className="h-4 w-4 text-[#1a4d2e] shrink-0" />
                          <span>زيارة الملف الشخصي</span>
                        </Link>

                        <Link
                          to="/profile/settings"
                          onClick={closeMenu}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-stone-700 hover:bg-white transition-colors"
                        >
                          <Settings className="h-4 w-4 text-stone-500 shrink-0" />
                          <span>إعدادات الحساب</span>
                        </Link>

                        {hasBusinessesOrMedical && (
                          <Link
                            to="/profile?tab=dashboard"
                            onClick={closeMenu}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-stone-700 hover:bg-white transition-colors"
                          >
                            <Store className="h-4 w-4 text-[#ff9f1c] shrink-0" />
                            <span>لوحة التحكم</span>
                          </Link>
                        )}

                        {isStaff && (
                          <Link
                            to="/admin"
                            onClick={closeMenu}
                            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100/80 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <Shield className="h-4 w-4 text-amber-600 shrink-0" />
                              <span>لوحة تحكم مدير الموقع</span>
                            </div>
                            <span className="text-[10px] font-black text-amber-800 bg-amber-200/70 px-1.5 py-0.5 rounded-md">
                              {isAdmin ? 'إدارة' : 'إشراف'}
                            </span>
                          </Link>
                        )}

                        <div className="border-t border-stone-200/60 my-1" />

                        <button
                          type="button"
                          onClick={() => {
                            closeMenu();
                            logout();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-right"
                        >
                          <LogOut className="h-4 w-4 text-red-500 shrink-0" />
                          <span>تسجيل الخروج</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative overflow-hidden bg-gradient-to-r from-stone-900 via-stone-800 to-[#1a4d2e] p-4.5 rounded-3xl text-white shadow-lg border border-stone-800 flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-black text-white">أهلاً بك في دليل إربد! 👋</p>
                      <p className="text-[11px] text-stone-300 font-medium truncate">سجّل حسابك مجاناً للتواصل وحفظ المفضلات</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Link
                        to="/login"
                        onClick={closeMenu}
                        className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-stone-950 text-xs font-black rounded-xl transition-all shadow-xs active:scale-95"
                      >
                        دخول
                      </Link>
                      <Link
                        to="/register"
                        onClick={closeMenu}
                        className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-xl border border-white/20 transition-all active:scale-95"
                      >
                        تسجيل
                      </Link>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* 2. Floating Command Strip: 4 Interactive Utility Tiles */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 14, scale: 0.98 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 400, damping: 28 } },
                  exit: { opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.12 } }
                }}
                className="grid grid-cols-4 gap-2"
              >
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    navigate('/search');
                  }}
                  className="bg-white p-2.5 rounded-2xl border border-stone-200/90 shadow-2xs hover:border-emerald-300 flex flex-col items-center justify-center text-center gap-1.5 transition-all active:scale-95 cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#1a4d2e] flex items-center justify-center shrink-0 group-hover:bg-[#1a4d2e] group-hover:text-white transition-colors">
                    <Search className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[10px] font-black text-stone-700 truncate w-full">البحث</span>
                </button>

                <Link
                  to="/notifications"
                  onClick={closeMenu}
                  className="bg-white p-2.5 rounded-2xl border border-stone-200/90 shadow-2xs hover:border-emerald-300 flex flex-col items-center justify-center text-center gap-1.5 transition-all active:scale-95 group relative"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#1a4d2e] flex items-center justify-center shrink-0 group-hover:bg-[#1a4d2e] group-hover:text-white transition-colors">
                    <Bell className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[10px] font-black text-stone-700 truncate w-full">الإشعارات</span>
                </Link>

                <Link
                  to="/messages"
                  onClick={closeMenu}
                  className="bg-white p-2.5 rounded-2xl border border-stone-200/90 shadow-2xs hover:border-emerald-300 flex flex-col items-center justify-center text-center gap-1.5 transition-all active:scale-95 group relative"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#1a4d2e] flex items-center justify-center shrink-0 group-hover:bg-[#1a4d2e] group-hover:text-white transition-colors">
                    <MessageSquare className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[10px] font-black text-stone-700 truncate w-full">المحادثات</span>
                  {hasUnreadMessages && (
                    <span className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  )}
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    triggerPwaInstallModal();
                  }}
                  className="bg-stone-900 text-white p-2.5 rounded-2xl border border-stone-800 shadow-2xs flex flex-col items-center justify-center text-center gap-1.5 transition-all active:scale-95 cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-stone-950 transition-colors">
                    <Smartphone className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[10px] font-black text-emerald-300 truncate w-full">التطبيق</span>
                </button>
              </motion.div>

              {/* 3. Special Merchant & Business Actions: QR Scanner & Live Orders */}
              {currentUser && (activeGiftBusinesses.length > 0 || hasFoodAndDrinkBusiness) && (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 14, scale: 0.98 },
                    visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 400, damping: 28 } },
                    exit: { opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.12 } }
                  }}
                >
                  {activeGiftBusinesses.length > 0 && hasFoodAndDrinkBusiness ? (
                    /* Two Square Buttons Side-By-Side on mobile, compact matched tile height on tablet */
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          closeMenu();
                          navigate('/merchant/scanner');
                        }}
                        className="p-3 rounded-2xl bg-gradient-to-br from-emerald-950 via-stone-950 to-teal-950 text-white flex flex-col items-center justify-center text-center gap-2 border-2 border-emerald-500/60 shadow-lg shadow-emerald-950/30 hover:border-emerald-400 transition-all cursor-pointer active:scale-98 group aspect-square sm:aspect-auto sm:p-2.5 sm:gap-1.5 md:aspect-auto md:p-2.5 md:gap-1.5"
                      >
                        <div className="w-10 h-10 sm:w-9 sm:h-9 md:w-9 md:h-9 rounded-xl bg-emerald-500 text-stone-950 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                          <QrCode className="h-5 w-5 sm:h-4.5 sm:w-4.5 md:h-4.5 md:w-4.5" />
                        </div>
                        <span className="text-xs sm:text-[10px] md:text-[10px] font-black text-white leading-tight">ماسح كودات QR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          closeMenu();
                          navigate('/profile/live-orders');
                        }}
                        className="p-3 rounded-2xl bg-gradient-to-br from-emerald-900 via-stone-950 to-emerald-950 text-white flex flex-col items-center justify-center text-center gap-2 border-2 border-amber-500/60 shadow-lg shadow-emerald-950/30 hover:border-amber-400 transition-all cursor-pointer active:scale-98 group aspect-square sm:aspect-auto sm:p-2.5 sm:gap-1.5 md:aspect-auto md:p-2.5 md:gap-1.5"
                      >
                        <div className="w-10 h-10 sm:w-9 sm:h-9 md:w-9 md:h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                          <Utensils className="h-5 w-5 sm:h-4.5 sm:w-4.5 md:h-4.5 md:w-4.5" />
                        </div>
                        <span className="text-xs sm:text-[10px] md:text-[10px] font-black text-white leading-tight">لوحة تحكم الطلبات</span>
                      </button>
                    </div>
                  ) : activeGiftBusinesses.length > 0 ? (
                    /* Full-width QR Scanner only */
                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        navigate('/merchant/scanner');
                      }}
                      className="w-full p-3.5 sm:p-2.5 md:p-2.5 rounded-2xl bg-gradient-to-r from-emerald-950 via-stone-950 to-teal-950 text-white flex items-center justify-between border-2 border-emerald-500/60 shadow-lg shadow-emerald-950/30 hover:border-emerald-400 transition-all cursor-pointer active:scale-98 group"
                    >
                      <div className="flex items-center gap-3 sm:gap-2 md:gap-2">
                        <div className="w-10 h-10 sm:w-9 sm:h-9 md:w-9 md:h-9 rounded-xl bg-emerald-500 text-stone-950 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                          <QrCode className="h-5 w-5 sm:h-4.5 sm:w-4.5 md:h-4.5 md:w-4.5" />
                        </div>
                        <div className="text-right">
                          <span className="text-xs sm:text-[11px] md:text-[11px] font-black text-white block">ماسح كودات QR</span>
                        </div>
                      </div>
                      <ChevronLeft className="h-4 w-4 text-emerald-400 group-hover:-translate-x-0.5 transition-transform shrink-0" />
                    </button>
                  ) : (
                    /* Full-width Live Orders only */
                    <button
                      type="button"
                      onClick={() => {
                        closeMenu();
                        navigate('/profile/live-orders');
                      }}
                      className="w-full p-3.5 sm:p-2.5 md:p-2.5 rounded-2xl bg-gradient-to-r from-emerald-900 to-emerald-950 text-white flex items-center justify-between border border-emerald-500/35 shadow-md hover:border-emerald-400 transition-all cursor-pointer active:scale-98 group text-right"
                    >
                      <div className="flex items-center gap-3 sm:gap-2 md:gap-2">
                        <div className="w-10 h-10 sm:w-9 sm:h-9 md:w-9 md:h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                          <Utensils className="h-5 w-5 sm:h-4.5 sm:w-4.5 md:h-4.5 md:w-4.5" />
                        </div>
                        <div className="text-right">
                          <span className="text-xs sm:text-[11px] md:text-[11px] font-black text-white block">طلبات المنيو والزبائن الحية</span>
                        </div>
                      </div>
                      <ChevronLeft className="h-4 w-4 text-emerald-400 group-hover:-translate-x-0.5 transition-transform shrink-0" />
                    </button>
                  )}
                </motion.div>
              )}

              {/* Add Business Callout Banner */}
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 14, scale: 0.98 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 400, damping: 28 } },
                  exit: { opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.12 } }
                }}
              >
                {isMedicalPage ? (
                  <Link
                    to="/medical/register"
                    onClick={closeMenu}
                    className="w-full p-3.5 rounded-2xl bg-emerald-50/90 hover:bg-emerald-100/90 text-[#1a4d2e] border border-emerald-200/90 font-black text-xs flex items-center justify-between transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#1a4d2e] text-white flex items-center justify-center shrink-0">
                        <Stethoscope className="h-4 w-4" />
                      </div>
                      <span>طبيب أو تملك منشأة طبية؟</span>
                    </div>
                    <span className="text-[10px] bg-[#1a4d2e] text-white font-extrabold px-2.5 py-1 rounded-xl shadow-2xs">
                      أضف منشأتك
                    </span>
                  </Link>
                ) : (
                  <Link
                    to="/contact"
                    onClick={closeMenu}
                    className="w-full p-3.5 rounded-2xl bg-emerald-50/90 hover:bg-emerald-100/90 text-[#1a4d2e] border border-emerald-200/90 font-black text-xs flex items-center justify-between transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#1a4d2e] text-white flex items-center justify-center shrink-0">
                        <PlusCircle className="h-4 w-4" />
                      </div>
                      <span>هل تملك نشاطاً تجارياً في إربد؟</span>
                    </div>
                    <span className="text-[10px] bg-[#1a4d2e] text-white font-extrabold px-2.5 py-1 rounded-xl shadow-2xs">
                      ضاعف زبائنك
                    </span>
                  </Link>
                )}
              </motion.div>

              {/* 4. Categorized Main Navigation Sections */}
              
              {/* SECTION A: Primary Discovery Hub */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 14, scale: 0.98 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 400, damping: 28 } },
                  exit: { opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.12 } }
                }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black text-stone-500 uppercase tracking-wide">الخدمات والاكتشافات</span>
                  <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">أبرز الأقسام</span>
                </div>

                <nav className="grid grid-cols-2 gap-2.5">
                  <Link
                    to="/"
                    onClick={closeMenu}
                    className="p-3.5 rounded-2xl bg-[#1a4d2e] text-white flex items-center gap-2.5 font-black text-xs shadow-md transition-all active:scale-95 group"
                  >
                    <Store className="h-4.5 w-4.5 text-amber-400 group-hover:scale-110 transition-transform" />
                    <span>الرئيسية</span>
                  </Link>

                  <Link
                    to="/offers"
                    onClick={closeMenu}
                    className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white flex items-center gap-2 font-black text-xs shadow-md transition-all active:scale-95 group"
                  >
                    <Flame className="h-4.5 w-4.5 text-amber-200 animate-pulse" />
                    <span>العروض والخصومات</span>
                  </Link>

                  <Link
                    to="/products"
                    onClick={closeMenu}
                    className="p-3.5 rounded-2xl bg-white border border-stone-200/90 text-stone-800 hover:border-emerald-300 flex items-center gap-2.5 font-bold text-xs transition-all shadow-2xs active:scale-95 group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                    <span className="font-black">المنتجات والخدمات</span>
                  </Link>

                  <Link
                    to="/medical"
                    onClick={closeMenu}
                    className="p-3.5 rounded-2xl bg-white border border-stone-200/90 text-stone-800 hover:border-emerald-300 flex items-center gap-2.5 font-bold text-xs transition-all shadow-2xs active:scale-95 group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                      <Stethoscope className="h-4 w-4" />
                    </div>
                    <span className="font-black">الرعاية الطبية</span>
                  </Link>

                  <Link
                    to="/jobs"
                    onClick={closeMenu}
                    className="p-3.5 rounded-2xl bg-white border border-stone-200/90 text-stone-800 hover:border-emerald-300 flex items-center gap-2.5 font-bold text-xs transition-all shadow-2xs active:scale-95 group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <span className="font-black">الوظائف</span>
                  </Link>

                  <Link
                    to="/housing"
                    onClick={closeMenu}
                    className="p-3.5 rounded-2xl bg-white border border-stone-200/90 text-stone-800 hover:border-emerald-300 flex items-center gap-2.5 font-bold text-xs transition-all shadow-2xs active:scale-95 group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <span className="font-black">سكنات وعقارات</span>
                  </Link>
                </nav>
              </motion.div>

              {/* SECTION B: City Life & Utilities */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 14, scale: 0.98 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 400, damping: 28 } },
                  exit: { opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.12 } }
                }}
                className="space-y-2 pt-1"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black text-stone-500 uppercase tracking-wide">دليل الحياة والمرافق</span>
                  <span className="text-[10px] font-extrabold text-stone-400">إربد والمحافظة</span>
                </div>

                <nav className="grid grid-cols-2 gap-2.5">
                  <Link
                    to="/transportation"
                    onClick={closeMenu}
                    className="p-3.5 rounded-2xl bg-white border border-stone-200/90 text-stone-800 hover:border-amber-300 flex items-center justify-between font-bold text-xs transition-all shadow-2xs active:scale-95 col-span-2 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 font-black">
                        <Bus className="h-4.5 w-4.5" />
                      </div>
                      <span className="font-black text-stone-900">دليل المواصلات والمجمعات</span>
                    </div>
                    <ChevronLeft className="h-4 w-4 text-stone-400 group-hover:-translate-x-0.5 transition-transform" />
                  </Link>

                  <Link
                    to="/news"
                    onClick={closeMenu}
                    className="p-3.5 rounded-2xl bg-white border border-stone-200/90 text-stone-800 hover:border-purple-300 flex items-center justify-between font-bold text-xs transition-all shadow-2xs active:scale-95 group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <Newspaper className="h-4 w-4" />
                      </div>
                      <span className="font-black">أخبار إربد</span>
                    </div>
                  </Link>

                  <Link
                    to="/tourism"
                    onClick={closeMenu}
                    className="p-3.5 rounded-2xl bg-white border border-stone-200/90 text-stone-800 hover:border-teal-300 flex items-center justify-between font-bold text-xs transition-all shadow-2xs active:scale-95 group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                        <Compass className="h-4 w-4" />
                      </div>
                      <span className="font-black">أماكن سياحية</span>
                    </div>
                  </Link>

                  <Link
                    to="/prayer-times"
                    onClick={closeMenu}
                    className="p-3.5 rounded-2xl bg-white border border-stone-200/90 text-stone-800 hover:border-indigo-300 flex items-center justify-between font-bold text-xs transition-all shadow-2xs active:scale-95 group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Clock className="h-4 w-4" />
                      </div>
                      <span className="font-black">مواقيت الصلاة</span>
                    </div>
                  </Link>

                  <Link
                    to="/packages"
                    onClick={closeMenu}
                    className="p-3.5 rounded-2xl bg-white border border-stone-200/90 text-stone-800 hover:border-amber-300 flex items-center justify-between font-bold text-xs transition-all shadow-2xs active:scale-95 group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <span className="font-black">الباقات والاشتراكات</span>
                    </div>
                  </Link>
                </nav>
              </motion.div>

              {/* SECTION C: VIP Membership & Admin Control */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 14, scale: 0.98 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 400, damping: 28 } },
                  exit: { opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.12 } }
                }}
                className="space-y-2 pt-1"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black text-stone-500 uppercase tracking-wide">الترقية والخدمات</span>
                </div>

                <div className="space-y-2">
                  <Link
                    to="/packages"
                    onClick={closeMenu}
                    className="p-3.5 rounded-2xl bg-gradient-to-r from-stone-900 to-amber-950 text-white border border-amber-500/30 flex items-center justify-between font-black text-xs transition-all shadow-sm active:scale-98 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                        <Crown className="h-4.5 w-4.5 text-amber-300 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-white font-black block text-xs">باقات VIP المميزة</span>
                        <span className="text-[10px] text-amber-300/90 font-bold block">صدّار المحافظة ويميّز نشاطك</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-amber-500 text-stone-950 font-black px-2.5 py-1 rounded-lg">
                      ترقية
                    </span>
                  </Link>

                  {/* Admin/Staff Dashboard Link */}
                  {isStaff && (
                    <Link
                      to="/admin"
                      onClick={closeMenu}
                      className="w-full p-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs flex items-center justify-between shadow-md transition-all active:scale-98"
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="h-4.5 w-4.5" />
                        <span>لوحة التحكم والعمليات</span>
                      </div>
                      <span className="bg-stone-950 text-white text-[10px] px-2 py-0.5 rounded-md font-bold">الإدارة</span>
                    </Link>
                  )}
                </div>
              </motion.div>

              {/* 5. Footer Information & Quick Links */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 14, scale: 0.98 },
                  visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 400, damping: 28 } },
                  exit: { opacity: 0, y: 6, scale: 0.98, transition: { duration: 0.12 } }
                }}
                className="pt-4 border-t border-stone-200/80 space-y-3"
              >
                <div className="flex items-center justify-around text-xs font-bold text-stone-500">
                  <Link to="/about" onClick={closeMenu} className="hover:text-stone-900 transition-colors flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" />
                    <span>عن المنصة</span>
                  </Link>
                  <span className="text-stone-300">•</span>
                  <Link to="/contact" onClick={closeMenu} className="hover:text-stone-900 transition-colors flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" />
                    <span>اتصل بنا</span>
                  </Link>
                </div>

                <div className="text-center pt-1">
                  <p className="text-[10px] text-stone-400 font-bold">
                    دليل "{globalSettings.siteName}" الرقمي • جميع الحقوق محفوظة {getJordanYear()}
                  </p>
                </div>
              </motion.div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <main className={cn(
        "flex-1 w-full flex flex-col min-h-0",
        location.pathname === '/messages'
          ? "max-w-[1440px] mx-auto p-2 sm:p-3 md:p-4 h-[calc(100dvh-62px)] sm:h-[calc(100dvh-68px)] md:h-[calc(100dvh-72px)] overflow-hidden"
          : location.pathname === '/profile/live-orders'
          ? "w-full max-w-none p-0 m-0 min-h-[calc(100dvh-62px)] sm:min-h-[calc(100dvh-68px)] md:min-h-[calc(100dvh-72px)] overflow-x-hidden flex flex-col"
          : location.pathname.startsWith('/admin')
          ? "w-full max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-24 sm:pt-6 sm:pb-16 min-w-0 overflow-x-clip"
          : location.pathname.startsWith('/profile')
          ? "max-w-[1200px] mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 pb-20 md:py-12"
          : location.pathname.startsWith('/products') || location.pathname === '/search' || location.pathname.startsWith('/medical') || location.pathname.startsWith('/offers') || location.pathname.startsWith('/housing') || location.pathname.startsWith('/jobs') || location.pathname.startsWith('/transportation') || location.pathname.startsWith('/tourism')
          ? "max-w-[1200px] mx-auto px-0 lg:px-8 pt-0 lg:pt-[10px] pb-20 sm:pb-12"
          : "max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-20 sm:pt-[10px] sm:pb-12 md:pt-[10px] md:pb-12 lg:pt-[10px] lg:pb-12"
      )}>
        {currentUser && !isEmailVerified && !['/login', '/register', '/verify', '/terms', '/privacy', '/about', '/contact'].includes(location.pathname) ? (
          <div className="max-w-md mx-auto w-full bg-white py-8 px-6 shadow-xs rounded-[32px] border border-[#e5e1da] text-right space-y-6 mt-4">
            <div className="space-y-3 text-center py-2">
              <div className="w-16 h-16 bg-[#1a4d2e]/5 text-[#1a4d2e] rounded-full mx-auto flex items-center justify-center relative">
                <Mail className="h-7 w-7 text-[#1a4d2e]" />
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#1a4d2e] animate-spin opacity-40" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-black text-xl text-stone-900">تأكيد البريد الإلكتروني مطلوب</h3>
                <p className="text-xs text-stone-500 font-medium leading-relaxed">
                  لقد قمت بإنشاء الحساب بنجاح، ولكن يرجى تأكيد ملكية بريدك الإلكتروني أولاً لتتمكن من تصفح واستخدام منصة "شو في بإربد؟".
                </p>
                <div className="font-mono font-bold text-[#1a4d2e] bg-[#1a4d2e]/5 px-3 py-1.5 rounded-xl border border-[#1a4d2e]/10 inline-block text-xs mt-1">
                  {currentUser.email}
                </div>
              </div>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/60 p-4 rounded-2xl text-xs space-y-2 text-stone-700 leading-relaxed">
              <div className="flex items-center gap-1.5 font-black text-amber-900 text-sm">
                <Hourglass className="h-4.5 w-4.5 animate-pulse text-amber-700" />
                <span>يرجى مراجعة بريدك الإلكتروني</span>
              </div>
              <p>
                أرسلنا إليك رابط تفعيل آمن. يرجى فتح بريدك الإلكتروني والضغط على الرابط لتفعيل الحساب.
              </p>
              <p className="font-bold text-amber-950">
                💡 بمجرد ضغطك على الرابط في بريدك، ستتعرف هذه الصفحة تلقائياً على التفعيل وتفتح لك كامل الموقع فوراً دون أي إجراء إضافي!
              </p>
            </div>

            {verificationError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-2xl font-bold text-xs text-center flex items-center justify-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{verificationError}</span>
              </div>
            )}

            {resendEmailSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-[#1a4d2e] rounded-2xl font-bold text-xs text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>تم إعادة إرسال رابط التفعيل بنجاح! تفقد بريدك الوارد أو الـ Spam.</span>
              </div>
            )}

            {showStatusSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-[#1a4d2e] rounded-2xl font-bold text-xs text-center flex items-center justify-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[#ff9f1c] shrink-0 animate-bounce" />
                <span>تم التحقق وتنشيط حسابك بنجاح! جاري دخولك للموقع...</span>
              </div>
            )}

            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={handleCheckEmailStatus}
                disabled={checkingEmail || showStatusSuccess}
                className="w-full py-3.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-2xl font-black text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs hover:shadow-sm"
              >
                {checkingEmail ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span>لقد قمت بالتأكيد، دخول للموقع</span>
              </button>

              <button
                type="button"
                onClick={handleResendLockLink}
                disabled={resendingEmail}
                className="w-full py-3 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-2xl font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>{resendingEmail ? 'جاري إعادة الإرسال...' : 'إعادة إرسال رابط التفعيل'}</span>
              </button>

              <button
                type="button"
                onClick={logout}
                className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>تسجيل الخروج واستخدام بريد آخر</span>
              </button>
            </div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
      
      {location.pathname !== '/messages' && (
        <footer className="bg-stone-950 text-stone-300 border-t border-stone-800/80 mt-auto pb-28 md:pb-0" dir="rtl">
          {/* Main Footer Hub */}
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10 mb-12">
              
              {/* Column 1: Platform Branding & App */}
              <div className="lg:col-span-2 space-y-4">
                <Link to="/" className="inline-flex items-center gap-2.5 text-2xl font-black text-white group">
                  {(globalSettings.logoUrl || '/logo.png') ? (
                    <img 
                      src={globalSettings.logoUrl || '/logo.png'} 
                      alt={globalSettings.siteName} 
                      style={{ height: `${Math.min(65, Math.max(44, globalSettings.logoHeight || 55))}px` }}
                      className="max-h-[65px] max-w-[260px] object-contain group-hover:scale-102 transition-transform brightness-0 invert" 
                    />
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-2xl bg-[#1a4d2e] flex items-center justify-center text-white shadow-md shrink-0">
                        <Store className="h-6 w-6 text-[#ff9f1c]" />
                      </div>
                      <span>{globalSettings.siteName}</span>
                    </>
                  )}
                </Link>

                <p className="text-stone-400 text-xs sm:text-sm leading-relaxed font-medium max-w-md">
                  {globalSettings.footerDescription || "المنصة الشاملة الأولى لاكتشاف المحلات، المنتجات، العروض، الخدمات الطبية، الوظائف والسكنات في إربد."}
                </p>

                <div className="pt-1 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={triggerPwaInstallModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a4d2e] hover:bg-[#143a23] text-white font-black text-xs rounded-xl shadow-xs border border-emerald-800/60 transition-all cursor-pointer active:scale-98"
                  >
                    <Smartphone className="h-4 w-4 text-emerald-400" />
                    <span>تنزيل تطبيق الهاتف</span>
                  </button>
                  <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-black text-xs rounded-xl border border-amber-500/30 transition-all cursor-pointer"
                  >
                    <PlusCircle className="h-4 w-4 text-amber-400" />
                    <span>انضم كتاجر أو منشأة</span>
                  </Link>
                </div>

                {/* Social Media Links */}
                <div className="pt-2 flex items-center gap-2.5">
                  {globalSettings.facebookUrl && (
                    <a
                      href={globalSettings.facebookUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="فيسبوك"
                      aria-label="فيسبوك"
                      className="w-9 h-9 rounded-xl bg-stone-900 text-stone-300 hover:text-white hover:bg-blue-600 border border-stone-800 flex items-center justify-center transition-all shadow-2xs"
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
                      className="w-9 h-9 rounded-xl bg-stone-900 text-stone-300 hover:text-white hover:bg-pink-600 border border-stone-800 flex items-center justify-center transition-all shadow-2xs"
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
                      className="w-9 h-9 rounded-xl bg-stone-900 text-stone-300 hover:text-white hover:bg-emerald-600 border border-stone-800 flex items-center justify-center transition-all shadow-2xs"
                    >
                      <WhatsAppIcon className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Column 2: Commercial Directory & Marketplace */}
              <div>
                <h3 className="font-black text-white text-sm sm:text-base mb-5 pb-2.5 border-b border-stone-800/60 flex items-center gap-2">
                  <Store className="h-4 w-4 text-[#ff9f1c]" />
                  <span>الدليل والمنتجات</span>
                </h3>
                <ul className="space-y-3 text-xs sm:text-sm font-bold text-stone-400">
                  <li>
                    <Link to="/" className="hover:text-emerald-400 transition-colors flex items-center gap-2 group">
                      <ChevronLeft className="h-3.5 w-3.5 text-stone-600 group-hover:text-emerald-400 shrink-0 transition-colors" />
                      <span>دليل المحلات والأنشطة التجارية</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/products" className="hover:text-emerald-400 transition-colors flex items-center gap-2 group">
                      <ChevronLeft className="h-3.5 w-3.5 text-stone-600 group-hover:text-emerald-400 shrink-0 transition-colors" />
                      <span>المنتجات والخدمات الرقمية</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/offers" className="hover:text-emerald-400 transition-colors flex items-center gap-2 group">
                      <ChevronLeft className="h-3.5 w-3.5 text-stone-600 group-hover:text-emerald-400 shrink-0 transition-colors" />
                      <span>عروض وخصومات إربد</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/news" className="hover:text-emerald-400 transition-colors flex items-center gap-2 group">
                      <ChevronLeft className="h-3.5 w-3.5 text-stone-600 group-hover:text-emerald-400 shrink-0 transition-colors" />
                      <span>أخبار وفعاليات إربد</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/search" className="hover:text-emerald-400 transition-colors flex items-center gap-2 group">
                      <ChevronLeft className="h-3.5 w-3.5 text-stone-600 group-hover:text-emerald-400 shrink-0 transition-colors" />
                      <span>البحث الشامل والمتقدم</span>
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 3: Medical, Housing, Jobs & Transit */}
              <div>
                <h3 className="font-black text-white text-sm sm:text-base mb-5 pb-2.5 border-b border-stone-800/60 flex items-center gap-2">
                  <Compass className="h-4 w-4 text-[#ff9f1c]" />
                  <span>الخدمات والمرافق</span>
                </h3>
                <ul className="space-y-3 text-xs sm:text-sm font-bold text-stone-400">
                  <li>
                    <Link to="/medical" className="hover:text-emerald-400 transition-colors flex items-center gap-2 group">
                      <ChevronLeft className="h-3.5 w-3.5 text-stone-600 group-hover:text-emerald-400 shrink-0 transition-colors" />
                      <span>الدليل الطبي والعيادات</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/housing" className="hover:text-emerald-400 transition-colors flex items-center gap-2 group">
                      <ChevronLeft className="h-3.5 w-3.5 text-stone-600 group-hover:text-emerald-400 shrink-0 transition-colors" />
                      <span>العقارات والسكنات والشقق</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/jobs" className="hover:text-emerald-400 transition-colors flex items-center gap-2 group">
                      <ChevronLeft className="h-3.5 w-3.5 text-stone-600 group-hover:text-emerald-400 shrink-0 transition-colors" />
                      <span>الوظائف والشواغر المتاحة</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/transportation" className="hover:text-emerald-400 transition-colors flex items-center gap-2 group">
                      <ChevronLeft className="h-3.5 w-3.5 text-stone-600 group-hover:text-emerald-400 shrink-0 transition-colors" />
                      <span>دليل المواصلات والمجمعات</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/tourism" className="hover:text-emerald-400 transition-colors flex items-center gap-2 group">
                      <ChevronLeft className="h-3.5 w-3.5 text-stone-600 group-hover:text-emerald-400 shrink-0 transition-colors" />
                      <span>السياحة والمعالم الأثرية</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/prayer-times" className="hover:text-emerald-400 transition-colors flex items-center gap-2 group">
                      <ChevronLeft className="h-3.5 w-3.5 text-stone-600 group-hover:text-emerald-400 shrink-0 transition-colors" />
                      <span>مواقيت الصلاة والأذان</span>
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 4: Merchants & Business Owners */}
              <div>
                <h3 className="font-black text-white text-sm sm:text-base mb-5 pb-2.5 border-b border-stone-800/60 flex items-center gap-2">
                  <PlusCircle className="h-4 w-4 text-[#ff9f1c]" />
                  <span>أصحاب المنشآت والشركاء</span>
                </h3>
                <ul className="space-y-3 text-xs sm:text-sm font-bold text-stone-400">
                  <li>
                    <Link to="/contact" className="hover:text-emerald-400 transition-colors flex items-center gap-2 group font-black text-emerald-400">
                      <ChevronLeft className="h-3.5 w-3.5 text-stone-600 group-hover:text-emerald-400 shrink-0 transition-colors" />
                      <span>سجل محلك التجاري مجاناً</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/medical/register" className="hover:text-emerald-400 transition-colors flex items-center gap-2 group">
                      <ChevronLeft className="h-3.5 w-3.5 text-stone-600 group-hover:text-emerald-400 shrink-0 transition-colors" />
                      <span>إضافة عيادة أو مركز طبي</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/packages" className="hover:text-emerald-400 transition-colors flex items-center gap-2 group">
                      <ChevronLeft className="h-3.5 w-3.5 text-stone-600 group-hover:text-emerald-400 shrink-0 transition-colors" />
                      <span>باقات الاشتراك والترويج</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/notifications" className="hover:text-emerald-400 transition-colors flex items-center gap-2 group">
                      <ChevronLeft className="h-3.5 w-3.5 text-stone-600 group-hover:text-emerald-400 shrink-0 transition-colors" />
                      <span>مركز الإشعارات والتحديثات</span>
                    </Link>
                  </li>
                </ul>
              </div>

            </div>

            {/* Bottom Copyright & Legal Strip */}
            <div className="pt-8 border-t border-stone-800/80 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold text-stone-500">
              <div>
                © {getJordanYear()} {globalSettings.siteName}. جميع الحقوق محفوظة.
              </div>
              <div className="flex items-center gap-4 sm:gap-5 text-stone-400 flex-wrap justify-center">
                <Link to="/about" className="hover:text-white transition-colors">عن المنصة</Link>
                <span className="text-stone-800">•</span>
                <Link to="/terms" className="hover:text-white transition-colors">الشروط والأحكام</Link>
                <span className="text-stone-800">•</span>
                <Link to="/privacy" className="hover:text-white transition-colors">سياسة الخصوصية</Link>
                <span className="text-stone-800">•</span>
                <Link to="/contact" className="hover:text-white transition-colors">اتصل بنا</Link>
              </div>
            </div>

          </div>
        </footer>
      )}

      {/* Global Quick Search Modal Dialog - Removed */}

      {/* Progressive Web App Install Banner */}
      <PwaInstallBanner />

      {/* Floating Mobile Scroll To Top Button */}
      <FloatingScrollToTop />

      {/* Floating Cart & Cart Conflict Resolution Modal */}
      <FloatingCartWidget />
      <CartConflictModal />

      {/* 100% Free AI Smart Site Assistant */}
      {isSettingsLoaded && globalSettings?.enableAiAssistant !== false && (
        <AiSiteAssistant />
      )}

      {/* Mobile Fixed Bottom Navigation Bar */}
      {!location.pathname.includes('/menu-offers') && !(location.pathname.startsWith('/products/') && location.pathname !== '/products') && (
        <BottomNavigation 
          onOpenSearch={() => navigate('/search')} 
          hasUnreadMessages={hasUnreadMessages} 
          onToggleMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
          onCloseMenu={closeMenu}
          isMenuOpen={mobileMenuOpen}
        />
      )}
    </div>
  );
}
