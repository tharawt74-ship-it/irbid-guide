import React from 'react';
import { Link, useLocation } from 'react-router';
import { Store, Flame, Bot, Menu, X, PlusCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { playAiHoverSound, playAiClickSound } from '../../utils/aiSoundEffects';

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
  type: 'link' | 'menu_button';
  specialIconClass?: string;
  hasBadge?: boolean;
  onClick?: () => void;
}

export function BottomNavigation({ 
  hasUnreadMessages, 
  onToggleMenu, 
  onCloseMenu, 
  isMenuOpen 
}: BottomNavigationProps) {
  const location = useLocation();
  const { globalSettings } = useSystemSettings();
  const isAiEnabled = globalSettings?.enableAiAssistant !== false;

  // Hide global bottom navigation on business details page
  if (location.pathname.startsWith('/business/') || location.pathname.startsWith('/b/') || location.pathname.includes('/@')) {
    return null;
  }

  const mainNavItems: NavItem[] = [
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
      specialIconClass: "text-stone-700"
    },
    {
      label: 'القائمة',
      type: 'menu_button',
      onClick: onToggleMenu,
      icon: isMenuOpen ? X : Menu,
    },
  ];

  const handleAiClick = () => {
    if (onCloseMenu) onCloseMenu();
    window.dispatchEvent(new CustomEvent('toggle-ai-assistant'));
  };

  return (
    <div 
      className="md:hidden fixed bottom-4 left-3 right-3 z-[70] flex items-center justify-center gap-2 max-w-[420px] mx-auto pointer-events-none"
      dir="rtl"
    >
      {/* Standalone Circular AI Assistant Button - Exact matching height/diameter as navbar (h-14 = 56px) in 2D flat style */}
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
          className="pointer-events-auto relative shrink-0 w-14 h-14 rounded-full bg-[#1a4d2e] hover:bg-[#143e24] active:bg-[#0f2e1b] text-white flex flex-col items-center justify-center border border-[#143e24] shadow-sm active:scale-95 transition-all cursor-pointer group"
          title="ربداوي AI"
          aria-label="ربداوي AI"
        >
          <div className="relative flex items-center justify-center">
            <Bot className="w-5.5 h-5.5 text-emerald-300 group-hover:scale-105 transition-transform duration-150" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-100 mt-0.5 leading-none">
            ربداوي
          </span>
        </motion.button>
      )}

      {/* Unified 4-Item Main Navigation Bar - Clean 2D flat style with matching h-14 height */}
      <nav 
        aria-label="التنقل السفلي"
        className="pointer-events-auto flex-1 h-14 bg-white border border-stone-200 shadow-sm rounded-full px-2.5 flex items-center min-w-0"
      >
        <div className="flex items-center justify-between w-full gap-1">
          {mainNavItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = item.type === 'menu_button' 
              ? isMenuOpen 
              : (item.path ? location.pathname === item.path : false);

            const innerContent = (
              <>
                <div className="w-8 h-8 rounded-full flex items-center justify-center relative shrink-0">
                  {isActive && (
                    <motion.div
                      layoutId="activeNavBubble2D"
                      className="absolute inset-0 rounded-full bg-[#1a4d2e]/10 border border-[#1a4d2e]/20"
                      transition={{
                        type: "spring",
                        stiffness: 450,
                        damping: 35,
                      }}
                    />
                  )}
                  <Icon 
                    className={cn(
                      "h-4.5 w-4.5 relative z-10 transition-colors duration-150", 
                      isActive 
                        ? "text-[#1a4d2e] stroke-[2.5px]" 
                        : item.specialIconClass 
                        ? item.specialIconClass 
                        : "text-stone-500 group-hover:text-stone-800"
                    )} 
                  />
                  {item.hasBadge && (
                    <span className="absolute 0 top-0 right-0 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white z-20" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] sm:text-[11px] mt-0.5 text-center whitespace-nowrap leading-none transition-colors relative z-10",
                    isActive ? "font-bold text-[#1a4d2e]" : "font-medium text-stone-600 group-hover:text-stone-900"
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
    </div>
  );
}
