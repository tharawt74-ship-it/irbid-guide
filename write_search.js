const fs = require('fs');

const content = `import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Search as SearchIcon, X, Store, Briefcase, Building, Newspaper, 
  MapPin, Star, Clock, ChevronRight, Loader2, Flame, MenuSquare, 
  Percent, Building2, SlidersHorizontal, FilterX
} from 'lucide-react';
import { Business, MenuItem, NewsArticle, JobOffer, HousingItem } from '../types';
import { normalizeArabic } from '../lib/arabicSearch';
import { getBusinessVipStatus } from '../lib/vipHelper';
import { getLiveWorkingStatus } from '../lib/businessHoursHelper';
import { SEO } from '../components/common/SEO';
import { BUSINESS_CATEGORIES, ALL_IRBID_DISTRICTS } from '../lib/categories';

// Matches OfferItem type structure from Offers.tsx
interface OfferItem {
  id: string;
  title: string;
  businessName: string;
  category: string;
  discountPercentage: number | string;
  oldPrice?: string;
  newPrice?: string;
  code?: string;
  expiresIn: string;
  description: string;
  location: string;
  phone: string;
  whatsapp?: string;
  image: string;
  isHot?: boolean;
  isStudent?: boolean;
  isDemo?: boolean;
  createdAt?: number;
}

interface MatchedProduct {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  badge?: string;
  parentBusiness: Business;
}

type FilterTab = 'all' | 'businesses' | 'products' | 'offers' | 'housing' | 'jobs' | 'news';

export function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q') || '';
  
  const [inputVal, setInputVal] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  
  // Data States
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [housings, setHousings] = useState<HousingItem[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedLocation, setSelectedLocation] = useState<string>('الكل');
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('الكل');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('الكل');

  // Load all datasets on mount
  useEffect(() => {
    async function loadSearchData() {
      if (!db) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [bizSnap, offersSnap, jobsSnap, housingsSnap, newsSnap] = await Promise.all([
          getDocs(query(collection(db, 'businesses'))),
          getDocs(query(collection(db, 'offers'), orderBy('createdAt', 'desc'))).catch(() => ({ docs: [] } as any)),
          getDocs(query(collection(db, 'jobs'), orderBy('createdAt', 'desc'))).catch(() => ({ docs: [] } as any)),
          getDocs(query(collection(db, 'housings'), orderBy('createdAt', 'desc'))).catch(() => ({ docs: [] } as any)),
          getDocs(query(collection(db, 'news'), orderBy('createdAt', 'desc'))).catch(() => ({ docs: [] } as any))
        ]);

        setBusinesses(bizSnap.docs.map(d => ({ id: d.id, ...d.data() } as Business)));
        setOffers(offersSnap.docs.map(d => ({ id: d.id, ...d.data() } as OfferItem)));
        setJobs(jobsSnap.docs.map(d => ({ id: d.id, ...d.data() } as JobOffer)));
        setHousings(housingsSnap.docs.map(d => ({ id: d.id, ...d.data() } as HousingItem)));
        setNews(newsSnap.docs.map(d => ({ id: d.id, ...d.data() } as NewsArticle)));
      } catch (err) {
        console.error('Error loading search datasets:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSearchData();
  }, []);

  // Update input text when search params change externally
  useEffect(() => {
    const qParam = searchParams.get('q') || '';
    setInputVal(qParam);
  }, [searchParams]);

  // Submit search
  const triggerSearch = (queryStr: string) => {
    const trimmed = queryStr.trim();
    setSearchParams(trimmed ? { q: trimmed } : {});
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSearch(inputVal);
  };

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    // Reset category filters on tab change, but keep location
    setSelectedMainCategory('الكل');
    setSelectedSubCategory('الكل');
  };

  const handleClearFilters = () => {
    setSelectedLocation('الكل');
    setSelectedMainCategory('الكل');
    setSelectedSubCategory('الكل');
  };

  // Normalizer & Tokenizer for search queries
  const searchQuery = searchParams.get('q') || '';
  const normalizedQuery = normalizeArabic(searchQuery);
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

  // Derive dynamic filter options
  const jobCategories = useMemo(() => Array.from(new Set(jobs.map(j => j.category).filter(Boolean))), [jobs]);
  const housingTypes = useMemo(() => Array.from(new Set(housings.map(h => h.type).filter(Boolean))), [housings]);
  
  // 1. FILTERED BUSINESSES
  const filteredBusinesses = useMemo(() => {
    return businesses.filter(b => {
      const isSearchMatch = queryTokens.length === 0 || queryTokens.every(token => 
        normalizeArabic(b.name || '').includes(token) ||
        normalizeArabic(b.category || '').includes(token) ||
        normalizeArabic(b.district || '').includes(token) ||
        normalizeArabic(b.description || '').includes(token) ||
        (b.menuCategories || []).some(c => normalizeArabic(c).includes(token))
      );

      const isLocMatch = selectedLocation === 'الكل' || b.district === selectedLocation;

      let isCatMatch = true;
      if (selectedMainCategory !== 'الكل') {
        const subCats = BUSINESS_CATEGORIES[selectedMainCategory as keyof typeof BUSINESS_CATEGORIES] || [];
        isCatMatch = b.category === selectedMainCategory || subCats.includes(b.category);
      }
      if (selectedMainCategory !== 'الكل' && selectedSubCategory !== 'الكل') {
        isCatMatch = b.category === selectedSubCategory;
      }

      return isSearchMatch && isLocMatch && isCatMatch;
    });
  }, [businesses, queryTokens, selectedLocation, selectedMainCategory, selectedSubCategory]);

  // 2. FILTERED PRODUCTS (MENU ITEMS)
  const filteredProducts = useMemo(() => {
    const products: MatchedProduct[] = [];
    businesses.forEach(b => {
      const isLocMatch = selectedLocation === 'الكل' || b.district === selectedLocation;
      let isCatMatch = true;
      if (selectedMainCategory !== 'الكل') {
        const subCats = BUSINESS_CATEGORIES[selectedMainCategory as keyof typeof BUSINESS_CATEGORIES] || [];
        isCatMatch = b.category === selectedMainCategory || subCats.includes(b.category);
      }
      if (selectedMainCategory !== 'الكل' && selectedSubCategory !== 'الكل') {
        isCatMatch = b.category === selectedSubCategory;
      }

      if (!isLocMatch || !isCatMatch) return;

      if (b.menuItems && Array.isArray(b.menuItems)) {
        b.menuItems.forEach((item: MenuItem) => {
          const isSearchMatch = queryTokens.length === 0 || queryTokens.every(token =>
            normalizeArabic(item.name || '').includes(token) ||
            normalizeArabic(item.description || '').includes(token) ||
            normalizeArabic(item.category || '').includes(token)
          );
          if (isSearchMatch) {
            products.push({ ...item, parentBusiness: b });
          }
        });
      }
    });
    return products;
  }, [businesses, queryTokens, selectedLocation, selectedMainCategory, selectedSubCategory]);

  // 3. FILTERED OFFERS
  const filteredOffers = useMemo(() => {
    return offers.filter(o => {
      const isSearchMatch = queryTokens.length === 0 || queryTokens.every(token =>
        normalizeArabic(o.title || '').includes(token) ||
        normalizeArabic(o.description || '').includes(token) ||
        normalizeArabic(o.businessName || '').includes(token) ||
        normalizeArabic(o.category || '').includes(token) ||
        normalizeArabic(o.location || '').includes(token)
      );

      const isLocMatch = selectedLocation === 'الكل' || o.location === selectedLocation;
      
      let isCatMatch = true;
      if (selectedMainCategory !== 'الكل') {
        const subCats = BUSINESS_CATEGORIES[selectedMainCategory as keyof typeof BUSINESS_CATEGORIES] || [];
        isCatMatch = o.category === selectedMainCategory || subCats.includes(o.category);
      }
      if (selectedMainCategory !== 'الكل' && selectedSubCategory !== 'الكل') {
        isCatMatch = o.category === selectedSubCategory;
      }

      return isSearchMatch && isLocMatch && isCatMatch;
    });
  }, [offers, queryTokens, selectedLocation, selectedMainCategory, selectedSubCategory]);

  // 4. FILTERED HOUSING
  const filteredHousings = useMemo(() => {
    return housings.filter(h => {
      const isSearchMatch = queryTokens.length === 0 || queryTokens.every(token =>
        normalizeArabic(h.title || '').includes(token) ||
        normalizeArabic(h.description || '').includes(token) ||
        normalizeArabic(h.location || '').includes(token) ||
        normalizeArabic(h.type || '').includes(token) ||
        normalizeArabic(h.university || '').includes(token)
      );

      const isLocMatch = selectedLocation === 'الكل' || h.location === selectedLocation;
      const isCatMatch = selectedMainCategory === 'الكل' || h.type === selectedMainCategory;

      return isSearchMatch && isLocMatch && isCatMatch;
    });
  }, [housings, queryTokens, selectedLocation, selectedMainCategory]);

  // 5. FILTERED JOBS
  const filteredJobs = useMemo(() => {
    return jobs.filter(j => {
      const isSearchMatch = queryTokens.length === 0 || queryTokens.every(token =>
        normalizeArabic(j.title || '').includes(token) ||
        normalizeArabic(j.company || '').includes(token) ||
        normalizeArabic(j.description || '').includes(token) ||
        normalizeArabic(j.location || '').includes(token) ||
        normalizeArabic(j.category || '').includes(token)
      );

      const isLocMatch = selectedLocation === 'الكل' || j.location === selectedLocation;
      const isCatMatch = selectedMainCategory === 'الكل' || j.category === selectedMainCategory;

      return isSearchMatch && isLocMatch && isCatMatch;
    });
  }, [jobs, queryTokens, selectedLocation, selectedMainCategory]);

  // 6. FILTERED NEWS
  const filteredNews = useMemo(() => {
    return news.filter(n => {
      const isSearchMatch = queryTokens.length === 0 || queryTokens.every(token =>
        normalizeArabic(n.title || '').includes(token) ||
        normalizeArabic(n.excerpt || '').includes(token) ||
        normalizeArabic(n.category || '').includes(token) ||
        normalizeArabic(n.location || '').includes(token)
      );

      const isLocMatch = selectedLocation === 'الكل' || n.location === selectedLocation;

      return isSearchMatch && isLocMatch;
    });
  }, [news, queryTokens, selectedLocation]);

  const totalCount = 
    (activeTab === 'all' || activeTab === 'businesses' ? filteredBusinesses.length : 0) + 
    (activeTab === 'all' || activeTab === 'products' ? filteredProducts.length : 0) + 
    (activeTab === 'all' || activeTab === 'offers' ? filteredOffers.length : 0) + 
    (activeTab === 'all' || activeTab === 'housing' ? filteredHousings.length : 0) + 
    (activeTab === 'all' || activeTab === 'jobs' ? filteredJobs.length : 0) + 
    (activeTab === 'all' || activeTab === 'news' ? filteredNews.length : 0);

  // Dynamic filter dropdown options based on Active Tab
  const showMainCategoryFilter = activeTab !== 'all' && activeTab !== 'news';
  const showSubCategoryFilter = showMainCategoryFilter && selectedMainCategory !== 'الكل' && (activeTab === 'businesses' || activeTab === 'products' || activeTab === 'offers');

  let mainCategoryOptions: string[] = [];
  if (activeTab === 'businesses' || activeTab === 'products' || activeTab === 'offers') {
    mainCategoryOptions = Object.keys(BUSINESS_CATEGORIES);
  } else if (activeTab === 'jobs') {
    mainCategoryOptions = jobCategories;
  } else if (activeTab === 'housing') {
    mainCategoryOptions = housingTypes;
  }

  const subCategoryOptions = (selectedMainCategory !== 'الكل' && BUSINESS_CATEGORIES[selectedMainCategory as keyof typeof BUSINESS_CATEGORIES]) 
    ? BUSINESS_CATEGORIES[selectedMainCategory as keyof typeof BUSINESS_CATEGORIES] 
    : [];

  const filtersActive = selectedLocation !== 'الكل' || selectedMainCategory !== 'الكل' || selectedSubCategory !== 'الكل';

  return (
    <div className="w-full bg-[#fdfcfb] min-h-screen pb-20 font-sans" dir="rtl">
      <SEO 
        title={\`نتائج البحث عن \${searchQuery || 'محلات ووظائف وعقارات'} | دليل إربد الشامل\`}
        description="استخدم المحرك الذكي للبحث والفلترة الفورية لكافة المحلات، المطاعم، المقاهي، السكنات، الوظائف الشاغرة، العروض ونبض الأخبار في مدينة إربد."
      />

      {/* SEARCH HEADER & TABS (Sticky to Layout Header) */}
      <div className="sticky top-[62px] sm:top-[68px] md:top-[72px] z-40 bg-white border-b border-stone-200/80 shadow-xs flex flex-col pt-3 pb-0">
        
        {/* Search Input Row */}
        <div className="px-3 sm:px-6 w-full max-w-7xl mx-auto mb-3">
          <form onSubmit={handleFormSubmit} className="flex items-center gap-2 max-w-3xl">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-11 h-11 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center shrink-0 border border-stone-200/50 transition-colors"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
            <div className="relative flex-1">
              <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 pointer-events-none">
                <SearchIcon className="h-5 w-5" />
              </span>
              <input
                type="search"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="ابحث عن..."
                className="w-full bg-stone-50 border border-stone-200/80 text-sm sm:text-base font-bold text-stone-800 rounded-2xl py-3 pr-10 pl-10 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 focus:bg-white transition-all shadow-2xs outline-none"
              />
              {inputVal && (
                <button
                  type="button"
                  onClick={() => {
                    setInputVal('');
                    triggerSearch('');
                  }}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 p-2 text-stone-400 hover:text-stone-700 bg-stone-100/0 hover:bg-stone-200/50 rounded-full transition-colors"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Tabs Row */}
        <div className="px-1 sm:px-4 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none snap-x px-2">
            {[
              { id: 'all', label: 'الكل', count: (filteredBusinesses.length + filteredProducts.length + filteredOffers.length + filteredHousings.length + filteredJobs.length + filteredNews.length) },
              { id: 'businesses', label: 'محلات وشركات', count: filteredBusinesses.length, icon: Store, color: 'text-emerald-500' },
              { id: 'products', label: 'المنيو والمنتجات', count: filteredProducts.length, icon: MenuSquare, color: 'text-amber-500' },
              { id: 'offers', label: 'عروض', count: filteredOffers.length, icon: Percent, color: 'text-red-500' },
              { id: 'housing', label: 'عقارات', count: filteredHousings.length, icon: Building, color: 'text-blue-500' },
              { id: 'jobs', label: 'وظائف', count: filteredJobs.length, icon: Briefcase, color: 'text-teal-500' },
              { id: 'news', label: 'أخبار', count: filteredNews.length, icon: Newspaper, color: 'text-sky-500' },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as FilterTab)}
                  className={\`relative px-4 py-2.5 rounded-full text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 snap-center \${
                    isActive
                      ? 'bg-stone-900 text-white shadow-md'
                      : 'bg-white hover:bg-stone-50 text-stone-600 border border-stone-200/80 shadow-2xs'
                  }\`}
                >
                  {Icon && <Icon className={\`h-4 w-4 \${isActive ? 'text-white' : tab.color}\`} />}
                  <span>{tab.label}</span>
                  {(activeTab === 'all' || tab.id !== 'all') && (
                     <span className={\`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5 \${isActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'}\`}>
                       {tab.count}
                     </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters Bar (Only show if needed) */}
        <div className="bg-stone-50/50 border-t border-stone-100 py-2.5 px-3 sm:px-6 w-full shadow-inner-sm">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center gap-2.5">
            <div className="flex items-center gap-1.5 shrink-0">
              <SlidersHorizontal className="h-4 w-4 text-stone-400" />
              <span className="text-[11px] font-bold text-stone-500">تصفية حسب:</span>
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none snap-x w-full">
              {/* Location Filter (Always available except maybe News but let's keep it global) */}
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className={\`text-xs font-bold rounded-xl px-3 py-2 border outline-none appearance-none cursor-pointer shrink-0 snap-center min-w-[120px] bg-no-repeat bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")] bg-[position:left_0.5rem_center] bg-[size:1.25em_1.25em] pl-8 transition-colors \${
                  selectedLocation !== 'الكل' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                }\`}
              >
                {ALL_IRBID_DISTRICTS.map(loc => (
                  <option key={loc} value={loc}>{loc === 'الكل' ? 'كل المواقع' : loc}</option>
                ))}
              </select>

              {/* Main Category Filter */}
              {showMainCategoryFilter && mainCategoryOptions.length > 0 && (
                <select
                  value={selectedMainCategory}
                  onChange={(e) => {
                    setSelectedMainCategory(e.target.value);
                    setSelectedSubCategory('الكل'); // Reset sub on main change
                  }}
                  className={\`text-xs font-bold rounded-xl px-3 py-2 border outline-none appearance-none cursor-pointer shrink-0 snap-center min-w-[140px] bg-no-repeat bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")] bg-[position:left_0.5rem_center] bg-[size:1.25em_1.25em] pl-8 transition-colors \${
                    selectedMainCategory !== 'الكل' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                  }\`}
                >
                  <option value="الكل">كل الأقسام</option>
                  {mainCategoryOptions.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}

              {/* Sub Category Filter */}
              {showSubCategoryFilter && subCategoryOptions.length > 0 && (
                <select
                  value={selectedSubCategory}
                  onChange={(e) => setSelectedSubCategory(e.target.value)}
                  className={\`text-xs font-bold rounded-xl px-3 py-2 border outline-none appearance-none cursor-pointer shrink-0 snap-center min-w-[140px] bg-no-repeat bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")] bg-[position:left_0.5rem_center] bg-[size:1.25em_1.25em] pl-8 transition-colors \${
                    selectedSubCategory !== 'الكل' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                  }\`}
                >
                  <option value="الكل">التصنيف الفرعي (الكل)</option>
                  {subCategoryOptions.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}

              {/* Clear Filters Button */}
              {filtersActive && (
                <button
                  onClick={handleClearFilters}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/50 shrink-0 snap-center transition-colors cursor-pointer"
                >
                  <FilterX className="h-3.5 w-3.5" />
                  <span>مسح الفلاتر</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center py-12">
          <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
          <p className="text-sm font-black text-stone-600">جاري جلب النتائج بذكاء...</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-10">
          
          {/* Zero Results State */}
          {totalCount === 0 && (
            <div className="py-20 text-center space-y-4 max-w-md mx-auto px-4 bg-white rounded-3xl border border-stone-200/60 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-stone-50 text-stone-400 flex items-center justify-center mx-auto border border-stone-100">
                <SearchIcon className="h-8 w-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-stone-800">لم يتم العثور على نتائج</h3>
                <p className="text-sm text-stone-500 leading-relaxed">
                  جرب تغيير كلمات البحث، أو تأكد من إزالة بعض الفلاتر (مثل الموقع أو القسم) لتوسيع نطاق البحث.
                </p>
              </div>
              {filtersActive && (
                <button
                  onClick={handleClearFilters}
                  className="mt-4 px-6 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <FilterX className="h-4 w-4" />
                  مسح جميع الفلاتر
                </button>
              )}
            </div>
          )}

          {/* CATEGORY 1: BUSINESSES */}
          {(activeTab === 'all' || activeTab === 'businesses') && filteredBusinesses.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-200/60 pb-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg"><Store className="h-5 w-5" /></div>
                <h3 className="font-black text-lg text-stone-800">المحلات والشركات</h3>
                <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">{filteredBusinesses.length}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBusinesses.map(b => {
                  const vipInfo = getBusinessVipStatus(b);
                  const liveStatus = getLiveWorkingStatus(b.workingHours);
                  const targetUrl = b.username && b.username.trim() ? \`/@\${b.username.trim()}\` : \`/business/\${b.id}\`;

                  return (
                    <Link key={b.id} to={targetUrl} className="bg-white rounded-2xl p-4 border border-stone-200 hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between h-full group relative overflow-hidden">
                      {/* Optional subtle background gradient for VIP */}
                      {vipInfo.isVip && <div className="absolute inset-0 bg-gradient-to-tr from-amber-50/30 to-transparent pointer-events-none" />}
                      
                      <div className="flex gap-4 relative z-10">
                        {b.imageUrl ? (
                          <img src={b.imageUrl} alt={b.name} className="w-16 h-16 rounded-xl object-cover border border-stone-100 shrink-0 shadow-2xs bg-stone-50" />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center text-stone-400 shrink-0 text-xl shadow-2xs">🏢</div>
                        )}
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-black text-base text-stone-800 group-hover:text-emerald-700 transition-colors truncate pr-1">{b.name}</h4>
                            {vipInfo.isVip && <span className="text-[9px] bg-gradient-to-r from-amber-400 to-amber-500 text-white font-black px-2 py-0.5 rounded-full shadow-xs shrink-0">VIP</span>}
                          </div>
                          <p className="text-xs text-stone-500 line-clamp-1">{b.description}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-stone-500 flex-wrap pt-1 font-medium">
                            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md font-bold">{b.category}</span>
                            {b.district && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{b.district}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-stone-100 mt-4 pt-3 flex items-center justify-between text-xs font-bold relative z-10">
                        <div className="flex items-center gap-2">
                          {b.rating ? (
                            <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md">⭐ {b.rating.toFixed(1)}</span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md">جديد</span>
                          )}
                          {liveStatus.isOpen ? (
                            <span className="text-emerald-600 bg-emerald-50/50 px-1.5 py-0.5 rounded">مفتوح</span>
                          ) : (
                            <span className="text-stone-400 bg-stone-50 px-1.5 py-0.5 rounded">مغلق</span>
                          )}
                        </div>
                        <span className="group-hover:translate-x-1 transition-transform flex items-center gap-1 text-emerald-600">
                          التفاصيل <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* CATEGORY 2: PRODUCTS (MENU ITEMS) */}
          {(activeTab === 'all' || activeTab === 'products') && filteredProducts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-200/60 pb-2">
                <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg"><MenuSquare className="h-5 w-5" /></div>
                <h3 className="font-black text-lg text-stone-800">المنتجات والمنيو</h3>
                <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">{filteredProducts.length}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((p, idx) => {
                  const storeUrl = p.parentBusiness.username && p.parentBusiness.username.trim() 
                    ? \`/@\${p.parentBusiness.username.trim()}?tab=menu\` 
                    : \`/business/\${p.parentBusiness.id}?tab=menu\`;

                  return (
                    <Link key={\`\${p.id}-\${idx}\`} to={storeUrl} className="bg-white rounded-2xl p-3.5 border border-stone-200 hover:border-amber-500/50 hover:shadow-md transition-all flex flex-col group h-full">
                      <div className="flex gap-3 h-full">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-[84px] h-[84px] rounded-xl object-cover border border-stone-100 shrink-0 shadow-2xs" />
                        ) : (
                          <div className="w-[84px] h-[84px] rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-stone-400 shrink-0 text-2xl shadow-2xs">🍲</div>
                        )}
                        <div className="flex flex-col flex-1 min-w-0">
                          <h4 className="font-black text-sm text-stone-800 group-hover:text-amber-700 transition-colors line-clamp-1">{p.name}</h4>
                          <p className="text-[11px] text-stone-500 line-clamp-2 mt-1 mb-2 leading-relaxed flex-1">{p.description}</p>
                          <div className="flex items-center justify-between mt-auto">
                            <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{p.price} د.أ</span>
                            <span className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-md truncate max-w-[80px]">{p.category || 'عام'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-stone-100 mt-3 pt-2.5 flex items-center justify-between text-[10px] font-bold text-stone-500">
                        <span className="truncate max-w-[70%] text-stone-600"><span className="text-stone-400">من:</span> {p.parentBusiness.name}</span>
                        <span className="text-amber-600 group-hover:translate-x-1 transition-transform flex items-center">اطلب <ChevronRight className="h-3 w-3 rotate-180" /></span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* CATEGORY 3: OFFERS */}
          {(activeTab === 'all' || activeTab === 'offers') && filteredOffers.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-200/60 pb-2">
                <div className="p-1.5 bg-red-100 text-red-700 rounded-lg"><Percent className="h-5 w-5" /></div>
                <h3 className="font-black text-lg text-stone-800">العروض والخصومات</h3>
                <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">{filteredOffers.length}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredOffers.map(o => (
                  <Link key={o.id} to="/offers" className="bg-white rounded-2xl overflow-hidden border border-stone-200 hover:border-red-500/50 hover:shadow-md transition-all flex flex-col group">
                    <div className="relative aspect-[16/9] w-full bg-stone-100 overflow-hidden shrink-0">
                      <img src={o.image} alt={o.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-3 right-3 bg-red-600 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                        <Flame className="h-4 w-4 animate-pulse" />
                        <span>خصم %{o.discountPercentage}</span>
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-md font-bold">{o.category}</span>
                          <span className="text-[10px] text-stone-500 font-bold flex items-center gap-1"><Clock className="h-3 w-3" /> {o.expiresIn}</span>
                        </div>
                        <h4 className="font-black text-base text-stone-800 line-clamp-1 group-hover:text-red-600 transition-colors">{o.title}</h4>
                        <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">{o.description}</p>
                      </div>
                      <div className="border-t border-stone-100 mt-4 pt-3 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-stone-700 font-black truncate pr-2 flex-1"><span className="text-stone-400 font-medium">مقدم من:</span> {o.businessName}</span>
                        <span className="text-red-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform shrink-0">التفاصيل <ChevronRight className="h-3 w-3 rotate-180" /></span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* CATEGORY 4: HOUSING / REAL ESTATE */}
          {(activeTab === 'all' || activeTab === 'housing') && filteredHousings.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-200/60 pb-2">
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg"><Building className="h-5 w-5" /></div>
                <h3 className="font-black text-lg text-stone-800">السكنات والعقارات</h3>
                <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">{filteredHousings.length}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredHousings.map(h => (
                  <Link key={h.id} to="/housing" className="bg-white rounded-2xl overflow-hidden border border-stone-200 hover:border-blue-500/50 hover:shadow-md transition-all flex flex-col group">
                    <div className="relative aspect-[4/3] w-full bg-stone-100 overflow-hidden shrink-0">
                      <img src={h.image} alt={h.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm text-blue-700 font-black text-sm px-3 py-1.5 rounded-xl shadow-lg border border-blue-100/50">
                        {h.price} د.أ <span className="text-[10px] text-stone-500 font-bold">/ {h.pricePeriod}</span>
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-md font-bold">{h.type}</span>
                          <span className="text-[10px] text-stone-500 font-bold flex items-center gap-1"><MapPin className="h-3 w-3" /> {h.location}</span>
                        </div>
                        <h4 className="font-black text-base text-stone-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{h.title}</h4>
                        <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">{h.description}</p>
                      </div>
                      <div className="border-t border-stone-100 pt-3 flex items-center justify-between text-[11px] font-bold text-blue-600">
                        <span className="text-stone-400 bg-stone-50 px-2 py-1 rounded-lg">جامعة {h.university}</span>
                        <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">شاهد الإعلان <ChevronRight className="h-3 w-3 rotate-180" /></span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* CATEGORY 5: JOBS */}
          {(activeTab === 'all' || activeTab === 'jobs') && filteredJobs.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-200/60 pb-2">
                <div className="p-1.5 bg-teal-100 text-teal-700 rounded-lg"><Briefcase className="h-5 w-5" /></div>
                <h3 className="font-black text-lg text-stone-800">فرص العمل والوظائف</h3>
                <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">{filteredJobs.length}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredJobs.map(j => (
                  <Link key={j.id} to="/jobs" className="bg-white rounded-2xl p-5 border border-stone-200 hover:border-teal-500/50 hover:shadow-md transition-all flex flex-col group">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="bg-stone-100 text-stone-600 text-[10px] font-bold px-2.5 py-1 rounded-lg">{j.category}</span>
                      <span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-2.5 py-1 rounded-lg">{j.jobType}</span>
                    </div>
                    <h4 className="font-black text-base text-stone-800 line-clamp-1 group-hover:text-teal-700 transition-colors">{j.title}</h4>
                    <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-2 font-bold">
                      <Building2 className="h-4 w-4 text-stone-400" /> <span>{j.company}</span>
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-2 mt-3 leading-relaxed flex-1">{j.description}</p>
                    <div className="border-t border-stone-100 mt-4 pt-3 flex items-center justify-between text-xs font-bold">
                      <span className="text-stone-500 flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-stone-400" /> {j.location}</span>
                      <span className="text-teal-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">قدّم الآن <ChevronRight className="h-3.5 w-3.5 rotate-180" /></span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* CATEGORY 6: NEWS */}
          {(activeTab === 'all' || activeTab === 'news') && filteredNews.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-200/60 pb-2">
                <div className="p-1.5 bg-sky-100 text-sky-700 rounded-lg"><Newspaper className="h-5 w-5" /></div>
                <h3 className="font-black text-lg text-stone-800">أخبار إربد</h3>
                <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">{filteredNews.length}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredNews.map(n => (
                  <Link key={n.id} to="/news" className="bg-white rounded-2xl overflow-hidden border border-stone-200 hover:border-sky-500/50 hover:shadow-md transition-all flex flex-col group">
                    {n.imageUrl && (
                      <div className="relative aspect-[16/9] w-full bg-stone-100 overflow-hidden shrink-0">
                        <img src={n.imageUrl} alt={n.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm text-sky-700 font-black text-[10px] px-2.5 py-1 rounded-lg shadow-sm">
                          {n.category}
                        </div>
                      </div>
                    )}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-bold text-stone-400 mb-2">
                          <span className="bg-stone-50 px-2 py-0.5 rounded-md text-stone-500">{n.date}</span>
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {n.location}</span>
                        </div>
                        <h4 className="font-black text-base text-stone-800 line-clamp-2 group-hover:text-sky-700 transition-colors leading-snug">{n.title}</h4>
                        <p className="text-xs text-stone-500 line-clamp-2 mt-2 leading-relaxed">{n.excerpt}</p>
                      </div>
                      <div className="border-t border-stone-100 pt-3 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-stone-400 truncate max-w-[60%]">المصدر: {n.source}</span>
                        <span className="text-sky-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">إقرأ الخبر <ChevronRight className="h-3 w-3 rotate-180" /></span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
`
fs.writeFileSync('src/pages/Search.tsx', content);
