import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCachedBusinesses, setCachedBusinesses, getCachedOffers, setCachedOffers, getCachedJobs, setCachedJobs, getCachedHousings, setCachedHousings } from '../lib/dataCache';
import { 
  Search as SearchIcon, X, Store, Briefcase, Building, Newspaper, 
  MapPin, Star, Clock, ChevronRight, Loader2, Flame, MenuSquare, 
  Percent, Building2, SlidersHorizontal, FilterX, ChevronDown, ChevronUp,
  Stethoscope, Bus, Compass, Phone, ArrowLeftRight, Car
} from 'lucide-react';
import { Business, MenuItem, NewsArticle, JobOffer, HousingItem, TerminalItem, RouteItem, TaxiItem } from '../types';
import { fetchTransportation } from '../lib/transportationService';
import { TourismSpot, SEED_TOURISM_SPOTS } from './Tourism';
import { getAppConfig, DEMO_SEED_DATA } from '../lib/demoDataHelper';
import { normalizeArabic } from '../lib/arabicSearch';
import { getBusinessVipStatus, compareBusinessesByTier } from '../lib/vipHelper';
import { getLiveWorkingStatus } from '../lib/businessHoursHelper';
import { SEO } from '../components/common/SEO';
import { BUSINESS_CATEGORIES, ALL_IRBID_DISTRICTS } from '../lib/categories';
import { Pagination } from '../components/common/Pagination';
import { cn } from '../lib/utils';

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

type FilterTab = 'all' | 'businesses' | 'products' | 'offers' | 'medical' | 'housing' | 'jobs' | 'transportation' | 'tourism' | 'news';

const isMedicalFacility = (b: Business) => {
  if (b.medicalProfile) return true;
  const cat = (b.category || '').toLowerCase();
  const name = (b.name || '').toLowerCase();
  const desc = (b.description || '').toLowerCase();
  return (
    cat.includes('طب') ||
    cat.includes('صحة') ||
    cat.includes('عياد') ||
    cat.includes('مستشف') ||
    cat.includes('مختبر') ||
    cat.includes('صيدل') ||
    cat.includes('علاج طبيعي') ||
    cat.includes('أسنان') ||
    name.includes('دكتور') ||
    name.includes('عيادة') ||
    name.includes('مركز طبي') ||
    name.includes('صيدلية') ||
    name.includes('مختبر') ||
    desc.includes('طبيب')
  );
};

