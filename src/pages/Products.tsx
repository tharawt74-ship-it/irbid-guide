import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { 
  ShoppingBag, 
  Search, 
  Store, 
  Flame, 
  Clock, 
  MapPin, 
  SlidersHorizontal, 
  ChevronDown, 
  ChevronLeft, 
  X, 
  ArrowUpDown, 
  Phone,
  LayoutGrid,
  List,
  Filter,
  Check,
  Sparkles,
  Crown
} from 'lucide-react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCachedBusinesses, setCachedBusinesses, isBusinessesCacheFresh } from '../lib/dataCache';
import { Business, MenuItem, InFeedPromoCard } from '../types';
import { SEO } from '../components/common/SEO';
import { getWhatsAppUrl } from '../lib/contactHelper';
import { WhatsApp3DIcon, Phone3DIcon } from '../components/common/PremiumContactButtons';
import { DEMO_SEED_DATA } from '../lib/demoDataHelper';
import { Pagination } from '../components/common/Pagination';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { getCategoryMeta } from '../lib/categoryMeta';
import { CategoryButtonLabel, cleanCategoryName } from '../components/CategoryButtonLabel';
import { CategoriesModal } from '../components/CategoriesModal';
import { fetchPagePromoCards } from '../lib/promoCards';
import { InFeedPromoCardItem } from '../components/common/InFeedPromoCardItem';
import { VerifiedBadge } from '../components/vip/VerifiedBadge';
import { getBusinessVipStatus, isItemCurrentlyFeatured, isBusinessCurrentlyFeatured } from '../lib/vipHelper';
import { BUSINESS_CATEGORIES, MainCategory, isFoodAndDrinkBusiness, getCanonicalBusinessCategory, normalizeArabic } from '../lib/categories';
import { cn } from '../lib/utils';
import { useHeaderVisibility } from '../lib/useHeaderVisibility';

// Location Matching Helper
function isMatchingLocation(selectedReg: string, bizAddress: string, bizDistrict: string, bizRegion: string, bizName: string): boolean {
  if (!selectedReg || selectedReg === 'الكل' || !selectedReg.trim()) return true;

  const selNorm = normalizeArabic(selectedReg);
  const addrNorm = normalizeArabic(bizAddress);
  const distNorm = normalizeArabic(bizDistrict);
  const regNorm = normalizeArabic(bizRegion);
  const nameNorm = normalizeArabic(bizName);

  if (addrNorm.includes(selNorm) || distNorm.includes(selNorm) || regNorm.includes(selNorm) || nameNorm.includes(selNorm)) {
    return true;
  }

  const cleanReg = selectedReg.replace(/\(.*?\)/g, '').replace(/\/.*$/g, '').trim();
  const cleanNorm = normalizeArabic(cleanReg);

  if (cleanNorm && (addrNorm.includes(cleanNorm) || distNorm.includes(cleanNorm) || regNorm.includes(cleanNorm) || nameNorm.includes(cleanNorm))) {
    return true;
  }

  const tokens = selNorm.split(' ').filter(t => t.length > 2 && t !== 'شارع' && t !== 'طريق' && t !== 'لواء' && t !== 'قرى' && t !== 'مدينة' && t !== 'حي' && t !== 'مجمع');
  if (tokens.length === 0) return true;

  return tokens.some(t => addrNorm.includes(t) || distNorm.includes(t) || regNorm.includes(t) || nameNorm.includes(t));
}

export interface ProductItem extends MenuItem {
  businessId: string;
  businessName: string;
  businessLogo?: string;
  businessImage?: string;
  businessCategory?: string;
  businessSubCategory?: string;
  businessAddress?: string;
  businessDistrict?: string;
  businessRegion?: string;
  businessPhone?: string;
  businessWhatsapp?: string;
  businessRating?: number;
  businessIsVerified?: boolean;
  businessIsVip?: boolean;
  businessIsFeatured?: boolean;
  isMenuFeatured?: boolean;
  isMedicalProcedure?: boolean;
}

