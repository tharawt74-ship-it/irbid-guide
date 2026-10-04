import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Tag, 
  Flame, 
  Percent, 
  Clock, 
  MapPin, 
  Copy, 
  Check, 
  ExternalLink, 
  Share2, 
  Search, 
  Store, 
  Phone, 
  Sparkles, 
  Gift, 
  Plus, 
  X,
  MessageSquare,
  SlidersHorizontal,
  ChevronDown,
  LayoutGrid,
  List,
  Crown
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useHeaderVisibility } from '../lib/useHeaderVisibility';
import { Link, useNavigate } from 'react-router';
import { CategoryButtonLabel } from '../components/CategoryButtonLabel';
import { collection, getDocs, query, orderBy, addDoc, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCachedOffers, setCachedOffers, getCachedBusinesses, setCachedBusinesses } from '../lib/dataCache';
import { getAppConfig } from '../lib/demoDataHelper';
import { getBusinessVipStatus, isItemCurrentlyFeatured } from '../lib/vipHelper';
import { fetchPagePromoCards } from '../lib/promoCards';
import { InFeedPromoCardItem } from '../components/common/InFeedPromoCardItem';
import { InFeedPromoCard } from '../types';
import { ShareButton } from '../components/ShareButton';
import { getWhatsAppUrl, formatOfferWhatsAppMessage } from '../lib/contactHelper';
import { WhatsApp3DIcon, Phone3DIcon } from '../components/common/PremiumContactButtons';
import { SEO } from '../components/common/SEO';
import { getJordanNow } from '../lib/jordanTime';
import { useAuth } from '../contexts/AuthContext';
import { BannerSlideshow } from '../components/BannerSlideshow';
import { HomepageBanner, Business } from '../types';
import { fetchPageBanners, DEFAULT_OFFERS_BANNERS } from '../lib/pageBanners';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { getCategoryMeta } from '../lib/categoryMeta';
import { CategoriesModal } from '../components/CategoriesModal';
import { Pagination } from '../components/common/Pagination';
import { OfferCardSkeleton } from '../components/common/Skeleton';

interface OfferItem {
  id: string;
  title: string;
  businessName: string;
  businessId?: string;
  category: string;
  discountPercentage: number | string;
  oldPrice?: string;
  newPrice?: string;
  code?: string;
  expiresIn: string;
  durationMode?: string;
  durationHours?: string;
  durationDays?: string;
  startDate?: string;
  endDate?: string;
  recurringDays?: string[];
  expiresAt?: number | null;
  description: string;
  location: string;
  phone: string;
  whatsapp?: string;
  image: string;
  isHot?: boolean;
  isStudent?: boolean;
  isDemo?: boolean;
  isFeatured?: boolean;
  isSponsored?: boolean;
  featuredStartDate?: number | null;
  featuredExpiryDate?: number | null;
  createdAt?: number;
}

