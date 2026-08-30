import React, { useState, useEffect, useRef } from 'react';
import { 
  Store, Search, Tag, MessageSquare, Plus, Minus, Trash2,
  Sparkles, Check, Flame, ExternalLink, UtensilsCrossed,
  DollarSign, Edit3, LayoutGrid, List, ShoppingBag, Eye, X, Info,
  Home, Building, Activity, GraduationCap, Wrench, Gift, ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Business, MenuItem } from '../../types';
import { trackBusinessInteraction } from '../../lib/analyticsTracker';
import { cn } from '../../lib/utils';
import { getCategoryTheme } from './DigitalMenuManagerModal';
import { useCart } from '../../contexts/CartContext';
import { Link } from 'react-router';

interface DigitalMenuViewProps {
  business: Business;
  isOwner?: boolean;
  onOpenManageMenu?: () => void;
}

interface CartItem {
  item: MenuItem;
  quantity: number;
}

export function DigitalMenuView({
  business,
  isOwner = false,
  onOpenManageMenu
}: DigitalMenuViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeSmartFilter, setActiveSmartFilter] = useState<'all' | 'popular' | 'offers'>('all');
  
  // Ref for search input and desktop keyboard shortcut focusing
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is on PC (lg viewport >= 1024px)
      if (window.innerWidth < 1024) return;
      
      const isInputFocused = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
      if (isInputFocused && document.activeElement !== searchInputRef.current) return;

      // Ctrl+K/⌘+K or '/' key
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === '/' && !isInputFocused) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Global Cart Context
  const { 
    addItem, 
    updateQuantity, 
    getItemQuantity, 
    totalCount, 
    totalPrice, 
    clearCart,
    sendOrderViaWhatsapp 
  } = useCart();
  
  // Lightbox state for premium image preview
  const [lightboxItem, setLightboxItem] = useState<MenuItem | null>(null);

  const menuItems: MenuItem[] = business.menuItems || [];
  
  // Resolve Dynamic Theme vocabulary
  const theme = getCategoryTheme(business.category || '');

  // Extract unique categories
  const categories = ['all', ...Array.from(new Set(menuItems.map(item => item.category || 'عام')))];

  // Helper to calculate real discount percentage if original price is provided
  const getItemDiscount = (item: MenuItem) => {
    if (item.originalPrice) {
      const original = parseFloat(item.originalPrice) || 0;
      const current = parseFloat(item.price) || 0;
      if (original > current && current > 0) {
        const percent = Math.round(((original - current) / original) * 100);
        return {
          originalPrice: item.originalPrice,
          discountPercent: percent
        };
      }
    }
    return null;
  };

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory || (!item.category && selectedCategory === 'عام');
    const matchesSearch = !searchQuery.trim() || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Smart Filter matching
    let matchesSmartFilter = true;
    if (activeSmartFilter === 'popular') {
      matchesSmartFilter = item.isPopular || item.badge === 'popular';
    } else if (activeSmartFilter === 'offers') {
      matchesSmartFilter = getItemDiscount(item) !== null;
    }

    return matchesCategory && matchesSearch && matchesSmartFilter;
  });

  // Cart operations using CartContext
  const addToCart = (item: MenuItem) => {
    addItem(item, {
      id: business.id,
      name: business.name,
      phone: business.phone
    });
  };

  const removeFromCart = (item: MenuItem) => {
    updateQuantity(item.id, -1);
  };

  const handleOrderCartWhatsapp = () => {
    trackBusinessInteraction(business.id, 'whatsapp');
    trackBusinessInteraction(business.id, 'menu');
    sendOrderViaWhatsapp();
  };

  const handleSingleOrderWhatsapp = (item: MenuItem) => {
    trackBusinessInteraction(business.id, 'whatsapp');
    trackBusinessInteraction(business.id, 'menu');

    let phone = business.phone ? business.phone.replace(/[^0-9]/g, '') : '';
    if (phone.startsWith('07')) {
      phone = '962' + phone.substring(1);
    } else if (!phone.startsWith('962') && phone.length === 9) {
      phone = '962' + phone;
    }

    const optionsText = item.options && item.options.length > 0 
      ? `\nالخيارات المفضلة: (${item.options.join(', ')})` 
      : '';

    const messageText = encodeURIComponent(
      `مرحباً ${business.name} 👋\nأرغب في حجز/طلب: *${item.name}*\nالسعر: *${item.price} د.أ*${optionsText}\nمن خلال منصة (شو في بإربد؟).`
    );

    if (phone) {
      window.open(`https://wa.me/${phone}?text=${messageText}`, '_blank');
    } else {
      alert(`رقم هاتف ${business.name} غير متوفر للطلب المباشر حالياً.`);
    }
  };

  // Helper to render high fidelity premium badge
  const renderPremiumBadge = (item: MenuItem) => {
    const badgeType = item.badge || (item.isPopular ? 'popular' : 'none');
    switch (badgeType) {
      case 'popular':
        return (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-1 z-10 whitespace-nowrap backdrop-blur-xs">
            <Flame className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-current animate-pulse shrink-0" />
            <span className="whitespace-nowrap">{theme.badges.popular}</span>
          </div>
        );
      case 'new':
        return (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-1 z-10 whitespace-nowrap backdrop-blur-xs">
            <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 animate-pulse shrink-0" />
            <span className="whitespace-nowrap">{theme.badges.new}</span>
          </div>
        );
      case 'spicy':
        return (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-rose-600 text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-1 z-10 whitespace-nowrap backdrop-blur-xs">
            <span className="whitespace-nowrap">{theme.badges.spicyOrFeatured}</span>
          </div>
        );
      case 'vegetarian':
        return (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-1 z-10 whitespace-nowrap backdrop-blur-xs">
            <span className="whitespace-nowrap">{theme.badges.vegetarianOrPromo}</span>
          </div>
        );
      default:
        return null;
    }
  };

  // Icon switcher for UI
  const getSectionIcon = () => {
    switch (theme.cartIconType) {
      case 'home':
        return <Home className="h-5 w-5 text-amber-700" />;
      case 'medical':
        return <Activity className="h-5 w-5 text-amber-700" />;
      case 'edu':
        return <GraduationCap className="h-5 w-5 text-amber-700" />;
      case 'wrench':
        return <Wrench className="h-5 w-5 text-amber-700" />;
      default:
        return <UtensilsCrossed className="h-5 w-5 text-amber-700" />;
    }
  };

  return (
    <div className="space-y-6 text-right relative" dir="rtl">
      
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e1da] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
              {getSectionIcon()}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 flex items-center gap-1.5">
              <span>{theme.title}</span>
              <span className="text-xs bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black px-2 py-0.5 rounded-md shadow-xs animate-pulse">
                VIP ✨
              </span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            {theme.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {isOwner && (
            <button
              type="button"
              onClick={onOpenManageMenu}
              className="inline-flex items-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer"
            >
              <Edit3 className="h-4 w-4" />
              <span>إدارة الكتالوج ({menuItems.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Layout/Filters Bar */}
      {menuItems.length > 0 && (
        <div className="space-y-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
          <div className="flex flex-col gap-3.5 w-full">
            {/* Search Box */}
            <div className="relative w-full group">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن أي صنف، خدمة، أو منتج..."
                className="w-full pl-10 lg:pl-12 pr-11 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] lg:hover:border-stone-300 lg:hover:shadow-2xs lg:focus:ring-4 lg:focus:ring-[#1a4d2e]/10 lg:focus:border-[#1a4d2e] lg:focus:shadow-sm transition-all duration-300 text-right"
              />
              <Search className="h-4 w-4 text-stone-400 absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-200 group-focus-within:text-[#1a4d2e]" />
              
              {/* Clear button when searchQuery exists */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-all cursor-pointer z-10"
                  title="مسح البحث"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Layout and Smart Filter Switchers */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
              {/* Smart Filters (All, Popular, Offers) - Clean Segmented Control Grid */}
              <div className="bg-stone-100 p-1 rounded-2xl border border-stone-200/80 grid grid-cols-3 gap-1 w-full sm:w-auto sm:min-w-[340px]">
                <button
                  type="button"
                  onClick={() => setActiveSmartFilter('all')}
                  className={cn(
                    "h-9 px-2 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer flex items-center justify-center text-center",
                    activeSmartFilter === 'all'
                      ? "bg-[#1a4d2e] text-white shadow-xs"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
                  )}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSmartFilter('popular')}
                  className={cn(
                    "h-9 px-2 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer text-center",
                    activeSmartFilter === 'popular'
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-amber-800 hover:bg-amber-100/60"
                  )}
                >
                  <Flame className="h-3.5 w-3.5 fill-current shrink-0" />
                  <span>المميز</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSmartFilter('offers')}
                  className={cn(
                    "h-9 px-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer text-center",
                    activeSmartFilter === 'offers'
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-rose-800 hover:bg-rose-100/60"
                  )}
                >
                  <Tag className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">العروض والتخفيضات</span>
                </button>
              </div>

              {/* Grid vs List Toggler */}
              <div className="bg-white border border-stone-200 rounded-2xl p-1 flex items-center justify-center self-end sm:self-auto shrink-0 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded-xl transition-all cursor-pointer",
                    viewMode === 'grid' 
                      ? "bg-amber-100 text-amber-800 font-bold" 
                      : "text-stone-400 hover:text-stone-600"
                  )}
                  title="عرض الشبكة الفاخر"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded-xl transition-all cursor-pointer",
                    viewMode === 'list' 
                      ? "bg-amber-100 text-amber-800 font-bold" 
                      : "text-stone-400 hover:text-stone-600"
                  )}
                  title="عرض القائمة المبسط"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Standard Categories Selection */}
          {categories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide border-t border-stone-200/50 pt-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer border",
                    selectedCategory === cat
                      ? 'bg-amber-950 border-amber-950 text-white shadow-2xs'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  )}
                >
                  {cat === 'all' ? 'جميع الأقسام' : cat}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {menuItems.length === 0 ? (
        <div className="text-center py-14 bg-stone-50 rounded-3xl border border-dashed border-[#e5e1da] p-6 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-100/80 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
            {getSectionIcon()}
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="text-lg font-black text-stone-800">الكتالوج الرقمي قيد التجهيز</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              يقوم فريق إدارة {business.name} بإضافة وتنسيق قائمة الأسعار والأصناف الخاصة بالمحل لعرضها هنا.
            </p>
          </div>

          {isOwner && (
            <button
              type="button"
              onClick={onOpenManageMenu}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1a4d2e] text-white rounded-xl font-bold text-xs hover:bg-[#133b22] transition-colors shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة أول صنف في الكتالوج الآن</span>
            </button>
          )}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-stone-500 bg-white rounded-2xl border border-stone-200 shadow-2xs">
          لم يتم العثور على نتائج تطابق خيارات التصفية والبحث المحددة.
        </div>
      ) : (
        /* Items Grid / List Display */
        <div className={cn(
          viewMode === 'grid' 
            ? "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4.5" 
            : "grid grid-cols-1 gap-2.5 sm:gap-3.5"
        )}>
          {filteredItems.map((item) => {
            const discount = getItemDiscount(item);
            const cartQty = getItemQuantity(item.id);

            if (viewMode === 'grid') {
              // --- GRID CARD (Mobile 2-Column Responsive Card) ---
              return (
                <motion.div
                  layout
                  key={item.id}
                  className={cn(
                    "bg-white border border-stone-100 shadow-[0_4px_12px_rgba(0,0,0,0.04)] rounded-2xl relative flex flex-col justify-between overflow-hidden text-right transition-all lg:border-stone-200/80 lg:shadow-[0_2px_10px_rgba(0,0,0,0.03)] lg:hover:shadow-md lg:hover:border-amber-500/30 group min-w-0",
                    (item.isPopular || item.badge === 'popular') && "border-amber-200 bg-amber-50/10"
                  )}
                >
                  {/* Top Aspect Ratio Image Box */}
                  <div className="relative w-full aspect-[4/3] bg-stone-100 overflow-hidden shrink-0 select-none">
                    {renderPremiumBadge(item)}

                    {item.imageUrl ? (
                      <div 
                        onClick={() => setLightboxItem(item)}
                        className="w-full h-full cursor-pointer relative group/img"
                        title="انقر لمعاينة الصورة كاملة"
                      >
                        <img
                          referrerPolicy="no-referrer"
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full bg-amber-50/60 text-amber-700 flex items-center justify-center border-b border-amber-100 relative overflow-hidden">
                        {theme.cartIconType === 'home' ? (
                          <Home className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600/40" />
                        ) : theme.cartIconType === 'medical' ? (
                          <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600/40" />
                        ) : theme.cartIconType === 'edu' ? (
                          <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600/40" />
                        ) : theme.cartIconType === 'wrench' ? (
                          <Wrench className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600/40" />
                        ) : (
                          <UtensilsCrossed className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600/40" />
                        )}
                      </div>
                    )}

                    {discount && (
                      <div className="absolute bottom-2 left-2 bg-rose-600 text-white text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-xs z-10 whitespace-nowrap">
                        %{discount.discountPercent}-
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2 min-w-0">
                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-extrabold text-stone-900 lg:font-bold line-clamp-1 leading-snug group-hover:text-amber-950">
                        {item.name}
                      </h3>

                      <div className="flex flex-wrap items-center gap-1">
                        {item.category && (
                          <span className="inline-block text-[9px] sm:text-[10px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded truncate max-w-full">
                            {item.category}
                          </span>
                        )}
                        {discount && (
                          <span className="text-[9px] sm:text-xs text-stone-400 font-bold line-through">
                            {discount.originalPrice} د.أ
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="text-[11px] sm:text-xs text-stone-500/90 line-clamp-2 leading-relaxed pt-0.5">
                          {item.description}
                        </p>
                      )}

                      {item.options && item.options.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {item.options.map((opt, oIdx) => (
                            <span key={oIdx} className="text-[8px] sm:text-[10px] bg-stone-50 text-stone-500 border border-stone-200/60 px-1 py-0.5 rounded font-medium truncate max-w-full">
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-1 pt-2 border-t border-dashed border-stone-100 mt-auto">
                      <div className="text-[11px] sm:text-sm font-black text-amber-950 whitespace-nowrap bg-amber-50/90 px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg border border-amber-200/40 shadow-3xs text-center w-full sm:w-auto">
                        {item.price} <span className="text-[9px] font-normal">د.أ</span>
                      </div>

                      {item.isAvailable !== false ? (
                        <div className="flex items-center w-full sm:w-auto justify-center">
                          {cartQty > 0 ? (
                            <div className="flex items-center justify-between w-full sm:w-auto bg-[#1a4d2e] text-white rounded-lg p-1 sm:p-0.5 shadow-2xs border border-[#1a4d2e]">
                              <button
                                type="button"
                                onClick={() => removeFromCart(item)}
                                className="w-5.5 h-5.5 sm:w-6 sm:h-6 flex items-center justify-center hover:bg-[#133b22] rounded transition-colors cursor-pointer active:scale-90"
                              >
                                <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </button>
                              <span className="px-1.5 text-[11px] sm:text-xs font-black min-w-[14px] text-center">{cartQty}</span>
                              <button
                                type="button"
                                onClick={() => addToCart(item)}
                                className="w-5.5 h-5.5 sm:w-6 sm:h-6 flex items-center justify-center hover:bg-[#133b22] rounded transition-colors cursor-pointer active:scale-90"
                              >
                                <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addToCart(item)}
                              className="inline-flex items-center justify-center gap-1 bg-[#1a4d2e] lg:hover:bg-[#133b22] text-white px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-black transition-all shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap w-full sm:w-auto"
                            >
                              <ShoppingBag className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              <span>{theme.buttonAddShort}</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[9px] sm:text-xs font-bold text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-lg text-center w-full sm:w-auto">
                          غير متوفر
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            }

            // --- LIST CARD (Full Row Layout) ---
            return (
              <motion.div
                layout
                key={item.id}
                className={cn(
                  "bg-white border border-stone-100 shadow-[0_4px_12px_rgba(0,0,0,0.03)] rounded-2xl relative flex flex-row items-center gap-3 p-3 text-right min-w-0 transition-all lg:border-stone-200/80 lg:shadow-[0_2px_10px_rgba(0,0,0,0.03)] lg:hover:shadow-md lg:hover:border-amber-500/30 lg:gap-4 lg:p-4 group",
                  (item.isPopular || item.badge === 'popular') && "border-amber-200 bg-amber-50/10"
                )}
              >
                {/* Fixed Image Thumbnail (Order-1 in RTL means Right Side) */}
                <div className="relative w-20 h-20 sm:w-28 sm:h-28 rounded-xl bg-stone-100 overflow-hidden shrink-0 select-none">
                  {renderPremiumBadge(item)}

                  {item.imageUrl ? (
                    <div 
                      onClick={() => setLightboxItem(item)}
                      className="w-full h-full cursor-pointer relative group/img"
                      title="انقر لمعاينة الصورة كاملة"
                    >
                      <img
                        referrerPolicy="no-referrer"
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-amber-50/60 text-amber-700 flex items-center justify-center relative overflow-hidden">
                      {theme.cartIconType === 'home' ? (
                        <Home className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600/40" />
                      ) : theme.cartIconType === 'medical' ? (
                        <Activity className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600/40" />
                      ) : theme.cartIconType === 'edu' ? (
                        <GraduationCap className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600/40" />
                      ) : theme.cartIconType === 'wrench' ? (
                        <Wrench className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600/40" />
                      ) : (
                        <UtensilsCrossed className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600/40" />
                      )}
                    </div>
                  )}

                  {discount && (
                    <div className="absolute bottom-1.5 left-1.5 bg-rose-600 text-white text-[8px] sm:text-[10px] font-black px-1.5 py-0.5 rounded shadow-xs z-10 whitespace-nowrap">
                      %{discount.discountPercent}-
                    </div>
                  )}
                </div>

                {/* Content Block */}
                <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5 space-y-1">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm sm:text-base font-extrabold text-stone-900 lg:font-bold line-clamp-1 group-hover:text-amber-950">
                        {item.name}
                      </h3>
                      {item.category && (
                        <span className="inline-block text-[9px] sm:text-[10px] font-bold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded shrink-0">
                          {item.category}
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-[11px] sm:text-xs text-stone-500/90 line-clamp-2 leading-relaxed pt-0.5">
                        {item.description}
                      </p>
                    )}

                    {item.options && item.options.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.options.map((opt, oIdx) => (
                          <span key={oIdx} className="text-[8px] sm:text-[10px] bg-stone-50 text-stone-500 border border-stone-200/60 px-1 py-0.5 rounded font-medium">
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1.5 border-t border-dashed border-stone-100/80 mt-auto">
                    <div className="flex items-center gap-1.5 justify-center sm:justify-start w-full sm:w-auto">
                      <div className="text-[11px] sm:text-sm font-black text-amber-950 whitespace-nowrap bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200/50 shadow-3xs text-center">
                        {item.price} <span className="text-[9px] font-normal">د.أ</span>
                      </div>
                      {discount && (
                        <span className="text-[9px] sm:text-xs text-stone-400 font-bold line-through">
                          {discount.originalPrice} د.أ
                        </span>
                      )}
                    </div>

                    {item.isAvailable !== false ? (
                      <div className="flex items-center w-full sm:w-auto justify-center">
                        {cartQty > 0 ? (
                          <div className="flex items-center justify-between w-full sm:w-auto bg-[#1a4d2e] text-white rounded-lg p-1 sm:p-0.5 shadow-2xs border border-[#1a4d2e]">
                            <button
                              type="button"
                              onClick={() => removeFromCart(item)}
                              className="w-5.5 h-5.5 sm:w-6 sm:h-6 flex items-center justify-center hover:bg-[#133b22] rounded transition-colors cursor-pointer active:scale-90"
                            >
                              <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            </button>
                            <span className="px-1.5 text-[11px] sm:text-xs font-black min-w-[14px] text-center">{cartQty}</span>
                            <button
                              type="button"
                              onClick={() => addToCart(item)}
                              className="w-5.5 h-5.5 sm:w-6 sm:h-6 flex items-center justify-center hover:bg-[#133b22] rounded transition-colors cursor-pointer active:scale-90"
                            >
                              <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToCart(item)}
                            className="inline-flex items-center justify-center gap-1 bg-[#1a4d2e] lg:hover:bg-[#133b22] text-white px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-black transition-all shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap w-full sm:w-auto"
                          >
                            <ShoppingBag className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            <span>{theme.buttonAddShort}</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[9px] sm:text-xs font-bold text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-lg text-center w-full sm:w-auto">
                        غير متوفر
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Floating Info Note */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-amber-900 mt-6 shadow-3xs">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
          <span>الكتالوج الرقمي وحجوزات الواتساب ميزة مدعومة رسمياً من منصة شو في بإربد للباقة الذهبية (VIP).</span>
        </div>
      </div>

      {/* Premium Lightbox Modal */}
      <AnimatePresence>
        {lightboxItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-900/90 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-right"
            onClick={() => setLightboxItem(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl relative border border-stone-100"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLightboxItem(null)}
                className="absolute top-4 left-4 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-all z-10 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="h-72 sm:h-96 w-full relative">
                <img
                  referrerPolicy="no-referrer"
                  src={lightboxItem.imageUrl}
                  alt={lightboxItem.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-stone-900">{lightboxItem.name}</h3>
                    {lightboxItem.category && (
                      <span className="inline-block text-xs font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md mt-1">
                        {lightboxItem.category}
                      </span>
                    )}
                  </div>

                  <div className="text-xl font-black text-amber-900 bg-amber-50 border border-amber-100 px-3 py-1 rounded-xl whitespace-nowrap">
                    {lightboxItem.price} د.أ
                  </div>
                </div>

                {lightboxItem.description && (
                  <p className="text-sm text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100">
                    {lightboxItem.description}
                  </p>
                )}

                {/* Lightbox customization options */}
                {lightboxItem.options && lightboxItem.options.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-black text-stone-800">الخيارات والتفاصيل المشمولة:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {lightboxItem.options.map((opt, idx) => (
                        <span key={idx} className="text-xs bg-amber-50 border border-amber-200 text-amber-950 px-2.5 py-1 rounded-lg font-bold">
                          {opt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      addToCart(lightboxItem);
                      setLightboxItem(null);
                    }}
                    className="flex-1 py-3 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>إضافة إلى سلة الحجز</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleSingleOrderWhatsapp(lightboxItem);
                      setLightboxItem(null);
                    }}
                    className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
                    title="طلب حجز فوري عبر الواتساب"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>حجز فوري</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Active Cart Drawer */}
      <AnimatePresence>
        {totalCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-16 left-0 right-0 z-50 px-4 pb-4 md:bottom-6 max-w-4xl mx-auto"
            dir="rtl"
          >
            <div className="bg-[#1c1917] text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-stone-800 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#ff9f1c] rounded-xl flex items-center justify-center text-[#2d2a26] shrink-0 font-black animate-pulse">
                  <ShoppingBag className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black">سلة الطلبات الرقمية النشطة ({totalCount} أصناف)</h4>
                  <p className="text-xs text-stone-300 font-bold mt-0.5">القيمة الإجمالية: <span className="text-[#ff9f1c] font-black text-sm">{totalPrice.toFixed(2)} د.أ</span></p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleOrderCartWhatsapp}
                  className="flex-1 sm:flex-initial inline-flex justify-center items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all cursor-pointer shadow-md"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>أرسل الطلب عبر الواتساب</span>
                </button>

                <Link
                  to="/cart"
                  className="inline-flex justify-center items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-stone-100 text-[#2d2a26] font-black text-xs rounded-xl transition-colors cursor-pointer"
                >
                  <span>استعراض السلة الكاملة</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={clearCart}
                  className="p-2.5 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-red-500 rounded-xl transition-colors cursor-pointer"
                  title="تفريغ السلة"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
