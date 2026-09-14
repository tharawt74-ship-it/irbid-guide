import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  where 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Business } from '../types';
import { compareBusinessesByTier } from '../lib/vipHelper';
import { Link, useNavigate } from 'react-router';
import { 
  Stethoscope, 
  Heart, 
  Activity, 
  Brain, 
  Bone, 
  Eye, 
  Baby, 
  User, 
  Phone, 
  Flame, 
  Microscope, 
  MapPin, 
  Star, 
  Clock, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  MessageSquare, 
  Pill, 
  ShieldAlert, 
  Sparkles,
  Smile,
  LayoutGrid,
  Zap,
  Building2
} from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { BusinessCard } from '../components/BusinessCard';
import { ALL_IRBID_DISTRICTS } from '../lib/categories';
import { BannerSlideshow } from '../components/BannerSlideshow';
import { fetchPageBanners, DEFAULT_MEDICAL_BANNERS } from '../lib/pageBanners';
import { HomepageBanner } from '../types';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import * as LucideIcons from 'lucide-react';
import { RegionDropdownFilter } from '../components/RegionDropdownFilter';
import { useAuth } from '../contexts/AuthContext';
import { getLiveWorkingStatus } from '../lib/businessHoursHelper';

// Custom Tooth icon matching Lucide styling perfectly
const Tooth = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M7 4C5.5 4 4 5.5 4 7.5C4 9.5 5 11 6.5 12C8 13 8 13.5 8 14.5V17C8 18.5 9 19.5 10 20C10.5 20 11 19.5 11 19V16C11 15 11.5 14.5 12 14.5C12.5 14.5 13 15 13 16V19C13 19.5 13.5 20 14 20C15 19.5 16 18.5 16 17V14.5C16 13.5 16 13 17.5 12C19 11 20 9.5 20 7.5C20 5.5 18.5 4 17 4C15.5 4 14.5 5.5 13.5 6.5C12.5 5.5 11.5 4 10 4C8.5 4 7.5 4 7 4Z" />
  </svg>
);

import { MEDICAL_SPECIALTIES, MedicalSpecialty } from '../lib/medicalCategories';

const getSpecIcon = (spec: any) => {
  if (spec.icon) return spec.icon;
  if (spec.iconName === 'Tooth' || spec.id === 'dentistry') return Tooth;
  const Icon = (LucideIcons as any)[spec.iconName];
  return Icon || LucideIcons.Stethoscope;
};