export function Offers() {
  const navigate = useNavigate();
  const { currentUser, isAdmin, isStaff, isMerchant, ownedBusinesses } = useAuth();
  const { categories } = useSystemSettings();
  const mainCategories = categories.map(c => c.name);
  const getSubCats = (catName: string) => categories.find(c => c.name === catName)?.subcategories || [];

  const renderOfferDurationText = (offer: any) => {
    if (!offer.durationMode) {
      return offer.expiresIn || 'لفترة محدودة';
    }

    if (offer.durationMode === 'recurring_weekly') {
      const days = offer.recurringDays || [];
      if (days.length === 0) return 'متكرر أسبوعياً';
      
      const daysOfWeekArabic = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const todayArabic = daysOfWeekArabic[getJordanNow().getDay()];
      const isTodayActive = days.includes(todayArabic);

      if (isTodayActive) {
        return `فعال اليوم 🟢 (كل ${days.join('، ')})`;
      }
      return `نشط أيام: ${days.join('، ')}`;
    }

    if (offer.expiresAt) {
      const timeLeftMs = offer.expiresAt - Date.now();
      if (timeLeftMs <= 0) {
        return 'منتهي الصلاحية 🔴';
      }

      const totalHoursLeft = timeLeftMs / (3600 * 1000);
      if (totalHoursLeft < 1) {
        return 'ينتهي خلال أقل من ساعة ⚡';
      }
      if (totalHoursLeft <= 24) {
        return `متبقي ${Math.ceil(totalHoursLeft)} ساعة/ساعات ⏳`;
      }
      const daysLeft = Math.ceil(totalHoursLeft / 24);
      return `متبقي ${daysLeft} يوم/أيام 📅`;
    }

    return offer.expiresIn || 'لفترة محدودة';
  };

  const hasBusiness = Boolean(currentUser && (isAdmin || isStaff || isMerchant || (ownedBusinesses && ownedBusinesses.length > 0)));

  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [businessMap, setBusinessMap] = useState<Record<string, Business>>({});
  const [banners, setBanners] = useState<HomepageBanner[]>(DEFAULT_OFFERS_BANNERS);
  const [promoCards, setPromoCards] = useState<InFeedPromoCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [stickySearchInput, setStickySearchInput] = useState('');
  const [desktopSearchInput, setDesktopSearchInput] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isSubCategoriesExpanded, setIsSubCategoriesExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFloatingSearchOpen, setIsFloatingSearchOpen] = useState(false);
  const [isFloatingFilterOpen, setIsFloatingFilterOpen] = useState(false);

  // Mobile App States
  const showHeader = useHeaderVisibility();
  const [mobileViewMode, setMobileViewMode] = useState<'grid' | 'list'>('grid');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'hot' | 'student'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'discount_desc' | 'newest'>('default');

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

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedSubCategory, searchQuery, filterType, sortBy]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory && selectedCategory !== 'الكل') count++;
    if (selectedSubCategory && selectedSubCategory.trim()) count++;
    if (filterType !== 'all') count++;
    if (sortBy !== 'default') count++;
    return count;
  }, [selectedCategory, selectedSubCategory, filterType, sortBy]);

  useEffect(() => {
    async function loadOffersAndBanners() {
      setLoading(true);
      try {
        // Load page banners
        fetchPageBanners(['عروض', 'خصومات', 'تخفيضات', 'تسوق', 'مطاعم'], DEFAULT_OFFERS_BANNERS, 'offers')
          .then(res => setBanners(res))
          .catch(() => setBanners(DEFAULT_OFFERS_BANNERS));

        const cached = getCachedOffers();
        if (cached && cached.length > 0) {
          setOffers(cached);
          setLoading(false);
        }

        if (!db) {
          setOffers([]);
          setLoading(false);
          return;
        }

        // Fetch / retrieve businesses to verify VIP tier status
        let bizList = getCachedBusinesses();
        if (!bizList || bizList.length === 0) {
          try {
            const bizSnap = await getDocs(query(collection(db, 'businesses'), limit(150)));
            bizList = bizSnap.docs.map(d => ({ id: d.id, ...d.data() } as Business));
            setCachedBusinesses(bizList);
          } catch (e) {
            console.warn('Could not fetch businesses for offers VIP check:', e);
            bizList = [];
          }
        }

        const bizMap = new Map<string, Business>();
        const bMapObj: Record<string, Business> = {};
        (bizList || []).forEach(b => {
          if (b.id) {
            bizMap.set(b.id, b);
            bMapObj[b.id] = b;
          }
          if (b.name) {
            bizMap.set(b.name.trim().toLowerCase(), b);
            bMapObj[b.name.trim().toLowerCase()] = b;
          }
        });
        setBusinessMap(bMapObj);

        const appConfig = await getAppConfig();
        const q = query(collection(db, 'offers'), orderBy('createdAt', 'desc'), limit(80));
        const snap = await getDocs(q);

        const loaded: OfferItem[] = [];
        snap.forEach(d => {
          const data = d.data();
          if (!appConfig.showDemoData && data.isDemo) {
            return;
          }

          // STRICT SECURITY VIP GATE:
          // Any offer whose parent business is on the basic plan or has an expired VIP subscription is strictly excluded!
          const parentBiz = (data.businessId && bizMap.get(data.businessId)) ||
                            (data.businessName && bizMap.get(String(data.businessName).trim().toLowerCase()));

          if (parentBiz) {
            const vipStatus = getBusinessVipStatus(parentBiz);
            if (!vipStatus.isVip) {
              return; // Exclude non-VIP businesses from public offers page
            }
          } else if (data.businessId || !data.isDemo) {
            // Real offer without a verified active VIP business is hidden
            return;
          }

          loaded.push({ id: d.id, ...data } as OfferItem);
        });

        setOffers(loaded);
        setCachedOffers(loaded);
        fetchPagePromoCards('offers').then(cards => setPromoCards(cards)).catch(() => {});
      } catch (err) {
        console.warn('Error loading offers from Firestore:', err);
        setOffers([]);
      } finally {
        setLoading(false);
      }
    }

    loadOffersAndBanners();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  const filteredOffers = useMemo(() => {
    let list = offers.filter(offer => {
      let matchesCategory = true;
      if (selectedCategory && selectedCategory !== 'الكل') {
        const validSubCats = getSubCats(selectedCategory);
        if (selectedSubCategory) {
          matchesCategory = offer.category === selectedSubCategory;
        } else {
          matchesCategory = offer.category === selectedCategory || validSubCats.includes(offer.category);
        }
      }

      let matchesFilter = true;
      if (filterType === 'hot') matchesFilter = Boolean(offer.isHot);
      if (filterType === 'student') matchesFilter = Boolean(offer.isStudent);

      return matchesCategory && matchesFilter;
    });

    list = [...list].sort((a, b) => {
      const parentA = (a.businessId && businessMap[a.businessId]) || (a.businessName && businessMap[String(a.businessName).trim().toLowerCase()]);
      const parentB = (b.businessId && businessMap[b.businessId]) || (b.businessName && businessMap[String(b.businessName).trim().toLowerCase()]);
      const featA = isItemCurrentlyFeatured(a, parentA) ? 1 : 0;
      const featB = isItemCurrentlyFeatured(b, parentB) ? 1 : 0;
      if (featB !== featA) return featB - featA;

      if (sortBy === 'discount_desc') {
        const dA = parseFloat(String(a.discountPercentage).replace(/[^0-9.]/g, '')) || 0;
        const dB = parseFloat(String(b.discountPercentage).replace(/[^0-9.]/g, '')) || 0;
        return dB - dA;
      } else if (sortBy === 'newest') {
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return list;
  }, [offers, selectedCategory, selectedSubCategory, searchQuery, filterType, sortBy, businessMap]);

  return (
    <div className="w-full space-y-6 sm:space-y-8 pb-16 relative" dir="rtl">
      <SEO 
        title="عروض وخصومات إربد | أحدث تخفيضات وكوبونات المطاعم والمحلات"
        description="استكشف أقوى العروض والخصومات والتخفيضات اليومية في مدينة إربد: خصومات مطاعم وكافيهات، عروض الملابس، إلكترونيات، صالونات ومراكز التجميل."
        keywords={['عروض إربد', 'خصومات إربد', 'تخفيضات إربد', 'كوبونات إربد', 'مطاعم إربد عروض']}
        canonicalUrl="https://shofibirbid.site/offers"
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
                navigate(`/search?q=${encodeURIComponent(stickySearchInput.trim())}&tab=offers`);
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
              className="w-full h-10 pl-8 pr-9 bg-stone-100/90 border border-stone-200 rounded-xl text-xs font-bold placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-red-600 transition-all cursor-text"
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
            className="h-10 px-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
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
                ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-transparent shadow-xs font-black'
                : 'bg-white text-stone-700 border-stone-200 hover:border-red-300'
            }`}
          >
            <span>الكل</span>
            <span className="text-[10px] opacity-80">({offers.length})</span>
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
                    ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-transparent shadow-xs font-black'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-red-300'
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
                  ? 'bg-red-700 text-white border-transparent font-black'
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
                    ? 'bg-red-700 text-white border-transparent font-black'
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
      {/* MOBILE FILTER SHEET / DRAWER (App-Style Experience)                      */}
      {/* ========================================================================= */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="absolute inset-0"
            onClick={() => setIsMobileFilterOpen(false)}
          />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl border-t border-stone-200 overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Sheet Header */}
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-red-600" />
                <h3 className="font-black text-stone-900 text-base">فلترة وتخصيص العروض</h3>
              </div>
              <div className="flex items-center gap-3">
                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => {
                      setSelectedCategory('الكل');
                      setSelectedSubCategory('');
                      setFilterType('all');
                      setSortBy('default');
                      setSearchQuery('');
                    }}
                    className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                  >
                    إعادة ضبط
                  </button>
                )}
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Sheet Body */}
            <div className="p-4 overflow-y-auto space-y-5 text-xs">
              {/* Type Filter */}
              <div className="space-y-2">
                <label className="font-black text-stone-800 flex items-center gap-1.5">
                  <Flame className="h-4 w-4 text-red-600" />
                  <span>نوع العرض</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'كافة العروض' },
                    { id: 'hot', label: 'عروض ساخنة' },
                    { id: 'student', label: 'خصم طلابي' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setFilterType(t.id as any)}
                      className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer ${
                        filterType === t.id
                          ? 'bg-red-600 text-white border-transparent shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort By */}
              <div className="space-y-2">
                <label className="font-black text-stone-800 flex items-center gap-1.5">
                  <Percent className="h-4 w-4 text-red-600" />
                  <span>الترتيب حسب</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'default', label: 'الافتراضي' },
                    { id: 'discount_desc', label: 'الأعلى خصماً' },
                    { id: 'newest', label: 'الأحدث' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSortBy(s.id as any)}
                      className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer ${
                        sortBy === s.id
                          ? 'bg-red-600 text-white border-transparent shadow-xs'
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
                  <SlidersHorizontal className="h-4 w-4 text-red-600" />
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
                        ? 'bg-red-600 text-white border-transparent'
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
                          ? 'bg-red-600 text-white border-transparent'
                          : 'bg-stone-50 text-stone-700 border-stone-200'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sheet Footer */}
            <div className="p-4 border-t border-stone-100 bg-stone-50">
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl font-black text-sm shadow-md active:scale-98 transition-all cursor-pointer"
              >
                تطبيق الفلترة (عرض {filteredOffers.length} عرض)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner Slideshow */}
      <BannerSlideshow banners={banners} />

      {/* DESKTOP HEADER SECTION */}
      <div className="hidden lg:flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200/80 pb-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight flex items-center gap-2.5">
            <Tag className="h-7 w-7 text-red-600" />
            <span>العروض والخصومات</span>
          </h1>
        </div>
      </div>



      {/* Dynamic Main and Sub Categories Section (DESKTOP ONLY - Hidden on Mobile) */}
      {mainCategories.length > 0 && (
        <div className="hidden lg:flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-[#2d2a26]">تصفح أقسام العروض الرئيسية</h2>
            </div>
            <div className="flex items-center gap-2">
              {selectedCategory && selectedCategory !== 'الكل' && (
                <button 
                  onClick={() => {
                    setSelectedCategory('الكل');
                    setSelectedSubCategory('');
                  }}
                  className="text-xs font-bold text-stone-500 hover:text-red-600 hover:underline cursor-pointer"
                >
                  إعادة تعيين
                </button>
              )}
              <button
                onClick={() => setIsCategoriesModalOpen(true)}
                className="text-xs sm:text-sm font-black text-[#1a4d2e] hover:text-[#133b22] flex items-center gap-1 bg-[#1a4d2e]/5 hover:bg-[#1a4d2e]/10 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
              >
                <span>عرض الكل</span>
                <span className="text-[10px] sm:text-xs">←</span>
              </button>
            </div>
          </div>

          <div className="relative">
            {/* Left Edge Gradient Affordance for Mobile Scroll */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-[#fdfcfb] to-transparent z-10 sm:hidden" />

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
                        ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-transparent shadow-lg shadow-red-500/25 -translate-y-1' 
                        : 'bg-white text-[#2d2a26] border-[#e5e1da] hover:border-red-500/40 hover:bg-[#fcfbfa] hover:-translate-y-0.5 hover:shadow-md'
                    }`}
                  >
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-2.5 transition-transform group-hover:scale-110 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-red-50 text-red-600'
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
                        ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-transparent shadow-lg shadow-red-500/25 -translate-y-1' 
                        : 'bg-white text-[#2d2a26] border-[#e5e1da] hover:border-red-500/40 hover:bg-[#fcfbfa] hover:-translate-y-0.5 hover:shadow-md'
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
          
          {/* Sub Categories (Shows only when a main category is selected) */}
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
                            ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-transparent shadow-md shadow-red-500/10'
                            : 'bg-white text-stone-600 border-[#e5e1da] hover:border-red-300 hover:bg-stone-50'
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
                              ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-transparent shadow-md shadow-red-500/10'
                              : 'bg-white text-stone-600 border-[#e5e1da] hover:border-red-300 hover:bg-stone-50'
                          }`}
                        >
                          {subCat}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#fdfcfb] to-transparent z-10 sm:hidden" />
                      <div className="flex flex-nowrap overflow-x-auto gap-2 sm:gap-2.5 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide snap-x items-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <button
                          onClick={() => setSelectedSubCategory('')}
                          className={`snap-start shrink-0 whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 border cursor-pointer ${
                            selectedSubCategory === ''
                              ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-transparent shadow-md shadow-red-500/10'
                              : 'bg-white text-stone-600 border-[#e5e1da] hover:border-red-300 hover:bg-stone-50'
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
                                ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-transparent shadow-md shadow-red-500/10'
                                : 'bg-white text-stone-600 border-[#e5e1da] hover:border-red-300 hover:bg-stone-50'
                            }`}
                          >
                            {subCat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Fixed circular expand/collapse button */}
                <button
                  onClick={() => setIsSubCategoriesExpanded(!isSubCategoriesExpanded)}
                  className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-stone-200 hover:border-orange-500/40 hover:bg-stone-50 text-stone-600 hover:text-stone-900 shadow-xs flex items-center justify-center transition-all duration-300 cursor-pointer"
                  title={isSubCategoriesExpanded ? "عرض كشريط أفقي" : "تمديد للأسفل"}
                  aria-label={isSubCategoriesExpanded ? "عرض كشريط أفقي" : "تمديد للأسفل"}
                >
                  <ChevronDown className={`h-4.5 w-4.5 sm:h-5 sm:w-5 transition-transform duration-300 ${isSubCategoriesExpanded ? 'rotate-180 text-orange-600' : ''}`} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results Info Bar for Desktop */}
      <div className="hidden lg:flex items-center justify-between text-xs text-stone-400 font-bold max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
        <span>تصفح العروض والخصومات</span>
        <span>عدد العناصر: <strong className="text-red-700">{filteredOffers.length}</strong></span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <OfferCardSkeleton key={idx} />
          ))}
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-stone-200 p-8 shadow-xs max-w-2xl mx-auto space-y-4">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto">
            <Gift className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-black text-stone-800">لا توجد عروض متاحة حالياً</h3>
          <p className="text-stone-500 text-sm max-w-md mx-auto">
            لم يتم إدراج عروض أو خصومات نشطة في الوقت الحالي. إذا كنت تملك محلاً تجارياً، يمكنك أن تكون أول من يضيف عرضاً لزبائنك!
          </p>
          {hasBusiness && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-orange-500 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>أعلن عن عرض محلك الآن</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Results Info Bar for Mobile with Grid / List View Toggle */}
          <div className="lg:hidden flex items-center justify-between text-xs font-bold text-stone-600 bg-stone-100/80 px-3 py-1.5 rounded-xl">
            <span className="flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-red-600" />
              <span>النتائج: <strong className="text-red-700">{filteredOffers.length}</strong></span>
            </span>

            {/* Grid / List View Toggle */}
            <div className="flex items-center bg-white p-0.5 rounded-lg shrink-0 border border-stone-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setMobileViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                  mobileViewMode === 'grid' ? 'bg-red-600 text-white shadow-xs' : 'text-stone-500 hover:text-stone-800'
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
                  mobileViewMode === 'list' ? 'bg-red-600 text-white shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
                title="عرض قائمة"
                aria-label="عرض قائمة"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div>
            <div 
              id="offers-grid" 
              className={
                mobileViewMode === 'list'
                  ? "flex flex-col gap-2.5 sm:gap-4"
                  : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8"
              }
            >
            {filteredOffers
              .slice((currentPage - 1) * 15, currentPage * 15)
              .flatMap((offer, idx) => {
                const durationText = renderOfferDurationText(offer);
                const isExpired = offer.expiresAt && offer.expiresAt <= Date.now() && offer.durationMode !== 'recurring_weekly';
                const isUrgent = offer.expiresAt && (offer.expiresAt - Date.now() < 24 * 3600 * 1000) && offer.durationMode !== 'recurring_weekly';

                const parentBiz = (offer.businessId && businessMap[offer.businessId]) || (offer.businessName && businessMap[String(offer.businessName).trim().toLowerCase()]);
                const isFeaturedOffer = isItemCurrentlyFeatured(offer, parentBiz);

                // =========================================================================
                // MOBILE LIST VIEW CARD (Horizontal App Row Layout)
                // =========================================================================
                const offerCardNode = mobileViewMode === 'list' ? (
                    <div 
                      key={offer.id}
                      className={cn(
                        "bg-white rounded-2xl p-3 flex flex-col gap-2.5 relative overflow-hidden transition-all",
                        isFeaturedOffer
                          ? "border-2 border-amber-400/90 ring-2 ring-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.55)] hover:border-amber-400"
                          : "border border-stone-200/80 shadow-2xs hover:shadow-md"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Thumbnail Image with Discount Badge */}
                        <Link 
                          to={`/offers/${offer.id}`} 
                          className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-stone-100 shrink-0 block cursor-pointer"
                        >
                          <img 
                            src={offer.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800'} 
                            alt={offer.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1 right-1 bg-amber-400 text-stone-900 font-black text-[10px] px-1.5 py-0.5 rounded-md shadow-xs">
                            -{offer.discountPercentage}
                          </div>
                        </Link>

                        {/* Middle Info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isFeaturedOffer && (
                              <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-yellow-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1 w-fit border border-amber-300/60 shrink-0">
                                <Crown className="h-3 w-3 fill-current shrink-0 text-amber-950" />
                                <span>ممول</span>
                              </span>
                            )}
                            <span className="text-[10px] font-black text-red-700 bg-red-50 border border-red-200/80 px-2 py-0.5 rounded-md">
                              {offer.category}
                            </span>
                            {offer.isHot && (
                              <span className="bg-red-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Flame className="h-2.5 w-2.5 fill-white" />
                                <span>ساخن</span>
                              </span>
                            )}
                            {offer.isStudent && (
                              <span className="bg-blue-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                <Gift className="h-2.5 w-2.5" />
                                <span>طلابي</span>
                              </span>
                            )}
                          </div>

                          <Link to={`/offers/${offer.id}`} className="block">
                            <h3 className="text-xs sm:text-sm font-black text-stone-900 truncate leading-snug">
                              {offer.title}
                            </h3>
                          </Link>

                          <div className="flex items-center gap-1 text-[11px] font-bold text-stone-600 truncate">
                            <Store className="h-3 w-3 text-stone-400 shrink-0" />
                            <span className="truncate">{offer.businessName}</span>
                          </div>

                          <p className="text-[10px] text-stone-500 flex items-center gap-1 truncate">
                            <MapPin className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                            <span className="truncate">{offer.location}</span>
                          </p>

                          <div className="flex items-center gap-2 pt-0.5">
                            {offer.newPrice && (
                              <span className="text-sm font-black text-emerald-700">{offer.newPrice}</span>
                            )}
                            {offer.oldPrice && (
                              <span className="text-[10px] text-stone-400 font-bold line-through">{offer.oldPrice}</span>
                            )}
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 border mr-auto",
                              isExpired 
                                ? "text-stone-400 bg-stone-50 border-stone-200"
                                : isUrgent
                                  ? "text-red-600 bg-red-50 border-red-200"
                                  : "text-orange-600 bg-orange-50 border-orange-200/60"
                            )}>
                              <Clock className="h-2.5 w-2.5" />
                              <span>{durationText}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Code Strip in List Mode if available */}
                      {offer.code && (
                        <div className="flex items-center justify-between bg-red-50/80 border border-red-200/70 px-2.5 py-1.5 rounded-xl">
                          <div className="flex items-center gap-1.5">
                            <Tag className="h-3.5 w-3.5 text-red-600" />
                            <span className="text-[11px] font-bold text-stone-700">الكود:</span>
                            <code className="bg-white px-2 py-0.5 rounded-md text-red-600 font-mono font-black text-xs border border-red-200">
                              {offer.code}
                            </code>
                          </div>
                          <button
                            onClick={() => handleCopyCode(offer.code!)}
                            className="bg-white hover:bg-red-600 hover:text-white text-red-600 border border-red-200 px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            {copiedCode === offer.code ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" />
                                <span className="text-emerald-600">تم النسخ</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>نسخ</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Action Buttons in List Mode */}
                      <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
                        <a
                          href={getWhatsAppUrl(offer.whatsapp || offer.phone, formatOfferWhatsAppMessage(offer.title, offer.businessName))}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-2 rounded-xl text-xs font-bold transition-colors shadow-xs"
                        >
                          <WhatsApp3DIcon className="h-3.5 w-3.5 text-white" />
                          <span>واتساب</span>
                        </a>

                        <a
                          href={`tel:${offer.phone}`}
                          className="inline-flex items-center justify-center gap-1 bg-[#1a4d2e] hover:bg-[#133c23] text-white py-1.5 px-3 rounded-xl text-xs font-bold transition-colors shadow-xs"
                        >
                          <Phone3DIcon className="h-3.5 w-3.5 text-white" />
                          <span>اتصال</span>
                        </a>

                        <ShareButton
                          title={`عرض خاص: ${offer.title}`}
                          text={`شاهد عرض (${offer.title}) لدى ${offer.businessName} بخصم ${offer.discountPercentage}!`}
                          url={`/offers`}
                          size="sm"
                          variant="outline"
                        />
                      </div>
                    </div>
                  ) : (
                  <div 
                    key={offer.id}
                    className={cn(
                      "bg-white rounded-3xl overflow-hidden transition-all duration-300 flex flex-col group relative",
                      isFeaturedOffer
                        ? "border-2 border-amber-400/90 ring-2 ring-amber-400/40 shadow-[0_0_22px_rgba(245,158,11,0.3)] hover:shadow-[0_0_35px_rgba(245,158,11,0.55)] hover:border-amber-400"
                        : "border border-stone-200/80 shadow-xs hover:shadow-xl"
                    )}
                  >
                    {/* Badges */}
                    <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 items-start">
                      {isFeaturedOffer && (
                        <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-yellow-950 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1 w-fit border border-amber-300/60">
                          <Crown className="h-3 w-3 fill-current shrink-0 text-amber-950" />
                          <span>ممول</span>
                        </span>
                      )}
                      {offer.isHot && (
                        <span className="bg-red-600 text-white font-black text-[11px] px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                          <Flame className="h-3 w-3 fill-white" />
                          <span>سوبر هُوت</span>
                        </span>
                      )}
                      {offer.isStudent && (
                        <span className="bg-blue-600 text-white font-black text-[11px] px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                          <Gift className="h-3 w-3" />
                          <span>خصم طلابي</span>
                        </span>
                      )}
                    </div>

                    {/* Discount Badge Left */}
                    <div className="absolute top-3 left-3 z-10">
                      <div className="bg-amber-400 text-stone-900 font-black text-sm px-3.5 py-1.5 rounded-2xl shadow-lg border border-amber-300 flex items-center gap-1">
                        <span>خصم {offer.discountPercentage}</span>
                      </div>
                    </div>

                    {/* Offer Image */}
                    <Link to={`/offers/${offer.id}`} className="relative h-48 sm:h-52 w-full overflow-hidden bg-stone-100 block cursor-pointer">
                      <img 
                        src={offer.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800'} 
                        alt={offer.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-3 right-3 left-3 text-white">
                        <span className="text-xs font-bold text-orange-300 block mb-0.5">{offer.businessName}</span>
                        <p className="text-xs text-white/80 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-orange-400" />
                          <span>{offer.location}</span>
                        </p>
                      </div>
                    </Link>

                    {/* Content */}
                    <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                      <Link to={`/offers/${offer.id}`} className="space-y-2 block cursor-pointer">
                        <h3 className="text-base sm:text-lg font-black text-stone-900 group-hover:text-red-600 transition-colors leading-snug">
                          {offer.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-stone-600 line-clamp-2 leading-relaxed">
                          {offer.description}
                        </p>
                      </Link>

                      {/* Price and Coupon Code Box */}
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between bg-stone-50 p-3 rounded-2xl border border-stone-100">
                          <div className="flex items-baseline gap-2">
                            {offer.newPrice && (
                              <span className="text-lg font-black text-emerald-700">{offer.newPrice}</span>
                            )}
                            {offer.oldPrice && (
                              <span className="text-xs text-stone-400 line-through">{offer.oldPrice}</span>
                            )}
                          </div>
                          <span className={cn(
                            "text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 border",
                            isExpired 
                              ? "text-stone-400 bg-stone-50 border-stone-200"
                              : isUrgent
                                ? "text-red-600 bg-red-50 border-red-200 animate-pulse"
                                : "text-orange-600 bg-orange-50 border-orange-200/60"
                          )}>
                            <Clock className="h-3 w-3" />
                            <span>{durationText}</span>
                          </span>
                        </div>

                        {/* Code box */}
                        {offer.code && (
                          <div className="flex items-center justify-between bg-red-50/80 border border-red-200/70 p-2.5 rounded-2xl">
                            <div className="flex items-center gap-2 pr-1">
                              <Tag className="h-4 w-4 text-red-600" />
                              <span className="text-xs font-bold text-stone-700">كود الخصم:</span>
                              <code className="bg-white px-2 py-0.5 rounded-md text-red-600 font-mono font-black text-xs border border-red-200">
                                {offer.code}
                              </code>
                            </div>
                            <button
                              onClick={() => handleCopyCode(offer.code!)}
                              className="bg-white hover:bg-red-600 hover:text-white text-red-600 border border-red-200 px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              {copiedCode === offer.code ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                  <span className="text-emerald-600">تم النسخ</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" />
                                  <span>نسخ</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="p-4 sm:p-5 pt-0 border-t border-stone-100 flex items-center gap-2 mt-auto">
                      <a
                        href={getWhatsAppUrl(offer.whatsapp || offer.phone, formatOfferWhatsAppMessage(offer.title, offer.businessName))}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-3 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                      >
                        <WhatsApp3DIcon className="h-4 w-4 text-white" />
                        <span>استفسار واتساب</span>
                      </a>

                      <a
                        href={`tel:${offer.phone}`}
                        className="inline-flex items-center justify-center gap-1.5 bg-[#1a4d2e] hover:bg-[#133c23] text-white py-2.5 px-3 rounded-xl text-xs font-bold transition-colors shadow-xs"
                        title="اتصال بالمنشأة"
                      >
                        <Phone3DIcon className="h-4 w-4 text-white" />
                        <span>اتصال</span>
                      </a>

                      <ShareButton
                        title={`عرض خاص: ${offer.title}`}
                        text={`شاهد عرض (${offer.title}) لدى ${offer.businessName} بخصم ${offer.discountPercentage}!`}
                        url={`/offers`}
                        size="sm"
                        variant="outline"
                      />
                    </div>

                  </div>
                );

                const currentSlice = filteredOffers.slice((currentPage - 1) * 15, currentPage * 15);
                const shouldInsertPromo0 = (idx === 2 || (idx === currentSlice.length - 1 && currentSlice.length < 3)) && promoCards[0];
                const shouldInsertPromo1 = (idx === 8) && promoCards[1];
                const promoToInsert = shouldInsertPromo0 ? (
                  <InFeedPromoCardItem key={`promo_${promoCards[0].id}_${idx}`} card={promoCards[0]} />
                ) : shouldInsertPromo1 ? (
                  <InFeedPromoCardItem key={`promo_${promoCards[1].id}_${idx}`} card={promoCards[1]} />
                ) : null;

                return promoToInsert ? [offerCardNode, promoToInsert] : [offerCardNode];
              })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredOffers.length / 15)}
            onPageChange={(p) => {
              setCurrentPage(p);
              window.scrollTo({ top: 300, behavior: 'smooth' });
            }}
            totalItems={filteredOffers.length}
            itemsPerPage={15}
          />
        </div>
      </div>
    )}

      {/* Add Offer Modal */}
      {isAddModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100000] bg-stone-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden" dir="rtl">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full max-h-[88dvh] sm:max-h-[85vh] flex flex-col overflow-hidden p-5 sm:p-8 shadow-2xl border border-stone-200 relative my-0 sm:my-auto animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
            
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-1 sm:hidden shrink-0" />

            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-xl shrink-0">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-stone-900">نشر عرض أو خصم خاص بمحلك</h3>
                  <p className="text-xs text-stone-500">ليصل عرضك إلى آلاف الزوار والطلبة في إربد</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 transition-colors shrink-0 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-5 pt-3">
              <p className="text-xs text-stone-600 leading-relaxed bg-amber-50 p-3 rounded-xl border border-amber-200">
                يمكنك نشر عروضك وتخفيضاتك الترويجية مباشرة عبر باقات الاشتراك أو بالتواصل المباشر مع فريق إدارة شو في بإربد لتثبيت عرضك في الصفحة الرئيسية وقسم العروض.
              </p>

              <div className="space-y-3 pt-2">
                <Link
                  to="/packages"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-full flex items-center justify-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white py-3 px-4 rounded-xl font-bold text-sm shadow-xs transition-colors"
                >
                  <Sparkles className="h-4 w-4 text-yellow-300" />
                  <span>تصفح باقات العروض والترويج</span>
                </Link>
                
                <Link
                  to="/contact"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-full flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 py-3 px-4 rounded-xl font-bold text-sm transition-colors"
                >
                  <Store className="h-4 w-4 text-stone-500" />
                  <span>تواصل مع الإدارة لإضافة عرضك</span>
                </Link>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Categories Modal */}
      <CategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        categories={categories}
        selectedCategory={selectedCategory === 'الكل' ? '' : selectedCategory}
        onSelectCategory={(catName) => {
          setSelectedCategory(catName || 'الكل');
          setSelectedSubCategory('');
        }}
      />

      {/* FLOATING SEARCH BAR OVERLAY */}
      {isFloatingSearchOpen && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-xl z-[200] px-4 hidden lg:block animate-in fade-in slide-in-from-bottom-5 duration-300">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (desktopSearchInput.trim()) {
                navigate(`/search?q=${encodeURIComponent(desktopSearchInput.trim())}&tab=offers`);
              }
            }}
            className="relative shadow-2xl rounded-full"
          >
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 pointer-events-none" />
            <input
              type="search"
              enterKeyHint="search"
              placeholder="ابحث عن عرض، تخفيض، كوبون..."
              value={desktopSearchInput}
              onChange={(e) => setDesktopSearchInput(e.target.value)}
              className="w-full pl-14 pr-13 py-3.5 bg-white border-2 border-red-600 rounded-full text-sm font-bold placeholder:text-stone-400 focus:outline-none focus:ring-4 focus:ring-red-600/15 shadow-2xl transition-all"
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
        <div className="fixed bottom-8 right-28 w-[380px] max-h-[calc(100vh-5rem)] overflow-y-auto bg-white rounded-2xl border-2 border-red-600/80 shadow-2xl p-5 z-[200] hidden lg:block animate-in fade-in slide-in-from-bottom-5 duration-300 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
            <h4 className="font-black text-sm text-stone-900">تصفية العروض والخصومات</h4>
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
            {/* Filter Type Selector (Segmented) */}
            <div className="space-y-1.5">
              <span className="font-black text-stone-850 flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-red-600" />
                <span>نوع العرض:</span>
              </span>
              <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200/60 w-full justify-between">
                {[
                  { id: 'all', label: 'كافة العروض' },
                  { id: 'hot', label: 'عروض ساخنة' },
                  { id: 'student', label: 'طلابي' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFilterType(t.id as any)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterType === t.id
                        ? 'bg-red-600 text-white shadow-xs font-black'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="space-y-1.5">
              <span className="font-black text-stone-850 flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-stone-500" />
                <span>الترتيب حسب:</span>
              </span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2.5 px-3 font-black text-stone-800 focus:outline-none focus:border-red-600 cursor-pointer"
              >
                <option value="default">الافتراضي</option>
                <option value="discount_desc">الأعلى خصماً</option>
                <option value="newest">الأحدث</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTONS */}
      <div className="fixed bottom-8 right-8 z-[200] hidden lg:flex flex-col gap-3">
        {/* Floating Add Offer Button */}
        <button
          onClick={() => {
            setIsFloatingFilterOpen(false);
            setIsFloatingSearchOpen(false);
            setIsAddModalOpen(true);
          }}
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl border cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 bg-[#ff9f1c] hover:bg-[#f08f0c] border-[#ff9f1c] text-stone-950"
          title="أعلن عن عرض أو خصم جديد"
          aria-label="أعلن عن عرض أو خصم جديد"
        >
          <Plus className="h-6 w-6 stroke-[2.5]" />
        </button>

        {/* Floating Filter Button */}
        <button
          onClick={() => {
            setIsFloatingFilterOpen(!isFloatingFilterOpen);
            setIsFloatingSearchOpen(false);
          }}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl border cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 ${
            isFloatingFilterOpen
              ? 'bg-red-600 border-red-600 text-white ring-4 ring-red-600/20'
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
              : 'bg-red-600 border-red-600 text-white hover:bg-red-700'
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

export default Offers;
