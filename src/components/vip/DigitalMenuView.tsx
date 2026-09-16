import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Store, Search, Tag, Plus, Minus, Trash2,
  Sparkles, Check, Flame, ExternalLink, UtensilsCrossed,
  DollarSign, Edit3, LayoutGrid, List, ShoppingBag, Eye, X, Info,
  Home, Building, Activity, GraduationCap, Wrench, Gift, ShieldAlert,
  Layers, CheckCircle2
} from 'lucide-react';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import { motion, AnimatePresence } from 'motion/react';
import { Business, MenuItem, MenuItemVersion } from '../../types';
import { trackBusinessInteraction } from '../../lib/analyticsTracker';
import { cn } from '../../lib/utils';
import { getCategoryTheme } from './DigitalMenuManagerModal';
import { isMedicalBusiness } from '../../lib/medicalHelper';
import { useCart, calculateItemPriceWithVersion, getMenuItemDisplayPrice } from '../../contexts/CartContext';
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
  const [activeSmartFilter, setActiveSmartFilter] = useState<'all' | 'popular' | 'new'>('all');
  
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

  // Version selection modal state
  const [selectedItemForVersions, setSelectedItemForVersions] = useState<MenuItem | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<MenuItemVersion | null>(null);
  const [versionQuantity, setVersionQuantity] = useState<number>(1);

  const rawMenuItems: MenuItem[] = business.menuItems || [];
  
  // Detect if medical facility
  const isMedical = isMedicalBusiness(business);

  const menuItems: MenuItem[] = React.useMemo(() => {
    let list = [...rawMenuItems];
    if (isMedical && business.medicalProfile?.consultationFee && business.medicalProfile.consultationFee.trim()) {
      const fee = business.medicalProfile.consultationFee.trim();
      if (fee && fee !== '0') {
        const hasConsultation = list.some(item => 
          item.name.includes('كشف') || item.name.includes('معاين') || item.name.includes('استشار')
        );
        if (!hasConsultation) {
          const feeNumericOnly = fee.replace(/[^0-9.-]/g, '');
          const consultItem: MenuItem = {
            id: 'menu_consultation_fee_auto',
            name: business.category?.includes('صيدل')
              ? 'استشارة دوائية وصرف وصفات'
              : business.category?.includes('مختبر')
              ? 'فحص مخبري واستشارة تشخيصية'
              : business.category?.includes('علاج طبيعي')
              ? 'كشفية وجلسة تقييم علاج طبيعي'
              : business.category?.includes('مستشف')
              ? 'معاينة وكشفية طوارئ / عيادات'
              : 'كشفية ومعاينة طبية بالعيادة',
            description: 'تشمل الفحص السريري والاستشارة الطبية المتخصصة',
            price: feeNumericOnly || fee,
            category: 'معاينات واستشارات',
            isPopular: true,
            badge: 'popular'
          };
          list = [consultItem, ...list];
        }
      }
    }
    return list;
  }, [rawMenuItems, isMedical, business.medicalProfile?.consultationFee, business.category]);

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
    } else if (activeSmartFilter === 'new') {
      const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
      const isNewByDate = item.createdAt ? (Date.now() - item.createdAt <= fifteenDaysMs) : false;
      matchesSmartFilter = isNewByDate || item.badge === 'new';
    }

    return matchesCategory && matchesSearch && matchesSmartFilter;
  });

  // Open version selection modal
  const handleOpenVersionModal = (item: MenuItem, defaultVersion?: MenuItemVersion) => {
    setSelectedItemForVersions(item);
    const isSizes = item.versionType !== 'addons' && item.versions && item.versions.length > 0;
    if (defaultVersion) {
      setSelectedVersion(defaultVersion);
    } else if (isSizes) {
      // In sizes mode, default to the first size, ignoring base price
      setSelectedVersion(item.versions![0]);
    } else {
      // In addons mode, default to null (base option without add-on)
      setSelectedVersion(null);
    }
    setVersionQuantity(1);
  };

  // Cart operations using CartContext
  const addToCart = (item: MenuItem, version?: MenuItemVersion, quantity: number = 1) => {
    addItem(
      item, 
      {
        id: business.id,
        name: business.name,
        phone: business.phone
      },
      version,
      quantity
    );
  };

  const removeFromCart = (item: MenuItem) => {
    updateQuantity(item.id, -1);
  };

  const handleAddVersionToCart = () => {
    if (!selectedItemForVersions) return;
    addToCart(selectedItemForVersions, selectedVersion || undefined, versionQuantity);
    setSelectedItemForVersions(null);
  };

  const handleOrderCartWhatsapp = () => {
    trackBusinessInteraction(business.id, 'whatsapp', { isOwner });
    trackBusinessInteraction(business.id, 'menu', { isOwner });
    sendOrderViaWhatsapp();
  };

  const handleSingleOrderWhatsapp = (item: MenuItem, version?: MenuItemVersion, qty: number = 1) => {
    trackBusinessInteraction(business.id, 'whatsapp', { isOwner });
    trackBusinessInteraction(business.id, 'menu', { isOwner });

    let phone = business.phone ? business.phone.replace(/[^0-9]/g, '') : '';
    if (phone.startsWith('07')) {
      phone = '962' + phone.substring(1);
    } else if (!phone.startsWith('962') && phone.length === 9) {
      phone = '962' + phone;
    }

    const unitPrice = calculateItemPriceWithVersion(item.price, version);
    const itemTotalPrice = (unitPrice * qty).toFixed(2);
    const versionText = version ? `\nالحجم / النسخة: *${version.name}*` : '';
    const quantityText = qty > 1 ? `\nالعدد: *${qty}*` : '';

    const optionsText = item.options && item.options.length > 0 
      ? `\nالخيارات المفضلة: (${item.options.join(', ')})` 
      : '';

    const messageText = encodeURIComponent(
      `مرحباً ${business.name} 👋\nأرغب في حجز/طلب: *${item.name}*${versionText}${quantityText}\nالسعر: *${itemTotalPrice} د.أ*${optionsText}\nمن خلال منصة (شو في بإربد؟).`
    );

    if (phone) {
      window.open(`https://wa.me/${phone}?text=${messageText}`, '_blank');
    } else {
      alert(`رقم هاتف ${business.name} غير متوفر للطلب المباشر حالياً.`);
    }
  };

  // Helper to render high fidelity premium badge
  const renderPremiumBadge = (item: MenuItem) => {
    if (isMedical) return null;
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
              <span>{business.menuTitle || (isMedical ? 'الخدمات والإجراءات' : theme.title)}</span>
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1 leading-relaxed">
            {business.menuDescription || (isMedical ? 'استعرض قائمة المعاينات، الكشوفات الطبية، جلسات العلاج، والخدمات الصحية المتاحة.' : theme.subtitle)}
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
              <span>{isMedical ? `إدارة الخدمات والإجراءات (${menuItems.length})` : `إدارة الكتالوج (${menuItems.length})`}</span>
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
                placeholder={isMedical ? "ابحث عن أي خدمة، إجراء، أو كشفية طبية..." : "ابحث عن أي صنف، خدمة، أو منتج..."}
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

            {/* Smart Filters (All, Popular, New) - Clean Segmented Control Grid (Hidden for Medical facilities) */}
            {!isMedical && (
              <div className="bg-stone-100 p-1 rounded-2xl border border-stone-200/80 grid grid-cols-3 gap-1 w-full">
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
                  <span>المميز</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSmartFilter('new')}
                  className={cn(
                    "h-9 px-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer text-center",
                    activeSmartFilter === 'new'
                      ? "bg-sky-600 text-white shadow-xs"
                      : "text-sky-800 hover:bg-sky-100/60"
                  )}
                >
                  <span className="truncate">جديد</span>
                </button>
              </div>
            )}
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

      {/* View Mode & Items Summary Bar (Above menu / service cards) */}
      {menuItems.length > 0 && filteredItems.length > 0 && (
        <div className="flex items-center justify-between gap-3 pt-0.5">
          {/* Items / Services Count Indicator */}
          <div className="text-xs font-bold text-stone-600 flex items-center gap-1.5">
            <span className="text-stone-400 font-normal">عرض</span>
            <span className="text-stone-900 font-black">{filteredItems.length}</span>
            <span>{isMedical ? 'خدمة وإجراء' : 'صنف ومنتج'}</span>
            {selectedCategory !== 'all' && (
              <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px] font-bold border border-emerald-200/80 mr-1">
                {selectedCategory}
              </span>
            )}
          </div>

          {/* Grid vs List Toggler */}
          <div className="bg-stone-100/80 p-1 rounded-2xl border border-stone-200 flex items-center gap-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                viewMode === 'grid' 
                  ? "bg-[#1a4d2e] text-white shadow-xs" 
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
              )}
              title="عرض شبكة"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="text-[11px] hidden sm:inline">شبكة</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                viewMode === 'list' 
                  ? "bg-[#1a4d2e] text-white shadow-xs" 
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/60"
              )}
              title="عرض قائمة"
            >
              <List className="h-4 w-4" />
              <span className="text-[11px] hidden sm:inline">قائمة</span>
            </button>
          </div>
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
                    (item.isPopular || item.badge === 'popular') && !isMedical && "border-amber-200 bg-amber-50/10"
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

                      {discount && (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[9px] sm:text-xs text-stone-400 font-bold line-through">
                            {discount.originalPrice} د.أ
                          </span>
                        </div>
                      )}

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
                        {(() => {
                          const priceInfo = getMenuItemDisplayPrice(item);
                          if (priceInfo.isStartingPrice) {
                            return (
                              <span className="text-[10px] sm:text-xs">
                                يبدأ من <span className="font-mono text-[11px] sm:text-sm font-black">{priceInfo.formattedPrice}</span> د.أ
                              </span>
                            );
                          }
                          return (
                            <>
                              <span className="font-mono text-[11px] sm:text-sm font-black">{priceInfo.formattedPrice}</span> <span className="text-[9px] font-normal">د.أ</span>
                            </>
                          );
                        })()}
                      </div>

                      {item.isAvailable !== false ? (
                        <div className="flex items-center w-full sm:w-auto justify-center">
                          {item.versions && item.versions.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleOpenVersionModal(item)}
                              className="inline-flex items-center justify-center gap-1 bg-[#1a4d2e] lg:hover:bg-[#133b22] text-white px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-black transition-all shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap w-full sm:w-auto"
                            >
                              <Layers className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              <span>{item.versionType === 'addons' ? 'اختيار الإضافات' : 'اختيار الحجم'}</span>
                            </button>
                          ) : cartQty > 0 ? (
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
                  (item.isPopular || item.badge === 'popular') && !isMedical && "border-amber-200 bg-amber-50/10"
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
                        {(() => {
                          const priceInfo = getMenuItemDisplayPrice(item);
                          if (priceInfo.isStartingPrice) {
                            return (
                              <span className="text-[10px] sm:text-xs">
                                يبدأ من <span className="font-mono text-[11px] sm:text-sm font-black">{priceInfo.formattedPrice}</span> د.أ
                              </span>
                            );
                          }
                          return (
                            <>
                              <span className="font-mono text-[11px] sm:text-sm font-black">{priceInfo.formattedPrice}</span> <span className="text-[9px] font-normal">د.أ</span>
                            </>
                          );
                        })()}
                      </div>
                      {discount && (
                        <span className="text-[9px] sm:text-xs text-stone-400 font-bold line-through">
                          {discount.originalPrice} د.أ
                        </span>
                      )}
                    </div>

                    {item.isAvailable !== false ? (
                      <div className="flex items-center w-full sm:w-auto justify-center">
                        {item.versions && item.versions.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenVersionModal(item)}
                            className="inline-flex items-center justify-center gap-1 bg-[#1a4d2e] lg:hover:bg-[#133b22] text-white px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-black transition-all shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap w-full sm:w-auto"
                          >
                            <Layers className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            <span>{item.versionType === 'addons' ? 'اختيار الإضافات' : 'اختيار الحجم'}</span>
                          </button>
                        ) : cartQty > 0 ? (
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

      {/* Premium Lightbox Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {lightboxItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-stone-900/90 backdrop-blur-xs flex items-center justify-center p-4 z-[100000] text-right"
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
                    </div>

                    <div className="text-xl font-black text-amber-900 bg-amber-50 border border-amber-100 px-3 py-1 rounded-xl whitespace-nowrap">
                      {(() => {
                        const priceInfo = getMenuItemDisplayPrice(lightboxItem);
                        return priceInfo.isStartingPrice ? `يبدأ من ${priceInfo.formattedPrice} د.أ` : `${priceInfo.formattedPrice} د.أ`;
                      })()}
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
                        if (lightboxItem.versions && lightboxItem.versions.length > 0) {
                          const target = lightboxItem;
                          setLightboxItem(null);
                          handleOpenVersionModal(target);
                        } else {
                          addToCart(lightboxItem);
                          setLightboxItem(null);
                        }
                      }}
                      className="flex-1 py-3 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
                    >
                      {lightboxItem.versions && lightboxItem.versions.length > 0 ? (
                        <>
                          <Layers className="h-4 w-4" />
                          <span>اختيار الحجم / النسخة</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="h-4 w-4" />
                          <span>إضافة إلى سلة الحجز</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (lightboxItem.versions && lightboxItem.versions.length > 0) {
                          const target = lightboxItem;
                          setLightboxItem(null);
                          handleOpenVersionModal(target);
                        } else {
                          handleSingleOrderWhatsapp(lightboxItem);
                          setLightboxItem(null);
                        }
                      }}
                      className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
                      title="طلب حجز فوري عبر الواتساب"
                    >
                      <WhatsAppIcon className="h-4 w-4" />
                      <span>حجز فوري</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Interactive Version / Size Selection Modal */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {selectedItemForVersions && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-stone-900/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-[100000] text-right"
              onClick={() => setSelectedItemForVersions(null)}
            >
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                className="bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl relative border border-stone-100 max-h-[88vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between gap-3 bg-stone-50/70">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedItemForVersions.imageUrl ? (
                      <img 
                        src={selectedItemForVersions.imageUrl} 
                        alt="" 
                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-stone-200/80" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        <Layers className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-black text-stone-900 truncate">
                        {selectedItemForVersions.name}
                      </h3>
                      <p className="text-xs text-stone-500 font-medium">
                        السعر الأساسي: <span className="font-mono font-bold text-[#1a4d2e]">{selectedItemForVersions.price} د.أ</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedItemForVersions(null)}
                    className="w-9 h-9 rounded-full bg-white hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer border border-stone-200 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Body: Versions options list */}
                <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                  {selectedItemForVersions.description && (
                    <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100">
                      {selectedItemForVersions.description}
                    </p>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-amber-600" />
                      <span>
                        {selectedItemForVersions.versionType === 'addons' 
                          ? 'اختر الإضافة أو الخيار المطلوب (اختياري):' 
                          : 'اختر الحجم أو المقاس المطلوب:'}
                      </span>
                    </label>

                    <div className="space-y-2">
                      {/* Default Base Item option - Only shown if versionType is 'addons' */}
                      {selectedItemForVersions.versionType === 'addons' && (
                        <div
                          onClick={() => setSelectedVersion(null)}
                          className={cn(
                            "p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3",
                            selectedVersion === null
                              ? "border-emerald-600 bg-emerald-50/30 shadow-xs"
                              : "border-stone-200 bg-white hover:border-stone-300"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center border transition-colors",
                              selectedVersion === null
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "border-stone-300 bg-white"
                            )}>
                              {selectedVersion === null && <Check className="h-3 w-3 stroke-[3]" />}
                            </div>
                            <div>
                              <span className="text-xs font-black text-stone-900 block">الطلب الأساسي (بدون إضافات)</span>
                              <span className="text-[10px] text-stone-400 font-medium">السعر الأساسي المعتمد</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-black text-[#1a4d2e] font-mono">
                              {parseFloat(selectedItemForVersions.price || '0').toFixed(2)} د.أ
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Custom versions / sizes / addons */}
                      {selectedItemForVersions.versions?.map((version) => {
                        const isSelected = selectedVersion?.id === version.id;
                        const calculatedPrice = calculateItemPriceWithVersion(selectedItemForVersions.price, version);

                        return (
                          <div
                            key={version.id}
                            onClick={() => setSelectedVersion(version)}
                            className={cn(
                              "p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3",
                              isSelected
                                ? "border-emerald-600 bg-emerald-50/30 shadow-xs"
                                : "border-stone-200 bg-white hover:border-stone-300"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center border transition-colors shrink-0",
                                isSelected
                                  ? "bg-emerald-600 border-emerald-600 text-white"
                                  : "border-stone-300 bg-white"
                              )}>
                                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-black text-stone-900">{version.name}</span>
                                  <span className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.2 rounded-md",
                                    version.priceType === 'fixed' ? "bg-blue-50 text-blue-800 border border-blue-200/60" :
                                    version.priceType === 'additional' ? "bg-amber-50 text-amber-800 border border-amber-200/60" :
                                    "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                                  )}>
                                    {version.priceType === 'fixed' ? 'سعر خاص' : version.priceType === 'additional' ? `+${version.price} د.أ` : 'مشمول مجاناً'}
                                  </span>
                                </div>
                                {version.description && (
                                  <span className="text-[10px] text-stone-500 line-clamp-1 mt-0.5 block">{version.description}</span>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-xs font-black text-[#1a4d2e] font-mono">
                                {calculatedPrice.toFixed(2)} د.أ
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quantity Selector */}
                  <div className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-200">
                    <span className="text-xs font-black text-stone-800">الكمية المطلوبة:</span>
                    <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-stone-200 shadow-3xs">
                      <button
                        type="button"
                        onClick={() => setVersionQuantity(q => Math.max(1, q - 1))}
                        disabled={versionQuantity <= 1}
                        className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-black flex items-center justify-center text-xs disabled:opacity-40 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-black text-sm font-mono text-stone-900">{versionQuantity}</span>
                      <button
                        type="button"
                        onClick={() => setVersionQuantity(q => q + 1)}
                        className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-black flex items-center justify-center text-xs cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Calculation Summary Bar */}
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between">
                    <div className="text-xs text-amber-900 font-bold">
                      <span>المجموع الإجمالي:</span>
                    </div>
                    <div className="text-base font-black text-[#1a4d2e] font-mono">
                      {(calculateItemPriceWithVersion(selectedItemForVersions.price, selectedVersion || undefined) * versionQuantity).toFixed(2)} د.أ
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 sm:p-5 border-t border-stone-100 bg-white flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleAddVersionToCart}
                    className="flex-1 py-3 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>إضافة للسلة ({versionQuantity})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleSingleOrderWhatsapp(selectedItemForVersions, selectedVersion || undefined, versionQuantity);
                      setSelectedItemForVersions(null);
                    }}
                    className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                    title="طلب فوري عبر الواتساب"
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">طلب واتساب</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Cart is handled globally by FloatingCartWidget */}
    </div>
  );
}