export function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q') || '';
  
  const [inputVal, setInputVal] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);

  // Auto-collapse header on scroll down (Mobile)
  useEffect(() => {
    let lastScrollY = window.scrollY;
    const handleScroll = () => {
      // Only apply auto-collapse on smaller screens
      if (window.innerWidth >= 640) return;
      
      const currentScrollY = window.scrollY;
      if (currentScrollY > 5 && currentScrollY > lastScrollY) {
        setIsHeaderExpanded(false);
      }
      lastScrollY = currentScrollY;
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Data States
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [housings, setHousings] = useState<HousingItem[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  
  // New Category States
  const [terminalsData, setTerminalsData] = useState<TerminalItem[]>([]);
  const [internalRoutes, setInternalRoutes] = useState<RouteItem[]>([]);
  const [taxiApps, setTaxiApps] = useState<TaxiItem[]>([]);
  const [tourismSpots, setTourismSpots] = useState<TourismSpot[]>([]);
  
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedLocation, setSelectedLocation] = useState<string>('الكل');
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('الكل');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('الكل');
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const [businessPage, setBusinessPage] = useState(1);
  const [medicalPage, setMedicalPage] = useState(1);

  useEffect(() => {
    setBusinessPage(1);
    setMedicalPage(1);
  }, [inputVal, selectedLocation, selectedMainCategory, selectedSubCategory, activeTab]);

  // Load all datasets on mount with caching & query limits
  useEffect(() => {
    async function loadSearchData() {
      // Fetch transportation and tourism data
      fetchTransportation()
        .then(res => {
          setTerminalsData(res.terminals || []);
          setInternalRoutes(res.routes || []);
          setTaxiApps(res.taxis || []);
        })
        .catch(err => console.error("Error loading transportation in Search:", err));

      if (db) {
        const tourismRef = collection(db, 'tourism');
        getDocs(tourismRef)
          .then(snap => {
            let items: TourismSpot[] = [];
            snap.forEach(d => {
              items.push({ id: d.id, ...d.data() } as TourismSpot);
            });
            if (items.length === 0) {
              setTourismSpots(SEED_TOURISM_SPOTS);
            } else {
              setTourismSpots(items);
            }
          })
          .catch(err => {
            console.error("Error loading tourism in Search:", err);
            setTourismSpots(SEED_TOURISM_SPOTS);
          });
      } else {
        setTourismSpots(SEED_TOURISM_SPOTS);
      }

      if (!db) {
        setLoading(false);
        return;
      }

      // Check cache first for instant render and zero DB reads
      const cachedB = getCachedBusinesses();
      const cachedO = getCachedOffers();
      const cachedJ = getCachedJobs();
      const cachedH = getCachedHousings();

      if (cachedB && cachedB.length > 0) {
        setBusinesses(cachedB);
        if (cachedO) setOffers(cachedO);
        if (cachedJ) setJobs(cachedJ);
        if (cachedH) setHousings(cachedH);
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        const appConfig = await getAppConfig();
        const [bizSnap, offersSnap, jobsSnap, housingsSnap, newsSnap] = await Promise.all([
          getDocs(query(collection(db, 'businesses'), limit(150))),
          getDocs(query(collection(db, 'offers'), orderBy('createdAt', 'desc'), limit(50))).catch(() => ({ docs: [] } as any)),
          getDocs(query(collection(db, 'jobs'), orderBy('createdAt', 'desc'), limit(50))).catch(() => ({ docs: [] } as any)),
          getDocs(query(collection(db, 'housings'), orderBy('createdAt', 'desc'), limit(50))).catch(() => ({ docs: [] } as any)),
          getDocs(query(collection(db, 'news'), orderBy('createdAt', 'desc'), limit(50))).catch(() => ({ docs: [] } as any))
        ]);

        let bizDocs = bizSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Business))
          .filter(b => b.status !== 'pending' && b.status !== 'rejected')
          .filter(b => appConfig.showDemoData !== false || !(b as any).isDemo);

        if (bizDocs.length === 0) {
          bizDocs = DEMO_SEED_DATA.businesses.map((b, idx) => ({ id: `demo-b-${idx}`, ...b } as Business));
        }

        const offersList = offersSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as OfferItem)).filter((o: any) => appConfig.showDemoData !== false || !o.isDemo);
        const jobsList = jobsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as JobOffer)).filter((j: any) => appConfig.showDemoData !== false || !j.isDemo);
        const housingsList = housingsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as HousingItem)).filter((h: any) => appConfig.showDemoData !== false || !h.isDemo);
        const newsList = newsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as NewsArticle));

        setBusinesses(bizDocs);
        setOffers(offersList);
        setJobs(jobsList);
        setHousings(housingsList);
        setNews(newsList);

        // Save to cache
        setCachedBusinesses(bizDocs);
        setCachedOffers(offersList);
        setCachedJobs(jobsList);
        setCachedHousings(housingsList);
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
  const triggerSearch = (queryStr: string, replaceHistory = false) => {
    const trimmed = queryStr.trim();
    setSearchParams(trimmed ? { q: trimmed } : {}, { replace: replaceHistory });
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
    const list = businesses.filter(b => {
      // Exclude medical facilities from standard businesses list
      if (isMedicalFacility(b)) return false;

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

    // Always sort by: Featured -> Golden VIP -> Rest
    const now = Date.now();
    return list.sort((a, b) => {
      return compareBusinessesByTier(a, b, undefined, now);
    });
  }, [businesses, queryTokens, selectedLocation, selectedMainCategory, selectedSubCategory]);

  // 1b. FILTERED MEDICAL BUSINESSES
  const filteredMedical = useMemo(() => {
    const list = businesses.filter(b => {
      // ONLY include medical facilities
      if (!isMedicalFacility(b)) return false;

      const isSearchMatch = queryTokens.length === 0 || queryTokens.every(token => 
        normalizeArabic(b.name || '').includes(token) ||
        normalizeArabic(b.category || '').includes(token) ||
        normalizeArabic(b.district || '').includes(token) ||
        normalizeArabic(b.description || '').includes(token)
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

    const now = Date.now();
    return list.sort((a, b) => {
      return compareBusinessesByTier(a, b, undefined, now);
    });
  }, [businesses, queryTokens, selectedLocation, selectedMainCategory, selectedSubCategory]);

  // FILTERED TERMINALS
  const filteredTerminals = useMemo(() => {
    if (queryTokens.length === 0) return terminalsData;
    return terminalsData.map(t => {
      const matchingDest = t.destinations.filter(d => 
        queryTokens.every(token => 
          normalizeArabic(d.name || '').includes(token) || 
          normalizeArabic(d.vehicleType || '').includes(token)
        )
      );
      const nameMatch = queryTokens.every(token => 
        normalizeArabic(t.name || '').includes(token) || 
        normalizeArabic(t.description || '').includes(token) ||
        normalizeArabic(t.location || '').includes(token)
      );
      if (nameMatch || matchingDest.length > 0) {
        return {
          ...t,
          destinations: matchingDest.length > 0 ? matchingDest : t.destinations
        };
      }
      return null;
    }).filter(Boolean) as TerminalItem[];
  }, [terminalsData, queryTokens]);

  // FILTERED ROUTES
  const filteredRoutes = useMemo(() => {
    if (queryTokens.length === 0) return internalRoutes;
    return internalRoutes.filter(r => 
      queryTokens.every(token => 
        normalizeArabic(r.name || '').includes(token) || 
        normalizeArabic(r.code || '').includes(token) || 
        r.stops.some(s => normalizeArabic(s || '').includes(token))
      )
    );
  }, [internalRoutes, queryTokens]);

  // FILTERED TAXIS
  const filteredTaxis = useMemo(() => {
    if (queryTokens.length === 0) return taxiApps;
    return taxiApps.filter(app => 
      queryTokens.every(token => 
        normalizeArabic(app.name || '').includes(token) || 
        normalizeArabic(app.badge || '').includes(token) || 
        normalizeArabic(app.categoryType || (app as any).type || '').includes(token) || 
        normalizeArabic(app.description || '').includes(token)
      )
    );
  }, [taxiApps, queryTokens]);

  // FILTERED TOURISM
  const filteredTourism = useMemo(() => {
    return tourismSpots.filter(spot => {
      const isSearchMatch = queryTokens.length === 0 || queryTokens.every(token =>
        normalizeArabic(spot.name || '').includes(token) ||
        normalizeArabic(spot.description || '').includes(token) ||
        normalizeArabic(spot.location || '').includes(token) ||
        normalizeArabic(spot.category || '').includes(token) ||
        (spot.tags || []).some(t => normalizeArabic(t || '').includes(token))
      );
      const isLocMatch = selectedLocation === 'الكل' || spot.location.includes(selectedLocation);
      return isSearchMatch && isLocMatch;
    });
  }, [tourismSpots, queryTokens, selectedLocation]);

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

    // Sort products based on parent business tier: Featured -> Golden VIP -> Rest
    const now = Date.now();
    return products.sort((a, b) => {
      return compareBusinessesByTier(a.parentBusiness, b.parentBusiness, undefined, now);
    });
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
    (activeTab === 'all' || activeTab === 'medical' ? filteredMedical.length : 0) + 
    (activeTab === 'all' || activeTab === 'housing' ? filteredHousings.length : 0) + 
    (activeTab === 'all' || activeTab === 'jobs' ? filteredJobs.length : 0) + 
    (activeTab === 'all' || activeTab === 'transportation' ? (filteredTerminals.length + filteredRoutes.length + filteredTaxis.length) : 0) + 
    (activeTab === 'all' || activeTab === 'tourism' ? filteredTourism.length : 0) + 
    (activeTab === 'all' || activeTab === 'news' ? filteredNews.length : 0);

  // Dynamic filter dropdown options based on Active Tab
  const showMainCategoryFilter = activeTab !== 'news' && activeTab !== 'transportation' && activeTab !== 'tourism';
  const showSubCategoryFilter = showMainCategoryFilter && selectedMainCategory !== 'الكل' && (activeTab === 'all' || activeTab === 'businesses' || activeTab === 'products' || activeTab === 'offers');

  let mainCategoryOptions: string[] = [];
  if (activeTab === 'all' || activeTab === 'businesses' || activeTab === 'products' || activeTab === 'offers') {
    mainCategoryOptions = Object.keys(BUSINESS_CATEGORIES);
  } else if (activeTab === 'medical') {
    mainCategoryOptions = BUSINESS_CATEGORIES["🏥 صحة وطب"] as string[];
  } else if (activeTab === 'jobs') {
    mainCategoryOptions = jobCategories;
  } else if (activeTab === 'housing') {
    mainCategoryOptions = housingTypes;
  }

  const subCategoryOptions = (selectedMainCategory !== 'الكل' && BUSINESS_CATEGORIES[selectedMainCategory as keyof typeof BUSINESS_CATEGORIES]) 
    ? BUSINESS_CATEGORIES[selectedMainCategory as keyof typeof BUSINESS_CATEGORIES] 
    : [];

  const filtersActive = selectedLocation !== 'الكل' || selectedMainCategory !== 'الكل' || selectedSubCategory !== 'الكل';

  const renderFiltersContent = () => (
    <>
      <div className="flex items-center gap-1.5 shrink-0 mb-1">
        <SlidersHorizontal className="h-4 w-4 text-stone-400" />
        <span className="text-[11px] font-bold text-stone-500">تصفية حسب:</span>
      </div>
      
      {/* Location Filter */}
      <select
        value={selectedLocation}
        onChange={(e) => setSelectedLocation(e.target.value)}
        className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 border outline-none appearance-none cursor-pointer bg-no-repeat bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")] bg-[position:left_0.5rem_center] bg-[size:1.25em_1.25em] pl-8 transition-colors ${
          selectedLocation !== 'الكل' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
        }`}
      >
        {ALL_IRBID_DISTRICTS.map(loc => (
          <option key={loc} value={loc}>{loc === 'الكل' ? 'الموقع (الكل)' : loc}</option>
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
          className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 border outline-none appearance-none cursor-pointer bg-no-repeat bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")] bg-[position:left_0.5rem_center] bg-[size:1.25em_1.25em] pl-8 transition-colors ${
            selectedMainCategory !== 'الكل' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
          }`}
        >
          <option value="الكل">القسم الرئيسي (الكل)</option>
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
          className={`w-full text-xs font-bold rounded-xl px-3 py-2.5 border outline-none appearance-none cursor-pointer bg-no-repeat bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")] bg-[position:left_0.5rem_center] bg-[size:1.25em_1.25em] pl-8 transition-colors ${
            selectedSubCategory !== 'الكل' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
          }`}
        >
          <option value="الكل">القسم الفرعي (الكل)</option>
          {subCategoryOptions.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      )}

      {/* Clear Filters Button */}
      {filtersActive && (
        <button
          onClick={handleClearFilters}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/50 transition-colors cursor-pointer mt-1"
        >
          <FilterX className="h-4 w-4" />
          <span>مسح الفلاتر</span>
        </button>
      )}
    </>
  );

  return (
    <div className="w-full bg-[#fdfcfb] min-h-screen pb-28 font-sans" dir="rtl">
      <SEO 
        title={`نتائج البحث عن ${searchQuery || 'محلات ووظائف وعقارات'} | دليل إربد الشامل`}
        description="استخدم المحرك الذكي للبحث والفلترة الفورية لكافة المحلات، المطاعم، المقاهي، السكنات، الوظائف الشاغرة، العروض ونبض الأخبار في مدينة إربد."
      />

      {/* SEARCH HEADER & TABS (Sticky to Layout Header) */}
      <div className="sticky top-[62px] sm:top-[68px] md:top-[72px] z-30 bg-[#fdfcfb]/95 backdrop-blur-md sm:bg-white border-b border-transparent sm:border-stone-200/80 sm:shadow-xs flex flex-col pt-0 pb-0 transition-all duration-300">
        
        {/* Full Header Content (Desktop Search Bar) */}
        <div className="hidden sm:flex flex-col transition-all duration-300 overflow-visible pt-0">
          {/* Search Input Row - Rounded Design with Filter Button */}
          <div className="w-full px-3 sm:px-6 max-w-4xl mx-auto mt-3 sm:mt-4 mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-12 h-12 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center shrink-0 border border-stone-200/50 transition-colors cursor-pointer"
                title="العودة للصفحة الرئيسية"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              
              <form onSubmit={handleFormSubmit} className="flex-1 relative h-12">
                <SearchIcon className="h-5 w-5 text-stone-400 absolute right-4 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={inputVal}
                  onChange={(e) => {
                    setInputVal(e.target.value);
                    triggerSearch(e.target.value, true);
                  }}
                  placeholder="ابحث عن أي شيء في إربد..."
                  className="w-full h-full bg-white border border-stone-200 rounded-full pr-11 pl-12 text-sm sm:text-base font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 shadow-sm transition-all [&::-webkit-search-cancel-button]:appearance-none"
                  autoFocus
                />
                {inputVal && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputVal('');
                      triggerSearch('', true);
                    }}
                    className="absolute left-1 top-1/2 -translate-y-1/2 p-2.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                )}
              </form>

              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setShowFiltersDropdown(!showFiltersDropdown)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border transition-all cursor-pointer shadow-sm ${showFiltersDropdown ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'} ${(selectedLocation !== 'الكل' || selectedMainCategory !== 'الكل' || selectedSubCategory !== 'الكل') ? 'ring-2 ring-emerald-500/50' : ''}`}
                  title="تصفية النتائج"
                >
                  <SlidersHorizontal className="h-5 w-5" />
                </button>
                
                {/* Filters Dropdown */}
                {showFiltersDropdown && (
                  <div className="absolute top-14 left-0 w-[280px] sm:w-[320px] bg-white rounded-2xl shadow-xl border border-stone-100 p-4 z-50 flex flex-col gap-3 origin-top-left">
                    {renderFiltersContent()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div> {/* Close Desktop Search Bar */}

        {/* Tabs Row (Visible on all devices) */}
        <div className="px-1 sm:px-4 w-full max-w-7xl mx-auto sm:mt-0 pt-2 sm:pt-0">
          <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none snap-x px-2">
            {[
              { id: 'all', label: 'الكل', count: (filteredBusinesses.length + filteredProducts.length + filteredOffers.length + filteredMedical.length + filteredHousings.length + filteredJobs.length + filteredTerminals.length + filteredRoutes.length + filteredTaxis.length + filteredTourism.length + filteredNews.length) },
              { id: 'businesses', label: 'محلات وشركات', count: filteredBusinesses.length, icon: Store, color: 'text-emerald-500' },
              { id: 'products', label: 'المنيو والمنتجات', count: filteredProducts.length, icon: MenuSquare, color: 'text-amber-500' },
              { id: 'offers', label: 'عروض', count: filteredOffers.length, icon: Percent, color: 'text-red-500' },
              { id: 'medical', label: 'الصحة والطب', count: filteredMedical.length, icon: Stethoscope, color: 'text-rose-500' },
              { id: 'housing', label: 'عقارات', count: filteredHousings.length, icon: Building, color: 'text-blue-500' },
              { id: 'jobs', label: 'وظائف', count: filteredJobs.length, icon: Briefcase, color: 'text-teal-500' },
              { id: 'transportation', label: 'المواصلات', count: (filteredTerminals.length + filteredRoutes.length + filteredTaxis.length), icon: Bus, color: 'text-indigo-500' },
              { id: 'tourism', label: 'الأماكن السياحية', count: filteredTourism.length, icon: Compass, color: 'text-[#ff9f1c]' },
              { id: 'news', label: 'أخبار', count: filteredNews.length, icon: Newspaper, color: 'text-sky-500' },
            ].map(tab => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                   key={tab.id}
                   onClick={() => handleTabChange(tab.id as FilterTab)}
                   className={`relative px-4 py-2.5 rounded-full text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 snap-center ${
                     isActive
                       ? 'bg-stone-900 text-white shadow-md'
                       : 'bg-white hover:bg-stone-50 text-stone-600 border border-stone-200/80 shadow-2xs'
                   }`}
                >
                  {Icon && <Icon className={`h-4 w-4 ${isActive ? 'text-white' : tab.color}`} />}
                  <span>{tab.label}</span>
                  {(activeTab === 'all' || tab.id !== 'all') && (
                     <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5 ${isActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'}`}>
                       {tab.count}
                     </span>
                  )}
                </button>
              );
            })}
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredBusinesses
                  .slice((businessPage - 1) * 15, businessPage * 15)
                  .map(b => {
                  const vipInfo = getBusinessVipStatus(b);
                  const liveStatus = getLiveWorkingStatus(b.workingHours);
                  const targetUrl = b.username && b.username.trim() ? `/@${b.username.trim()}` : `/business/${b.id}`;

                  const isCurrentlyFeatured = b.isFeatured && (!b.featuredStartDate || b.featuredStartDate <= Date.now()) && (!b.featuredExpiryDate || b.featuredExpiryDate > Date.now());

                  // Strictly use profile image / logo, never the cover image
                  const profileImg = b.logoUrl || (b as any).profileImage || (b as any).logo || (b as any).avatar || (b as any).profileImg;

                  return (
                    <Link 
                      key={b.id} 
                      to={targetUrl} 
                      className={cn(
                        "bg-white rounded-3xl p-4 sm:p-5 border transition-all duration-300 flex flex-col justify-between h-full group relative overflow-hidden shadow-2xs hover:shadow-lg hover:-translate-y-0.5",
                        isCurrentlyFeatured 
                          ? "border-amber-400/90 ring-2 ring-amber-400/20 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]" 
                          : "border-stone-200/90 hover:border-emerald-600/50"
                      )}
                    >
                      {/* Subtle background glow for featured */}
                      {isCurrentlyFeatured && <div className="absolute inset-0 bg-gradient-to-tr from-amber-50/30 via-transparent to-transparent pointer-events-none" />}
                      
                      <div className="relative z-10 flex flex-col justify-between h-full gap-3">
                        <div>
                          {/* Header: Profile image on right + badges on left (RTL) */}
                          <div className="flex items-center justify-between gap-3 mb-2.5">
                            {/* Profile Image (الصورة الشخصية للمحل) */}
                            <div className="relative shrink-0">
                              {profileImg ? (
                                <img 
                                  src={profileImg} 
                                  alt={b.name} 
                                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-stone-200/80 shadow-xs bg-stone-50 group-hover:scale-105 transition-transform duration-300" 
                                />
                              ) : (
                                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-800 font-black text-xl shadow-xs">
                                  {b.name ? b.name.trim().charAt(0) : <Store className="h-6 w-6 text-emerald-600" />}
                                </div>
                              )}
                            </div>

                            {/* Status & verification badges */}
                            <div className="flex flex-wrap items-center justify-end gap-1.5 min-w-0">
                              {isCurrentlyFeatured && (
                                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-black px-2.5 py-0.5 rounded-full shadow-2xs border border-amber-300/60 shrink-0">
                                  ⭐ ممول
                                </span>
                              )}
                              {vipInfo.isVip && (
                                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] bg-sky-50 text-sky-700 border border-sky-200 font-black px-2.5 py-0.5 rounded-full shadow-2xs shrink-0">
                                  ✓ موثّق
                                </span>
                              )}
                              <span className={cn(
                                "inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 border",
                                liveStatus.isOpen
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                                  : "bg-stone-100 text-stone-500 border-stone-200"
                              )}>
                                <span className={cn("w-1.5 h-1.5 rounded-full", liveStatus.dotColor)} />
                                <span>{liveStatus.statusText}</span>
                              </span>
                            </div>
                          </div>

                          {/* Full Business Name - 100% full width, completely visible without any cropping or ellipsis */}
                          <h4 className={cn(
                            "font-black text-base sm:text-lg leading-snug transition-colors break-words whitespace-normal pt-1",
                            isCurrentlyFeatured
                              ? "text-amber-950 group-hover:text-amber-700"
                              : "text-stone-900 group-hover:text-[#1a4d2e]"
                          )}>
                            {b.name}
                          </h4>

                          {/* Description if present */}
                          {b.description && (
                            <p className="text-xs text-stone-500 leading-relaxed line-clamp-2 mt-1.5">
                              {b.description}
                            </p>
                          )}

                          {/* Category and Location */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-2.5 pt-1">
                            {b.category && (
                              <span className="text-[#1a4d2e] bg-[#1a4d2e]/7 border border-[#1a4d2e]/15 px-2.5 py-0.5 rounded-lg font-bold text-[11px]">
                                {b.category}
                              </span>
                            )}
                            {(b.district || b.address) && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-stone-500 font-medium">
                                <MapPin className="h-3 w-3 text-stone-400 shrink-0" />
                                <span className="break-words">{b.district || b.address}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Footer: Rating & CTA */}
                        <div className="border-t border-stone-100 pt-3 mt-1 flex items-center justify-between text-xs font-bold">
                          <div className="flex items-center gap-1.5">
                            {typeof b.rating === 'number' && b.rating > 0 ? (
                              <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-lg text-xs font-bold">
                                ⭐ {b.rating.toFixed(1)}
                                {typeof b.reviewCount === 'number' && b.reviewCount > 0 && (
                                  <span className="text-[10px] text-stone-400 font-normal">({b.reviewCount})</span>
                                )}
                              </span>
                            ) : (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/50 px-2 py-0.5 rounded-lg text-xs">
                                جديد
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-[#1a4d2e] group-hover:text-emerald-700 group-hover:-translate-x-1 transition-all flex items-center gap-1">
                            عرض المحل <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <Pagination
                currentPage={businessPage}
                totalPages={Math.ceil(filteredBusinesses.length / 15)}
                onPageChange={(p) => setBusinessPage(p)}
                totalItems={filteredBusinesses.length}
                itemsPerPage={15}
              />
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
                    ? `/@${p.parentBusiness.username.trim()}?tab=menu` 
                    : `/business/${p.parentBusiness.id}?tab=menu`;

                  return (
                    <Link key={`${p.id}-${idx}`} to={storeUrl} className="bg-white rounded-2xl p-3.5 border border-stone-200 hover:border-amber-500/50 hover:shadow-md transition-all flex flex-col group h-full">
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
                      <img src={o.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800'} alt={o.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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

          {/* CATEGORY 3b: MEDICAL FACILITIES */}
          {(activeTab === 'all' || activeTab === 'medical') && filteredMedical.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-200/60 pb-2">
                <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg"><Stethoscope className="h-5 w-5" /></div>
                <h3 className="font-black text-lg text-stone-800">المنشآت الطبية والرعاية الصحية</h3>
                <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">{filteredMedical.length}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredMedical
                  .slice((medicalPage - 1) * 15, medicalPage * 15)
                  .map(b => {
                    const vipInfo = getBusinessVipStatus(b);
                    const liveStatus = getLiveWorkingStatus(b.workingHours);
                    const targetUrl = b.username && b.username.trim() ? `/@${b.username.trim()}` : `/business/${b.id}`;
                    const isCurrentlyFeatured = b.isFeatured && (!b.featuredStartDate || b.featuredStartDate <= Date.now()) && (!b.featuredExpiryDate || b.featuredExpiryDate > Date.now());
                    const profileImg = b.logoUrl || (b as any).profileImage || (b as any).logo || (b as any).avatar || (b as any).profileImg;

                    return (
                      <Link 
                        key={b.id} 
                        to={targetUrl} 
                        className={cn(
                          "bg-white rounded-3xl p-4 sm:p-5 border transition-all duration-300 flex flex-col justify-between h-full group relative overflow-hidden shadow-2xs hover:shadow-lg hover:-translate-y-0.5",
                          isCurrentlyFeatured 
                            ? "border-amber-400/90 ring-2 ring-amber-400/20 shadow-[0_0_15px_rgba(245,158,11,0.15)] hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]" 
                            : "border-stone-200/90 hover:border-emerald-600/50"
                        )}
                      >
                        {isCurrentlyFeatured && <div className="absolute inset-0 bg-gradient-to-tr from-amber-50/30 via-transparent to-transparent pointer-events-none" />}
                        
                        <div className="relative z-10 flex flex-col justify-between h-full gap-3">
                          <div>
                            <div className="flex items-center justify-between gap-3 mb-2.5">
                              <div className="relative shrink-0">
                                {profileImg ? (
                                  <img 
                                    src={profileImg} 
                                    alt={b.name} 
                                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-stone-200/80 shadow-xs bg-stone-50 group-hover:scale-105 transition-transform duration-300" 
                                  />
                                ) : (
                                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#fff0f3] border border-rose-200 flex items-center justify-center text-rose-800 font-black text-xl shadow-xs">
                                    {b.name ? b.name.trim().charAt(0) : <Stethoscope className="h-6 w-6 text-rose-600" />}
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center justify-end gap-1.5 min-w-0">
                                {isCurrentlyFeatured && (
                                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-black px-2.5 py-0.5 rounded-full shadow-2xs border border-amber-300/60 shrink-0">
                                    ⭐ ممول
                                  </span>
                                )}
                                {vipInfo.isVip && (
                                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] bg-sky-50 text-sky-700 border border-sky-200 font-black px-2.5 py-0.5 rounded-full shadow-2xs shrink-0">
                                    ✓ موثّق
                                  </span>
                                )}
                                <span className={cn(
                                  "inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 border",
                                  liveStatus.isOpen
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                                    : "bg-stone-100 text-stone-500 border-stone-200"
                                )}>
                                  <span className={cn("w-1.5 h-1.5 rounded-full", liveStatus.dotColor)} />
                                  <span>{liveStatus.statusText}</span>
                                </span>
                              </div>
                            </div>

                            <h4 className={cn(
                              "font-black text-base sm:text-lg leading-snug transition-colors break-words whitespace-normal pt-1",
                              isCurrentlyFeatured
                                ? "text-amber-950 group-hover:text-amber-700"
                                : "text-stone-900 group-hover:text-rose-700"
                            )}>
                              {b.name}
                            </h4>

                            {b.description && (
                              <p className="text-xs text-stone-500 leading-relaxed line-clamp-2 mt-1.5">
                                {b.description}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mt-2.5 pt-1">
                              {b.category && (
                                <span className="text-rose-700 bg-rose-50 border border-rose-200/40 px-2.5 py-0.5 rounded-lg font-bold text-[11px]">
                                  {b.category}
                                </span>
                              )}
                              {(b.district || b.address) && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-stone-500 font-medium">
                                  <MapPin className="h-3 w-3 text-stone-400 shrink-0" />
                                  <span className="break-words">{b.district || b.address}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="border-t border-stone-100 pt-3 mt-1 flex items-center justify-between text-xs font-bold">
                            <div className="flex items-center gap-1.5">
                              {typeof b.rating === 'number' && b.rating > 0 ? (
                                <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-lg text-xs font-bold">
                                  ⭐ {b.rating.toFixed(1)}
                                  {typeof b.reviewCount === 'number' && b.reviewCount > 0 && (
                                    <span className="text-[10px] text-stone-400 font-normal">({b.reviewCount})</span>
                                  )}
                                </span>
                              ) : (
                                <span className="bg-rose-50 text-rose-700 border border-rose-200/50 px-2 py-0.5 rounded-lg text-xs">
                                  مركز معتمد
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-bold text-rose-700 group-hover:text-rose-800 group-hover:-translate-x-1 transition-all flex items-center gap-1">
                              عرض الملف الطبي <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
              </div>

              <Pagination
                currentPage={medicalPage}
                totalPages={Math.ceil(filteredMedical.length / 15)}
                onPageChange={(p) => setMedicalPage(p)}
                totalItems={filteredMedical.length}
                itemsPerPage={15}
              />
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
                  <Link key={h.id} to={`/housing/${h.id}`} className="bg-white rounded-2xl overflow-hidden border border-stone-200 hover:border-blue-500/50 hover:shadow-md transition-all flex flex-col group">
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

          {/* CATEGORY 5b: TRANSPORTATION */}
          {(activeTab === 'all' || activeTab === 'transportation') && (filteredTerminals.length > 0 || filteredRoutes.length > 0 || filteredTaxis.length > 0) && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-stone-200/60 pb-2">
                <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg"><Bus className="h-5 w-5" /></div>
                <h3 className="font-black text-lg text-stone-800">دليل المواصلات والنقل</h3>
                <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">
                  {filteredTerminals.length + filteredRoutes.length + filteredTaxis.length}
                </span>
              </div>

              {/* Terminals Sub-Section */}
              {filteredTerminals.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-black text-sm text-stone-700 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#ff9f1c]" />
                    <span>مجمعات الحافلات الرئيسية</span>
                  </h4>
                  <div className="space-y-4">
                    {filteredTerminals.slice(0, 3).map((terminal) => (
                      <div key={terminal.id} className="bg-white rounded-2xl p-5 border border-stone-200 shadow-2xs space-y-4">
                        <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3">
                          <div>
                            <h5 className="font-black text-base text-[#2d2a26]">{terminal.name}</h5>
                            <p className="text-xs text-stone-500 flex items-center gap-1 mt-1">
                              <MapPin className="h-3.5 w-3.5 text-[#ff9f1c]" />
                              <span>{terminal.location}</span>
                            </p>
                          </div>
                          <Link to="/transportation" className="text-xs text-[#1a4d2e] font-black hover:underline shrink-0">عرض الدليل الكامل</Link>
                        </div>
                        {terminal.description && (
                          <p className="text-xs text-stone-600 leading-relaxed font-medium">
                            {terminal.description}
                          </p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {terminal.destinations.slice(0, 4).map((dest, idx) => (
                            <div key={idx} className="bg-stone-50 rounded-xl p-3.5 border border-stone-200/80 flex flex-col justify-between gap-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-black text-xs text-[#2d2a26]">{dest.name}</span>
                                <span className="text-[10px] font-black text-[#1a4d2e] bg-emerald-100/80 px-2 py-0.5 rounded-full">
                                  {dest.approxFare}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[10px] text-stone-500 font-medium pt-1 border-t border-stone-200/60">
                                <span className="flex items-center gap-1">
                                  <Bus className="h-3 w-3 text-stone-400" />
                                  {dest.vehicleType}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-stone-400" />
                                  {dest.duration}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Routes Sub-Section */}
              {filteredRoutes.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-black text-sm text-stone-700 flex items-center gap-2 pt-2">
                    <ArrowLeftRight className="h-4 w-4 text-[#ff9f1c]" />
                    <span>خطوط السرفيس والباص الداخلي</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredRoutes.slice(0, 4).map((route, idx) => (
                      <div key={route.id || idx} className="bg-white rounded-2xl p-4.5 border border-stone-200 shadow-2xs space-y-3">
                        <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-2.5">
                          <div>
                            <span className="text-[9px] font-black bg-[#1a4d2e]/10 text-[#1a4d2e] px-2 py-0.5 rounded-full block w-fit mb-1">
                              {route.code}
                            </span>
                            <h5 className="font-black text-sm text-[#2d2a26]">{route.name}</h5>
                          </div>
                          <span className="text-xs font-black text-[#1a4d2e] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 shrink-0">
                            {route.fare}
                          </span>
                        </div>
                        {route.stops && route.stops.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium text-stone-500">
                            <span className="text-stone-400">مسار السير:</span>
                            {route.stops.map((stop, sIdx) => (
                              <span key={sIdx} className="bg-stone-50 text-stone-600 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                <span>{stop}</span>
                                {sIdx < route.stops.length - 1 && <span className="text-stone-300">←</span>}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Taxis Sub-Section */}
              {filteredTaxis.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-black text-sm text-stone-700 flex items-center gap-2 pt-2">
                    <Car className="h-4 w-4 text-[#ff9f1c]" />
                    <span>التاكسي والتطبيقات الذكية</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTaxis.slice(0, 3).map((taxi) => (
                      <div key={taxi.id} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-2xs flex gap-3 group">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-black text-lg shrink-0">🚖</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h5 className="font-black text-sm text-stone-800 truncate">{taxi.name}</h5>
                            {taxi.badge && (
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-bold">
                                {taxi.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-stone-500 line-clamp-2 mt-1 leading-relaxed">{taxi.description}</p>
                          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-stone-50">
                            {taxi.phone && (
                              <a href={`tel:${taxi.phone}`} className="text-[11px] font-bold text-stone-600 hover:text-emerald-700 flex items-center gap-1">
                                <Phone className="h-3 w-3 text-stone-400" />
                                <span>{taxi.phone}</span>
                              </a>
                            )}
                            {taxi.badge === 'تطبيقات ذكية' && (
                              <span className="text-[10px] font-black text-[#1a4d2e]">متاح للتنزيل</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CATEGORY 5c: TOURISM SPOTS */}
          {(activeTab === 'all' || activeTab === 'tourism') && filteredTourism.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-stone-200/60 pb-2">
                <div className="p-1.5 bg-[#ff9f1c]/10 text-[#ff9f1c] rounded-lg"><Compass className="h-5 w-5" /></div>
                <h3 className="font-black text-lg text-[#2d2a26]">الأماكن السياحية والمعالم</h3>
                <span className="text-xs font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md">{filteredTourism.length}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredTourism.map(spot => (
                  <Link key={spot.id} to="/tourism" className="bg-white rounded-2xl overflow-hidden border border-stone-200 hover:border-[#ff9f1c]/50 hover:shadow-md transition-all flex flex-col group">
                    <div className="relative aspect-[16/10] w-full bg-stone-100 overflow-hidden shrink-0">
                      <img src={spot.image} alt={spot.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-3 right-3 bg-[#ff9f1c] text-white font-black text-xs px-3 py-1.5 rounded-full shadow-md">
                        {spot.category}
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-stone-500 font-bold">
                          <MapPin className="h-3 w-3 text-[#ff9f1c]" />
                          <span className="truncate">{spot.location}</span>
                        </div>
                        <h4 className="font-black text-base text-stone-800 line-clamp-1 group-hover:text-[#ff9f1c] transition-colors">{spot.name}</h4>
                        <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">{spot.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(spot.tags || []).slice(0, 3).map((tag, tIdx) => (
                          <span key={tIdx} className="text-[9px] font-bold bg-stone-50 text-stone-500 px-2 py-0.5 rounded-md">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <div className="border-t border-stone-100 pt-3 flex items-center justify-between text-[11px] font-bold text-[#ff9f1c]">
                        <span className="text-stone-500 flex items-center gap-1 font-medium"><Clock className="h-3 w-3" /> {spot.openingHours}</span>
                        <span className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">شاهد التفاصيل <ChevronRight className="h-3 w-3 rotate-180" /></span>
                      </div>
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

      {/* Mobile Bottom Search Bar */}
      <div 
        className="sm:hidden fixed bottom-4 left-3 right-3 z-[100] flex items-center justify-center gap-2 max-w-[420px] mx-auto pointer-events-auto"
        dir="rtl"
      >
        {/* Filter Button (Replaces AI Button) */}
        <div className="relative">
          <button 
            type="button"
            onClick={() => setShowFiltersDropdown(!showFiltersDropdown)}
            className={`relative shrink-0 w-14 h-14 rounded-full flex flex-col items-center justify-center border shadow-lg transition-all cursor-pointer ${showFiltersDropdown ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-[#1a4d2e] hover:bg-[#143e24] text-white border-[#143e24]'} ${(selectedLocation !== 'الكل' || selectedMainCategory !== 'الكل' || selectedSubCategory !== 'الكل') ? 'ring-2 ring-emerald-400/50' : ''}`}
            title="تصفية النتائج"
          >
             <SlidersHorizontal className="w-5.5 h-5.5" />
             <span className="text-[10px] font-bold text-emerald-100 mt-0.5 leading-none">تصفية</span>
          </button>
          
          {/* Filters Dropdown Mobile */}
          {showFiltersDropdown && (
            <div className="absolute bottom-16 right-0 w-[280px] bg-white rounded-2xl shadow-xl border border-stone-100 p-4 z-50 flex flex-col gap-3 origin-bottom-right">
              {renderFiltersContent()}
            </div>
          )}
        </div>

        {/* Search Input */}
        <form onSubmit={handleFormSubmit} className="flex-1 h-14 bg-white border border-stone-200 shadow-lg rounded-full relative overflow-visible">
          <SearchIcon className="h-5 w-5 text-stone-400 absolute right-4 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              triggerSearch(e.target.value, true);
            }}
            placeholder="ابحث في إربد..."
            className="w-full h-full bg-transparent pr-11 pl-12 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 rounded-full transition-all [&::-webkit-search-cancel-button]:appearance-none"
          />
          {inputVal && (
            <button
              type="button"
              onClick={() => {
                setInputVal('');
                triggerSearch('', true);
              }}
              className="absolute left-1 top-1/2 -translate-y-1/2 p-2.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
