import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { 
  Store, 
  LayoutGrid, 
  Bot, 
  Menu, 
  X, 
  PlusCircle, 
  Stethoscope,
  Flame,
  ShoppingBag,
  Briefcase,
  Building2,
  Bus,
  Newspaper,
  Compass,
  Clock,
  ChevronLeft,
  Phone,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { cn } from '../../lib/utils';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { playAiHoverSound, playAiClickSound } from '../../utils/aiSoundEffects';
import { WhatsApp3DIcon } from '../common/PremiumContactButtons';
import { trackBusinessInteraction } from '../../lib/analyticsTracker';

interface BottomNavigationProps {
  onOpenSearch: () => void;
  hasUnreadMessages?: boolean;
  onToggleMenu?: () => void;
  onCloseMenu?: () => void;
  isMenuOpen?: boolean;
}

interface NavItem {
  label: string;
  path?: string;
  icon: React.ComponentType<{ className?: string }>;
  type: 'link' | 'button';
  specialIconClass?: string;
  hasBadge?: boolean;
  onClick?: () => void;
}

interface CategoryOption {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  textColor: string;
  bgHover: string;
}

interface BusinessNavData {
  phone?: string;
  whatsappUrl?: string;
  googleMapsUrl?: string;
  businessId?: string;
  userId?: string;
  isOwner?: boolean;
  isAdmin?: boolean;
}

export function BottomNavigation({ 
  hasUnreadMessages, 
  onToggleMenu, 
  onCloseMenu, 
  isMenuOpen 
}: BottomNavigationProps) {
  const location = useLocation();
  const { globalSettings, isSettingsLoaded } = useSystemSettings();
  const isAiEnabled = isSettingsLoaded && globalSettings?.enableAiAssistant !== false;

  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isSectionsOpen, setIsSectionsOpen] = useState(false);
  const [hasSeenAiDot, setHasSeenAiDot] = useState(() => {
    return localStorage.getItem('shofi_ai_opened_once') === 'true';
  });

  const [businessNavData, setBusinessNavData] = useState<BusinessNavData | null>(null);

  // Listen to business navigation data sent from BusinessDetail or medical pages
  useEffect(() => {
    const handleBusinessData = (e: any) => {
      if (e.detail) {
        setBusinessNavData(e.detail);
      } else {
        setBusinessNavData(null);
      }
    };

    window.addEventListener('shofi-business-nav-data', handleBusinessData);
    return () => {
      window.removeEventListener('shofi-business-nav-data', handleBusinessData);
    };
  }, []);

  useEffect(() => {
    const handleStateChange = (e: any) => {
      if (typeof e.detail?.isOpen === 'boolean') {
        setIsAiOpen(e.detail.isOpen);
        if (e.detail.isOpen) {
          setHasSeenAiDot(true);
          localStorage.setItem('shofi_ai_opened_once', 'true');
        }
      }
    };

    window.addEventListener('ai-assistant-state-changed', handleStateChange);
    return () => {
      window.removeEventListener('ai-assistant-state-changed', handleStateChange);
    };
  }, []);

  // Close sections popup on route change or when external menu opens
  useEffect(() => {
    setIsSectionsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isMenuOpen) {
      setIsSectionsOpen(false);
    }
  }, [isMenuOpen]);

  // Hide global bottom navigation only on messages and search pages
  if (
    location.pathname === '/messages' ||
    location.pathname.startsWith('/messages/') ||
    location.pathname === '/search'
  ) {
    return null;
  }

  // Check if current view is a business / medical facility detail page
  const isBusinessDetailPage = 
    location.pathname.startsWith('/business/') || 
    location.pathname.startsWith('/b/') || 
    location.pathname.includes('/@') ||
    Boolean(businessNavData?.businessId);

  const isMedicalPage = location.pathname.startsWith('/medical');
  const isHousingPage = location.pathname.startsWith('/housing');

  // Main 3 items in the regular navbar
  const mainNavItems: NavItem[] = [
    {
      label: 'الرئيسية',
      path: '/',
      icon: Store,
      type: 'link',
    },
    {
      label: isSectionsOpen ? 'إغلاق' : 'الأقسام',
      icon: isSectionsOpen ? X : LayoutGrid,
      type: 'button',
      specialIconClass: isSectionsOpen ? "text-rose-600 stroke-[2.5px]" : "text-[#1a4d2e]",
      onClick: () => {
        if (onCloseMenu) onCloseMenu();
        setIsSectionsOpen(prev => !prev);
      }
    },
    isMedicalPage ? {
      label: 'أضف منشأتك',
      path: '/medical/register',
      icon: Stethoscope,
      type: 'link',
      specialIconClass: "text-emerald-600"
    } : isHousingPage ? {
      label: 'أضف عقارك',
      path: '/housing',
      icon: PlusCircle,
      type: 'link',
      specialIconClass: "text-[#1a4d2e]",
      onClick: () => {
        window.dispatchEvent(new CustomEvent('open-add-housing-modal'));
      }
    } : {
      label: 'أضف محلك',
      path: '/contact',
      icon: PlusCircle,
      type: 'link',
      specialIconClass: "text-stone-700"
    },
  ];

  const categoryOptions: CategoryOption[] = [
    {
      title: 'العروض والخصومات',
      path: '/offers',
      icon: Flame,
      iconColor: 'text-rose-600',
      textColor: 'text-rose-700',
      bgHover: 'hover:bg-rose-50/50'
    },
    {
      title: 'المنتجات والخدمات',
      path: '/products',
      icon: ShoppingBag,
      iconColor: 'text-[#1a4d2e]',
      textColor: 'text-[#1a4d2e]',
      bgHover: 'hover:bg-emerald-50/50'
    },
    {
      title: 'الرعاية الطبية',
      path: '/medical',
      icon: Stethoscope,
      iconColor: 'text-teal-600',
      textColor: 'text-teal-700',
      bgHover: 'hover:bg-teal-50/50'
    },
    {
      title: 'الوظائف',
      path: '/jobs',
      icon: Briefcase,
      iconColor: 'text-emerald-600',
      textColor: 'text-emerald-700',
      bgHover: 'hover:bg-emerald-50/50'
    },
    {
      title: 'سكنات وعقارات',
      path: '/housing',
      icon: Building2,
      iconColor: 'text-blue-600',
      textColor: 'text-blue-700',
      bgHover: 'hover:bg-blue-50/50'
    },
    {
      title: 'دليل المواصلات',
      path: '/transportation',
      icon: Bus,
      iconColor: 'text-amber-600',
      textColor: 'text-amber-700',
      bgHover: 'hover:bg-amber-50/50'
    },
    {
      title: 'أخبار أربد',
      path: '/news',
      icon: Newspaper,
      iconColor: 'text-purple-600',
      textColor: 'text-purple-700',
      bgHover: 'hover:bg-purple-50/50'
    },
    {
      title: 'الأماكن السياحية',
      path: '/tourism',
      icon: Compass,
      iconColor: 'text-cyan-600',
      textColor: 'text-cyan-700',
      bgHover: 'hover:bg-cyan-50/50'
    },
    {
      title: 'مواقيت الصلاة',
      path: '/prayer-times',
      icon: Clock,
      iconColor: 'text-indigo-600',
      textColor: 'text-indigo-700',
      bgHover: 'hover:bg-indigo-50/50'
    },
  ];

  const handleAiClick = () => {
    if (onCloseMenu) onCloseMenu();
    setIsSectionsOpen(false);
    setHasSeenAiDot(true);
    localStorage.setItem('shofi_ai_opened_once', 'true');
    window.dispatchEvent(new CustomEvent('toggle-ai-assistant'));
  };

  // Staggered animation variants for sections
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03,
        delayChildren: 0.02
      }
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: 0.015,
        staggerDirection: -1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 14, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 420,
        damping: 28
      }
    },
    exit: {
      opacity: 0,
      y: 8,
      scale: 0.96,
      transition: { duration: 0.12 }
    }
  };

  return (
    <>
      {/* Categories / Sections Staggered List Overlay */}
      <AnimatePresence>
        {isSectionsOpen && (
          <>
            {/* Fullscreen Blurred Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-[80] bg-stone-950/45 backdrop-blur-md"
              onClick={() => setIsSectionsOpen(false)}
            />

            {/* List Container positioned directly ABOVE the Bottom Navbar */}
            <div 
              className="md:hidden fixed left-3 right-3 bottom-[78px] z-[90] max-w-[420px] mx-auto pointer-events-none flex flex-col justify-end"
              dir="rtl"
            >
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="pointer-events-auto space-y-2 max-h-[calc(100dvh-96px)] overflow-y-auto px-0.5 py-1 scrollbar-none"
              >
                {categoryOptions.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <motion.div key={index} variants={itemVariants}>
                      <Link
                        to={item.path}
                        onClick={() => setIsSectionsOpen(false)}
                        className={cn(
                          "w-full bg-white rounded-2xl p-3 sm:p-3.5 flex items-center justify-between border border-stone-200/90 shadow-md transition-all duration-150 active:scale-[0.98] group cursor-pointer",
                          item.bgHover
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn("w-5 h-5 shrink-0 transition-transform group-hover:scale-110", item.iconColor)} />
                          <span className={cn("text-xs sm:text-sm font-black transition-colors", item.textColor)}>
                            {item.title}
                          </span>
                        </div>
                        <ChevronLeft className="w-4 h-4 text-stone-400 group-hover:text-stone-700 group-hover:-translate-x-1 transition-all" />
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Nav Bar Container */}
      <div 
        className="md:hidden fixed bottom-4 left-3 right-3 z-[100] flex items-center justify-center gap-2 max-w-[420px] mx-auto pointer-events-none"
        dir="rtl"
      >
        {/* 1. Standalone Circular Menu Button: Black & White in normal, Black & Red with X when open */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            setIsSectionsOpen(false);
            if (onToggleMenu) onToggleMenu();
          }}
          className="pointer-events-auto relative shrink-0 w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer group border bg-stone-900 hover:bg-stone-800 text-white border-stone-800"
          title={isMenuOpen ? "إغلاق القائمة" : "القائمة"}
          aria-label={isMenuOpen ? "إغلاق القائمة" : "القائمة"}
        >
          <div className="relative flex items-center justify-center">
            {isMenuOpen ? (
              <X className="w-5.5 h-5.5 text-red-500 stroke-[2.5]" />
            ) : (
              <Menu className="w-5.5 h-5.5 text-white group-hover:scale-105 transition-transform duration-150" />
            )}
            {hasUnreadMessages && !isMenuOpen && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-stone-900" />
            )}
          </div>
          <span className={cn(
            "text-[10px] font-bold mt-0.5 leading-none",
            isMenuOpen ? "text-red-400 font-black" : "text-white"
          )}>
            {isMenuOpen ? 'إغلاق' : 'القائمة'}
          </span>
        </motion.button>

        {/* 2. Main Pill Navigation Bar */}
        <nav 
          aria-label="التنقل السفلي"
          className="pointer-events-auto flex-1 h-14 bg-white border border-stone-200 shadow-sm rounded-full p-1.5 flex items-center min-w-0"
        >
          {isBusinessDetailPage ? (
            /* ========================================================================= */
            /* Business & Medical Facility Actions Bar: اتصال - واتساب - الاتجاهات      */
            /* ========================================================================= */
            <div className="flex items-center justify-between w-full h-full gap-1">
              {/* زر اتصال */}
              <a
                href={businessNavData?.phone ? `tel:${businessNavData.phone}` : '#'}
                onClick={(e) => {
                  if (!businessNavData?.phone) {
                    e.preventDefault();
                  } else if (businessNavData?.businessId) {
                    trackBusinessInteraction(businessNavData.businessId, 'call', {
                      isOwner: businessNavData.isOwner,
                      ownerId: businessNavData.userId,
                      isAdmin: businessNavData.isAdmin
                    });
                  }
                }}
                className={cn(
                  "flex-1 h-full flex flex-col items-center justify-center py-1 px-1.5 rounded-full transition-all relative cursor-pointer active:scale-95 group focus:outline-none min-w-0 hover:bg-stone-50",
                  !businessNavData?.phone && "opacity-40 pointer-events-none"
                )}
                title="اتصال هاتفي"
              >
                <Phone className="h-4 w-4 text-[#1a4d2e] transition-transform group-hover:scale-110 shrink-0 stroke-[2.2]" />
                <span className="text-[10px] sm:text-[11px] font-black text-stone-800 mt-0.5 text-center whitespace-nowrap leading-none">
                  اتصال
                </span>
              </a>

              {/* فاصل رأسي خفيف */}
              <div className="w-[1px] h-6 bg-stone-200 shrink-0" />

              {/* زر واتساب */}
              <a
                href={businessNavData?.whatsappUrl || '#'}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                  if (!businessNavData?.whatsappUrl) {
                    e.preventDefault();
                  } else if (businessNavData?.businessId) {
                    trackBusinessInteraction(businessNavData.businessId, 'whatsapp', {
                      isOwner: businessNavData.isOwner,
                      ownerId: businessNavData.userId,
                      isAdmin: businessNavData.isAdmin
                    });
                  }
                }}
                className={cn(
                  "flex-1 h-full flex flex-col items-center justify-center py-1 px-1.5 rounded-full transition-all relative cursor-pointer active:scale-95 group focus:outline-none min-w-0 hover:bg-emerald-50/50",
                  !businessNavData?.whatsappUrl && "opacity-40 pointer-events-none"
                )}
                title="محادثة واتساب"
              >
                <WhatsApp3DIcon className="h-4 w-4 text-emerald-600 transition-transform group-hover:scale-110 shrink-0" />
                <span className="text-[10px] sm:text-[11px] font-black text-stone-800 mt-0.5 text-center whitespace-nowrap leading-none">
                  واتساب
                </span>
              </a>

              {/* فاصل رأسي خفيف */}
              <div className="w-[1px] h-6 bg-stone-200 shrink-0" />

              {/* زر الاتجاهات */}
              <a
                href={businessNavData?.googleMapsUrl || '#'}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                  if (!businessNavData?.googleMapsUrl) {
                    e.preventDefault();
                  } else if (businessNavData?.businessId) {
                    trackBusinessInteraction(businessNavData.businessId, 'direction', {
                      isOwner: businessNavData.isOwner,
                      ownerId: businessNavData.userId,
                      isAdmin: businessNavData.isAdmin
                    });
                  }
                }}
                className={cn(
                  "flex-1 h-full flex flex-col items-center justify-center py-1 px-1.5 rounded-full transition-all relative cursor-pointer active:scale-95 group focus:outline-none min-w-0 hover:bg-amber-50/50",
                  !businessNavData?.googleMapsUrl && "opacity-40 pointer-events-none"
                )}
                title="خرائط واتجاهات الموقع"
              >
                <MapPin className="h-4 w-4 text-[#1a4d2e] transition-transform group-hover:scale-110 shrink-0 stroke-[2.2]" />
                <span className="text-[10px] sm:text-[11px] font-black text-stone-800 mt-0.5 text-center whitespace-nowrap leading-none">
                  الاتجاهات
                </span>
              </a>
            </div>
          ) : (
            /* ========================================================================= */
            /* General Navigation Items with Solid Pill Highlight                        */
            /* ========================================================================= */
            <LayoutGroup id="mobile-bottom-nav">
              <div className="flex items-center justify-between w-full h-full gap-1">
                {mainNavItems.map((item, index) => {
                  const Icon = item.icon;
                  const isActive = item.type === 'button'
                    ? isSectionsOpen
                    : (item.path ? (item.path === '/' ? (location.pathname === '/' && !isSectionsOpen && !isMenuOpen) : (location.pathname === item.path || location.pathname.startsWith(`${item.path}/`))) : false);

                  const innerContent = (
                    <div className="relative w-full h-full flex flex-col items-center justify-center py-1 px-1.5 rounded-full">
                      {/* Solid Pill-Shaped Highlight for Icon + Text */}
                      {isActive && (
                        <motion.div
                          layoutId="activeNavPill"
                          initial={false}
                          className={cn(
                            "absolute inset-0 rounded-full shadow-xs pointer-events-none transform-gpu will-change-transform",
                            isSectionsOpen && item.type === 'button' ? "bg-rose-600" : "bg-[#1a4d2e]"
                          )}
                          transition={{
                            type: "spring",
                            stiffness: 480,
                            damping: 34,
                            mass: 0.6,
                          }}
                        />
                      )}
                      <Icon 
                        className={cn(
                          "h-4 w-4 relative z-10 transition-colors duration-150 shrink-0", 
                          isActive 
                            ? "text-white stroke-[2.5px]" 
                            : "text-stone-600 group-hover:text-stone-900"
                        )} 
                      />
                      <span
                        className={cn(
                          "text-[10px] sm:text-[11px] mt-0.5 text-center whitespace-nowrap leading-none transition-colors relative z-10",
                          isActive 
                            ? "font-black text-white" 
                            : "font-bold text-stone-600 group-hover:text-stone-900"
                        )}
                      >
                        {item.label}
                      </span>
                    </div>
                  );

                  if (item.type === 'button') {
                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={item.onClick}
                        className="flex-1 h-full flex flex-col items-center justify-center rounded-full transition-all relative cursor-pointer active:scale-95 group focus:outline-none min-w-0"
                      >
                        {innerContent}
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={index}
                      to={item.path!}
                      onClick={() => {
                        if (item.onClick) item.onClick();
                        if (onCloseMenu) onCloseMenu();
                      }}
                      className="flex-1 h-full flex flex-col items-center justify-center rounded-full transition-all relative cursor-pointer active:scale-95 group focus:outline-none min-w-0"
                    >
                      {innerContent}
                    </Link>
                  );
                })}
              </div>
            </LayoutGroup>
          )}
        </nav>

        {/* 3. Standalone Circular AI Assistant Button */}
        {isAiEnabled && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onMouseEnter={playAiHoverSound}
            onClick={() => {
              playAiClickSound();
              handleAiClick();
            }}
            id="mobile-bottom-ai-btn"
            className="pointer-events-auto relative shrink-0 w-14 h-14 rounded-full bg-[#1a4d2e] hover:bg-[#143e24] active:bg-[#0f2e1b] text-white flex flex-col items-center justify-center border border-[#143e24] shadow-md active:scale-95 transition-all cursor-pointer group"
            title={isAiOpen ? "إغلاق المساعد" : "ربداوي AI"}
            aria-label={isAiOpen ? "إغلاق المساعد" : "ربداوي AI"}
          >
            <div className="relative flex items-center justify-center">
              {isAiOpen ? (
                <X className="w-5.5 h-5.5 text-emerald-300 group-hover:scale-105 transition-transform duration-150" />
              ) : (
                <Bot className="w-5.5 h-5.5 text-emerald-300 group-hover:scale-105 transition-transform duration-150" />
              )}
              {!hasSeenAiDot && !isAiOpen && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white"></span>
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold text-emerald-100 mt-0.5 leading-none">
              {isAiOpen ? 'إغلاق' : 'ربداوي'}
            </span>
          </motion.button>
        )}
      </div>
    </>
  );
}
