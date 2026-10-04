import { useEffect, useState, useRef, useMemo } from 'react';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Business, HomepageBanner } from '../types';
import { Link, useSearchParams, useNavigate } from 'react-router';
import { getAppConfig, DEMO_SEED_DATA } from '../lib/demoDataHelper';
import { BusinessCard } from '../components/BusinessCard';
import { BusinessCardSkeleton } from '../components/common/Skeleton';
import { BannerSlideshow } from '../components/BannerSlideshow';
import { BUSINESS_CATEGORIES } from '../lib/categories';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { RegionDropdownFilter } from '../components/RegionDropdownFilter';
import { getLiveWorkingStatus } from '../lib/businessHoursHelper';
import { DynamicSmartSuggestions } from '../components/DynamicSmartSuggestions';
import { SEO } from '../components/common/SEO';
import { CategoriesModal } from '../components/CategoriesModal';
import { Pagination } from '../components/common/Pagination';
import { CategoryButtonLabel } from '../components/CategoryButtonLabel';
import { BlurredVerticalTextScroller } from '../components/common/BlurredVerticalTextScroller';
import { getCachedBusinesses, setCachedBusinesses, getCachedBanners, setCachedBanners, isBusinessesCacheFresh } from '../lib/dataCache';
import { BOOK_YOUR_AD_BANNER } from '../lib/pageBanners';
import { compareBusinessesByTier, isBusinessCurrentlyFeatured } from '../lib/vipHelper';
import { fetchPagePromoCards } from '../lib/promoCards';
import { InFeedPromoCardItem } from '../components/common/InFeedPromoCardItem';
import { InFeedPromoCard } from '../types';
import { cn } from '../lib/utils';
import { 
  MapPin, Star, Search, Store, Filter, X,
  LayoutGrid, UtensilsCrossed, Coffee, CakeSlice, 
  BookOpen, Building2, Landmark, HeartPulse, 
  Shirt, Smartphone, ShoppingCart, Scissors, Dumbbell, Car, Sparkles,
  Heart, Compass, Crown, TrendingUp, Clock, SlidersHorizontal,
  Hammer, Sprout, GraduationCap, Laptop, ChevronDown
} from 'lucide-react';


import { getCategoryMeta } from '../lib/categoryMeta';
export { getCategoryMeta };

// Arabic Text Normalization helper for advanced NLP search
export function normalizeArabic(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    // Normalize Alef, Hamza, etc.
    .replace(/[أإآ]/g, "ا")
    // Normalize Taa Marbouta to Haa
    .replace(/ة/g, "ه")
    // Normalize Yaa / Alif Maqsurah to Yaa
    .replace(/[ىي]/g, "ي")
    // Strip Arabic diacritics (harakat)
    .replace(/[\u064B-\u065F]/g, "")
    // Strip common punctuation
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
    .trim();
}

// Advanced Synonym Map for smart query expansion & semantic linkage
export const SYNONYM_MAP: { [key: string]: string[] } = {
  "دكتور": ["طبيب", "عياده", "مستشفى", "صحه", "اسنان", "جلديه", "اطفال", "قلب", "رويال", "بصريات", "مختبر"],
  "طبيب": ["دكتور", "عياده", "مستشفى", "صحه", "رويال", "اسنان", "استشاري"],
  "اسنان": ["دكتور", "طبيب", "عياده", "مركز", "تقويم", "اسنان"],
  "اكل": ["مطعم", "شاورما", "برجر", "بيتزا", "وجبات", "فطور", "غداء", "عشاء", "اكلات", "طعام", "مشاوي", "سناكات"],
  "جوعان": ["مطعم", "شاورما", "برجر", "بيتزا", "وجبات", "اكل", "طعام", "سندويش", "مشاوي"],
  "مطعم": ["اكل", "وجبات", "شاورما", "برجر", "بيتزا", "سندويش", "طعام", "مشاوي", "فلافل", "حمص"],
  "قهوه": ["كافيه", "مقهى", "دراسه", "نسكافيه", "شاي", "جلسه", "مشروبات", "اسبريسو", "لاتيه"],
  "كافيه": ["قهوه", "مقهى", "دراسه", "جلسات", "حلويات", "شاي", "مشروبات", "عصائر"],
  "دراسه": ["كافيه", "مكتبه", "مقهى", "جامعه", "كتب", "دراسي", "هدوء", "قرطاسيه"],
  "حلويات": ["كنافه", "كيك", "حلو", "مخبز", "معجنات", "ايس كريم", "عصائر", "وافل", "كريب"],
  "عصائر": ["كوكتيل", "عصير", "ايس كريم", "انتعاش", "مشروبات", "كافيه"],
  "كيك": ["حلويات", "كعك", "مخبز", "معجنات", "تورتات", "حلويات"],
  "وافل": ["كريب", "بان كيك", "شوكولاته", "حلويات", "كافيه"],
  "سكن": ["شقه", "طلاب", "طالبات", "ايجار", "غرف", "شقق", "عقار", "استوديو", "جامعه"],
  "شقه": ["سكن", "طلاب", "طالبات", "ايجار", "شقق", "مفروشه"],
  "ملابس": ["ازياء", "بوتيك", "فساتين", "خياط", "رجالي", "نسائي", "احذيه", "موضه", "حقائب"],
  "عطور": ["هدايا", "بخور", "مكياج", "تجميل", "ساعات", "اكسسوارات"],
  "صالون": ["حلاق", "تجميل", "كوافير", "عنايه", "بشره", "شعر"],
  "رياضه": ["جيم", "نادي", "لياقه", "حديد", "مسبح", "فتنس"],
  "دراجه": ["بسكليت", "تصليح", "قطع", "موتور", "سكوتر"],
  "سياره": ["تأجير", "تصليح", "ميكانيك", "غسيل", "سيارات", "قطع غيار", "كراج", "بناشر"],
  "غسيل": ["سياره", "تلميع", "سيارات", "تنظيف", "كراج"],
  "تصليح": ["صيانه", "ميكانيك", "كهرباء", "سيارات", "هواتف", "كراج"],
  "صيدليه": ["دواء", "علاج", "طبي", "صحه", "رويال", "فيتامينات", "طوارئ"],
  "نجار": ["نجاره", "منجره", "خشب", "مطبخ", "مطابخ", "ابواب", "مفروشات", "تنجيد", "اثاث", "صيانة", "حرف"],
  "حداد": ["حداده", "حديد", "محدده", "تشكيل معادن", "ابواب", "شبابيك", "درابزين", "صيانة", "حرف"],
  "حجر": ["محاجر", "مصانع", "رخام", "سيراميك", "بلاط", "طوب", "خرسانه", "بناء", "انشاءات", "كساره", "مقلع"],
  "مياه": ["تنقيه", "مياه شرب", "فلتر", "فلاتر", "محطه مياه", "تصفيه", "شرب"],
  "دجاج": ["دواجن", "نتفات", "مسلخ", "ملحمه", "لحوم", "طازج", "بيض"],
  "لحم": ["ملحمه", "ملاحم", "قصاب", "خروف", "عجل", "طازج", "دواجن", "دجاج", "مجمدات"],
  "اناره": ["اضاءه", "ثريات", "كهرباء", "لمبات", "اضويه"],
  "كشك": ["اكشاك", "قهوه", "درايف ثرو", "شاي", "نسكافيه"],
  "بوظه": ["ايس كريم", "عصير", "جيلاتو", "سلاش"]
};