export function Products() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlSearchParam = searchParams.get('search') || '';
  const urlCatParam = searchParams.get('category') || 'الكل';
  const urlSubCatParam = searchParams.get('subCategory') || searchParams.get('subcategory') || '';
  const { categories, neighborhoods } = useSystemSettings();
  const mainCategories = categories.map(c => c.name);
  const getSubCats = (catName: string) => categories.find(c => c.name === catName)?.subcategories || [];

  const [businesses, setBusinesses] = useState<Business[]>(() => getCachedBusinesses() || []);
  const [promoCards, setPromoCards] = useState<InFeedPromoCard[]>([]);
  const [loading, setLoading] = useState(!businesses || businesses.length === 0);
  const [searchQuery, setSearchQuery] = useState(urlSearchParam);
  const [stickySearchInput, setStickySearchInput] = useState('');
  const [desktopSearchInput, setDesktopSearchInput] = useState(urlSearchParam);
  const [selectedCategory, setSelectedCategory] = useState(urlCatParam);
  const [selectedSubCategory, setSelectedSubCategory] = useState(urlSubCatParam);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'popular'>('default');
  const [isFloatingSearchOpen, setIsFloatingSearchOpen] = useState(false);
  const [isFloatingFilterOpen, setIsFloatingFilterOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isSubCategoriesExpanded, setIsSubCategoriesExpanded] = useState(false);
  
  // Mobile app states
  const showHeader = useHeaderVisibility();
  const [mobileViewMode, setMobileViewMode] = useState<'grid' | 'list'>('grid');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const activeCategoryRef = useRef<HTMLButtonElement | null>(null);
  const activeSubCategoryRef = useRef<HTMLButtonElement | null>(null);

  const scrollContainerToElement = (el: HTMLElement | null) => {
    if (!el || !el.parentElement) return;
    const container = el.parentElement;
    const elRect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const elCenter = elRect.left + elRect.width / 2;
    const containerCenter = containerRect.left + containerRect.width / 2;
    const scrollOffset = elCenter - containerCenter;

    container.scrollBy({
      left: scrollOffset,
      behavior: 'smooth'
    });
  };

  // Auto scroll selected main category into view
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollContainerToElement(activeCategoryRef.current);
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedCategory]);

  // Auto scroll selected subcategory into view
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollContainerToElement(activeSubCategoryRef.current);
    }, 120);
    return () => clearTimeout(timer);
  }, [selectedSubCategory, selectedCategory]);

  // Sync with URL query parameters if they change
  useEffect(() => {
    const q = searchParams.get('search');
    const c = searchParams.get('category');
    const sc = searchParams.get('subCategory') || searchParams.get('subcategory');
    if (q !== null) setSearchQuery(q);
    if (c !== null) setSelectedCategory(c);
    if (sc !== null) setSelectedSubCategory(sc);
  }, [searchParams]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory && selectedCategory !== 'الكل') count++;
    if (selectedSubCategory && selectedSubCategory.trim()) count++;
    if (selectedRegion && selectedRegion.trim()) count++;
    if (sortBy !== 'default') count++;
    return count;
  }, [selectedCategory, selectedSubCategory, selectedRegion, sortBy]);
  
  // Pagination (Max 30 items per page as requested)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 30;

  // Fetch businesses using controlled TTL cache
  useEffect(() => {
    fetchPagePromoCards('products').then(cards => setPromoCards(cards)).catch(() => {});

    if (!db) {
      setLoading(false);
      return;
    }

    const cached = getCachedBusinesses();
    const isFresh = isBusinessesCacheFresh();
    if (cached && cached.length > 0) {
      setBusinesses(cached);
      setLoading(false);
      if (isFresh) {
        return;
      }
    }

    let isMounted = true;
    getDocs(query(collection(db, 'businesses'), limit(150)))
      .then((snapshot) => {
        if (!isMounted) return;
        const liveList: Business[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data && !data.isHidden && data.status !== 'rejected') {
            liveList.push({ id: docSnap.id, ...data } as Business);
          }
        });

        if (liveList.length > 0) {
          setBusinesses(liveList);
          setCachedBusinesses(liveList);
        } else {
          const fallback = (DEMO_SEED_DATA.businesses || []).map((b, idx) => ({
            id: (b as any).id || (b as any).username || `demo-b-${idx}`,
            ...b
          })) as Business[];
          setBusinesses(fallback);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("Products businesses fetch fallback:", err);
        const fallback = (DEMO_SEED_DATA.businesses || []).map((b, idx) => ({
          id: (b as any).id || (b as any).username || `demo-b-${idx}`,
          ...b
        })) as Business[];
        setBusinesses(fallback);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Aggregate all products and medical services
  // Each product strictly inherits the EXACT parent business main category and subcategory
  const allProducts = useMemo<ProductItem[]>(() => {
    const list: ProductItem[] = [];

    businesses.forEach(biz => {
      if (!biz || !biz.id) return;

      const isMedical = Boolean(
        biz.category?.includes('طبي') || 
        biz.category?.includes('صحة') || 
        biz.category?.includes('عياد') || 
        biz.category?.includes('أسنان') ||
        biz.category?.includes('صيدل') ||
        biz.category?.includes('مختبر') ||
        biz.category?.includes('مستشف') ||
        biz.facilityType
      );

      const vipStatus = getBusinessVipStatus(biz);
      // STRICT VIP SECURITY GATE: Only businesses on the active Golden (VIP) tier (trial or paid) can display products/services on the products page
      if (!vipStatus.isVip) return;

      const { mainCategory: stdCategory, subCategory: stdSubCategory } = getCanonicalBusinessCategory(biz);
      const isBizFeatured = isBusinessCurrentlyFeatured(biz);
      const isBizMenuFeatured = Boolean((biz as any).isMenuFeatured);

      // 1. Menu items / products
      if (Array.isArray(biz.menuItems) && biz.menuItems.length > 0) {
        biz.menuItems.forEach((item: MenuItem, idx: number) => {
          if (!item || !item.name) return;
          const isItemFeat = isItemCurrentlyFeatured(item, biz);
          list.push({
            ...item,
            id: item.id || `biz_${biz.id}_item_${idx}`,
            isFeatured: isItemFeat || isBizFeatured || isBizMenuFeatured || Boolean(item.isFeatured),
            isSponsored: Boolean(item.isSponsored || isBizFeatured || isBizMenuFeatured),
            isMenuFeatured: isBizMenuFeatured,
            businessId: biz.id,
            businessName: biz.name || 'محل تجاري',
            businessLogo: biz.logoUrl || biz.imageUrl,
            businessImage: biz.imageUrl || biz.coverImage,
            businessCategory: stdCategory,
            businessSubCategory: stdSubCategory,
            businessAddress: biz.address || 'إربد',
            businessDistrict: (biz as any).district || '',
            businessRegion: (biz as any).region || '',
            businessPhone: biz.phone,
            businessWhatsapp: biz.whatsapp || biz.socialLinks?.whatsapp || biz.phone,
            businessRating: biz.rating,
            businessIsVerified: vipStatus.isVerified || Boolean(biz.isVerified),
            businessIsVip: vipStatus.isVip || Boolean(biz.isVip),
            businessIsFeatured: isBizFeatured,
            isMedicalProcedure: isMedical
          });
        });
      }

      // 2. Medical Consultation if available and not present in items
      if (isMedical && biz.medicalProfile?.consultationFee && biz.medicalProfile.consultationFee.trim()) {
        const fee = biz.medicalProfile.consultationFee.trim();
        if (fee && fee !== '0') {
          const hasConsultation = (biz.menuItems || []).some(m => 
            m.name?.includes('كشف') || m.name?.includes('معاين') || m.name?.includes('استشار')
          );
          if (!hasConsultation) {
            const feeNumericOnly = fee.replace(/[^0-9.-]/g, '');
            list.push({
              id: `med_consult_${biz.id}`,
              name: biz.category?.includes('صيدل')
                ? 'استشارة دوائية وصرف وصفات'
                : biz.category?.includes('مختبر')
                ? 'فحص مخبري واستشارة تشخيصية'
                : biz.category?.includes('علاج طبيعي')
                ? 'كشفية وجلسة تقييم علاج طبيعي'
                : biz.category?.includes('مستشف')
                ? 'معاينة وكشفية طوارئ / عيادات'
                : 'كشفية ومعاينة طبية بالعيادة',
              price: feeNumericOnly || fee,
              category: 'معاينات واستشارات',
              description: 'تشمل الفحص السريري والاستشارة الطبية المتخصصة وتقديم التشخيص الدقيق.',
              isPopular: true,
              isAvailable: true,
              isFeatured: isBizFeatured,
              isSponsored: isBizFeatured,
              businessId: biz.id,
              businessName: biz.name || 'منشأة طبية',
              businessLogo: biz.logoUrl || biz.imageUrl,
              businessImage: biz.imageUrl,
              businessCategory: stdCategory || 'صحة وطب',
              businessSubCategory: stdSubCategory,
              businessAddress: biz.address || 'إربد',
              businessDistrict: (biz as any).district || '',
              businessRegion: (biz as any).region || '',
              businessPhone: biz.phone,
              businessWhatsapp: biz.whatsapp || biz.socialLinks?.whatsapp || biz.phone,
              businessRating: biz.rating,
              businessIsVerified: vipStatus.isVerified || Boolean(biz.isVerified),
              businessIsVip: vipStatus.isVip || Boolean(biz.isVip),
              businessIsFeatured: isBizFeatured,
              isMedicalProcedure: true
            });
          }
        }
      }
    });

    return list;
  }, [businesses]);

  // Filtered and Sorted products
  const filteredProducts = useMemo(() => {
    let result = allProducts.filter(item => {
      // 0. Automatically exclude unavailable products
      const isUnavailable = item.isAvailable === false || (item.trackStock && item.stockCount === 0);
      if (isUnavailable) return false;

      // 1. Main Category Filter (Strictly matches the shop's main category)
      if (selectedCategory && selectedCategory !== 'الكل') {
        const selClean = cleanCategoryName(selectedCategory);
        const itemCatClean = cleanCategoryName(item.businessCategory || '');
        if (selClean !== itemCatClean && item.businessCategory !== selectedCategory) {
          return false;
        }
      }

      // 3. Sub Category Filter (Strictly matches the shop's subcategory)
      if (selectedSubCategory && selectedSubCategory.trim() && selectedSubCategory !== 'الكل الفرعي' && selectedSubCategory !== 'عرض الكل الفرعي') {
        const selSubClean = cleanCategoryName(selectedSubCategory);
        const itemSubClean = cleanCategoryName(item.businessSubCategory || '');
        if (selSubClean !== itemSubClean && item.businessSubCategory !== selectedSubCategory) {
          return false;
        }
      }

      // 4. Region / Location Filter (Product inherits parent business location)
      if (selectedRegion && selectedRegion !== 'الكل' && selectedRegion.trim()) {
        const matchesLoc = isMatchingLocation(
          selectedRegion,
          item.businessAddress || '',
          item.businessDistrict || '',
          item.businessRegion || '',
          item.businessName || ''
        );
        if (!matchesLoc) return false;
      }

      return true;
    });

    // Sorting: Featured / Sponsored items first (صدارة البحث والنتائج)
    result.sort((a, b) => {
      const aFeat = isItemCurrentlyFeatured(a) ? 1 : 0;
      const bFeat = isItemCurrentlyFeatured(b) ? 1 : 0;
      if (bFeat !== aFeat) return bFeat - aFeat;

      const priceA = parseFloat(String(a.price)) || 0;
      const priceB = parseFloat(String(b.price)) || 0;

      if (sortBy === 'price_asc') {
        return priceA - priceB;
      }
      if (sortBy === 'price_desc') {
        return priceB - priceA;
      }
      if (sortBy === 'popular') {
        const aPop = a.isPopular || a.badge === 'popular' ? 1 : 0;
        const bPop = b.isPopular || b.badge === 'popular' ? 1 : 0;
        return bPop - aPop;
      }

      // Default: VIP businesses first, then newest
      const aVip = a.businessIsVip ? 1 : 0;
      const bVip = b.businessIsVip ? 1 : 0;
      if (bVip !== aVip) return bVip - aVip;

      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return result;
  }, [allProducts, searchQuery, selectedCategory, selectedSubCategory, selectedRegion, sortBy]);

  // Reset pagination on filter adjustments
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedSubCategory, selectedRegion, sortBy]);

  // Paginated items slice
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredProducts.slice(startIndex, startIndex + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  return (
    <div className="min-h-screen bg-[#fdfcfb] text-[#2d2a26] pb-24 selection:bg-emerald-100 selection:text-emerald-900" dir="rtl">
      <SEO 
        title="المنتجات والخدمات | منصة شو في بإربد"
        description="تصفح جميع المنتجات والوجبات والسلع والخدمات المتاحة لدى محلات ومطاعم ومنشآت إربد مع الأسعار الحية وإمكانية الطلب عبر واتساب أو الاتصال المباشر."
      />

      {/* ========================================================================= */}
      {/* MOBILE & TABLET STICKY TOP APP BAR (Native Mobile App Feeling)           */}
      {/* ========================================================================= */}
      <div className={cn(
        "lg:hidden sticky z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-2xs px-4 py-2.5 space-y-2 transition-all duration-300",
        showHeader ? "top-[62px] sm:top-[68px] md:top-[72px]" : "top-0"
      )}>
        {/* Row 1: Search Bar & Filter Sheet Button */}
        <div className="flex items-center gap-2">
          {/* Integrated Search Input */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (stickySearchInput.trim()) {
                navigate(`/search?q=${encodeURIComponent(stickySearchInput.trim())}&tab=products`);
              }
            }}
            className="relative flex-1 min-w-0"
          >
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
            <input
              type="search"
              enterKeyHint="search"
              placeholder="عن ماذا تبحث؟"
              value={stickySearchInput}
              onChange={(e) => setStickySearchInput(e.target.value)}
              className="w-full h-10 pl-8 pr-9 bg-stone-100/90 border border-stone-200 rounded-xl text-xs font-bold placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-emerald-600 transition-all cursor-text"
            />
            {stickySearchInput && (
              <button
                type="button"
                onClick={() => setStickySearchInput('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1 rounded-full cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </form>

          {/* Filter Sheet Trigger Button */}
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            className="h-10 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>فلترة</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 bg-amber-400 text-stone-900 rounded-full font-black text-[10px] flex items-center justify-center -mr-0.5">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Row 2: Horizontal Category Pills Carousel (Edge-To-Edge Scroll) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pt-0.5 pb-1 -mx-2.5 px-2.5 sm:-mx-4 sm:px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* All Category Pill */}
          <button
            ref={selectedCategory === 'الكل' ? activeCategoryRef : null}
            onClick={() => {
              setSelectedCategory('الكل');
              setSelectedSubCategory('');
            }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
              selectedCategory === 'الكل'
                ? 'bg-gradient-to-r from-emerald-700 to-teal-600 text-white border-transparent shadow-xs'
                : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-300'
            }`}
          >
            <span>الكل</span>
            <span className="text-[10px] opacity-80">({allProducts.length})</span>
          </button>

          {/* Main Category Pills */}
          {mainCategories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                ref={isSelected ? activeCategoryRef : null}
                onClick={() => {
                  setSelectedCategory(isSelected ? 'الكل' : cat);
                  setSelectedSubCategory('');
                }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                  isSelected
                    ? 'bg-gradient-to-r from-emerald-700 to-teal-600 text-white border-transparent shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-300'
                }`}
              >
                <span>{cat}</span>
              </button>
            );
          })}
        </div>

        {/* Row 3: Subcategory Pills (If Category Selected - Edge-To-Edge Scroll) */}
        {selectedCategory && selectedCategory !== 'الكل' && getSubCats(selectedCategory).length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pt-0.5 pb-1 -mx-2.5 px-2.5 sm:-mx-4 sm:px-4 border-t border-stone-100" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <button
              ref={selectedSubCategory === '' ? activeSubCategoryRef : null}
              onClick={() => setSelectedSubCategory('')}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                selectedSubCategory === ''
                  ? 'bg-emerald-800 text-white border-transparent'
                  : 'bg-stone-100 text-stone-600 border-stone-200'
              }`}
            >
              الكل الفرعي
            </button>
            {getSubCats(selectedCategory).map((subCat) => (
              <button
                key={subCat}
                ref={selectedSubCategory === subCat ? activeSubCategoryRef : null}
                onClick={() => setSelectedSubCategory(subCat)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                  selectedSubCategory === subCat
                    ? 'bg-emerald-800 text-white border-transparent'
                    : 'bg-stone-100 text-stone-600 border-stone-200'
                }`}
              >
                {subCat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM SHEET FILTER DRAWER MODAL                                  */}
      {/* ========================================================================= */}
      {isMobileFilterOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          {/* Backdrop Click */}
          <div className="flex-1" onClick={() => setIsMobileFilterOpen(false)} />

          {/* Bottom Sheet Modal */}
          <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl border-t border-stone-200 overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Sheet Handle Bar */}
            <div className="pt-3 pb-1 flex justify-center">
              <div className="w-12 h-1.5 bg-stone-300 rounded-full" />
            </div>

            {/* Sheet Header */}
            <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-emerald-700" />
                <h3 className="text-base font-black text-stone-900">فلترة المنتجات والخدمات</h3>
              </div>
              <button
                onClick={() => {
                  setSelectedCategory('الكل');
                  setSelectedSubCategory('');
                  setSelectedRegion('');
                  setSortBy('default');
                }}
                className="text-xs font-bold text-red-600 hover:text-red-700 p-1 cursor-pointer"
              >
                إعادة ضبط
              </button>
            </div>

            {/* Sheet Content Scrollable */}
            <div className="p-4 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Region Filter */}
              <div className="space-y-2">
                <label className="font-black text-stone-800 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-emerald-700" />
                  <span>الموقع أو المنطقة بإربد</span>
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2.5 px-3 font-bold text-stone-800 focus:outline-none focus:border-emerald-600"
                >
                  <option value="">جميع مناطق وإحياء إربد</option>
                  {neighborhoods && neighborhoods.map((group) => (
                    <optgroup key={group.groupName} label={group.groupName}>
                      {group.areas.map((area) => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Sort By Filter */}
              <div className="space-y-2">
                <label className="font-black text-stone-800 flex items-center gap-1.5">
                  <ArrowUpDown className="h-4 w-4 text-emerald-700" />
                  <span>الترتيب والتنسيق</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'default', label: 'المقترح' },
                    { id: 'popular', label: 'الأكثر طلباً' },
                    { id: 'price_asc', label: 'الأقل سعراً' },
                    { id: 'price_desc', label: 'الأعلى سعراً' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSortBy(s.id as any)}
                      className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer ${
                        sortBy === s.id
                          ? 'bg-emerald-700 text-white border-transparent shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <label className="font-black text-stone-800 flex items-center gap-1.5">
                  <SlidersHorizontal className="h-4 w-4 text-emerald-700" />
                  <span>اختر التصنيف</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => {
                      setSelectedCategory('الكل');
                      setSelectedSubCategory('');
                    }}
                    className={`px-3 py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      selectedCategory === 'الكل'
                        ? 'bg-emerald-700 text-white border-transparent'
                        : 'bg-stone-50 text-stone-700 border-stone-200'
                    }`}
                  >
                    الكل
                  </button>
                  {mainCategories.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setSelectedCategory(c);
                        setSelectedSubCategory('');
                      }}
                      className={`px-3 py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                        selectedCategory === c
                          ? 'bg-emerald-700 text-white border-transparent'
                          : 'bg-stone-50 text-stone-700 border-stone-200'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet Footer CTA */}
            <div className="p-4 border-t border-stone-100 bg-stone-50">
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 rounded-2xl font-black text-sm shadow-md active:scale-98 transition-all cursor-pointer"
              >
                تطبيق الفلترة (عرض {filteredProducts.length} نتيجة)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-12 space-y-6 sm:space-y-8">
        
        {/* DESKTOP HEADER SECTION (Hidden on mobile) */}
        <div className="hidden lg:flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight flex items-center gap-2.5">
              <ShoppingBag className="h-7 w-7 text-emerald-700" />
              <span>المنتجات والخدمات</span>
            </h1>
          </div>
        </div>

        {/* DESKTOP CATEGORIES BAR (Hidden on mobile) */}
        <div className="hidden lg:block space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-black text-stone-800 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-emerald-700" />
              <span>التصنيفات الرئيسية</span>
            </h2>
            <button
              onClick={() => setIsCategoriesModalOpen(true)}
              className="text-xs sm:text-sm font-black text-[#1a4d2e] hover:text-[#133b22] flex items-center gap-1 bg-[#1a4d2e]/5 hover:bg-[#1a4d2e]/10 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              <span>عرض الكل</span>
              <span className="text-[10px] sm:text-xs">←</span>
            </button>
          </div>

          <div className="relative">
            <div className="flex flex-nowrap overflow-x-auto pb-4 pt-1 gap-3.5 sm:gap-4 snap-x scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {/* All Button */}
              {(() => {
                const isSelected = selectedCategory === 'الكل';
                const { icon: Icon } = getCategoryMeta('الكل');
                return (
                  <button
                    onClick={() => {
                      setSelectedCategory('الكل');
                      setSelectedSubCategory('');
                    }}
                    className={`snap-start shrink-0 aspect-square w-[88px] sm:w-28 md:w-32 flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl md:rounded-[24px] transition-all duration-200 border text-center group cursor-pointer ${
                      isSelected 
                        ? 'bg-gradient-to-r from-emerald-700 to-teal-600 text-white border-transparent shadow-lg shadow-emerald-700/25 -translate-y-1' 
                        : 'bg-white text-[#2d2a26] border-[#e5e1da] hover:border-emerald-600/40 hover:bg-[#fcfbfa] hover:-translate-y-0.5 hover:shadow-md'
                    }`}
                  >
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-2.5 transition-transform group-hover:scale-110 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <CategoryButtonLabel name="الكل" isSelected={isSelected} />
                  </button>
                );
              })()}

              {/* Main Category buttons */}
              {mainCategories.map((cat) => {
                const isSelected = selectedCategory === cat;
                const { icon: Icon, bg } = getCategoryMeta(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(isSelected ? 'الكل' : cat);
                      setSelectedSubCategory('');
                    }}
                    className={`snap-start shrink-0 aspect-square w-[88px] sm:w-28 md:w-32 flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl md:rounded-[24px] transition-all duration-200 border text-center group cursor-pointer ${
                      isSelected 
                        ? 'bg-gradient-to-r from-emerald-700 to-teal-600 text-white border-transparent shadow-lg shadow-emerald-700/25 -translate-y-1' 
                        : 'bg-white text-[#2d2a26] border-[#e5e1da] hover:border-emerald-600/40 hover:bg-[#fcfbfa] hover:-translate-y-0.5 hover:shadow-md'
                    }`}
                  >
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-2.5 transition-transform group-hover:scale-110 ${
                      isSelected ? 'bg-white/20 text-white' : bg
                    }`}>
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <CategoryButtonLabel name={cat} isSelected={isSelected} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub Categories Strip */}
          {selectedCategory && selectedCategory !== 'الكل' && getSubCats(selectedCategory).length > 0 && (
            <div className="mt-3 mb-2">
              <div className="flex items-start sm:items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  {isSubCategoriesExpanded ? (
                    <div className="flex flex-wrap gap-2 sm:gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <button
                        onClick={() => setSelectedSubCategory('')}
                        className={`snap-start shrink-0 whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 border cursor-pointer ${
                          selectedSubCategory === ''
                            ? 'bg-gradient-to-r from-emerald-700 to-teal-600 text-white border-transparent shadow-md shadow-emerald-700/10'
                            : 'bg-white text-stone-600 border-[#e5e1da] hover:border-emerald-300 hover:bg-stone-50'
                        }`}
                      >
                        عرض الكل الفرعي
                      </button>
                      {getSubCats(selectedCategory).map((subCat) => (
                        <button
                          key={subCat}
                          onClick={() => setSelectedSubCategory(subCat)}
                          className={`snap-start shrink-0 whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 border cursor-pointer ${
                            selectedSubCategory === subCat
                              ? 'bg-gradient-to-r from-emerald-700 to-teal-600 text-white border-transparent shadow-md shadow-emerald-700/10'
                              : 'bg-white text-stone-600 border-[#e5e1da] hover:border-emerald-300 hover:bg-stone-50'
                          }`}
                        >
                          {subCat}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="flex flex-nowrap overflow-x-auto gap-2 sm:gap-2.5 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide snap-x items-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <button
                          onClick={() => setSelectedSubCategory('')}
                          className={`snap-start shrink-0 whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 border cursor-pointer ${
                            selectedSubCategory === ''
                              ? 'bg-gradient-to-r from-emerald-700 to-teal-600 text-white border-transparent shadow-md shadow-emerald-700/10'
                              : 'bg-white text-stone-600 border-[#e5e1da] hover:border-emerald-300 hover:bg-stone-50'
                          }`}
                        >
                          عرض الكل الفرعي
                        </button>
                        {getSubCats(selectedCategory).map((subCat) => (
                          <button
                            key={subCat}
                            onClick={() => setSelectedSubCategory(subCat)}
                            className={`snap-start shrink-0 whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 border cursor-pointer ${
                              selectedSubCategory === subCat
                                ? 'bg-gradient-to-r from-emerald-700 to-teal-600 text-white border-transparent shadow-md shadow-emerald-700/10'
                                : 'bg-white text-stone-600 border-[#e5e1da] hover:border-emerald-300 hover:bg-stone-50'
                            }`}
                          >
                            {subCat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setIsSubCategoriesExpanded(!isSubCategoriesExpanded)}
                  className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-stone-200 hover:border-emerald-500/40 hover:bg-stone-50 text-stone-600 hover:text-stone-900 shadow-xs flex items-center justify-center transition-all duration-300 cursor-pointer"
                  title={isSubCategoriesExpanded ? "عرض كشريط أفقي" : "تمديد للأسفل"}
                  aria-label={isSubCategoriesExpanded ? "عرض كشريط أفقي" : "تمديد للأسفل"}
                >
                  <ChevronDown className={`h-4.5 w-4.5 sm:h-5 sm:w-5 transition-transform duration-300 ${isSubCategoriesExpanded ? 'rotate-180 text-emerald-700' : ''}`} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Info Bar for Desktop */}
        <div className="hidden lg:flex items-center justify-between text-xs text-stone-400 font-bold mb-4">
          <span>تصفح المنتجات والخدمات</span>
          <span>عدد العناصر: <strong className="text-emerald-850">{filteredProducts.length}</strong></span>
        </div>

        {/* Results Info Bar for Mobile with Grid / List View Toggle */}
        <div className="lg:hidden flex items-center justify-between text-xs font-bold text-stone-600 bg-stone-100/80 px-3 py-1.5 rounded-xl">
          <span className="flex items-center gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5 text-emerald-700" />
            <span>النتائج: <strong className="text-emerald-800">{filteredProducts.length}</strong></span>
          </span>

          {/* Grid / List View Toggle */}
          <div className="flex items-center bg-white p-0.5 rounded-lg shrink-0 border border-stone-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setMobileViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                mobileViewMode === 'grid' ? 'bg-[#1a4d2e] text-white shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
              title="عرض شبكي"
              aria-label="عرض شبكي"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMobileViewMode('list')}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                mobileViewMode === 'list' ? 'bg-[#1a4d2e] text-white shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
              title="عرض قائمة"
              aria-label="عرض قائمة"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Products Grid Section */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-xs animate-pulse p-3 space-y-3">
                <div className="aspect-square bg-stone-100 rounded-xl" />
                <div className="h-4 bg-stone-100 rounded w-3/4" />
                <div className="h-3 bg-stone-100 rounded w-1/2" />
                <div className="h-8 bg-stone-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-3xl border border-stone-200 p-6 shadow-xs max-w-2xl mx-auto space-y-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-stone-800">لا توجد عناصر مطابقة حالياً</h3>
            <p className="text-stone-500 text-xs sm:text-sm max-w-md mx-auto">
              لم نتمكن من العثور على نتائج تطابق معايير البحث المحددة. جرب اختيار تصنيف آخر أو إعادة ضبط البحث.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('الكل');
                setSelectedSubCategory('');
                setSelectedRegion('');
                setSortBy('default');
              }}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-700 to-teal-600 text-white px-5 py-2.5 rounded-2xl font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <span>عرض جميع المنتجات والخدمات</span>
            </button>
          </div>
        ) : (
          <div>
            {/* PRODUCT CARD RENDERER: Adapts dynamically to Mobile View Mode */}
            <div 
              id="products-grid" 
              className={
                mobileViewMode === 'list'
                  ? "flex flex-col gap-2.5 sm:gap-4"
                  : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6"
              }
            >
              {paginatedItems.flatMap((item, idx) => {
                const isUnavailable = item.isAvailable === false || (item.trackStock && item.stockCount === 0);
                const priceNum = parseFloat(String(item.price)) || 0;
                const origPriceNum = item.originalPrice ? parseFloat(item.originalPrice) : 0;
                const hasDiscount = origPriceNum > priceNum;

                const phoneNum = item.businessPhone || '';
                const whatsappNum = item.businessWhatsapp || phoneNum;
                const whatsappOrderMsg = `مرحباً ${item.businessName}، أود الطلب والاستفسار بخصوص (${item.name}) بسعر ${priceNum.toFixed(2)} د.أ المعروض على منصة شو في بإربد.`;
                const whatsappUrl = getWhatsAppUrl(whatsappNum, whatsappOrderMsg);

                const isFeaturedProduct = isItemCurrentlyFeatured(item);

                // =========================================================================
                // MOBILE LIST VIEW CARD (Horizontal App Row Layout)
                // =========================================================================
                const prodCardNode = mobileViewMode === 'list' ? (
                  <div 
                    key={`${item.businessId}_${item.id}`}
                      className={cn(
                        "bg-white rounded-2xl border p-2.5 sm:p-3 transition-all flex items-center gap-3 relative overflow-hidden",
                        isUnavailable 
                          ? "border-stone-200/60 bg-stone-50/50 opacity-90"
                          : isFeaturedProduct
                            ? "border-2 border-amber-400/90 ring-2 ring-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.35)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] hover:ring-amber-300"
                            : "border-stone-200/80 shadow-2xs hover:shadow-md hover:border-emerald-200"
                      )}
                    >
                      {/* Image Thumbnail */}
                      <Link 
                        to={`/products/${item.id}`}
                        className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-stone-100 shrink-0 block cursor-pointer"
                      >
                        <img 
                          src={item.imageUrl || item.businessImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </Link>

                      {/* Content Area */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <Link to={`/products/${item.id}`} className="block">
                          <h3 className="text-xs sm:text-sm font-black text-stone-900 truncate leading-snug">
                            {item.name}
                          </h3>
                        </Link>

                        {/* Badges strip: Category + Sponsored */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isFeaturedProduct && (
                            <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-yellow-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1 w-fit border border-amber-300/60 shrink-0">
                              <Crown className="h-3 w-3 fill-current shrink-0 text-amber-950" />
                              <span>ممول</span>
                            </span>
                          )}
                          <span className="inline-block text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">
                            {item.businessSubCategory || item.businessCategory || item.category || 'صنف'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-[11px] font-bold text-stone-600 truncate">
                            {item.businessName}
                          </span>
                          {(item.businessIsVip || item.businessIsVerified) && (
                            <VerifiedBadge size="sm" businessName={item.businessName} />
                          )}
                        </div>
                        <p className="text-[10px] text-stone-500 flex items-center gap-1 truncate">
                          <MapPin className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                          <span className="truncate">{item.businessAddress || 'إربد'}</span>
                        </p>

                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-sm font-black text-red-600">
                            {priceNum.toFixed(2)} د.أ
                          </span>
                          {hasDiscount && (
                            <span className="text-[10px] text-stone-400 font-bold line-through">
                              {origPriceNum.toFixed(2)} د.أ
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action CTA Buttons */}
                      <div className="flex flex-col gap-1.5 shrink-0 pl-1">
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-xs active:scale-95 transition-all"
                          title="طلب عبر واتساب"
                          aria-label="طلب عبر واتساب"
                        >
                          <WhatsApp3DIcon className="w-4 h-4" />
                        </a>
                        {phoneNum ? (
                          <a
                            href={`tel:${phoneNum}`}
                            className="w-9 h-9 rounded-xl bg-stone-900 hover:bg-stone-800 text-white flex items-center justify-center shadow-xs active:scale-95 transition-all"
                            title="اتصال هاتفي"
                            aria-label="اتصال هاتفي"
                          >
                            <Phone3DIcon className="w-4 h-4" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                ) : (
                  <div 
                    key={`${item.businessId}_${item.id}`}
                    className={cn(
                      "bg-white rounded-2xl sm:rounded-3xl border transition-all duration-300 flex flex-col group relative overflow-hidden",
                      isUnavailable 
                        ? "border-stone-200/60 bg-stone-50/50 shadow-2xs opacity-90"
                        : isFeaturedProduct
                          ? "border-2 border-amber-400/90 ring-2 ring-amber-400/40 shadow-[0_0_22px_rgba(245,158,11,0.3)] hover:shadow-[0_0_35px_rgba(245,158,11,0.55)] hover:border-amber-400"
                          : "border-stone-200/80 shadow-2xs hover:shadow-xl hover:border-emerald-200"
                    )}
                  >
                    {/* Top Right Badges */}
                    <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-10 flex flex-col gap-1 items-start">
                      {isFeaturedProduct && (
                        <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-yellow-950 text-[10px] sm:text-[11px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1 w-fit border border-amber-300/60">
                          <Crown className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current shrink-0 text-amber-950" />
                          <span>ممول</span>
                        </span>
                      )}
                      {isUnavailable ? (
                        <span className="bg-stone-500/90 text-white font-black text-[10px] sm:text-[11px] px-2.5 py-1 rounded-full shadow-md backdrop-blur-xs">
                          غير متوفر
                        </span>
                      ) : (
                        item.isPopular && (
                          <span className="bg-red-600 text-white font-black text-[10px] sm:text-[11px] px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                            <Flame className="h-3 w-3 fill-white" />
                            <span>الأكثر طلباً</span>
                          </span>
                        )
                      )}
                    </div>

                    {/* Top Left Category Badge */}
                    <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-10">
                      <div className="bg-emerald-900/90 text-white font-black text-[10px] sm:text-xs px-2.5 py-1 rounded-xl sm:rounded-2xl shadow-md border border-emerald-700/50 backdrop-blur-xs">
                        <span className="truncate max-w-[120px] sm:max-w-none block">{item.businessSubCategory || item.businessCategory || item.category || 'صنف'}</span>
                      </div>
                    </div>

                    {/* Product Image Area - Links to product detail */}
                    <Link 
                      to={`/products/${item.id}`}
                      className="relative h-48 sm:h-52 w-full overflow-hidden bg-stone-100 block cursor-pointer select-none"
                    >
                      <img 
                        src={item.imageUrl || item.businessImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'} 
                        alt={item.name}
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                          isUnavailable ? 'grayscale contrast-90 brightness-95' : ''
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                      
                      {/* Overlaid Store Name and Category */}
                      <div className="absolute bottom-2.5 right-2.5 left-2.5 sm:bottom-3 sm:right-3 sm:left-3 text-white">
                        <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
                          <span className="text-xs sm:text-sm font-black text-amber-300 truncate">
                            {item.businessName}
                          </span>
                          {(item.businessIsVip || item.businessIsVerified) && (
                            <VerifiedBadge size="sm" businessName={item.businessName} />
                          )}
                        </div>
                        <p className="text-[11px] sm:text-xs text-white/90 flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 text-amber-400 shrink-0" />
                          <span className="truncate">{item.businessAddress || 'إربد'}</span>
                        </p>
                      </div>
                    </Link>

                    {/* Card Body */}
                    <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between space-y-2.5 sm:space-y-4">
                      <Link 
                        to={`/products/${item.id}`}
                        className="space-y-1 block cursor-pointer"
                      >
                        <h3 className="text-sm sm:text-base font-black text-stone-900 group-hover:text-emerald-700 transition-colors leading-snug line-clamp-2">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-xs sm:text-sm text-stone-600 line-clamp-2 leading-relaxed font-medium">
                            {item.description}
                          </p>
                        )}
                      </Link>

                      {/* Pricing Strip */}
                      <div>
                        <div className="flex items-center justify-between bg-stone-50/80 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-stone-100">
                          <div className="flex items-baseline gap-2">
                            <span className="text-base sm:text-lg font-black text-red-600">
                              {priceNum.toFixed(2)} د.أ
                            </span>
                            {hasDiscount && (
                              <span className="text-xs text-stone-400 font-bold line-through">
                                {origPriceNum.toFixed(2)} د.أ
                              </span>
                            )}
                          </div>

                          {item.prepTimeMinutes && item.prepTimeMinutes > 0 ? (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200/50">
                              <Clock className="h-3 w-3" />
                              <span>{item.prepTimeMinutes} دقيقة</span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Buttons (Direct WhatsApp + Phone Call) */}
                    <div className="p-3 sm:p-4 pt-0 flex items-center gap-2 mt-auto">
                      {/* WhatsApp Order Button */}
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 sm:py-2.5 px-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm text-center shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <WhatsApp3DIcon className="w-4 h-4" />
                        <span>طلب عبر واتساب</span>
                      </a>

                      {/* Phone Call Button */}
                      {phoneNum ? (
                        <a
                          href={`tel:${phoneNum}`}
                          className="bg-stone-900 hover:bg-stone-800 text-white py-2.5 sm:py-2.5 px-3 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm text-center shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer px-4"
                          title="اتصال هاتفي"
                          aria-label="اتصال هاتفي"
                        >
                          <Phone3DIcon className="w-4 h-4" />
                          <span>اتصال</span>
                        </a>
                      ) : null}
                    </div>
                  </div>
                );

                const shouldInsertPromo0 = (idx === 2 || (idx === paginatedItems.length - 1 && paginatedItems.length < 3)) && promoCards[0];
                const shouldInsertPromo1 = (idx === 8) && promoCards[1];
                const promoToInsert = shouldInsertPromo0 ? (
                  <InFeedPromoCardItem key={`promo_${promoCards[0].id}_${idx}`} card={promoCards[0]} />
                ) : shouldInsertPromo1 ? (
                  <InFeedPromoCardItem key={`promo_${promoCards[1].id}_${idx}`} card={promoCards[1]} />
                ) : null;

                return promoToInsert ? [prodCardNode, promoToInsert] : [prodCardNode];
              })}
            </div>

            {/* Pagination */}
            {filteredProducts.length > pageSize && (
              <div className="pt-8 sm:pt-10">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredProducts.length / pageSize)}
                  totalItems={filteredProducts.length}
                  itemsPerPage={pageSize}
                  onPageChange={(p) => {
                    setCurrentPage(p);
                    const gridEl = document.getElementById('products-grid');
                    if (gridEl) {
                      gridEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Categories Modal */}
      <CategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        categories={categories}
        onSelectCategory={(catName, subCatName) => {
          setSelectedCategory(catName);
          setSelectedSubCategory(subCatName || '');
          setIsCategoriesModalOpen(false);
        }}
        selectedCategory={selectedCategory}
      />

      {/* FLOATING SEARCH BAR OVERLAY */}
      {isFloatingSearchOpen && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-xl z-[200] px-4 hidden lg:block animate-in fade-in slide-in-from-bottom-5 duration-300">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (desktopSearchInput.trim()) {
                navigate(`/search?q=${encodeURIComponent(desktopSearchInput.trim())}&tab=products`);
              }
            }}
            className="relative shadow-2xl rounded-full"
          >
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 pointer-events-none" />
            <input
              type="search"
              enterKeyHint="search"
              placeholder="ابحث عن منتج، خدمة، علامة تجارية..."
              value={desktopSearchInput}
              onChange={(e) => setDesktopSearchInput(e.target.value)}
              className="w-full pl-14 pr-13 py-3.5 bg-white border-2 border-emerald-600 rounded-full text-sm font-bold placeholder:text-stone-400 focus:outline-none focus:ring-4 focus:ring-emerald-600/15 shadow-2xl transition-all"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setIsFloatingSearchOpen(false)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer"
              title="إغلاق"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* FLOATING FILTER POPUP MODAL */}
      {isFloatingFilterOpen && (
        <div className="fixed bottom-8 right-28 w-[380px] max-h-[calc(100vh-5rem)] overflow-y-auto bg-white rounded-2xl border-2 border-emerald-600/80 shadow-2xl p-5 z-[200] hidden lg:block animate-in fade-in slide-in-from-bottom-5 duration-300 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
            <h4 className="font-black text-sm text-stone-900">تصفية المنتجات والخدمات</h4>
            <button 
              onClick={() => setIsFloatingFilterOpen(false)}
              className="w-7 h-7 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
              title="إغلاق"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Location Selector */}
            <div className="space-y-1.5">
              <span className="font-black text-stone-850 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-emerald-700" />
                <span>الموقع في إربد:</span>
              </span>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2.5 px-3 font-bold text-stone-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
              >
                <option value="">جميع مناطق وإحياء إربد</option>
                {neighborhoods && neighborhoods.map((group) => (
                  <optgroup key={group.groupName} label={group.groupName}>
                    {group.areas.map((area) => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="space-y-1.5">
              <span className="font-black text-stone-850 flex items-center gap-1.5">
                <ArrowUpDown className="h-4 w-4 text-stone-500" />
                <span>الترتيب حسب:</span>
              </span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2.5 px-3 font-black text-stone-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
              >
                <option value="default">المقترح</option>
                <option value="popular">الأكثر طلباً</option>
                <option value="price_asc">الأقل سعراً</option>
                <option value="price_desc">الأعلى سعراً</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTONS */}
      <div className="fixed bottom-8 right-8 z-[200] hidden lg:flex flex-col gap-3">
        {/* Floating Filter Button */}
        <button
          onClick={() => {
            setIsFloatingFilterOpen(!isFloatingFilterOpen);
            setIsFloatingSearchOpen(false);
          }}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl border cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 ${
            isFloatingFilterOpen
              ? 'bg-emerald-700 border-emerald-700 text-white ring-4 ring-emerald-700/20'
              : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
          }`}
          title="تصفية النتائج"
          aria-label="تصفية النتائج"
        >
          <SlidersHorizontal className="h-6 w-6" />
        </button>

        {/* Floating Search Button */}
        <button
          onClick={() => {
            setIsFloatingSearchOpen(!isFloatingSearchOpen);
            setIsFloatingFilterOpen(false);
          }}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl border cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 ${
            isFloatingSearchOpen
              ? 'bg-red-600 border-red-600 text-white ring-4 ring-red-600/20 hover:bg-red-700'
              : 'bg-emerald-700 border-emerald-700 text-white hover:bg-emerald-800'
          }`}
          title={isFloatingSearchOpen ? "إغلاق البحث" : "البحث"}
          aria-label={isFloatingSearchOpen ? "إغلاق البحث" : "البحث"}
        >
          {isFloatingSearchOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Search className="h-6 w-6" />
          )}
        </button>
      </div>
    </div>
  );
}

export default Products;
