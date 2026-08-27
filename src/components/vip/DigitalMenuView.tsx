import React, { useState } from 'react';
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
  
  // Cart state
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  
  // Lightbox state for premium image preview
  const [lightboxItem, setLightboxItem] = useState<MenuItem | null>(null);

  const menuItems: MenuItem[] = business.menuItems || [];
  
  // Resolve Dynamic Theme vocabulary
  const theme = getCategoryTheme(business.category || '');

  // Extract unique categories
  const categories = ['all', ...Array.from(new Set(menuItems.map(item => item.category || 'عام')))];

  // Helper to calculate real discount or fall back to simulation
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

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev[item.id];
      return {
        ...prev,
        [item.id]: {
          item,
          quantity: existing ? existing.quantity + 1 : 1
        }
      };
    });
  };

  const removeFromCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev[item.id];
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const updated = { ...prev };
        delete updated[item.id];
        return updated;
      }
      return {
        ...prev,
        [item.id]: {
          ...existing,
          quantity: existing.quantity - 1
        }
      };
    });
  };

  const clearCart = () => {
    setCart({});
  };

  const getCartTotal = () => {
    return Object.values(cart).reduce((total, cartItem) => {
      const priceNum = parseFloat(cartItem.item.price) || 0;
      return total + (priceNum * cartItem.quantity);
    }, 0);
  };

  const getCartItemCount = () => {
    return Object.values(cart).reduce((count, cartItem) => count + cartItem.quantity, 0);
  };

  const handleOrderCartWhatsapp = () => {
    trackBusinessInteraction(business.id, 'whatsapp');
    trackBusinessInteraction(business.id, 'menu');

    let phone = business.phone ? business.phone.replace(/[^0-9]/g, '') : '';
    if (phone.startsWith('07')) {
      phone = '962' + phone.substring(1);
    } else if (!phone.startsWith('962') && phone.length === 9) {
      phone = '962' + phone;
    }

    const cartList = Object.values(cart);
    if (cartList.length === 0) return;

    let messageText = `مرحباً ${business.name} 👋\nأود إرسال طلب حجز/شراء جديد عبر منصة *(شو في بإربد؟)*:\n\n*الطلب بالتفصيل:*\n`;
    
    cartList.forEach((cartItem, idx) => {
      const itemTotal = (parseFloat(cartItem.item.price) || 0) * cartItem.quantity;
      const optionsText = cartItem.item.options && cartItem.item.options.length > 0 
        ? `   *(خيارات مخصصة: ${cartItem.item.options.join(', ')})*\n` 
        : '';
      messageText += `${idx + 1}. *${cartItem.item.name}* \n   الكمية: [ ${cartItem.quantity} ] ✕ السعر: ${cartItem.item.price} د.أ (الإجمالي: ${itemTotal.toFixed(2)} د.أ)\n${optionsText}`;
    });

    const grandTotal = getCartTotal();
    messageText += `\n💵 *الحساب الإجمالي:* *${grandTotal.toFixed(2)} د.أ*\n`;
    messageText += `\n📍 يرجى تأكيد توافر هذا الحجز/الطلب وتجهيزه للتواصل المباشر والاستلام.`;

    const encodedMessage = encodeURIComponent(messageText);

    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodedMessage}`, '_blank');
    } else {
      alert(`رقم هاتف ${business.name} غير متوفر للطلب المباشر حالياً.`);
    }
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
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search Box */}
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن أي صنف، خدمة، أو منتج..."
                className="w-full pl-4 pr-11 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-all"
              />
              <Search className="h-4 w-4 text-stone-400 absolute right-4 top-1/2 -translate-y-1/2" />
            </div>

            {/* Layout and Smart Filter Switchers */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Grid vs List Toggler */}
              <div className="bg-white border border-stone-200 rounded-xl p-1 flex items-center shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-1.5 rounded-lg transition-all cursor-pointer",
                    viewMode === 'grid' 
                      ? "bg-amber-100 text-amber-800" 
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
                    "p-1.5 rounded-lg transition-all cursor-pointer",
                    viewMode === 'list' 
                      ? "bg-amber-100 text-amber-800" 
                      : "text-stone-400 hover:text-stone-600"
                  )}
                  title="عرض القائمة المبسط"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Smart Filters (All, Popular, Offers) */}
              <div className="bg-white border border-stone-200 rounded-xl p-1 flex items-center gap-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveSmartFilter('all')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer",
                    activeSmartFilter === 'all'
                      ? "bg-[#1a4d2e] text-white"
                      : "text-stone-600 hover:bg-stone-50"
                  )}
                >
                  الكل
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSmartFilter('popular')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer",
                    activeSmartFilter === 'popular'
                      ? "bg-amber-600 text-white"
                      : "text-amber-700 hover:bg-amber-50"
                  )}
                >
                  <Flame className="h-3 w-3 fill-current" />
                  <span>المميز ⭐</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSmartFilter('offers')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer",
                    activeSmartFilter === 'offers'
                      ? "bg-rose-600 text-white"
                      : "text-rose-700 hover:bg-rose-50"
                  )}
                >
                  <Tag className="h-3 w-3" />
                  <span>العروض والتخفيضات 🏷️</span>
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
            const cartQty = cart[item.id]?.quantity || 0;

            if (viewMode === 'grid') {
              // --- GRID CARD (Mobile 2-Column Responsive Card) ---
              return (
                <motion.div
                  layout
                  key={item.id}
                  className={cn(
                    "bg-white border border-stone-200/80 transition-all relative flex flex-col justify-between group overflow-hidden rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-amber-500/30 text-right min-w-0",
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
                  <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2 min-w-0">
                    <div className="space-y-1">
                      <h3 className="text-xs sm:text-base font-bold text-stone-900 line-clamp-1 leading-snug group-hover:text-amber-950">
                        {item.name}
                      </h3>

                      <div className="flex flex-wrap items-center gap-1">
                        {item.category && (
                          <span className="inline-block text-[9px] sm:text-[10px] font-medium text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded truncate max-w-full">
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
                        <p className="text-[10px] sm:text-xs text-stone-500 line-clamp-2 leading-relaxed pt-0.5">
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
                    <div className="flex items-center justify-between gap-1 pt-2 border-t border-dashed border-stone-100 mt-auto">
                      <div className="text-xs sm:text-sm font-black text-amber-950 whitespace-nowrap bg-amber-50/80 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-amber-200/50">
                        {item.price} <span className="text-[9px] font-normal">د.أ</span>
                      </div>

                      {item.isAvailable !== false ? (
                        <div className="flex items-center">
                          {cartQty > 0 ? (
                            <div className="flex items-center bg-[#1a4d2e] text-white rounded-lg p-0.5 shadow-2xs border border-[#1a4d2e]">
                              <button
                                type="button"
                                onClick={() => removeFromCart(item)}
                                className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center hover:bg-[#133b22] rounded transition-colors cursor-pointer active:scale-90"
                              >
                                <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </button>
                              <span className="px-1.5 text-[11px] sm:text-xs font-black min-w-[14px] text-center">{cartQty}</span>
                              <button
                                type="button"
                                onClick={() => addToCart(item)}
                                className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center hover:bg-[#133b22] rounded transition-colors cursor-pointer active:scale-90"
                              >
                                <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addToCart(item)}
                              className="inline-flex items-center gap-1 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-black transition-all shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap"
                            >
                              <ShoppingBag className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              <span>{theme.buttonAddShort}</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[9px] sm:text-xs font-bold text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-lg">
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
                  "bg-white border border-stone-200/80 transition-all relative flex flex-row items-center gap-2.5 sm:gap-4 p-2.5 sm:p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-amber-500/30 text-right min-w-0 group",
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
                      <h3 className="text-xs sm:text-base font-bold text-stone-900 line-clamp-1 group-hover:text-amber-950">
                        {item.name}
                      </h3>
                      {item.category && (
                        <span className="inline-block text-[9px] sm:text-[10px] font-medium text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded shrink-0">
                          {item.category}
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-[10px] sm:text-xs text-stone-500 line-clamp-2 leading-relaxed pt-0.5">
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
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed border-stone-100/80 mt-auto">
                    <div className="flex items-center gap-1.5">
                      <div className="text-xs sm:text-sm font-black text-amber-950 whitespace-nowrap bg-amber-50/80 px-2 py-0.5 rounded-lg border border-amber-200/50">
                        {item.price} <span className="text-[9px] font-normal">د.أ</span>
                      </div>
                      {discount && (
                        <span className="text-[9px] sm:text-xs text-stone-400 font-bold line-through">
                          {discount.originalPrice} د.أ
                        </span>
                      )}
                    </div>

                    {item.isAvailable !== false ? (
                      <div>
                        {cartQty > 0 ? (
                          <div className="flex items-center bg-[#1a4d2e] text-white rounded-lg p-0.5 shadow-2xs border border-[#1a4d2e]">
                            <button
                              type="button"
                              onClick={() => removeFromCart(item)}
                              className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center hover:bg-[#133b22] rounded transition-colors cursor-pointer active:scale-90"
                            >
                              <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            </button>
                            <span className="px-1.5 text-[11px] sm:text-xs font-black min-w-[14px] text-center">{cartQty}</span>
                            <button
                              type="button"
                              onClick={() => addToCart(item)}
                              className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center hover:bg-[#133b22] rounded transition-colors cursor-pointer active:scale-90"
                            >
                              <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToCart(item)}
                            className="inline-flex items-center gap-1 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-black transition-all shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap"
                          >
                            <ShoppingBag className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            <span>{theme.buttonAddShort}</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[9px] sm:text-xs font-bold text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-lg">
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

      {/* Floating Interactive Cart Bar */}
      {getCartItemCount() > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white/95 backdrop-blur-md border border-amber-200 rounded-2xl p-4 shadow-xl z-50 flex flex-col gap-3 text-right"
        >
          <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-black text-stone-900">سلتك / قائمة حجزك الحالية</h4>
                <p className="text-[10px] text-stone-500">تم تحديد {getCartItemCount()} خدمات/أصناف</p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>تفريغ السلة</span>
            </button>
          </div>

          {/* Mini-Cart list preview */}
          <div className="max-h-28 overflow-y-auto space-y-1.5 divide-y divide-stone-100 pr-1 text-xs">
            {Object.values(cart).map((cartItem) => {
              const itemTotal = (parseFloat(cartItem.item.price) || 0) * cartItem.quantity;
              return (
                <div key={cartItem.item.id} className="flex items-center justify-between pt-1.5 first:pt-0">
                  <span className="font-bold text-stone-800 truncate max-w-[160px]">{cartItem.item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-stone-500">({cartItem.quantity} ✕ {cartItem.item.price})</span>
                    <span className="font-black text-amber-900">{itemTotal.toFixed(2)} د.أ</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-stone-100 pt-2.5 flex items-center justify-between">
            <span className="text-xs font-bold text-stone-600">الحساب الإجمالي التقريبي:</span>
            <span className="text-base font-black text-emerald-800">{getCartTotal().toFixed(2)} د.أ</span>
          </div>

          <button
            type="button"
            onClick={handleOrderCartWhatsapp}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            <MessageSquare className="h-4.5 w-4.5" />
            <span>تأكيد الطلب والحجز عبر الواتساب</span>
          </button>
        </motion.div>
      )}

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

    </div>
  );
}
