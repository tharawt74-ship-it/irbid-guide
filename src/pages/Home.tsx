import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Business, HomepageBanner } from '../types';
import { Link, useSearchParams } from 'react-router';
import { getAppConfig } from '../lib/demoDataHelper';
import { BusinessCard } from '../components/BusinessCard';
import { BannerSlideshow } from '../components/BannerSlideshow';
import { BUSINESS_CATEGORIES } from '../lib/categories';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { RegionDropdownFilter } from '../components/RegionDropdownFilter';
import { getLiveWorkingStatus } from '../lib/businessHoursHelper';
import { DynamicSmartSuggestions } from '../components/DynamicSmartSuggestions';
import { SEO } from '../components/common/SEO';
import { CategoriesModal } from '../components/CategoriesModal';
import { IrbidInteractiveMap } from '../components/IrbidInteractiveMap';
import { 
  MapPin, Star, Search, Store, Filter,
  LayoutGrid, UtensilsCrossed, Coffee, CakeSlice, 
  BookOpen, Building2, Landmark, HeartPulse, 
  Shirt, Smartphone, ShoppingCart, Scissors, Dumbbell, Car, Sparkles,
  Heart, Compass, Crown, TrendingUp, Clock, SlidersHorizontal,
  Hammer, Sprout
} from 'lucide-react';


