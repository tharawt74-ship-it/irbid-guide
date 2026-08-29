import React from 'react';
import { Link, useLocation } from 'react-router';
import { Store, Flame, Search, MessageSquare, Menu, X, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

interface BottomNavigationProps {
  onOpenSearch: () => void;
  hasUnreadMessages?: boolean;
  onToggleMenu?: () => void;
  isMenuOpen?: boolean;
}

export function BottomNavigation({ 
  onOpenSearch, 
  hasUnreadMessages, 
  onToggleMenu, 
  isMenuOpen 
}: BottomNavigationProps) {
  const location = useLocation();
  const [showAddBusiness, setShowAddBusiness] = React.useState(false);

  // Automatically toggle the button every 4 seconds for maximum visibility and engagement
  React.useEffect(() => {
    const interval = setInterval(() => {
      setShowAddBusiness((prev) => !prev);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Hide the global bottom navigation on business details page because it has its own dedicated sticky action bar
  if (location.pathname.startsWith('/business/')) {
    return null;
  }

  const navItems = [
    {
      label: 'الرئيسية',
      path: '/',
      icon: Store,
      type: 'link',
    },
    showAddBusiness ? {
      label: 'أضف محلك',
      path: '/contact',
      icon: PlusCircle,
      type: 'link',
      isSpecial: true,
      specialColorClass: "bg-emerald-100 text-emerald-800 animate-pulse",
      iconColorClass: "text-emerald-600"
    } : {
      label: 'العروض',
      path: '/offers',
      icon: Flame,
      type: 'link',
      isSpecial: true,
      specialColorClass: "bg-amber-100 text-amber-700 animate-pulse",
      iconColorClass: "text-red-500"
    },
    {
      label: 'بحث',
      type: 'button',
      onClick: onOpenSearch,
      icon: Search,
    },
    {
      label: 'الرسائل',
      path: '/messages',
      icon: MessageSquare,
      type: 'link',
      hasBadge: hasUnreadMessages,
    },
    {
      label: 'القائمة',
      type: 'menu_button',
      onClick: onToggleMenu,
      icon: isMenuOpen ? X : Menu,
    },
  ];

  return (
    <div className="md:hidden fixed bottom-5 left-4 right-4 z-40 bg-white/95 backdrop-blur-lg border border-stone-200/80 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-3xl px-2 py-2 max-w-md mx-auto">
      <div className="flex items-center justify-around w-full" dir="rtl">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.path ? location.pathname === item.path : false;

          if (item.type === 'button' || item.type === 'menu_button') {
            const isItemActive = item.type === 'menu_button' ? isMenuOpen : false;
            return (
              <button
                key={index}
                type="button"
                onClick={item.onClick}
                className={cn(
                  "flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all relative cursor-pointer active:scale-95",
                  isItemActive ? "text-[#1a4d2e] font-black" : "text-stone-500 hover:text-stone-800"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center transition-all relative",
                    isItemActive
                      ? "bg-[#1a4d2e] text-white shadow-xs"
                      : "bg-stone-50 border border-stone-200/50 text-stone-600 hover:bg-emerald-50 hover:text-[#1a4d2e]"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span
                  className={cn(
                    "text-[10px] mt-0.5 truncate max-w-[56px] text-center",
                    isItemActive ? "font-black text-[#1a4d2e]" : "font-bold text-stone-500"
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          }

          if (item.isSpecial) {
            return (
              <div key={index} className="flex flex-col items-center justify-center overflow-hidden h-[54px] w-[64px] relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={showAddBusiness ? 'add' : 'offers'}
                    initial={{ y: 24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -24, opacity: 0 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                    className="absolute inset-0 flex flex-col items-center justify-center"
                  >
                    <Link
                      to={item.path!}
                      className={cn(
                        "flex flex-col items-center justify-center w-full h-full transition-all relative active:scale-95",
                        isActive ? "text-[#1a4d2e] font-black" : "text-stone-500 hover:text-stone-800"
                      )}
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center transition-all relative",
                          isActive
                            ? "bg-[#1a4d2e] text-white shadow-xs"
                            : item.isSpecial
                            ? item.specialColorClass
                            : "bg-transparent text-stone-500"
                        )}
                      >
                        <Icon className={cn("h-4 w-4", item.isSpecial && !isActive && item.iconColorClass)} />
                        {item.hasBadge && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-white animate-pulse" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[10px] mt-0.5 truncate max-w-[56px] text-center",
                          isActive ? "font-black text-[#1a4d2e]" : "font-bold text-stone-500"
                        )}
                      >
                        {item.label}
                      </span>
                    </Link>
                  </motion.div>
                </AnimatePresence>
              </div>
            );
          }

          return (
            <Link
              key={index}
              to={item.path!}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all relative active:scale-95",
                isActive ? "text-[#1a4d2e] font-black" : "text-stone-500 hover:text-stone-800"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center transition-all relative",
                  isActive
                    ? "bg-[#1a4d2e] text-white shadow-xs"
                    : item.isSpecial
                    ? item.specialColorClass
                    : "bg-transparent text-stone-500"
                )}
              >
                <Icon className={cn("h-4 w-4", item.isSpecial && !isActive && item.iconColorClass)} />
                {item.hasBadge && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-white" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-0.5 truncate max-w-[56px] text-center",
                  isActive ? "font-black text-[#1a4d2e]" : "font-bold text-stone-500"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
