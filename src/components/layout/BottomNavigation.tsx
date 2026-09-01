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
      specialIconClass: "text-amber-600"
    },
    {
      label: 'أضف محلك',
      path: '/contact',
      icon: PlusCircle,
      type: 'link',
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
      className="md:hidden fixed bottom-5 left-4 right-4 z-40 bg-white/45 backdrop-blur-3xl border border-white/60 shadow-[0_24px_50px_-6px_rgba(0,0,0,0.14),inset_0_1.5px_1px_rgba(255,255,255,0.85),inset_0_-1px_1px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.04)] rounded-full px-2.5 py-2 max-w-[390px] mx-auto"
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
                    className="absolute inset-0 rounded-full bg-[#1a4d2e]/14 backdrop-blur-[6px] border border-[#1a4d2e]/25 shadow-[inset_1px_1px_1.5px_rgba(255,255,255,0.75),inset_-1px_-1px_2px_rgba(26,77,46,0.15),0_3px_8px_rgba(26,77,46,0.12)]"
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 32,
                      mass: 0.8
                    }}
                  />
                )}
                <Icon 
                  className={cn(
                    "h-4.5 w-4.5 relative z-10 transition-colors duration-200", 
                    isActive 
                      ? "text-[#1a4d2e] stroke-[2.5px] drop-shadow-[0_0.5px_1px_rgba(26,77,46,0.15)]" 
                      : item.specialIconClass 
                      ? item.specialIconClass 
                      : "text-stone-500 group-hover:text-stone-800"
                  )} 
                />
                {item.hasBadge && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-white/60 animate-pulse z-20" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] sm:text-[11px] mt-1 text-center whitespace-nowrap leading-none transition-colors relative z-10",
                  isActive ? "font-black text-[#1a4d2e] drop-shadow-[0_1px_1px_rgba(255,255,255,0.85)]" : "font-bold text-stone-600 group-hover:text-stone-900"
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