export function getCategoryMeta(cat: string) {
  const c = (cat || '').toLowerCase().trim();
  if (!cat || c === 'الكل') {
    return { icon: LayoutGrid, bg: 'bg-emerald-50 text-[#1a4d2e]' };
  }
  if (c.includes('مطاعم') || c.includes('أكل') || c.includes('وجبات') || c.includes('طعام') || c.includes('شاورما') || c.includes('برغر') || c.includes('مشاوي') || c.includes('بيتزا')) {
    return { icon: UtensilsCrossed, bg: 'bg-amber-50 text-amber-700' };
  }
  if (c.includes('مقاهي') || c.includes('كافيه') || c.includes('قهوة') || c.includes('مشروبات') || c.includes('شاي') || c.includes('عصائر')) {
    return { icon: Coffee, bg: 'bg-orange-50 text-orange-700' };
  }
  if (c.includes('حلويات') || c.includes('حلو') || c.includes('كيك') || c.includes('مخبز') || c.includes('معجنات') || c.includes('آيس كريم')) {
    return { icon: CakeSlice, bg: 'bg-pink-50 text-pink-700' };
  }
  if (c.includes('مكتب') || c.includes('قرطاس') || c.includes('كتب') || c.includes('طباعة') || c.includes('دراسة') || c.includes('جامع') || c.includes('مدرس') || c.includes('تعليم') || c.includes('تدريب')) {
    return { icon: BookOpen, bg: 'bg-blue-50 text-blue-700' };
  }
  if (c.includes('سكن') || c.includes('شقق') || c.includes('عقار') || c.includes('إسكان') || c.includes('استوديو') || c.includes('فنادق')) {
    return { icon: Building2, bg: 'bg-indigo-50 text-indigo-700' };
  }
  if (c.includes('سياح') || c.includes('معالم') || c.includes('حدائق') || c.includes('منتزه') || c.includes('آثار') || c.includes('ترفيه') || c.includes('ملاهي')) {
    return { icon: Landmark, bg: 'bg-emerald-50 text-emerald-700' };
  }
  if (c.includes('صيدل') || c.includes('طب') || c.includes('صحة') || c.includes('عياد') || c.includes('مستشفى') || c.includes('مختبر') || c.includes('علاج')) {
    return { icon: HeartPulse, bg: 'bg-rose-50 text-rose-700' };
  }
  if (c.includes('ملابس') || c.includes('أزياء') || c.includes('بوتيك') || c.includes('أقمشة') || c.includes('أحذية') || c.includes('حقائب')) {
    return { icon: Shirt, bg: 'bg-purple-50 text-purple-700' };
  }
  if (c.includes('إلكترون') || c.includes('هواتف') || c.includes('موبايل') || c.includes('كمبيوتر') || c.includes('صيانة') || c.includes('كهربائ')) {
    return { icon: Smartphone, bg: 'bg-cyan-50 text-cyan-700' };
  }
  if (c.includes('سوبر') || c.includes('بقال') || c.includes('ماركت') || c.includes('تموين') || c.includes('دكان') || c.includes('خضار') || c.includes('ملاحم')) {
    return { icon: ShoppingCart, bg: 'bg-green-50 text-green-700' };
  }
  if (c.includes('صالون') || c.includes('حلاق') || c.includes('تجميل') || c.includes('ميك اب') || c.includes('عطور') || c.includes('بشرة')) {
    return { icon: Scissors, bg: 'bg-fuchsia-50 text-fuchsia-700' };
  }
  if (c.includes('رياض') || c.includes('جيم') || c.includes('نوادي') || c.includes('لياقة') || c.includes('أكاديمي')) {
    return { icon: Dumbbell, bg: 'bg-red-50 text-red-700' };
  }
  if (c.includes('سيار') || c.includes('كراج') || c.includes('ميكانيك') || c.includes('غسيل') || c.includes('مركبات')) {
    return { icon: Car, bg: 'bg-slate-50 text-slate-700' };
  }
  if (c.includes('ذهب') || c.includes('مجوهرات') || c.includes('إكسسوار') || c.includes('هدايا') || c.includes('أفراح') || c.includes('زفاف')) {
    return { icon: Sparkles, bg: 'bg-yellow-50 text-yellow-700' };
  }
  if (c.includes('صناع') || c.includes('حرف') || c.includes('انشاءات') || c.includes('نجار') || c.includes('حداد') || c.includes('حجر') || c.includes('سيراميك') || c.includes('طوب') || c.includes('بناء') || c.includes('المنيوم')) {
    return { icon: Hammer, bg: 'bg-orange-50 text-orange-800' };
  }
  if (c.includes('زراع') || c.includes('حدائق') || c.includes('نبات') || c.includes('مستلزمات زراعية') || c.includes('زيتون')) {
    return { icon: Sprout, bg: 'bg-emerald-50 text-emerald-800' };
  }
  return { icon: Store, bg: 'bg-stone-50 text-stone-700' };
}

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
  const { userFavorites } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [banners, setBanners] = useState<HomepageBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subCategoryFilter, setSubCategoryFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [error, setError] = useState('');
  const [openNowFilter, setOpenNowFilter] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'featured' | 'popular' | 'recent' | 'map'>('all');
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

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
      
      try {
        const appConfig = await getAppConfig();
        const q = query(collection(db, 'businesses'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const fetchedBusinesses: Business[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.isHidden) {
            return;
          }
          if (!appConfig.showDemoData && data.isDemo) {
            return;
          }
          fetchedBusinesses.push({ id: docSnap.id, ...data } as Business);
        });
        setBusinesses(fetchedBusinesses);

        // Create set of valid active business IDs for banner filtering
        const validBusinessIds = new Set(fetchedBusinesses.map(b => b.id));

        // Fetch custom banners from Firestore
        try {
          const bannersQuery = query(collection(db, 'banners'));
          const bannersSnap = await getDocs(bannersQuery);
          const activeBanners: HomepageBanner[] = [];
          
          bannersSnap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.active) {
              const now = Date.now();
              const startsOk = !data.bannerStartDate || data.bannerStartDate <= now;
              const endsOk = !data.bannerExpiryDate || data.bannerExpiryDate > now;
              
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
                activeBanners.push({ id: docSnap.id, ...data } as HomepageBanner);
              }
            }
          });

          // Sort custom banners by newest first
          activeBanners.sort((a, b) => b.createdAt - a.createdAt);

          setBanners(activeBanners);
        } catch (bannersErr) {
          console.error("Error fetching homepage banners:", bannersErr);
          setBanners([]);
        }
      } catch (err) {
        console.error("Error fetching businesses:", err);
        setError('حدث خطأ أثناء جلب البيانات. يرجى التأكد من إعداد Firebase وصلاحيات Firestore.');
      } finally {
        setLoading(false);
      }
    }

    fetchBusinesses();
  }, []);

  const { categories } = useSystemSettings();
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
      if (subCategoryFilter) {
        matchesCategory = b.category === subCategoryFilter;
      } else {
        matchesCategory = b.category === categoryFilter || validSubCats.includes(b.category);
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
  if (searchTerm) {
    // Sort primarily by relevance search score
    displayedBusinesses = displayedBusinesses.sort((a, b) => {
      const scoreA = searchScoreMap[a.id]?.score || 0;
      const scoreB = searchScoreMap[b.id]?.score || 0;
      return scoreB - scoreA;
    });
  } else {
    // Regular tabs sorting if no active search
    if (activeTab === 'featured') {
      displayedBusinesses = displayedBusinesses.filter(b => {
        const now = Date.now();
        const startsOk = !b.featuredStartDate || b.featuredStartDate <= now;
        const endsOk = !b.featuredExpiryDate || b.featuredExpiryDate > now;
        return b.isFeatured && startsOk && endsOk;
      });
    } else if (activeTab === 'popular') {
      displayedBusinesses = displayedBusinesses.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (activeTab === 'recent') {
      displayedBusinesses = displayedBusinesses.sort((a, b) => b.createdAt - a.createdAt);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#e5e1da]"></div>
          <div className="absolute inset-0 rounded-full border-4 border-[#1a4d2e] border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-10">
      <SEO 
        title="الرئيسية | الدليل الشامل لمدينة ومحافظة إربد"
        description="دليل إربد الأكبر والشامل: استكشف أفضل المطاعم والمقاهي والمحلات التجارية، الوظائف وسوق العمل، سكنات طلاب جامعة اليرموك وجامعة التكنولوجيا، وعروض التسوق في إربد."
        canonicalUrl="https://shofierbid.com/"
      />
      
      

      {/* Hero Section */}
      <div className="bg-[#1a4d2e] rounded-2xl md:rounded-[32px] py-7 px-4 sm:p-6 md:p-16 text-white flex flex-col items-center text-center relative overflow-hidden shadow-xl shadow-[#1a4d2e]/10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-50"></div>
        <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-[#ff9f1c] rounded-full blur-[50px] md:blur-[100px] opacity-20 -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 md:w-64 md:h-64 bg-[#ffffff] rounded-full blur-[60px] md:blur-[120px] opacity-10 translate-y-1/2 -translate-x-1/3"></div>
        
        <div className="relative z-10 w-full max-w-3xl mx-auto space-y-2 md:space-y-6">
          <span className="inline-block py-0.5 px-2 md:py-1.5 md:px-4 rounded-full bg-white/10 border border-white/20 text-white/90 text-[10px] md:text-sm font-bold backdrop-blur-sm mb-0 md:mb-2">
            اكتشف أفضل ما في إربد ✨
          </span>
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
            شو في بإربد<span className="text-[#ff9f1c]">؟</span>
          </h1>
          <p className="text-xs sm:text-sm md:text-xl text-white/80 max-w-2xl mx-auto leading-snug md:leading-relaxed px-2">
            ابحث عن المطاعم، المقاهي، المحلات التجارية، والخدمات المميزة في مدينتك بكل سهولة.
          </p>

          <div className="mt-3 md:mt-10 w-full max-w-2xl mx-auto relative group">
            <div className="absolute inset-y-0 right-0 pr-3 md:pr-5 flex items-center pointer-events-none text-stone-400 group-focus-within:text-[#ff9f1c] transition-colors">
              <Search className="h-4 w-4 md:h-6 md:w-6" />
            </div>
            <input
              type="text"
              className="block w-full pr-9 pl-8 py-2.5 md:pr-14 md:pl-6 md:py-5 border-none rounded-xl md:rounded-[24px] leading-5 bg-white/95 backdrop-blur-md text-[#2d2a26] placeholder-stone-400 focus:outline-none focus:ring-4 focus:ring-[#ff9f1c]/40 shadow-xl font-bold text-sm md:text-lg transition-all"
              placeholder="عن ماذا تبحث؟ (مثال: شاورما، ملابس)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-full p-1 md:p-1.5 transition-colors cursor-pointer text-xs md:text-sm"
              >
                ✕
              </button>
            )}
          </div>

          {/* Dynamic Smart Suggestions Deck with continuous auto-rotation & animation */}
          <DynamicSmartSuggestions onSelectSuggestion={(queryText) => setSearchTerm(queryText)} />

          {/* Intelligent Search Feedback Badge */}
          {searchTerm && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-white/95 text-[10px] md:text-xs font-black bg-emerald-950/45 backdrop-blur-md py-1 px-2.5 md:py-2 md:px-4 rounded-lg md:rounded-xl border border-emerald-500/35 text-right">
              <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5 text-yellow-400 animate-pulse shrink-0" />
              <span>محركنا الذكي يبحث الآن في المرادفات والتصنيفات بدقة ✨</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-2xl border border-red-100 text-center text-sm md:text-base font-medium">
          {error}
        </div>
      )}

      {/* Unified Intelligent Search & Filters Deck */}
      <div className="space-y-3 md:space-y-4">
        <RegionDropdownFilter 
          selectedRegion={regionFilter} 
          onSelectRegion={setRegionFilter} 
        />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#e5e1da] p-3 rounded-2xl shadow-2xs">
          <div className="flex items-center gap-2 px-1">
            <SlidersHorizontal className="h-4 w-4 text-[#1a4d2e]" />
            <span className="text-xs font-black text-[#2d2a26]">فلترة سريعة وحالة العمل:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setOpenNowFilter(!openNowFilter)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 md:py-1.5 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                openNowFilter 
                  ? 'bg-[#1a4d2e] border-[#1a4d2e] text-white shadow-xs' 
                  : 'bg-[#fdfcfb] border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${openNowFilter ? 'bg-white animate-pulse' : 'bg-emerald-500'}`}></span>
              <span>مفتوح الآن</span>
            </button>

            <button
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 md:py-1.5 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                favoritesOnly 
                  ? 'bg-red-600 border-red-600 text-white shadow-xs' 
                  : 'bg-[#fdfcfb] border-stone-200 text-stone-600 hover:bg-[#fff5f5] hover:text-red-600 hover:border-red-200'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 md:h-3 md:w-3 ${favoritesOnly ? 'fill-white text-white' : 'text-red-500 fill-red-500'}`} />
              <span>المفضلة ({userFavorites.length})</span>
            </button>
          </div>
        </div>
      </div>

      {!isFiltering && banners.length > 0 && (
        <BannerSlideshow banners={banners} />
      )}

      {mainCategories.length > 0 && (
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-[#2d2a26]">تصفح الأقسام الرئيسية</h2>
              {categoryFilter && (
                <span className="text-xs bg-[#1a4d2e]/10 text-[#1a4d2e] font-black px-2.5 py-1 rounded-full">
                  {categoryFilter}
                </span>
              )}
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

            <div className="flex overflow-x-auto pb-4 pt-1 gap-3.5 sm:gap-4 snap-x scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {/* All Button */}
            {(() => {
              const isSelected = categoryFilter === '';
              const { icon: Icon } = getCategoryMeta('الكل');
              return (
                <button
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
                  <span className="text-[11px] sm:text-sm font-bold truncate max-w-full px-1">
                    الكل
                  </span>
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
                  <span className="text-[11px] sm:text-sm font-bold truncate max-w-full px-1" title={cat.replace(/^.*?\s/, '')}>
                    {cat.replace(/^.*?\s/, '')}
                  </span>
                </button>
              );
            })}
          </div>
          </div>
          
          {/* Sub Categories (Shows only when a main category is selected) */}
          {categoryFilter && getSubCats(categoryFilter).length > 0 && (
            <div className="relative">
              <div className="pointer-events-none absolute left-0 top-0 bottom-3 w-8 bg-gradient-to-r from-[#fdfcfb] to-transparent z-10 sm:hidden" />
              <div className="flex overflow-x-auto gap-2.5 pb-3 mt-4 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <button
                  onClick={() => setSubCategoryFilter('')}
                  className={`snap-start shrink-0 whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 border ${
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
                    className={`snap-start shrink-0 whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 border ${
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
      )}

      {/* Directory Explorer & Listings Hub */}
      {businesses.length === 0 && !error ? (
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
        <div className="space-y-6">
          {isFiltering && (
            <div className="bg-[#fcfbfa] border border-[#e5e1da] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-[#2d2a26] bg-stone-100 px-2.5 py-1 rounded-lg">التصفية النشطة حالياً:</span>
                {searchTerm && (
                  <span className="text-xs font-bold bg-[#1a4d2e]/10 text-[#1a4d2e] border border-[#1a4d2e]/10 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <span>بحث: "{searchTerm}"</span>
                    <button onClick={() => setSearchTerm('')} className="text-stone-400 hover:text-red-500 font-bold cursor-pointer">✕</button>
                  </span>
                )}
                {categoryFilter && (
                  <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <span>القسم: {categoryFilter.replace(/^.*?\s/, '')}</span>
                    <button onClick={() => { setCategoryFilter(''); setSubCategoryFilter(''); }} className="text-stone-400 hover:text-red-500 font-bold cursor-pointer">✕</button>
                  </span>
                )}
                {subCategoryFilter && (
                  <span className="text-xs font-bold bg-pink-50 text-pink-800 border border-pink-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <span>الفرعي: {subCategoryFilter}</span>
                    <button onClick={() => setSubCategoryFilter('')} className="text-stone-400 hover:text-red-500 font-bold cursor-pointer">✕</button>
                  </span>
                )}
                {regionFilter && regionFilter !== 'الكل' && (
                  <span className="text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <span>المنطقة: {regionFilter}</span>
                    <button onClick={() => setRegionFilter('')} className="text-stone-400 hover:text-red-500 font-bold cursor-pointer">✕</button>
                  </span>
                )}
                {openNowFilter && (
                  <span className="text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <span>مفتوح الآن 🟢</span>
                    <button onClick={() => setOpenNowFilter(false)} className="text-[#1a4d2e]/50 hover:text-red-500 font-bold cursor-pointer">✕</button>
                  </span>
                )}
                {favoritesOnly && (
                  <span className="text-xs font-bold bg-red-50 text-red-800 border border-red-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <span>المفضلة فقط ❤️</span>
                    <button onClick={() => setFavoritesOnly(false)} className="text-red-400 hover:text-red-500 font-bold cursor-pointer">✕</button>
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('');
                  setSubCategoryFilter('');
                  setRegionFilter('');
                  setOpenNowFilter(false);
                  setFavoritesOnly(false);
                  setActiveTab('all');
                }}
                className="text-xs font-black text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100/80 border border-red-200 px-3.5 py-2 rounded-xl transition-all shrink-0 cursor-pointer text-center"
              >
                إعادة تعيين الفلاتر
              </button>
            </div>
          )}
          
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
            <div className="flex items-center bg-transparent sm:bg-stone-100 sm:p-1 sm:rounded-2xl gap-2 sm:gap-1 overflow-x-auto scrollbar-hide select-none w-full sm:w-auto -mx-4 px-4 sm:mx-0 sm:px-0 snap-x">
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
                <span>المضافة حديثاً</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('map')}
                className={`snap-start shrink-0 flex items-center gap-1.5 px-5 py-2.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap border sm:border-transparent ${
                  activeTab === 'map'
                    ? 'bg-sky-600 text-white border-sky-600 sm:shadow-xs'
                    : 'bg-white sm:bg-transparent border-[#e5e1da] text-stone-600 hover:text-sky-600'
                }`}
              >
                <span className="text-sm">🗺️</span>
                <span>خريطة إربد التفاعلية (VIP)</span>
              </button>
            </div>
          </div>

          {/* Unified Business Grid */}
          {activeTab === 'map' ? (
            <IrbidInteractiveMap 
              businesses={businesses} 
              onClose={() => setActiveTab('all')} 
            />
          ) : displayedBusinesses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedBusinesses.map((business) => (
                <BusinessCard key={business.id} business={business} />
              ))}
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
        onSelectCategory={(catName) => {
          setCategoryFilter(catName);
          setSubCategoryFilter('');
        }}
      />
    </div>
  );
}