export function Home() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userFavorites } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>(() => getCachedBusinesses() || []);
  const [banners, setBanners] = useState<HomepageBanner[]>(() => getCachedBanners() || []);
  const [promoCards, setPromoCards] = useState<InFeedPromoCard[]>([]);
  const [loading, setLoading] = useState(() => !getCachedBusinesses());
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '');
  const [heroSearchInput, setHeroSearchInput] = useState(() => searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subCategoryFilter, setSubCategoryFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [error, setError] = useState('');
  const [openNowFilter, setOpenNowFilter] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'featured' | 'popular' | 'recent'>('all');
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isSubCategoriesExpanded, setIsSubCategoriesExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Mobile Sticky Header & Filters States
  const [stickySearchInput, setStickySearchInput] = useState('');
  const [desktopSearchInput, setDesktopSearchInput] = useState('');
  const [isFloatingSearchOpen, setIsFloatingSearchOpen] = useState(false);
  const [isFloatingFilterOpen, setIsFloatingFilterOpen] = useState(false);
  const [showDesktopFloating, setShowDesktopFloating] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isPastFirstCard, setIsPastFirstCard] = useState(false);
  const [isAtFooter, setIsAtFooter] = useState(false);
  const listingsSectionRef = useRef<HTMLDivElement>(null);

  const activeMobileCatRef = useRef<HTMLButtonElement | null>(null);
  const activeMobileSubCatRef = useRef<HTMLButtonElement | null>(null);
  const activeListingCatRef = useRef<HTMLButtonElement | null>(null);

  // Helper to scroll element into center horizontally within its scroll container without scrolling page vertically
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

  // Auto scroll selected main category into view across mobile sticky header and listing cards
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollContainerToElement(activeMobileCatRef.current);
      scrollContainerToElement(activeListingCatRef.current);
    }, 100);
    return () => clearTimeout(timer);
  }, [categoryFilter]);

  // Auto scroll selected subcategory into view in mobile sticky header
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollContainerToElement(activeMobileSubCatRef.current);
    }, 120);
    return () => clearTimeout(timer);
  }, [subCategoryFilter, categoryFilter]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (categoryFilter) count++;
    if (subCategoryFilter) count++;
    if (regionFilter && regionFilter !== 'الكل') count++;
    if (openNowFilter) count++;
    if (favoritesOnly) count++;
    if (activeTab !== 'all') count++;
    return count;
  }, [categoryFilter, subCategoryFilter, regionFilter, openNowFilter, favoritesOnly, activeTab]);

  // Track scroll position to coordinate mobile sticky header and main site header
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // 1. Check if user scrolled past the first business card or reached listings section
          let pastFirst = false;
          let reachedCards = false;
          if (listingsSectionRef.current) {
            const rect = listingsSectionRef.current.getBoundingClientRect();
            pastFirst = rect.top <= 75;
            reachedCards = rect.top <= window.innerHeight * 0.85;
          }

          // 2. Check if user reached the footer
          let atFooter = false;
          const footerEl = document.querySelector('footer');
          if (footerEl) {
            const fRect = footerEl.getBoundingClientRect();
            atFooter = fRect.top <= window.innerHeight - 30;
          }

          setIsPastFirstCard(pastFirst);
          setIsAtFooter(atFooter);
          setShowDesktopFloating(reachedCards);

          // In mobile view (<1024px):
          if (window.innerWidth < 1024) {
            if (pastFirst && !atFooter) {
              // Sticky header active -> hide main site header
              window.dispatchEvent(new CustomEvent('app-header-visibility', { detail: { visible: false } }));
            } else {
              // Sticky header inactive (at top or at footer) -> show main site header
              window.dispatchEvent(new CustomEvent('app-header-visibility', { detail: { visible: true } }));
            }
          }

          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.dispatchEvent(new CustomEvent('app-header-visibility', { detail: { visible: true } }));
    };
  }, [loading, businesses.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, subCategoryFilter, regionFilter, ratingFilter, openNowFilter, favoritesOnly, activeTab, searchTerm]);

  useEffect(() => {
    const qParam = searchParams.get('search');
    if (qParam !== null && qParam !== undefined) {
      setSearchTerm(qParam);
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchBusinesses() {
      if (!db) {
        setError('يرجى إعداد قاعدة بيانات Firebase أولاً (انظر ملف .env.example)');
        setLoading(false);
        return;
      }

      fetchPagePromoCards('home').then(cards => setPromoCards(cards)).catch(() => {});

      // If we already have fresh cached data, use it immediately and skip Firestore read
      const cached = getCachedBusinesses();
      const isFresh = isBusinessesCacheFresh();
      if (cached && cached.length > 0) {
        setBusinesses(cached);
        const cachedB = getCachedBanners();
        if (cachedB) setBanners(cachedB);
        setLoading(false);
        if (isFresh) {
          return;
        }
      }
      
      try {
        const appConfig = await getAppConfig();
        const q = query(collection(db, 'businesses'), orderBy('createdAt', 'desc'), limit(150));
        const bannersQuery = query(collection(db, 'banners'), limit(50));

        const [querySnapshot, bannersSnap] = await Promise.all([
          getDocs(q),
          getDocs(bannersQuery).catch(bErr => {
            console.warn("Could not fetch banners:", bErr);
            return null;
          })
        ]);

        const fetchedBusinesses: Business[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.isHidden) {
            return;
          }
          // Filter out unpublished/pending/rejected businesses
          if (data.status === 'pending' || data.status === 'rejected') {
            return;
          }
          // Allow demo data if showDemoData is true or if not explicitly disabled
          if (appConfig.showDemoData === false && data.isDemo) {
            return;
          }
          fetchedBusinesses.push({ id: docSnap.id, ...data } as Business);
        });

        // Fallback: If no businesses exist in Firestore, show DEMO_SEED_DATA businesses so Home Page is never empty
        if (fetchedBusinesses.length === 0) {
          DEMO_SEED_DATA.businesses.forEach((b, idx) => {
            fetchedBusinesses.push({ id: `demo-b-${idx}`, ...b } as Business);
          });
        }

        setBusinesses(fetchedBusinesses);
        setCachedBusinesses(fetchedBusinesses);

        // Create lookup maps for live business data
        const validBusinessIds = new Set(fetchedBusinesses.map(b => b.id));
        const businessById = new Map<string, Business>();
        const businessByUsername = new Map<string, Business>();
        fetchedBusinesses.forEach(b => {
          businessById.set(b.id, b);
          if (b.username && b.username.trim()) {
            businessByUsername.set(b.username.trim().toLowerCase(), b);
          }
        });

        // Process custom banners from fetched bannersSnap
        if (bannersSnap) {
          const activeBanners: HomepageBanner[] = [];
          
          bannersSnap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.active) {
              const now = Date.now();
              const startsOk = !data.bannerStartDate || data.bannerStartDate <= now;
              const endsOk = !data.bannerExpiryDate || data.bannerExpiryDate > now;
              const pageOk = !data.pageTarget || data.pageTarget === 'home' || data.pageTarget === 'all';
              
              if (!pageOk) {
                return;
              }
              
              // Skip banner if its associated business has been deleted or hidden
              if (data.businessId && !validBusinessIds.has(data.businessId)) {
                return;
              }
              if (data.type === 'business' && data.businessId && !validBusinessIds.has(data.businessId)) {
                return;
              }
              if (data.buttonLink && data.buttonLink.includes('/business/')) {
                const parts = data.buttonLink.split('/business/');
                if (parts[1]) {
                  const targetBizId = parts[1].split('?')[0].split('#')[0];
                  if (targetBizId && !validBusinessIds.has(targetBizId)) {
                    return;
                  }
                }
              }

              if (startsOk && endsOk) {
                const bannerObj = { id: docSnap.id, ...data } as HomepageBanner;
                
                // Identify target business (by businessId or buttonLink) to guarantee live accurate ratings and details
                let linkedBusiness: Business | undefined = undefined;
                if (bannerObj.businessId && businessById.has(bannerObj.businessId)) {
                  linkedBusiness = businessById.get(bannerObj.businessId);
                } else if (bannerObj.buttonLink) {
                  if (bannerObj.buttonLink.includes('/business/')) {
                    const parts = bannerObj.buttonLink.split('/business/');
                    const bId = parts[1]?.split('?')[0]?.split('#')[0];
                    if (bId && businessById.has(bId)) {
                      linkedBusiness = businessById.get(bId);
                    }
                  } else if (bannerObj.buttonLink.includes('/@')) {
                    const parts = bannerObj.buttonLink.split('/@');
                    const uName = parts[1]?.split('?')[0]?.split('#')[0]?.toLowerCase();
                    if (uName && businessByUsername.has(uName)) {
                      linkedBusiness = businessByUsername.get(uName);
                    }
                  }
                }

                // If linked to a business, sync actual live rating and review count from verified store data
                if (linkedBusiness) {
                  bannerObj.businessId = linkedBusiness.id;
                  if (linkedBusiness.username && linkedBusiness.username.trim()) {
                    bannerObj.businessUsername = linkedBusiness.username.trim();
                  }
                  if (typeof linkedBusiness.rating === 'number' && !isNaN(linkedBusiness.rating) && linkedBusiness.rating > 0) {
                    bannerObj.rating = linkedBusiness.rating;
                  } else {
                    bannerObj.rating = 0;
                  }
                  bannerObj.reviewCount = (typeof linkedBusiness.reviewCount === 'number' && !isNaN(linkedBusiness.reviewCount)) ? linkedBusiness.reviewCount : 0;
                  
                  if (!bannerObj.address && linkedBusiness.address) {
                    bannerObj.address = linkedBusiness.district ? `${linkedBusiness.district} - ${linkedBusiness.address}` : linkedBusiness.address;
                  }
                  if (!bannerObj.category && linkedBusiness.category) {
                    bannerObj.category = linkedBusiness.category;
                  }
                  if (!bannerObj.businessName && linkedBusiness.name) {
                    bannerObj.businessName = linkedBusiness.name;
                  }
                }
                
                // Rewrite buttonLink if it points to /business/ID and that business has a username
                if (bannerObj.buttonLink && bannerObj.buttonLink.includes('/business/')) {
                  const parts = bannerObj.buttonLink.split('/business/');
                  if (parts[1]) {
                    const targetBizId = parts[1].split('?')[0].split('#')[0];
                    if (targetBizId && businessById.has(targetBizId)) {
                      const username = businessById.get(targetBizId)?.username;
                      if (username && username.trim()) {
                        bannerObj.buttonLink = bannerObj.buttonLink.replace(`/business/${targetBizId}`, `/@${username.trim()}`);
                      }
                    }
                  }
                }
                
                activeBanners.push(bannerObj);
              }
            }
          });

          // Sort custom banners by newest first
          activeBanners.sort((a, b) => b.createdAt - a.createdAt);

          const finalBanners = activeBanners.length > 0 ? activeBanners : [BOOK_YOUR_AD_BANNER];
          setBanners(finalBanners);
          setCachedBanners(finalBanners);
        } else {
          setBanners([BOOK_YOUR_AD_BANNER]);
        }
      } catch (err: any) {
        console.warn("Could not fetch businesses from Firestore:", err);
        const cached = getCachedBusinesses();
        if (cached && cached.length > 0) {
          setBusinesses(cached);
        } else if (DEMO_SEED_DATA?.businesses) {
          const fallbackBiz = DEMO_SEED_DATA.businesses.map((b, idx) => ({
            id: `biz-demo-${idx + 1}`,
            ...b
          })) as Business[];
          setBusinesses(fallbackBiz);
        }
        if (!cached || cached.length === 0) {
          if (err?.message?.includes('Missing or insufficient permissions')) {
            console.info("Firestore Rules Note: Make sure the rules in firestore.rules are published to Firebase Console and App Check allows this domain.");
          } else {
            setError(`حدث خطأ أثناء جلب البيانات: ${err?.message || 'مشكلة غير معروفة'}.`);
          }
        }
      } finally {
        setLoading(false);
      }
    }

    fetchBusinesses();
  }, []);

  const { categories, globalSettings, neighborhoods } = useSystemSettings();
  const heroStyle = globalSettings?.heroSectionStyle || 'wheel_box';
  const mainCategories = categories.map(c => c.name);
  
  const getSubCats = (catName: string) => categories.find(c => c.name === catName)?.subcategories || [];
  
  const isFiltering = searchTerm || categoryFilter || regionFilter || ratingFilter || subCategoryFilter || openNowFilter || favoritesOnly;

  // 1. Calculate map of business ID -> search score & matchReasons for advanced search weighting
  const searchScoreMap: { [id: string]: { score: number, reasons: string[] } } = {};
  
  businesses.forEach(b => {
    const normQuery = normalizeArabic(searchTerm);
    if (!normQuery) {
      searchScoreMap[b.id] = { score: 1, reasons: [] };
      return;
    }

    const queryWords = normQuery.split(/\s+/).filter(Boolean);
    let score = 0;
    const matchReasons: string[] = [];

    const normName = normalizeArabic(b.name || "");
    const normDesc = normalizeArabic(b.description || "");
    const normCat = normalizeArabic(b.category || "");
    const normDistrict = normalizeArabic(b.district || "");
    const normAddress = normalizeArabic(b.address || "");

    // Exact full name match (highest priority)
    if (normName === normQuery) {
      score += 100;
      matchReasons.push("اسم مطابق تماماً");
    } else if (normName.includes(normQuery)) {
      score += 60;
      matchReasons.push("الاسم يحتوي على البحث");
    }

    queryWords.forEach(word => {
      if (word.length < 2) return;

      if (normName.includes(word)) {
        score += 30;
        if (!matchReasons.includes("الاسم")) matchReasons.push("الاسم");
      }

      if (normCat.includes(word)) {
        score += 25;
        if (!matchReasons.includes("القسم")) matchReasons.push("القسم");
      }

      if (normDistrict.includes(word) || normAddress.includes(word)) {
        score += 15;
        if (!matchReasons.includes("الموقع الجغرافي")) matchReasons.push("الموقع الجغرافي");
      }

      if (normDesc.includes(word)) {
        score += 10;
        if (!matchReasons.includes("تفاصيل المنشأة")) matchReasons.push("تفاصيل المنشأة");
      }

      // Synonym mapping expansion
      Object.entries(SYNONYM_MAP).forEach(([key, synonyms]) => {
        const normKey = normalizeArabic(key);
        if (word === normKey) {
          synonyms.forEach(syn => {
            const normSyn = normalizeArabic(syn);
            if (normName.includes(normSyn) || normDesc.includes(normSyn) || normCat.includes(normSyn)) {
              score += 18;
              const reason = `مرادف لـ (${key})`;
              if (!matchReasons.includes(reason)) matchReasons.push(reason);
            }
          });
        }
      });
    });

    searchScoreMap[b.id] = { score, reasons: matchReasons };
  });

  const filteredBusinesses = businesses.filter(b => {
    const matchesSearch = searchTerm ? (searchScoreMap[b.id]?.score > 0) : true;
    
    let matchesCategory = true;
    if (categoryFilter) {
      const validSubCats = getSubCats(categoryFilter);
      const bizCat = b.category || "";
      const bizSubCat = (b as any).subCategory || (b as any).subcategory || "";

      if (subCategoryFilter) {
        if (subCategoryFilter.includes('أسنان') || subCategoryFilter.includes('اسنان')) {
          matchesCategory = bizCat.includes('أسنان') || bizCat.includes('اسنان') || bizSubCat.includes('أسنان') || bizSubCat.includes('اسنان');
        } else if (subCategoryFilter.includes('مستشفيات')) {
          matchesCategory = bizCat.includes('مستشف') || bizSubCat.includes('مستشف');
        } else if (subCategoryFilter.includes('صيدل')) {
          matchesCategory = bizCat.includes('صيدل') || bizSubCat.includes('صيدل');
        } else if (subCategoryFilter.includes('مختبر')) {
          matchesCategory = bizCat.includes('مختبر') || bizCat.includes('أشعة') || bizCat.includes('بصر') || bizSubCat.includes('مختبر');
        } else if (subCategoryFilter.includes('عيادات أطباء')) {
          matchesCategory = (bizCat.includes('عياد') || bizCat.includes('طبيب') || bizCat.includes('دكتور')) && !bizCat.includes('أسنان') && !bizCat.includes('اسنان') && !bizCat.includes('بيطر');
        } else if (subCategoryFilter.includes('علاج طبيعي')) {
          matchesCategory = bizCat.includes('علاج') || bizSubCat.includes('علاج');
        } else if (subCategoryFilter.includes('بيطر')) {
          matchesCategory = bizCat.includes('بيطر') || bizSubCat.includes('بيطر');
        } else {
          matchesCategory = bizCat === subCategoryFilter || bizSubCat === subCategoryFilter;
        }
      } else {
        if (categoryFilter.includes('صحة وطب')) {
          matchesCategory = bizCat.includes('صحة') || bizCat.includes('طب') || bizCat.includes('عياد') || bizCat.includes('مستشف') || bizCat.includes('صيدل') || bizCat.includes('مختبر') || bizCat.includes('علاج') || bizCat.includes('أسنان') || bizCat.includes('اسنان') || bizCat.includes('بيطر') || validSubCats.includes(bizCat);
        } else {
          matchesCategory = bizCat === categoryFilter || validSubCats.includes(bizCat) || validSubCats.includes(bizSubCat);
        }
      }
    }
    
    const matchesRegion = (regionFilter && regionFilter !== 'الكل') 
      ? (b.district === regionFilter || (b.address || "").includes(regionFilter)) 
      : true;
    const matchesRating = ratingFilter ? (b.rating || 0) >= parseFloat(ratingFilter) : true;

    let matchesOpenNow = true;
    if (openNowFilter) {
      const status = getLiveWorkingStatus(b.workingHours);
      matchesOpenNow = status.isOpen;
    }

    let matchesFavorites = true;
    if (favoritesOnly) {
      matchesFavorites = userFavorites.includes(b.id);
    }

    return matchesSearch && matchesCategory && matchesRegion && matchesRating && matchesOpenNow && matchesFavorites;
  });

  // Calculate displayed businesses with dynamic sorting/filtering from tabs
  let displayedBusinesses = [...filteredBusinesses];
  const now = Date.now();

  if (searchTerm) {
    // Sort strictly: Featured -> Golden VIP -> Rest (with relevance search score as secondary sort)
    displayedBusinesses = displayedBusinesses.sort((a, b) => {
      return compareBusinessesByTier(a, b, (bizA, bizB) => {
        const scoreA = searchScoreMap[bizA.id]?.score || 0;
        const scoreB = searchScoreMap[bizB.id]?.score || 0;
        return scoreB - scoreA;
      }, now);
    });
  } else {
    // Regular tabs sorting if no active search
    if (activeTab === 'featured') {
      displayedBusinesses = displayedBusinesses.filter(b => isBusinessCurrentlyFeatured(b, now));
      displayedBusinesses = displayedBusinesses.sort((a, b) => {
        return compareBusinessesByTier(a, b, undefined, now);
      });
    } else if (activeTab === 'popular') {
      displayedBusinesses = displayedBusinesses.sort((a, b) => {
        // Sort from most views to least views, and then highest rating to lowest rating (regardless of featured/VIP tiers)
        const viewsDiff = (b.views || 0) - (a.views || 0);
        if (viewsDiff !== 0) return viewsDiff;
        return (b.rating || 0) - (a.rating || 0);
      });
    } else if (activeTab === 'recent') {
      displayedBusinesses = displayedBusinesses.sort((a, b) => {
        // Sort from newest to oldest (regardless of featured/VIP tiers)
        const timeA = a.createdAt || 0;
        const timeB = b.createdAt || 0;
        return timeB - timeA;
      });
    } else {
      // Default / 'all' tab: Restore the exact original sorting mechanism (Featured -> Golden VIP -> Rest)
      displayedBusinesses = displayedBusinesses.sort((a, b) => {
        return compareBusinessesByTier(a, b, undefined, now);
      });
    }
  }

  return (
    <div className="space-y-6 md:space-y-10">
      <SEO 
        title="الرئيسية | الدليل الشامل لمدينة ومحافظة إربد"
        description="دليل إربد الأكبر والشامل: استكشف أفضل المطاعم والمقاهي والمحلات التجارية، الوظائف وسوق العمل، سكنات طلاب جامعة اليرموك وجامعة التكنولوجيا، وعروض التسوق في إربد."
        canonicalUrl="https://shofibirbid.site/"
      />
      
      {/* ========================================================================= */}
      {/* MOBILE STICKY APP BAR (Appears ONLY after passing the first business card and before footer) */}
      {/* ========================================================================= */}
      <div 
        className={cn(
          "lg:hidden fixed left-0 right-0 top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/90 shadow-sm px-4 py-2.5 space-y-2 transition-all duration-300",
          (isPastFirstCard && !isAtFooter) ? "translate-y-0 opacity-100 pointer-events-auto" : "-translate-y-full opacity-0 pointer-events-none"
        )}
      >
        {/* Row 1: Search Input & Filter Button */}
        <div className="flex items-center gap-2">
          {/* Integrated Search Input */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (stickySearchInput.trim()) {
                navigate(`/search?q=${encodeURIComponent(stickySearchInput.trim())}`);
              }
            }}
            className="relative flex-1 min-w-0"
          >
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
            <input
              type="search"
              enterKeyHint="search"
              placeholder="عن ماذا تبحث؟"
              value={stickySearchInput}
              onChange={(e) => setStickySearchInput(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-stone-100/90 border border-stone-200 rounded-xl text-xs font-bold placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-[#1a4d2e] transition-all cursor-text"
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
            type="button"
            onClick={() => setIsMobileFilterOpen(true)}
            className="relative px-3 py-2 bg-[#1a4d2e] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
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
            type="button"
            ref={categoryFilter === '' ? activeMobileCatRef : null}
            onClick={() => {
              setCategoryFilter('');
              setSubCategoryFilter('');
            }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
              categoryFilter === ''
                ? 'bg-gradient-to-r from-[#1a4d2e] to-emerald-800 text-white border-transparent shadow-xs font-black'
                : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-300'
            }`}
          >
            <span>الكل</span>
            <span className="text-[10px] opacity-80">({businesses.length})</span>
          </button>

          {/* Main Category Pills */}
          {mainCategories.map((cat) => {
            const isSelected = categoryFilter === cat;
            return (
              <button
                type="button"
                key={cat}
                ref={isSelected ? activeMobileCatRef : null}
                onClick={() => {
                  setCategoryFilter(isSelected ? '' : cat);
                  setSubCategoryFilter('');
                }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#1a4d2e] to-emerald-800 text-white border-transparent shadow-xs font-black'
                    : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-300'
                }`}
              >
                <span>{cat}</span>
              </button>
            );
          })}
        </div>

        {/* Row 3: Subcategory Pills (If Category Selected - Edge-To-Edge Scroll) */}
        {categoryFilter && getSubCats(categoryFilter).length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pt-0.5 pb-1 -mx-2.5 px-2.5 sm:-mx-4 sm:px-4 border-t border-stone-100" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <button
              type="button"
              ref={subCategoryFilter === '' ? activeMobileSubCatRef : null}
              onClick={() => setSubCategoryFilter('')}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                subCategoryFilter === ''
                  ? 'bg-[#1a4d2e] text-white border-transparent font-black'
                  : 'bg-stone-100 text-stone-600 border-stone-200'
              }`}
            >
              الكل الفرعي
            </button>
            {getSubCats(categoryFilter).map((subCat) => (
              <button
                type="button"
                key={subCat}
                ref={subCategoryFilter === subCat ? activeMobileSubCatRef : null}
                onClick={() => setSubCategoryFilter(subCat)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                  subCategoryFilter === subCat
                    ? 'bg-[#1a4d2e] text-white border-transparent font-black'
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
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
          <div 
            className="absolute inset-0"
            onClick={() => setIsMobileFilterOpen(false)}
          />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl border-t border-stone-200 overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Sheet Handle Bar */}
            <div className="pt-3 pb-1 flex justify-center">
              <div className="w-12 h-1.5 bg-stone-300 rounded-full" />
            </div>

            {/* Sheet Header */}
            <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-[#1a4d2e]" />
                <h3 className="font-black text-stone-900 text-base">فلترة وتخصيص المنشآت</h3>
              </div>
              <div className="flex items-center gap-3">
                {activeFiltersCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter('');
                      setSubCategoryFilter('');
                      setRegionFilter('');
                      setOpenNowFilter(false);
                      setFavoritesOnly(false);
                      setActiveTab('all');
                      setSearchTerm('');
                    }}
                    className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                  >
                    إعادة ضبط
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Sheet Body */}
            <div className="p-4 overflow-y-auto space-y-5 text-xs">
              {/* Location / Region Filter */}
              <div className="space-y-2">
                <label className="font-black text-stone-800 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#1a4d2e]" />
                  <span>الموقع أو الحي في إربد</span>
                </label>
                <select
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2.5 px-3 font-bold text-stone-800 focus:outline-none focus:border-[#1a4d2e]"
                >
                  <option value="">جميع مناطق وأحياء إربد</option>
                  {neighborhoods && neighborhoods.map((group) => (
                    <optgroup key={group.groupName} label={group.groupName}>
                      {group.areas.map((area) => (
                        <option key={area} value={area}>{area}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Status Toggles: Open Now & Favorites */}
              <div className="space-y-2">
                <label className="font-black text-stone-800 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#1a4d2e]" />
                  <span>حالة المنشأة والمفضلة</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenNowFilter(!openNowFilter)}
                    className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      openNowFilter
                        ? 'bg-emerald-600 text-white border-transparent shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>مفتوح الآن</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFavoritesOnly(!favoritesOnly)}
                    className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      favoritesOnly
                        ? 'bg-rose-600 text-white border-transparent shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200'
                    }`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${favoritesOnly ? 'fill-white' : ''}`} />
                    <span>المفضلة ({userFavorites.length})</span>
                  </button>
                </div>
              </div>

              {/* Display Tabs Filter */}
              <div className="space-y-2">
                <label className="font-black text-stone-800 flex items-center gap-1.5">
                  <SlidersHorizontal className="h-4 w-4 text-[#1a4d2e]" />
                  <span>تبويبات العرض والترتيب</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'all', label: 'الكل' },
                    { id: 'featured', label: 'المميزة' },
                    { id: 'popular', label: 'الأكثر شعبية' },
                    { id: 'recent', label: 'الأحدث' }
                  ].map((tab) => (
                    <button
                      type="button"
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer ${
                        activeTab === tab.id
                          ? 'bg-[#1a4d2e] text-white border-transparent shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Selector */}
              <div className="space-y-2">
                <label className="font-black text-stone-800 flex items-center gap-1.5">
                  <Store className="h-4 w-4 text-[#1a4d2e]" />
                  <span>التصنيف الرئيسي</span>
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryFilter('');
                      setSubCategoryFilter('');
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                      categoryFilter === ''
                        ? 'bg-[#1a4d2e] text-white border-transparent'
                        : 'bg-stone-50 text-stone-700 border-stone-200'
                    }`}
                  >
                    الكل
                  </button>
                  {mainCategories.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => {
                        setCategoryFilter(c);
                        setSubCategoryFilter('');
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                        categoryFilter === c
                          ? 'bg-[#1a4d2e] text-white border-transparent'
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
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full bg-[#1a4d2e] hover:bg-[#143e24] text-white py-3 rounded-2xl font-black text-sm shadow-md active:scale-98 transition-all cursor-pointer"
              >
                تطبيق الفلترة (عرض {displayedBusinesses.length} منشأة)
              </button>
            </div>
          </div>
        </div>
      )}
      
      

      {/* Dynamic Hero Section according to Admin Control Panel Settings */}
      {heroStyle === 'wheel_box' ? (
        /* 1. Wheel Box Hero Section */
        <BlurredVerticalTextScroller
          config={globalSettings?.wheelBoxConfig}
          className="rounded-2xl md:rounded-[32px] -mt-25 sm:mt-0 md:mt-0 lg:mt-0 -mb-16 sm:-mb-3 lg:mb-2"
          dir="rtl"
        />
      ) : (
        /* 2. Traditional Green Box Hero Section */
        <>
          <div className="w-full max-w-full bg-[#0f3820] rounded-2xl md:rounded-[32px] py-10 md:py-20 px-4 sm:p-6 md:p-16 text-white flex flex-col items-center text-center relative overflow-hidden shadow-2xl shadow-[#1a4d2e]/20 min-h-[350px] md:min-h-[500px] justify-center box-border">
            
            {/* Animated Mesh Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a4d2e] via-[#0f3820] to-[#0a2414] z-0"></div>
            
            {/* Modern Fading Grid (SVG Mask) */}
            <div 
              className="absolute inset-0 z-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm1 1h38v38H1V1z' fill='%23ffffff' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)',
                WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)'
              }}
            ></div>

            {/* Ambient Glow Orbs */}
            <div className="absolute top-0 right-1/4 w-64 h-64 md:w-96 md:h-96 bg-[#ff9f1c] rounded-full blur-[80px] md:blur-[120px] opacity-20 animate-pulse mix-blend-screen pointer-events-none"></div>
            <div className="absolute bottom-0 left-1/4 w-64 h-64 md:w-96 md:h-96 bg-emerald-400 rounded-full blur-[80px] md:blur-[120px] opacity-10 mix-blend-screen pointer-events-none"></div>

            {/* Floating Micro-elements */}
            <div className="absolute top-10 right-10 md:top-20 md:right-32 opacity-20 animate-[bounce_5s_infinite] hidden sm:block pointer-events-none">
              <MapPin className="h-8 w-8 text-white rotate-12" />
            </div>
            <div className="absolute bottom-20 left-10 md:bottom-32 md:left-24 opacity-20 animate-[bounce_6s_infinite_reverse] hidden sm:block pointer-events-none">
              <UtensilsCrossed className="h-10 w-10 text-white -rotate-12" />
            </div>
            <div className="absolute top-32 left-12 md:top-40 md:left-40 opacity-20 animate-[pulse_4s_infinite] hidden lg:block pointer-events-none">
              <Coffee className="h-12 w-12 text-[#ff9f1c] rotate-45" />
            </div>
            <div className="absolute bottom-16 right-12 md:bottom-24 md:right-48 opacity-20 animate-[pulse_5s_infinite] hidden lg:block pointer-events-none">
              <ShoppingCart className="h-10 w-10 text-emerald-300 -rotate-12" />
            </div>
            
            <div className="relative z-10 w-full max-w-3xl mx-auto min-w-0 space-y-4 md:space-y-6">
              {/* Gradient Typography Heading */}
              <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-white tracking-tight leading-tight drop-shadow-lg">
                شو في ب{"\u200D"}<span className="text-[#ff9f1c] inline-block pb-1">{"\u200D"}إربد؟</span>
              </h1>
              
              <p className="text-sm sm:text-base md:text-xl text-emerald-50/80 max-w-2xl mx-auto leading-relaxed px-4 font-medium">
                ابحث عن المطاعم، المقاهي، المحلات التجارية، والخدمات المميزة في مدينتك بكل سهولة وبحث ذكي.
              </p>

              {/* Glassmorphism Search Bar */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (heroSearchInput.trim()) {
                    navigate(`/search?q=${encodeURIComponent(heroSearchInput.trim())}`);
                  }
                }}
                className="mt-6 md:mt-10 w-full max-w-2xl mx-auto min-w-0 relative group"
              >
                <input
                  type="search"
                  enterKeyHint="search"
                  className="block w-full pr-6 pl-24 py-3.5 md:pr-8 md:pl-28 md:py-5 border border-white/20 rounded-2xl md:rounded-[28px] leading-relaxed md:leading-5 bg-white/10 backdrop-blur-xl text-white placeholder-white/70 focus:outline-none focus:ring-4 focus:ring-amber-500/30 focus:border-amber-400/50 focus:bg-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.2)] font-bold text-sm md:text-lg transition-all duration-300 [&::-webkit-search-cancel-button]:appearance-none"
                  placeholder="عن ماذا تبحث؟ (مثال: شاورما، ملابس)..."
                  value={heroSearchInput}
                  onChange={(e) => setHeroSearchInput(e.target.value)}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 z-20">
                  {heroSearchInput && (
                    <button 
                      type="button"
                      onClick={() => setHeroSearchInput('')}
                      className="hover:bg-white/10 text-white/80 hover:text-white rounded-full p-2 transition-colors cursor-pointer"
                      title="مسح"
                    >
                      <X className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="hover:bg-white/10 text-white/90 hover:text-white p-2 md:p-2.5 rounded-full transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                    title="بحث"
                  >
                    <Search className="h-5 w-5 md:h-6 md:w-6 drop-shadow-sm" />
                  </button>
                </div>
              </form>

              {/* Dynamic Smart Suggestions Deck */}
              <DynamicSmartSuggestions onSelectSuggestion={(queryText) => {
                setHeroSearchInput(queryText);
                navigate(`/search?q=${encodeURIComponent(queryText)}`);
              }} />
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-100 text-center text-sm md:text-base font-medium mb-4">
          {error}
        </div>
      )}

      {banners.length > 0 && (
        <BannerSlideshow 
          banners={
            categoryFilter
              ? (banners.filter(b => b.category && (b.category.toLowerCase().includes(categoryFilter.toLowerCase()) || categoryFilter.toLowerCase().includes(b.category.toLowerCase()))).length > 0
                  ? banners.filter(b => b.category && (b.category.toLowerCase().includes(categoryFilter.toLowerCase()) || categoryFilter.toLowerCase().includes(b.category.toLowerCase())))
                  : banners)
              : banners
          } 
        />
      )}

      {/* Mobile-only Filter Box (Above Categories on Mobile) */}
      <div className="block md:hidden space-y-3">
        <RegionDropdownFilter 
          selectedRegion={regionFilter} 
          onSelectRegion={setRegionFilter} 
          openNowFilter={openNowFilter}
          onToggleOpenNow={() => setOpenNowFilter(!openNowFilter)}
          favoritesOnly={favoritesOnly}
          onToggleFavorites={() => setFavoritesOnly(!favoritesOnly)}
          userFavoritesCount={userFavorites.length}
        />
      </div>

      {mainCategories.length > 0 && (
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-[#2d2a26]">تصفح الأقسام الرئيسية</h2>
            </div>
            <div className="flex items-center gap-2">
              {categoryFilter && (
                <button 
                  onClick={() => {
                    setCategoryFilter('');
                    setSubCategoryFilter('');
                  }}
                  className="text-xs font-bold text-stone-500 hover:text-[#1a4d2e] hover:underline"
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
              const isSelected = categoryFilter === '';
              const { icon: Icon } = getCategoryMeta('الكل');
              return (
                <button
                  ref={isSelected ? activeListingCatRef : null}
                  onClick={() => {
                    setCategoryFilter('');
                    setSubCategoryFilter('');
                  }}
                  className={`snap-start shrink-0 aspect-square w-[88px] sm:w-28 md:w-32 flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl md:rounded-[24px] transition-all duration-200 border text-center group cursor-pointer ${
                    isSelected 
                      ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-lg shadow-[#1a4d2e]/25 -translate-y-1' 
                      : 'bg-white text-[#2d2a26] border-[#e5e1da] hover:border-[#1a4d2e]/40 hover:bg-[#fcfbfa] hover:-translate-y-0.5 hover:shadow-md'
                  }`}
                >
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-2.5 transition-transform group-hover:scale-110 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#1a4d2e]/10 text-[#1a4d2e]'
                  }`}>
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <CategoryButtonLabel name="الكل" isSelected={isSelected} />
                </button>
              );
            })()}

            {/* Main Category buttons */}
            {mainCategories.map((cat) => {
              const isSelected = categoryFilter === cat;
              const { icon: Icon, bg } = getCategoryMeta(cat);
              return (
                <button
                  key={cat}
                  ref={isSelected ? activeListingCatRef : null}
                  onClick={() => {
                    setCategoryFilter(isSelected ? '' : cat);
                    setSubCategoryFilter('');
                  }}
                  className={`snap-start shrink-0 aspect-square w-[88px] sm:w-28 md:w-32 flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl md:rounded-[24px] transition-all duration-200 border text-center group cursor-pointer ${
                    isSelected 
                      ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-lg shadow-[#1a4d2e]/25 -translate-y-1' 
                      : 'bg-white text-[#2d2a26] border-[#e5e1da] hover:border-[#1a4d2e]/40 hover:bg-[#fcfbfa] hover:-translate-y-0.5 hover:shadow-md'
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
          {categoryFilter && getSubCats(categoryFilter).length > 0 && (
            <div className="mt-4 mb-2">
              <div className="flex items-start sm:items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  {isSubCategoriesExpanded ? (
                    <div className="flex flex-wrap gap-2 sm:gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <button
                        onClick={() => setSubCategoryFilter('')}
                        className={`snap-start shrink-0 whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 border cursor-pointer ${
                          subCategoryFilter === ''
                            ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-md shadow-[#1a4d2e]/20'
                            : 'bg-white text-stone-600 border-[#e5e1da] hover:border-[#1a4d2e]/30 hover:bg-stone-50'
                        }`}
                      >
                        عرض الكل
                      </button>
                      {getSubCats(categoryFilter).map((subCat) => (
                        <button
                          key={subCat}
                          onClick={() => setSubCategoryFilter(subCat)}
                          className={`snap-start shrink-0 whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 border cursor-pointer ${
                            subCategoryFilter === subCat
                              ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-md shadow-[#1a4d2e]/20'
                              : 'bg-white text-stone-600 border-[#e5e1da] hover:border-[#1a4d2e]/30 hover:bg-stone-50'
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
                          onClick={() => setSubCategoryFilter('')}
                          className={`snap-start shrink-0 whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 border cursor-pointer ${
                            subCategoryFilter === ''
                              ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-md shadow-[#1a4d2e]/20'
                              : 'bg-white text-stone-600 border-[#e5e1da] hover:border-[#1a4d2e]/30 hover:bg-stone-50'
                          }`}
                        >
                          عرض الكل
                        </button>
                        {getSubCats(categoryFilter).map((subCat) => (
                          <button
                            key={subCat}
                            onClick={() => setSubCategoryFilter(subCat)}
                            className={`snap-start shrink-0 whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 border cursor-pointer ${
                              subCategoryFilter === subCat
                                ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-md shadow-[#1a4d2e]/20'
                                : 'bg-white text-stone-600 border-[#e5e1da] hover:border-[#1a4d2e]/30 hover:bg-stone-50'
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
                  className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-stone-200 hover:border-[#1a4d2e]/40 hover:bg-stone-50 text-stone-600 hover:text-stone-900 shadow-xs flex items-center justify-center transition-all duration-300 cursor-pointer"
                  title={isSubCategoriesExpanded ? "عرض كشريط أفقي" : "تمديد للأسفل"}
                  aria-label={isSubCategoriesExpanded ? "عرض كشريط أفقي" : "تمديد للأسفل"}
                >
                  <ChevronDown className={`h-4.5 w-4.5 sm:h-5 sm:w-5 transition-transform duration-300 ${isSubCategoriesExpanded ? 'rotate-180 text-[#1a4d2e]' : ''}`} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tablet-only Filter Box (Below Categories and Above Directory Explorer) */}
      <div className="hidden md:block lg:hidden space-y-4">
        <RegionDropdownFilter 
          selectedRegion={regionFilter} 
          onSelectRegion={setRegionFilter} 
          openNowFilter={openNowFilter}
          onToggleOpenNow={() => setOpenNowFilter(!openNowFilter)}
          favoritesOnly={favoritesOnly}
          onToggleFavorites={() => setFavoritesOnly(!favoritesOnly)}
          userFavoritesCount={userFavorites.length}
        />
      </div>

      {/* Directory Explorer & Listings Hub */}
      {loading ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 border-b border-[#e5e1da] pb-3 md:pb-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-48 rounded bg-stone-200 animate-pulse" />
            </div>
            <div className="h-10 w-64 rounded-xl bg-stone-100 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <BusinessCardSkeleton key={idx} />
            ))}
          </div>
        </div>
      ) : businesses.length === 0 && !error ? (
        <div className="text-center py-20 bg-white rounded-[32px] border border-[#e5e1da]">
          <div className="bg-stone-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <Store className="h-10 w-10 text-stone-400" />
          </div>
          <h3 className="text-2xl font-bold text-[#2d2a26]">لا توجد محلات بعد</h3>
          <p className="mt-3 text-stone-500 max-w-md mx-auto leading-relaxed">
            قاعدة البيانات جاهزة لاستقبال البيانات الحقيقية. يمكنك إضافة المحلات من خلال لوحة تحكم الموقع إذا كنت تمتلك الصلاحيات.
          </p>
        </div>
      ) : (
        <div id="directory-explorer" ref={listingsSectionRef} className="space-y-6">
          {/* Elite Tabs Filter & Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 border-b border-[#e5e1da] pb-3 md:pb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-[#1a4d2e]" />
              <h2 className="text-lg sm:text-2xl font-black text-[#2d2a26]">
                {categoryFilter ? `${categoryFilter.replace(/^.*?\s/, '')}` : 'دليل المنشآت والخدمات'}
                <span className="text-xs text-stone-400 font-bold mr-2">({displayedBusinesses.length} منشأة)</span>
              </h2>
            </div>

            {/* View Switching Tabs - edge-to-edge scroll on mobile */}
            <div className="flex items-center bg-transparent sm:bg-stone-100 sm:p-1 sm:rounded-2xl gap-2 sm:gap-1 overflow-x-auto scrollbar-hide select-none w-full sm:w-auto -mx-4 px-4 sm:mx-0 sm:px-0 snap-x touch-pan-y overscroll-x-contain">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`snap-start shrink-0 flex items-center gap-1.5 px-5 py-2.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border sm:border-transparent ${
                  activeTab === 'all'
                    ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] sm:shadow-xs'
                    : 'bg-white sm:bg-transparent border-[#e5e1da] text-stone-600 hover:text-[#1a4d2e]'
                }`}
              >
                <Compass className={`h-3.5 w-3.5 md:h-3.5 md:w-3.5 ${activeTab === 'all' ? 'text-white' : 'text-emerald-600'}`} />
                <span>الكل</span>
              </button>
              
              <button
                type="button"
                onClick={() => setActiveTab('featured')}
                className={`snap-start shrink-0 flex items-center gap-1.5 px-5 py-2.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border sm:border-transparent ${
                  activeTab === 'featured'
                    ? 'bg-amber-500 text-white border-amber-500 sm:shadow-xs'
                    : 'bg-white sm:bg-transparent border-[#e5e1da] text-stone-600 hover:text-amber-600'
                }`}
              >
                <Crown className={`h-3.5 w-3.5 md:h-3.5 md:w-3.5 ${activeTab === 'featured' ? 'text-white fill-white' : 'text-amber-500 fill-amber-400'}`} />
                <span>المميزة</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('popular')}
                className={`snap-start shrink-0 flex items-center gap-1.5 px-5 py-2.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border sm:border-transparent ${
                  activeTab === 'popular'
                    ? 'bg-amber-600 text-white border-amber-600 sm:shadow-xs'
                    : 'bg-white sm:bg-transparent border-[#e5e1da] text-stone-600 hover:text-amber-600'
                }`}
              >
                <TrendingUp className={`h-3.5 w-3.5 md:h-3.5 md:w-3.5 ${activeTab === 'popular' ? 'text-white' : 'text-orange-500'}`} />
                <span>الأكثر شعبية</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('recent')}
                className={`snap-start shrink-0 flex items-center gap-1.5 px-5 py-2.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border sm:border-transparent ${
                  activeTab === 'recent'
                    ? 'bg-emerald-600 text-white border-emerald-600 sm:shadow-xs'
                    : 'bg-white sm:bg-transparent border-[#e5e1da] text-stone-600 hover:text-emerald-600'
                }`}
              >
                <Clock className={`h-3.5 w-3.5 md:h-3.5 md:w-3.5 ${activeTab === 'recent' ? 'text-white' : 'text-blue-500'}`} />
                <span>الأحدث</span>
              </button>
            </div>
          </div>

          {/* Unified Business Grid */}
          {displayedBusinesses.length > 0 ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(() => {
                  const currentSlice = displayedBusinesses.slice((currentPage - 1) * 15, currentPage * 15);
                  const elements: React.ReactNode[] = [];
                  let promoIndex = 0;
                  currentSlice.forEach((business, idx) => {
                    elements.push(<BusinessCard key={business.id} business={business} />);
                    if ((idx === 2 || idx === 8) && promoCards[promoIndex]) {
                      const promo = promoCards[promoIndex];
                      elements.push(<InFeedPromoCardItem key={`promo_${promo.id}_${idx}`} card={promo} />);
                      promoIndex++;
                    }
                  });
                  if (currentSlice.length < 3 && promoCards.length > 0 && promoIndex === 0) {
                    elements.push(<InFeedPromoCardItem key={`promo_${promoCards[0].id}`} card={promoCards[0]} />);
                  }
                  return elements;
                })()}
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(displayedBusinesses.length / 15)}
                onPageChange={(p) => {
                  setCurrentPage(p);
                  window.scrollTo({ top: 750, behavior: 'smooth' });
                }}
                totalItems={displayedBusinesses.length}
                itemsPerPage={15}
              />
            </div>
          ) : (
            <div className="text-center py-20 text-stone-500 bg-white rounded-[32px] border border-[#e5e1da] flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center mb-4 text-stone-400">
                <Search className="h-6 w-6" />
              </div>
              <p className="font-extrabold text-[#2d2a26] text-lg">لم نعثر على منشآت مطابقة</p>
              <p className="text-stone-400 text-xs mt-1 max-w-sm leading-relaxed">
                لا توجد نتائج تطابق خيارات التصفية أو التبويب النشط حالياً. جرب التبديل لتبويب "الكل" أو إلغاء بعض فلاتر البحث.
              </p>
            </div>
          )}
        </div>
      )}

      <CategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        categories={categories}
        selectedCategory={categoryFilter}
        onSelectCategory={(catName, subcatName) => {
          setCategoryFilter(catName);
          setSubCategoryFilter(subcatName || '');
        }}
      />

      {/* FLOATING SEARCH BAR OVERLAY */}
      {isFloatingSearchOpen && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-xl z-[200] px-4 hidden lg:block animate-in fade-in slide-in-from-bottom-5 duration-300">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (desktopSearchInput.trim()) {
                navigate(`/search?q=${encodeURIComponent(desktopSearchInput.trim())}`);
              }
            }}
            className="relative shadow-2xl rounded-full"
          >
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 pointer-events-none" />
            <input
              type="search"
              enterKeyHint="search"
              placeholder="ابحث عن محل، مطعم، خدمة، طبيب، حرفة..."
              value={desktopSearchInput}
              onChange={(e) => setDesktopSearchInput(e.target.value)}
              className="w-full pl-14 pr-13 py-3.5 bg-white border-2 border-[#1a4d2e] rounded-full text-sm font-bold placeholder:text-stone-400 focus:outline-none focus:ring-4 focus:ring-[#1a4d2e]/15 shadow-2xl transition-all"
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
        <div className="fixed bottom-8 right-28 w-[380px] max-h-[calc(100vh-5rem)] overflow-y-auto bg-white rounded-2xl border-2 border-[#1a4d2e]/80 shadow-2xl p-5 z-[200] hidden lg:block animate-in fade-in slide-in-from-bottom-5 duration-300 text-xs text-right">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
            <h4 className="font-black text-sm text-stone-900">تصفية المحلات والمنشآت</h4>
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
                <MapPin className="h-4 w-4 text-[#1a4d2e]" />
                <span>الموقع في إربد:</span>
              </span>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2.5 px-3 font-bold text-stone-850 focus:outline-none focus:border-[#1a4d2e] cursor-pointer text-xs"
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

            {/* Status Filters */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpenNowFilter(!openNowFilter)}
                className={`h-10 rounded-xl text-xs font-black transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
                  openNowFilter 
                    ? 'bg-[#1a4d2e] border-[#1a4d2e] text-white shadow-xs' 
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>مفتوح الآن</span>
              </button>

              <button
                type="button"
                onClick={() => setFavoritesOnly(!favoritesOnly)}
                className={`h-10 rounded-xl text-xs font-black transition-all border cursor-pointer flex items-center justify-center gap-1.5 ${
                  favoritesOnly 
                    ? 'bg-rose-600 border-rose-600 text-white shadow-xs' 
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                }`}
              >
                <Heart className={`h-3.5 w-3.5 ${favoritesOnly ? 'fill-white text-white' : 'text-rose-500 fill-rose-500'}`} />
                <span>المفضلة</span>
              </button>
            </div>

            {/* Sorting Tabs */}
            <div className="space-y-1.5 pt-1">
              <span className="font-black text-stone-850 flex items-center gap-1.5">
                <SlidersHorizontal className="h-4 w-4 text-[#1a4d2e]" />
                <span>الترتيب والعرض:</span>
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'featured', label: 'المميزة' },
                  { id: 'popular', label: 'الأكثر شعبية' },
                  { id: 'recent', label: 'الأحدث' }
                ].map((tab) => (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-[#1a4d2e] text-white border-transparent font-black shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION BUTTONS (Visible only when user scrolls to business cards) */}
      {showDesktopFloating && (
        <div className="fixed bottom-8 right-8 z-[200] hidden lg:flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-300">
          {/* Floating Filter Button */}
          <button
            onClick={() => {
              setIsFloatingFilterOpen(!isFloatingFilterOpen);
              setIsFloatingSearchOpen(false);
            }}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl border cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 ${
              isFloatingFilterOpen
                ? 'bg-[#1a4d2e] border-[#1a4d2e] text-white ring-4 ring-[#1a4d2e]/20'
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
                : 'bg-[#1a4d2e] hover:bg-[#153e25] border-[#1a4d2e] text-white'
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
      )}
    </div>
  );
}

