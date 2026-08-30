import React from 'react';
import { Link, useLocation } from 'react-router';
import { Store, Flame, MessageSquare, Menu, X, PlusCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface BottomNavigationProps {
  onOpenSearch: () => void;
  hasUnreadMessages?: boolean;
  onToggleMenu?: () => void;
  onCloseMenu?: () => void;
  isMenuOpen?: boolean;
}

export function BottomNavigation({ 
  hasUnreadMessages, 
  onToggleMenu, 
  onCloseMenu,
  isMenuOpen 
}: BottomNavigationProps) {
  const location = useLocation();

  // Hide the global bottom navigation on business details page because it has its own dedicated sticky action bar
  if (location.pathname.startsWith('/business/') || location.pathname.startsWith('/b/') || location.pathname.includes('/@')) {
    return null;
  }

  const navItems = [
    {
      label: 'الرئيسية',
      path: '/',
      icon: Store,
      type: 'link',
    },
    {
      label: 'العروض',
      path: '/offers',
      icon: Flame,
      type: 'link',
      isSpecial: true,
      specialBgClass: "bg-amber-50",
      specialIconClass: "text-amber-600"
    },
    {
      label: 'أضف محلك',
      path: '/contact',
      icon: PlusCircle,
      type: 'link',
      isSpecial: true,
      specialBgClass: "bg-emerald-50",
      specialIconClass: "text-emerald-700"
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
    <nav 
      aria-label="التنقل السفلي"
      className="md:hidden fixed bottom-4 left-3 right-3 sm:left-6 sm:right-6 z-40 bg-white/92 backdrop-blur-2xl border border-stone-200/90 shadow-[0_12px_36px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.06)] rounded-full px-2 py-1.5 max-w-[400px] mx-auto"
    >
      <div className="flex items-center justify-between w-full gap-0.5" dir="rtl">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.type === 'menu_button' 
            ? isMenuOpen 
            : (item.path ? location.pathname === item.path : false);

          const innerContent = (
            <>
              <div className="w-10 h-10 rounded-full flex items-center justify-center relative shrink-0">
                {isActive && (
                  <motion.div
                    layoutId="activeNavBubble"
                    className="absolute inset-0 rounded-full bg-[#1a4d2e] shadow-md shadow-[#1a4d2e]/30"
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 32,
                      mass: 0.8
                    }}
                  />
                )}
                {!isActive && item.isSpecial && (
                  <div className={cn("absolute inset-0 rounded-full transition-transform duration-200 group-hover:scale-105", item.specialBgClass)} />
                )}
                <Icon 
                  className={cn(
                    "h-4.5 w-4.5 relative z-10 transition-colors duration-200", 
                    isActive 
                      ? "text-white stroke-[2.5px]" 
                      : item.isSpecial 
                      ? item.specialIconClass 
                      : "text-stone-500 group-hover:text-stone-800"
                  )} 
                />
                {item.hasBadge && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-white animate-pulse z-20" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] sm:text-[11px] mt-1 text-center whitespace-nowrap leading-none transition-colors relative z-10",
                  isActive ? "font-black text-[#1a4d2e]" : "font-bold text-stone-600 group-hover:text-stone-900"
                )}
              >
                {item.label}
              </span>
            </>
          );

          if (item.type === 'menu_button') {
            return (
              <button
                key={index}
                type="button"
                onClick={item.onClick}
                className="flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all relative cursor-pointer active:scale-95 group focus:outline-none min-w-0"
              >
                {innerContent}
              </button>
            );
          }

          return (
            <Link
              key={index}
              to={item.path!}
              onClick={onCloseMenu}
              className="flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-2xl transition-all relative cursor-pointer active:scale-95 group focus:outline-none min-w-0"
            >
              {innerContent}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