export default function Medical() {
  const navigate = useNavigate();
  const { userFavorites } = useAuth();
  const { medicalCategories } = useSystemSettings();
  
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [banners, setBanners] = useState<HomepageBanner[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [openNowFilter, setOpenNowFilter] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [activeSpecialty, setActiveSpecialty] = useState<string | null>(null);
  const [activeSubspecialty, setActiveSubspecialty] = useState<string | null>(null);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(true);
  const [isSpecialtiesModalOpen, setIsSpecialtiesModalOpen] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [isSubspecialtiesExpanded, setIsSubspecialtiesExpanded] = useState(false);

  const activeSpecObj = activeSpecialty ? medicalCategories.find(s => s.id === activeSpecialty) : null;

  // Load banners
  useEffect(() => {
    fetchPageBanners(['عيادات', 'طبي', 'صحة', 'مستشفى', 'أدوية'], DEFAULT_MEDICAL_BANNERS, 'medical')
      .then(res => setBanners(res))
      .catch(() => setBanners(DEFAULT_MEDICAL_BANNERS));
  }, []);

  // Fetch medical businesses from Firestore (Real database only)
  useEffect(() => {
    async function fetchMedicalData() {
      setLoading(true);
      try {
        // Query businesses in firestore matching medical categories
        const q = query(
          collection(db, 'businesses')
        );
        const querySnapshot = await getDocs(q);
        const fbData: Business[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Business;
          if (data.status === 'pending' || data.status === 'rejected') return;
          fbData.push({ id: doc.id, ...data });
        });

        // Filter strictly medical businesses from real database
        const strictlyMedical = fbData.filter(b => {
          if (b.medicalProfile) return true;
          const cat = (b.category || '').toLowerCase();
          const subCat = ((b as any).subCategory || (b as any).subcategory || '').toLowerCase();
          const desc = (b.description || '').toLowerCase();
          const name = (b.name || '').toLowerCase();
          return (
            cat.includes('طب') || 
            cat.includes('صحة') || 
            cat.includes('عياد') || 
            cat.includes('مستشف') || 
            cat.includes('مختبر') || 
            cat.includes('صيدل') ||
            cat.includes('علاج طبيعي') ||
            cat.includes('أسنان') ||
            cat.includes('باطن') ||
            cat.includes('جراح') ||
            cat.includes('عيون') ||
            subCat.includes('طب') ||
            subCat.includes('عياد') ||
            desc.includes('طبيب') ||
            name.includes('دكتور') ||
            name.includes('مركز طبي') ||
            name.includes('عيادة') ||
            name.includes('صيدلية') ||
            name.includes('مختبر')
          );
        });

        setBusinesses(strictlyMedical);
      } catch (err) {
        console.error("Error fetching medical businesses:", err);
        setBusinesses([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMedicalData();

    // Listen to real-time custom event when a medical facility is added
    const handleRefresh = () => {
      fetchMedicalData();
    };
    window.addEventListener('medical-business-added', handleRefresh);
    return () => {
      window.removeEventListener('medical-business-added', handleRefresh);
    };
  }, []);

  // Filter listings based on selections and sort strictly by tier: Featured -> Golden VIP -> Rest
  const filteredListings = useMemo(() => {
    const list = businesses.filter(b => {
      // 1. Region filter
      if (selectedRegion && selectedRegion !== 'الكل') {
        const matchesRegion = b.district === selectedRegion || (b.address || "").includes(selectedRegion) || b.region === selectedRegion;
        if (!matchesRegion) return false;
      }

      // 2. Specialty keywords filter
      if (activeSpecialty && activeSpecObj) {
        const textToSearch = `${b.name} ${b.description || ''} ${b.category || ''}`.toLowerCase();
        
        // If a subspecialty is selected, check its specific keywords, otherwise check main specialty keywords
        if (activeSubspecialty) {
          // Normalize names for comparison
          const subKey = activeSubspecialty.replace('أمراض ', '').replace('طب ', '').substring(0, 5).toLowerCase();
          const matchesSub = textToSearch.includes(subKey) || (activeSpecObj.keywords || []).some((k: string) => textToSearch.includes(k));
          if (!matchesSub) return false;
        } else {
          const matchesMain = (activeSpecObj.keywords || []).some((k: string) => textToSearch.includes(k));
          if (!matchesMain) return false;
        }
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch = 
          b.name.toLowerCase().includes(q) || 
          (b.description || '').toLowerCase().includes(q) ||
          (b.category || '').toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // 4. Open Now filter
      if (openNowFilter) {
        const status = getLiveWorkingStatus(b.workingHours);
        if (!status.isOpen) return false;
      }

      // 5. Favorites filter
      if (favoritesOnly) {
        if (!userFavorites.includes(b.id)) return false;
      }

      return true;
    });

    // Always sort by: Featured -> Golden VIP -> Rest
    const now = Date.now();
    return list.sort((a, b) => {
      return compareBusinessesByTier(a, b, undefined, now);
    });
  }, [businesses, selectedRegion, activeSpecialty, activeSpecObj, activeSubspecialty, searchQuery, openNowFilter, favoritesOnly, userFavorites]);

  return (
    <div className="min-h-screen bg-[#fdfcfb]" dir="rtl">
      <SEO 
        title="دليل الرعاية الطبية والصحة في إربد | عيادات ومستشفيات وصيدليات"
        description="تصفح جميع الاختصاصات الطبية العامة والدقيقة في محافظة إربد. دليلك الشامل للبحث عن الأطباء، العيادات، المستشفيات، الصيدليات ومختبرات التحاليل بأعلى درجات الدقة والتقييم الحقيقي."
      />

      {/* Emergency & Hot Numbers Floating Alert */}
      {isEmergencyOpen && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-4">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 text-right shadow-xs animate-in fade-in duration-300">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-red-100 text-red-600 rounded-xl shrink-0">
                <ShieldAlert className="h-4.5 w-4.5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-red-900">حالات الطوارئ والإنقاذ العاجلة</h4>
                <p className="text-[10px] sm:text-xs text-red-700 font-bold mt-0.5">الدفاع المدني والإسعاف الفوري: <span className="font-black text-red-900 underline">911</span></p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <a
                href="tel:911"
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors"
              >
                اتصال فوري
              </a>
              <button
                onClick={() => setIsEmergencyOpen(false)}
                className="p-1.5 hover:bg-red-100 text-red-500 rounded-xl cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 rotate-90" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner Slideshow */}
      <BannerSlideshow banners={banners} />
 
      {/* Search and Filters Hub - Renders ONLY when a specialty is selected */}
      {activeSpecialty && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4 animate-in fade-in duration-300">
          {/* Integrated Elegant Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 ابحث باسم الطبيب، عيادة الأسنان، الصيدلية، المختبر أو التخصص الدقيق..."
              className="w-full bg-white border border-stone-200 rounded-2xl px-5 py-4 pr-12 text-sm sm:text-base focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 font-extrabold text-[#2d2a26] shadow-sm transition-all placeholder-stone-400"
            />
            <Search className="h-5 w-5 text-stone-400 absolute right-4 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 font-black text-sm"
              >
                مسح ×
              </button>
            )}
          </div>

          {/* Region selection and status filters (Open Now & Favorites) */}
          <RegionDropdownFilter
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
            openNowFilter={openNowFilter}
            onToggleOpenNow={() => setOpenNowFilter(!openNowFilter)}
            favoritesOnly={favoritesOnly}
            onToggleFavorites={() => setFavoritesOnly(!favoritesOnly)}
            userFavoritesCount={userFavorites.length}
          />
        </div>
      )}
 
      <div id="specialties-list" className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        
        {/* UNIFIED SPECIALTIES HEADER */}
        <div className="flex items-center justify-between gap-4 mb-6 pb-2 border-b border-stone-100 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base md:text-lg font-black text-stone-900">تصفح الاختصاصات</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsSpecialtiesModalOpen(true)}
              className="text-[11px] sm:text-xs font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-full transition-all cursor-pointer"
            >
              <span>عرض جميع التخصصات</span>
              <span>←</span>
            </button>
          </div>
        </div>

        {/* If no specialty selected, show full intro grid. If selected, show square buttons (homepage style) with subspecialties */}
        {!activeSpecialty ? (
          <>
            {/* SPECIALTIES GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {medicalCategories.filter(s => s.active !== false).map(spec => {
                const SpecIcon = getSpecIcon(spec);
                const isSelected = activeSpecialty === spec.id;
                
                // Custom styling for general blue theme vs women-specific pink theme
                const themeClasses = spec.isFemale
                  ? 'bg-rose-50/50 hover:bg-rose-50 text-rose-950 border-rose-200/60 hover:border-rose-400'
                  : 'bg-blue-50/20 hover:bg-blue-50/60 text-blue-950 border-blue-100 hover:border-blue-300';

                const iconBgClasses = spec.isFemale
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-blue-100 text-blue-600';

                return (
                  <button
                    key={spec.id}
                    onClick={() => {
                      setActiveSpecialty(spec.id);
                      setActiveSubspecialty(null);
                    }}
                    className={`flex flex-col text-right p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${themeClasses}`}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div className={`p-2.5 rounded-xl ${iconBgClasses}`}>
                        <SpecIcon className="h-5 w-5" />
                      </div>
                      {spec.isFemale && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-rose-200/70 text-rose-800">
                          قسم صحة المرأة
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-black mb-1">{spec.name}</h3>
                    <p className="text-[10px] sm:text-xs font-medium leading-relaxed mb-2 opacity-80">
                      {spec.description}
                    </p>
                    <div className="mt-auto pt-2 flex items-center justify-between text-[11px] font-bold">
                      <span>{(spec.subspecialties || []).length} تخصص دقيق</span>
                      <ChevronLeft className="h-4 w-4" />
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="space-y-6 mb-8 animate-in fade-in duration-300">
            {/* SPECIALTY SQUARES ROW (LIKE HOMEPAGE) */}
            <div className="relative">
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#fdfcfb] to-transparent z-10 sm:hidden" />
              <div className="flex overflow-x-auto gap-3 pt-2.5 pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                
                {/* Reset Option (Back to All) */}
                <button
                  onClick={() => {
                    setActiveSpecialty(null);
                    setActiveSubspecialty(null);
                  }}
                  className="snap-start shrink-0 aspect-square w-[88px] sm:w-28 md:w-32 flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl md:rounded-[24px] transition-all duration-200 border text-center group cursor-pointer bg-white text-stone-700 border-stone-200 hover:border-blue-600/40 hover:bg-stone-50 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-2.5 bg-blue-100 text-blue-600">
                    <LayoutGrid className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-black truncate w-full">الكل</span>
                </button>

                {/* Specialties squares list */}
                {medicalCategories.filter(s => s.active !== false).map(spec => {
                  const SpecIcon = getSpecIcon(spec);
                  const isSelected = activeSpecialty === spec.id;
                  
                  const selectedBgClass = spec.isFemale
                    ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-600/25'
                    : 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/25';
                  
                  const iconBgClass = isSelected
                    ? 'bg-white/20 text-white'
                    : spec.isFemale
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-blue-50 text-blue-600';

                  return (
                    <button
                      key={spec.id}
                      onClick={() => {
                        setActiveSpecialty(spec.id);
                        setActiveSubspecialty(null);
                      }}
                      className={`snap-start shrink-0 aspect-square w-[88px] sm:w-28 md:w-32 flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl md:rounded-[24px] transition-all duration-200 border text-center group cursor-pointer ${
                        isSelected
                          ? `${selectedBgClass} -translate-y-1`
                          : 'bg-white text-stone-700 border-stone-200 hover:border-blue-600/40 hover:bg-stone-50 hover:-translate-y-0.5 hover:shadow-md'
                      }`}
                    >
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-2.5 transition-transform group-hover:scale-110 ${iconBgClass}`}>
                        <SpecIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-black truncate w-full">{spec.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SUBSPECIALTIES PILL SHAPES (LIKE HOMEPAGE) */}
            {activeSpecialty && activeSpecObj && activeSpecObj.subspecialties && activeSpecObj.subspecialties.length > 0 && (
              <div className="mt-4 mb-3">
                <div className="flex items-start sm:items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    {isSubspecialtiesExpanded ? (
                      <div className="flex flex-wrap gap-2 sm:gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <button
                          onClick={() => setActiveSubspecialty(null)}
                          className={`snap-start shrink-0 whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 border cursor-pointer ${
                            activeSubspecialty === null
                              ? (activeSpecObj.isFemale
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                                  : 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20')
                              : 'bg-white text-stone-600 border-[#e5e1da] hover:border-blue-600/30 hover:bg-stone-50'
                          }`}
                        >
                          عرض الكل
                        </button>
                        {activeSpecObj.subspecialties.map((sub: string) => (
                          <button
                            key={sub}
                            onClick={() => setActiveSubspecialty(activeSubspecialty === sub ? null : sub)}
                            className={`snap-start shrink-0 whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 border cursor-pointer ${
                              activeSubspecialty === sub
                                ? (activeSpecObj.isFemale
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                                    : 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20')
                                : 'bg-white text-stone-600 border-[#e5e1da] hover:border-blue-600/30 hover:bg-stone-50'
                            }`}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#fdfcfb] to-transparent z-10 sm:hidden" />
                        <div className="flex overflow-x-auto gap-2 sm:gap-2.5 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide snap-x items-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                          <button
                            onClick={() => setActiveSubspecialty(null)}
                            className={`snap-start shrink-0 whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 border cursor-pointer ${
                              activeSubspecialty === null
                                ? (activeSpecObj.isFemale
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                                    : 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20')
                                : 'bg-white text-stone-600 border-[#e5e1da] hover:border-blue-600/30 hover:bg-stone-50'
                            }`}
                          >
                            عرض الكل
                          </button>
                          {activeSpecObj.subspecialties.map((sub: string) => (
                            <button
                              key={sub}
                              onClick={() => setActiveSubspecialty(activeSubspecialty === sub ? null : sub)}
                              className={`snap-start shrink-0 whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 border cursor-pointer ${
                                activeSubspecialty === sub
                                  ? (activeSpecObj.isFemale
                                      ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                                      : 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20')
                                  : 'bg-white text-stone-600 border-[#e5e1da] hover:border-blue-600/30 hover:bg-stone-50'
                              }`}
                            >
                              {sub}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Fixed circular expand/collapse button */}
                  <button
                    onClick={() => setIsSubspecialtiesExpanded(!isSubspecialtiesExpanded)}
                    className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-stone-200 hover:border-blue-600/40 hover:bg-stone-50 text-stone-600 hover:text-stone-900 shadow-xs flex items-center justify-center transition-all duration-300 cursor-pointer"
                    title={isSubspecialtiesExpanded ? "عرض كشريط أفقي" : "تمديد للأسفل"}
                    aria-label={isSubspecialtiesExpanded ? "عرض كشريط أفقي" : "تمديد للأسفل"}
                  >
                    <ChevronDown className={`h-4.5 w-4.5 sm:h-5 sm:w-5 transition-transform duration-300 ${isSubspecialtiesExpanded ? 'rotate-180 text-blue-600' : ''}`} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LISTINGS SECTION */}
        {activeSpecialty && (
          <div className="flex flex-col lg:flex-row gap-6 items-start animate-in fade-in duration-300">
            
            {/* Main Listings Grid */}
            <div className="flex-1 w-full">
              {/* List Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-stone-900">
                    العيادات والمراكز المتاحة ({filteredListings.length})
                  </h3>
                  {selectedRegion !== 'الكل' && (
                    <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold">
                      في {selectedRegion}
                    </span>
                  )}
                </div>
                
                {(activeSpecialty || selectedRegion !== 'الكل' || searchQuery) && (
                  <button
                    onClick={() => {
                      setActiveSpecialty(null);
                      setActiveSubspecialty(null);
                      setSelectedRegion('الكل');
                      setSearchQuery('');
                    }}
                    className="text-xs font-bold text-red-600 hover:text-red-700 underline"
                  >
                    إعادة ضبط الفلاتر
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-stone-200/80">
                  <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-stone-500 font-bold text-sm mt-3">جاري جلب قائمة المراكز الطبية والعيادات...</span>
                </div>
              ) : filteredListings.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-16 bg-white rounded-3xl border border-stone-200/80 p-6 shadow-xs">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3.5 ring-8 ring-emerald-50/50">
                    <Stethoscope className="h-8 w-8" />
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-stone-800">لا توجد منشآت أو عيادات مضافة في هذا التصنيف حالياً</h4>
                  <p className="text-xs sm:text-sm text-stone-500 mt-1.5 max-w-md leading-relaxed">
                    هل أنت طبيب أو أخصائي أو تملك منشأة طبية في إربد؟ كن أول من يوثق ويسجل عيادته لاستقبال المرضى والمراجعين فورياً.
                  </p>
                  <Link
                    to="/medical/register"
                    className="mt-5 px-6 py-3 bg-gradient-to-r from-emerald-600 to-[#1a4d2e] hover:from-emerald-700 hover:to-[#133b22] text-white rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
                  >
                    <Stethoscope className="h-4 w-4 text-emerald-200" />
                    <span>أضف عيادتك أو منشأتك الآن 🩺</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredListings.map(b => (
                    <div key={b.id} className="relative group">
                      <BusinessCard business={b} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Informational / Hospital & Pharmacy Directory Widget */}
            <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
              
              {/* Hospitals Widget */}
              <div className="bg-white rounded-2xl border border-stone-200/80 p-4 sm:p-5 shadow-xs">
                <h4 className="text-xs sm:text-sm font-black text-stone-900 border-b border-stone-200/60 pb-2 mb-3 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <span>أبرز مستشفيات محافظة إربد</span>
                </h4>
                <div className="flex flex-col gap-2.5">
                  {[
                    { name: 'مستشفى الملك المؤسس عبدالله الجامعي', type: 'جامعي حكومي', tel: '027200600' },
                    { name: 'مستشفى الأميرة بسمة التعليمي', type: 'حكومي', tel: '027241011' },
                    { name: 'مستشفى إربد التخصصي', type: 'خاص', tel: '027248111' },
                    { name: 'مستشفى راهبات الوردية', type: 'خاص', tel: '027245415' },
                    { name: 'مستشفى ابن النفيس التخصصي', type: 'خاص', tel: '027201900' }
                  ].map((hospital, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                      <div className="min-w-0">
                        <h5 className="text-[11px] font-black text-stone-800 truncate">{hospital.name}</h5>
                        <span className="text-[9px] font-bold text-stone-400 mt-0.5 inline-block">{hospital.type}</span>
                      </div>
                      <a 
                        href={`tel:${hospital.tel}`}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        title="اتصال مباشر"
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emergency Pharmacies Alert */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-2xl border border-emerald-100 p-4 sm:p-5 shadow-xs">
                <h4 className="text-xs sm:text-sm font-black text-stone-900 border-b border-emerald-200/60 pb-2 mb-3 flex items-center gap-1.5">
                  <Pill className="h-4 w-4 text-emerald-600 animate-bounce" />
                  <span>صيدليات الخدمة والمناوبة 24 ساعة</span>
                </h4>
                <p className="text-[10px] sm:text-xs text-stone-600 font-bold leading-relaxed mb-4">
                  تتوفر العديد من الصيدليات المناوبة ليلاً في الحي الجنوبي وشارع الجامعة وقرب المستشفيات الرئيسية لتوفير الأدوية الطارئة.
                </p>
                <button 
                  onClick={() => {
                    setSelectedRegion('الكل');
                    setActiveSpecialty('pharmacies');
                    setActiveSubspecialty('صيدليات 24 ساعة (المناوبة)');
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white text-xs font-black transition-colors"
                >
                  <span>عرض الصيدليات المناوبة</span>
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
              
              {/* Guide Info */}
              <div className="bg-stone-50 border border-stone-200/60 rounded-2xl p-4 text-center">
                <Sparkles className="h-5 w-5 text-amber-500 mx-auto mb-2" />
                <h5 className="text-xs font-black text-stone-800">هل أنت طبيب أو تملك منشأة طبية؟</h5>
                <p className="text-[10px] text-stone-500 mt-1 font-bold leading-relaxed">
                  سجل عيادتك أو منشأتك الطبية في منصة شو في بإربد المعتمدة وابدأ باستقبال المراجعين وتنسيق المواعيد مباشرة.
                </p>
                <Link 
                  to="/medical/register"
                  className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-2 bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-400 rounded-xl text-xs font-black text-[#1a4d2e] transition-all cursor-pointer shadow-2xs"
                >
                  <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />
                  <span>أضف منشأتك الطبية الآن</span>
                </Link>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* Specialties Search & Browse Modal */}
      {isSpecialtiesModalOpen && (
        <div 
          className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsSpecialtiesModalOpen(false)}
        >
          <div 
            className="bg-[#fdfcfb] w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200/80 relative flex flex-col max-h-[88vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-stone-200/60 shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Activity className="h-4.5 w-4.5 animate-pulse" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-stone-900">جميع الاختصاصات والعيادات الطبية</h3>
              </div>
              <button
                onClick={() => setIsSpecialtiesModalOpen(false)}
                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-500 font-bold text-xs transition-colors cursor-pointer"
                aria-label="إغلاق"
              >
                إغلاق ×
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 sm:p-6 border-b border-stone-200/40 bg-stone-50/50 shrink-0">
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="ابحث عن اختصاص رئيسي أو عيادة فرعية دقيقة..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  className="w-full pr-10 pl-10 py-2.5 bg-white border border-stone-200 rounded-xl font-bold text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                {modalSearchTerm && (
                  <button
                    onClick={() => setModalSearchTerm('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-stone-400 hover:text-stone-700"
                  >
                    مسح
                  </button>
                )}
              </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {medicalCategories.filter(s => s.active !== false).map(spec => {
                const SpecIcon = getSpecIcon(spec);
                const matchesSearch = 
                  spec.name.includes(modalSearchTerm) || 
                  (spec.description || '').includes(modalSearchTerm) ||
                  (spec.subspecialties || []).some((s: string) => s.includes(modalSearchTerm)) ||
                  (spec.keywords || []).some((k: string) => k.includes(modalSearchTerm));

                if (modalSearchTerm && !matchesSearch) return null;

                const filteredSubs = (spec.subspecialties || []).filter((sub: string) => 
                  !modalSearchTerm || sub.includes(modalSearchTerm)
                );

                return (
                  <div key={spec.id} className="border border-stone-200/60 bg-white p-4 rounded-2xl shadow-3xs space-y-3">
                    <button
                      onClick={() => {
                        setActiveSpecialty(spec.id);
                        setActiveSubspecialty(null);
                        setIsSpecialtiesModalOpen(false);
                        window.scrollTo({ top: 400, behavior: 'smooth' });
                      }}
                      className="w-full flex items-center justify-between text-right group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-2 rounded-xl ${
                          spec.isFemale ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          <SpecIcon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-stone-900 group-hover:text-blue-600 transition-colors">
                            {spec.name}
                          </h4>
                          <p className="text-[10px] text-stone-400 font-bold truncate max-w-md">
                            {spec.description}
                          </p>
                        </div>
                      </div>
                      <ChevronLeft className="h-4 w-4 text-stone-400 group-hover:translate-x-[-4px] transition-transform" />
                    </button>

                    <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-stone-100">
                      {filteredSubs.map(sub => (
                        <button
                          key={sub}
                          onClick={() => {
                            setActiveSpecialty(spec.id);
                            setActiveSubspecialty(sub);
                            setIsSpecialtiesModalOpen(false);
                            window.scrollTo({ top: 400, behavior: 'smooth' });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-stone-50 hover:bg-blue-50 hover:text-blue-700 text-stone-600 border border-stone-200/40 text-[10px] font-black transition-all cursor-pointer"
                        >
                          {sub}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
