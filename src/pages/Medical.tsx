import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  where 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Business, InFeedPromoCard } from '../types';
import { compareBusinessesByTier } from '../lib/vipHelper';
import { fetchPagePromoCards } from '../lib/promoCards';
import { InFeedPromoCardItem } from '../components/common/InFeedPromoCardItem';
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
  Building2,
  X,
  SlidersHorizontal
} from 'lucide-react';
import { VoiceSearchButton } from '../components/common/VoiceSearchButton';
import { SEO } from '../components/common/SEO';
import { BusinessCard } from '../components/BusinessCard';
import { BusinessCardSkeleton } from '../components/common/Skeleton';
import { ALL_IRBID_DISTRICTS } from '../lib/categories';
import { BannerSlideshow } from '../components/BannerSlideshow';
import { fetchPageBanners, DEFAULT_MEDICAL_BANNERS } from '../lib/pageBanners';
import { HomepageBanner } from '../types';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import * as LucideIcons from 'lucide-react';
import { RegionDropdownFilter } from '../components/RegionDropdownFilter';
import { useAuth } from '../contexts/AuthContext';
import { getLiveWorkingStatus } from '../lib/businessHoursHelper';
import { cn } from '../lib/utils';
import { useHeaderVisibility } from '../lib/useHeaderVisibility';
import { isMedicalBusiness } from '../lib/medicalHelper';
import { getCachedBusinesses, setCachedBusinesses, isBusinessesCacheFresh } from '../lib/dataCache';
import { MedicalFilterModal, AppliedMedicalFilters } from '../components/MedicalFilterModal';

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

/**
 * Robust medical specialty and subspecialty matcher.
 * Matches facilities by ID, category, subcategory, facilityType, doctor profile, staff, procedures, and keywords.
 */
export function matchesMedicalSpecialty(
  b: Business, 
  specId: string, 
  specObj: any, 
  subspecialty: string | null
): boolean {
  if (!b || !specId || !specObj) return false;
  if (!isMedicalBusiness(b)) return false;

  const combinedText = [
    b.name || '',
    b.category || '',
    (b as any).subCategory || (b as any).subcategory || '',
    b.description || '',
    (b as any).specialty || (b as any).medicalSpecialty || '',
    b.facilityType || '',
    b.medicalProfile?.doctorProfile?.name || '',
    b.medicalProfile?.doctorProfile?.title || '',
    (b.medicalProfile?.doctorProfile as any)?.specialty || '',
    b.medicalProfile?.doctorProfile?.subspecialty || '',
    b.medicalProfile?.doctorProfile?.bio || '',
    ...(b.medicalProfile?.doctorsList || []).flatMap(d => [d.name || '', d.title || '', d.subspecialty || '', d.bio || '']),
    ...(b.medicalProfile?.procedures || []).flatMap(p => [p.name || '', p.category || '', p.description || ''])
  ].join(' ').toLowerCase();

  const bizSubCat = ((b as any).subCategory || (b as any).subcategory || b.medicalProfile?.doctorProfile?.subspecialty || '').trim().toLowerCase();
  const bizCat = (b.category || '').trim().toLowerCase();
  const bizSpecialty = ((b as any).specialty || (b as any).medicalSpecialty || '').trim().toLowerCase();
  const bizFacility = (b.facilityType || '').trim().toLowerCase();

  // 1. Verify Main Specialty Match
  let matchesMain = false;

  // Direct ID or Category name match
  if (
    bizSpecialty === specId.toLowerCase() ||
    bizCat === specObj.name.toLowerCase() ||
    bizCat.includes(specObj.name.toLowerCase()) ||
    specObj.name.toLowerCase().includes(bizCat)
  ) {
    matchesMain = true;
  }
  // Facility type match
  else if (specId === 'pharmacies' && (bizFacility === 'pharmacy' || bizCat.includes('صيدل') || combinedText.includes('صيدل') || combinedText.includes('دواء'))) {
    matchesMain = true;
  }
  else if (specId === 'hospitals' && (bizFacility === 'hospital' || bizCat.includes('مستشف') || combinedText.includes('مستشف') || combinedText.includes('طوارئ 24'))) {
    matchesMain = true;
  }
  else if (specId === 'laboratories' && (bizFacility === 'lab' || bizCat.includes('مختبر') || bizCat.includes('أشعة') || combinedText.includes('مختبر') || combinedText.includes('أشعة'))) {
    matchesMain = true;
  }
  else if (specId === 'physiotherapy' && (bizFacility === 'physio' || combinedText.includes('علاج طبيعي') || combinedText.includes('تأهيل حركي'))) {
    matchesMain = true;
  }
  // Subcategory belongs to this main specialty
  else if (bizSubCat && specObj.subspecialties && specObj.subspecialties.some((sub: string) => {
    const s = sub.toLowerCase();
    return s.includes(bizSubCat) || bizSubCat.includes(s);
  })) {
    matchesMain = true;
  }
  // Specialty keywords match
  else if (specObj.keywords && specObj.keywords.some((k: string) => combinedText.includes(k.toLowerCase()))) {
    matchesMain = true;
  }

  // If not in this main specialty, exclude
  if (!matchesMain) return false;

  // 2. If no subspecialty filter is active, business is accepted
  if (!subspecialty) return true;

  // 3. Subspecialty filter is active: must strictly match this subspecialty
  const targetSub = subspecialty.trim().toLowerCase();

  // Direct match on business subCategory
  if (bizSubCat && (bizSubCat.includes(targetSub) || targetSub.includes(bizSubCat))) {
    return true;
  }

  // Match in doctors list
  if (b.medicalProfile?.doctorsList?.some(doc => {
    const dSub = (doc.subspecialty || '').trim().toLowerCase();
    return dSub && (dSub.includes(targetSub) || targetSub.includes(dSub));
  })) {
    return true;
  }

  // Match in procedures
  if (b.medicalProfile?.procedures?.some(proc => {
    const pName = (proc.name || '').toLowerCase();
    const pCat = (proc.category || '').toLowerCase();
    return pName.includes(targetSub) || pCat.includes(targetSub);
  })) {
    return true;
  }

  // Significant subspecialty keywords match
  const stopWords = new Set(['أمراض', 'طب', 'وجراحة', 'جراحة', 'في', 'أو', 'و', 'عام', 'عامة', 'شاملة', 'ال', 'قسم', 'مركز']);
  const subWords = targetSub
    .replace(/[()\/\\-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stopWords.has(w));

  if (subWords.length > 0) {
    const matchedCount = subWords.filter(w => combinedText.includes(w)).length;
    if (matchedCount >= 1) {
      return true;
    }
  }

  return false;
}

export default function Medical() {
  const navigate = useNavigate();
  const { userFavorites } = useAuth();
  const { medicalCategories } = useSystemSettings();
  
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [banners, setBanners] = useState<HomepageBanner[]>([]);
  const [promoCards, setPromoCards] = useState<InFeedPromoCard[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [medicalSortBy, setMedicalSortBy] = useState<'default' | 'rating' | 'trusted'>('default');
  const [selectedInsurance, setSelectedInsurance] = useState('');
  const [openNowFilter, setOpenNowFilter] = useState(false);
  const [directInsuranceOnly, setDirectInsuranceOnly] = useState(false);
  const [appointmentOnly, setAppointmentOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [activeSpecialty, setActiveSpecialty] = useState<string | null>(null);
  const [activeSubspecialty, setActiveSubspecialty] = useState<string | null>(null);
  const [isSpecialtiesModalOpen, setIsSpecialtiesModalOpen] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [isSubspecialtiesExpanded, setIsSubspecialtiesExpanded] = useState(false);
  const showHeader = useHeaderVisibility();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isFloatingSearchOpen, setIsFloatingSearchOpen] = useState(false);
  const [isFloatingFilterOpen, setIsFloatingFilterOpen] = useState(false);

  const activeSpecObj = activeSpecialty ? medicalCategories.find(s => s.id === activeSpecialty) : null;

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedRegion && selectedRegion !== 'الكل') count++;
    if (activeSpecialty) count++;
    if (activeSubspecialty) count++;
    if (selectedInsurance) count++;
    if (openNowFilter) count++;
    if (directInsuranceOnly) count++;
    if (appointmentOnly) count++;
    if (favoritesOnly) count++;
    if (medicalSortBy !== 'default') count++;
    return count;
  }, [selectedRegion, activeSpecialty, activeSubspecialty, selectedInsurance, openNowFilter, directInsuranceOnly, appointmentOnly, favoritesOnly, medicalSortBy]);

  // Load banners and promo cards
  useEffect(() => {
    fetchPagePromoCards('medical').then(cards => setPromoCards(cards)).catch(() => {});
    fetchPageBanners(['عيادات', 'طبي', 'صحة', 'مستشفى', 'أدوية'], DEFAULT_MEDICAL_BANNERS, 'medical')
      .then(res => setBanners(res))
      .catch(() => setBanners(DEFAULT_MEDICAL_BANNERS));
  }, []);

  // Fetch medical businesses from Firestore (Real database only)
  useEffect(() => {
    async function fetchMedicalData() {
      setLoading(true);
      try {
        const cached = getCachedBusinesses();
        let fbData: Business[] = [];
        if (cached && cached.length > 0) {
          fbData = cached;
        } else {
          // Query businesses in firestore matching medical categories
          const q = query(
            collection(db, 'businesses')
          );
          const querySnapshot = await getDocs(q);
          fbData = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data() as Business;
            if (data.status === 'pending' || data.status === 'rejected' || data.status === 'hidden' || data.isHidden) return;
            fbData.push({ id: doc.id, ...data });
          });
          if (fbData.length > 0) {
            setCachedBusinesses(fbData);
          }
        }

        // Filter strictly medical businesses from real database
        const strictlyMedical = fbData.filter(b => {
          if (!isMedicalBusiness(b)) return false;
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

      // 2. Specialty & Subspecialty accurate filter
      if (activeSpecialty && activeSpecObj) {
        if (!matchesMedicalSpecialty(b, activeSpecialty, activeSpecObj, activeSubspecialty)) {
          return false;
        }
      }

      // 3. Insurance filter
      if (selectedInsurance) {
        const bInsurances = b.medicalProfile?.insurances || [];
        const hasIns = bInsurances.some(ins => {
          const insName = typeof ins === 'string' ? ins : ins.name;
          return insName.includes(selectedInsurance) || selectedInsurance.includes(insName);
        }) || (b.description || '').includes(selectedInsurance);
        if (!hasIns) return false;
      }

      // 4. Open Now filter
      if (openNowFilter) {
        const status = getLiveWorkingStatus(b.workingHours);
        if (!status.isOpen) return false;
      }

      // 5. Direct insurance billing filter
      if (directInsuranceOnly) {
        const hasDirect = (b.medicalProfile?.insurances || []).some(ins => {
          if (typeof ins === 'string') return true;
          return ins.isDirectBilling;
        }) || (b.description || '').includes('تأمين');
        if (!hasDirect) return false;
      }

      // 6. Favorites filter
      if (favoritesOnly) {
        if (!userFavorites.includes(b.id)) return false;
      }

      return true;
    });

    const now = Date.now();
    return list.sort((a, b) => {
      if (medicalSortBy === 'rating') {
        const rA = a.rating || 0;
        const rB = b.rating || 0;
        if (rB !== rA) return rB - rA;
      }

      return compareBusinessesByTier(a, b, undefined, now);
    });
  }, [businesses, selectedRegion, activeSpecialty, activeSpecObj, activeSubspecialty, selectedInsurance, openNowFilter, directInsuranceOnly, appointmentOnly, favoritesOnly, userFavorites, medicalSortBy]);

  return (
    <div className="min-h-screen bg-[#fdfcfb]" dir="rtl">
      <SEO 
        title="دليل الرعاية الطبية والصحة في إربد | عيادات ومستشفيات وصيدليات"
        description="تصفح جميع الاختصاصات الطبية العامة والدقيقة في محافظة إربد. دليلك الشامل للبحث عن الأطباء، العيادات، المستشفيات، الصيدليات ومختبرات التحاليل بأعلى درجات الدقة والتقييم الحقيقي."
      />

      {/* ========================================================================= */}
      {/* 1. MOBILE & TABLET APP BAR & OPTIMIZED LAYOUT (lg:hidden)                 */}
      {/* ========================================================================= */}
      <div className="lg:hidden w-full pb-12">
        {/* Mobile Sticky Top App Bar (Native platform layout matching Products & Home) */}
        <div className={cn(
          "sticky z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-2xs px-4 py-2.5 space-y-2 transition-all duration-300 w-full",
          showHeader ? "top-[62px] sm:top-[68px] md:top-[72px]" : "top-0"
        )}>
          {/* Row 1: Search Bar & Filter Sheet Button */}
          <div className="flex items-center gap-2">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (searchInput.trim()) {
                  navigate(`/search?q=${encodeURIComponent(searchInput.trim())}&tab=medical`);
                }
              }}
              className="relative flex-1 min-w-0"
            >
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
              <input
                type="search"
                enterKeyHint="search"
                placeholder="عن ماذا تبحث؟ طبيب، عيادة، تخصص..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full h-10 pl-16 pr-9 bg-stone-100/90 border border-stone-200 rounded-xl text-xs font-bold placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-all cursor-text [&::-webkit-search-cancel-button]:appearance-none"
              />
              <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 z-10">
                <VoiceSearchButton
                  onTranscript={(text) => {
                    setSearchInput(text);
                    navigate(`/search?q=${encodeURIComponent(text.trim())}&tab=medical`);
                  }}
                  size="sm"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="text-stone-400 hover:text-stone-600 p-1 rounded-full cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </form>

            {/* Filter Sheet Trigger Button */}
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="h-10 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
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

          {/* Row 2: Horizontal Specialty Pills Carousel (Edge-To-Edge Scroll) */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pt-0.5 pb-1 -mx-2.5 px-2.5 sm:-mx-4 sm:px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {/* All Specialties Pill */}
            <button
              type="button"
              onClick={() => {
                setActiveSpecialty(null);
                setActiveSubspecialty(null);
              }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                activeSpecialty === null
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-transparent shadow-xs font-black'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-blue-300'
              }`}
            >
              <span>الكل</span>
              <span className="text-[10px] opacity-80">({businesses.length})</span>
            </button>

            {/* Main Medical Specialties Pills */}
            {medicalCategories.filter(s => s.active !== false).map((spec) => {
              const isSelected = activeSpecialty === spec.id;
              return (
                <button
                  type="button"
                  key={spec.id}
                  onClick={() => {
                    setActiveSpecialty(isSelected ? null : spec.id);
                    setActiveSubspecialty(null);
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-transparent shadow-xs font-black'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-blue-300'
                  }`}
                >
                  <span>{spec.name}</span>
                </button>
              );
            })}
          </div>

          {/* Row 3: Subspecialties Carousel (If Specialty Selected - Edge-To-Edge Scroll) */}
          {activeSpecialty && activeSpecObj && activeSpecObj.subspecialties && activeSpecObj.subspecialties.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pt-0.5 pb-1 -mx-2.5 px-2.5 sm:-mx-4 sm:px-4 border-t border-stone-100" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <button
                type="button"
                onClick={() => setActiveSubspecialty(null)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                  activeSubspecialty === null
                    ? 'bg-blue-800/15 text-blue-800 border-blue-800/30 font-black'
                    : 'bg-stone-100 text-stone-600 border-stone-200'
                }`}
              >
                الكل الفرعي
              </button>
              {activeSpecObj.subspecialties.map((sub: string) => (
                <button
                  type="button"
                  key={sub}
                  onClick={() => setActiveSubspecialty(activeSubspecialty === sub ? null : sub)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                    activeSubspecialty === sub
                      ? 'bg-blue-800/15 text-blue-800 border-blue-800/30 font-black'
                      : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Compact Banner Slideshow for Mobile */}
        <div className="px-4 pt-3">
          <BannerSlideshow banners={banners} />
        </div>

        {/* Browse Specialties Section on Mobile */}
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-stone-900 flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
              <span>تصفح الاختصاصات الطبية</span>
            </h3>
            <button
              onClick={() => setIsSpecialtiesModalOpen(true)}
              className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full cursor-pointer"
            >
              عرض الكل ←
            </button>
          </div>

          {!activeSpecialty ? (
            /* 2-Column Specialty Cards: comfortable width, absolutely NO text cutting */
            <div className="grid grid-cols-2 gap-3">
              {medicalCategories.filter(s => s.active !== false).map(spec => {
                const SpecIcon = getSpecIcon(spec);
                const themeClasses = spec.isFemale
                  ? 'bg-rose-50 border-rose-100/60 text-rose-950'
                  : 'bg-blue-50/45 border-blue-100/60 text-blue-950';

                const iconBgClasses = spec.isFemale
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-blue-100/80 text-blue-600';

                return (
                  <button
                    key={spec.id}
                    onClick={() => {
                      setActiveSpecialty(spec.id);
                      setActiveSubspecialty(null);
                    }}
                    className={`flex flex-col items-center justify-center text-center p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${themeClasses}`}
                  >
                    <div className={`p-2.5 rounded-xl mb-2 ${iconBgClasses} shrink-0`}>
                      <SpecIcon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-black leading-normal text-stone-850 px-1 block max-w-full">
                      {spec.name}
                    </span>
                    <span className="text-[10px] font-bold text-stone-400 mt-1">
                      {(spec.subspecialties || []).length} تخصص فرعي
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Mobile Listings Section Container */}
        <div id="listings-container-mobile" className="px-4 pt-2 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <h4 className="text-xs font-black text-stone-800">
              {activeSpecialty ? `النتائج المتاحة (${filteredListings.length})` : "جميع المراكز والعيادات الطبية"}
            </h4>
            {(activeSpecialty || selectedRegion || searchQuery || activeFiltersCount > 0 || searchInput) && (
              <button
                onClick={() => {
                  setActiveSpecialty(null);
                  setActiveSubspecialty(null);
                  setSelectedRegion('');
                  setSearchQuery('');
                  setSearchInput('');
                  setOpenNowFilter(false);
                  setFavoritesOnly(false);
                }}
                className="text-[10px] font-black text-red-600 hover:text-red-700 underline"
              >
                إعادة ضبط الفلاتر
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <BusinessCardSkeleton key={idx} />
              ))}
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 bg-white border border-stone-200/80 rounded-2xl p-5 shadow-3xs">
              <div className="w-12 h-12 rounded-full bg-stone-50 text-stone-400 flex items-center justify-center mb-2.5">
                <Stethoscope className="h-5 w-5" />
              </div>
              <h5 className="text-xs font-black text-stone-800">لا تتوفر عيادات مضافة في هذا التصنيف حالياً</h5>
              <p className="text-[9.5px] text-stone-400 font-bold mt-1 max-w-xs leading-relaxed">
                هل أنت طبيب أو أخصائي في إربد؟ أضف عيادتك الطبية لتظهر لآلاف المرضى والمراجعين في دليل الرعاية الطبية.
              </p>
              <Link
                to="/medical/register"
                className="mt-3.5 px-4 py-2 bg-[#1a4d2e] text-white rounded-xl text-[10px] font-black"
              >
                أضف عيادتك الآن
              </Link>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredListings.flatMap((b, idx) => {
                const node = (
                  <div key={b.id} className="relative">
                    <BusinessCard business={b} />
                  </div>
                );
                const shouldInsertPromo = (idx === 2 || (idx === filteredListings.length - 1 && filteredListings.length < 3)) && promoCards[0];
                return shouldInsertPromo ? [node, <InFeedPromoCardItem key={`promo_${promoCards[0].id}_${idx}`} card={promoCards[0]} />] : [node];
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP ORIGINAL UNTOUCHED LAYOUT (hidden lg:block)                     */}
      {/* ========================================================================= */}
      <div className="hidden lg:block w-full">
        {/* Banner Slideshow */}
        <BannerSlideshow banners={banners} />
    
        {/* DESKTOP HEADER SECTION */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e5e1da]/60 pb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight flex items-center gap-2.5">
                <Activity className="h-7 w-7 text-blue-600" />
                <span>الرعاية الطبية والصحة</span>
              </h1>
            </div>
          </div>
        </div>

        {activeSpecialty && (
          <div className="hidden lg:flex items-center justify-between text-xs text-stone-400 font-bold max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4 pt-4">
            <span>تصفح الاختصاصات والعيادات الطبية</span>
            <span>عدد العناصر: <strong className="text-blue-700">{filteredListings.length}</strong></span>
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
            <div className="space-y-2 mb-6 animate-in fade-in duration-300">
              {/* SPECIALTY SQUARES ROW (LIKE HOMEPAGE) */}
              <div className="relative">
                <div className="flex flex-nowrap overflow-x-auto gap-3 pt-1 pb-1.5 mx-0 px-0 sm:mx-0 sm:px-0 scrollbar-hide snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  
                  {/* Reset Option (Back to All) */}
                  {(() => {
                    const isSelected = activeSpecialty === null;
                    return (
                      <button
                        onClick={() => {
                          setActiveSpecialty(null);
                          setActiveSubspecialty(null);
                        }}
                        className={`snap-start shrink-0 min-h-[44px] sm:min-h-[48px] px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-2.5 transition-all duration-200 border cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20 -translate-y-0.5 font-black'
                            : 'bg-white text-[#2d2a26] border-[#e5e1da] hover:border-blue-600/40 hover:bg-[#fcfbfa] hover:-translate-y-0.5 hover:shadow-xs font-bold'
                        }`}
                      >
                        <LayoutGrid className={`h-4.5 w-4.5 sm:h-5 sm:w-5 shrink-0 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
                        <span className="text-xs sm:text-sm">الكل</span>
                      </button>
                    );
                  })()}

                  {/* Specialties list */}
                  {medicalCategories.filter(s => s.active !== false).map(spec => {
                    const SpecIcon = getSpecIcon(spec);
                    const isSelected = activeSpecialty === spec.id;
                    
                    const activeColorClass = spec.isFemale
                      ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                      : 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20';

                    const iconColorClass = isSelected
                      ? 'text-white'
                      : spec.isFemale
                        ? 'text-rose-600'
                        : 'text-blue-600';

                    return (
                      <button
                        key={spec.id}
                        onClick={() => {
                          setActiveSpecialty(spec.id);
                          setActiveSubspecialty(null);
                        }}
                        className={`snap-start shrink-0 min-h-[44px] sm:min-h-[48px] px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-2.5 transition-all duration-200 border cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? `${activeColorClass} -translate-y-0.5 font-black`
                            : 'bg-white text-[#2d2a26] border-[#e5e1da] hover:border-blue-600/40 hover:bg-[#fcfbfa] hover:-translate-y-0.5 hover:shadow-xs font-bold'
                        }`}
                      >
                        <SpecIcon className={`h-4.5 w-4.5 sm:h-5 sm:w-5 shrink-0 ${iconColorClass}`} />
                        <span className="text-xs sm:text-sm">{spec.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SUBSPECIALTIES PILL SHAPES (LIKE HOMEPAGE) */}
              {activeSpecialty && activeSpecObj && activeSpecObj.subspecialties && activeSpecObj.subspecialties.length > 0 && (
                <div className="mt-1.5 sm:mt-2 mb-2">
                  <div className="flex items-start sm:items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                      {isSubspecialtiesExpanded ? (
                        <div className="flex flex-wrap gap-2 sm:gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                          <button
                            onClick={() => setActiveSubspecialty(null)}
                            className={`snap-start shrink-0 whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 border cursor-pointer ${
                              activeSubspecialty === null
                                ? (activeSpecObj.isFemale
                                    ? 'bg-rose-600/15 text-rose-700 border-rose-600/35 shadow-xs font-bold'
                                    : 'bg-blue-600/15 text-blue-700 border-blue-600/35 shadow-xs font-bold')
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
                                      ? 'bg-rose-600/15 text-rose-700 border-rose-600/35 shadow-xs font-bold'
                                      : 'bg-blue-600/15 text-blue-700 border-blue-600/35 shadow-xs font-bold')
                                  : 'bg-white text-stone-600 border-[#e5e1da] hover:border-blue-600/30 hover:bg-stone-50'
                              }`}
                            >
                              {sub}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="relative">
                          <div className="flex flex-nowrap overflow-x-auto gap-2 sm:gap-2.5 pb-2 mx-0 px-0 sm:mx-0 sm:px-0 scrollbar-hide snap-x items-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            <button
                              onClick={() => setActiveSubspecialty(null)}
                              className={`snap-start shrink-0 whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 border cursor-pointer ${
                                activeSubspecialty === null
                                  ? (activeSpecObj.isFemale
                                      ? 'bg-rose-600/15 text-rose-700 border-rose-600/35 shadow-xs font-bold'
                                      : 'bg-blue-600/15 text-blue-700 border-blue-600/35 shadow-xs font-bold')
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
                                        ? 'bg-rose-600/15 text-rose-700 border-rose-600/35 shadow-xs font-bold'
                                        : 'bg-blue-600/15 text-blue-700 border-blue-600/35 shadow-xs font-bold')
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
                      className="relative z-10 shrink-0 self-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-stone-200 hover:border-blue-600/40 hover:bg-stone-50 text-stone-600 hover:text-stone-900 shadow-xs flex items-center justify-center transition-all duration-300 cursor-pointer"
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
            <div className="w-full animate-in fade-in duration-300">
              
              {/* Main Listings Grid */}
              <div className="w-full">
                {/* List Header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-stone-900">
                      العيادات والمراكز المتاحة ({filteredListings.length})
                    </h3>
                    {selectedRegion !== 'الكل' && selectedRegion && (
                      <span className="px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold">
                        في {selectedRegion}
                      </span>
                    )}
                  </div>
                  
                  {(activeSpecialty || (selectedRegion !== 'الكل' && selectedRegion) || searchQuery || searchInput) && (
                    <button
                      onClick={() => {
                        setActiveSpecialty(null);
                        setActiveSubspecialty(null);
                        setSelectedRegion('الكل');
                        setSearchQuery('');
                        setSearchInput('');
                      }}
                      className="text-xs font-bold text-red-600 hover:text-red-700 underline"
                    >
                      إعادة ضبط الفلاتر
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <BusinessCardSkeleton key={idx} />
                    ))}
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
                      <span>أضف عيادتك أو منشأتك الآن</span>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredListings.flatMap((b, idx) => {
                      const node = (
                        <div key={b.id} className="relative group">
                          <BusinessCard business={b} />
                        </div>
                      );
                      const shouldInsertPromo0 = (idx === 2 || (idx === filteredListings.length - 1 && filteredListings.length < 3)) && promoCards[0];
                      const shouldInsertPromo1 = (idx === 8) && promoCards[1];
                      const promoToInsert = shouldInsertPromo0 ? (
                        <InFeedPromoCardItem key={`promo_${promoCards[0].id}_${idx}`} card={promoCards[0]} />
                      ) : shouldInsertPromo1 ? (
                        <InFeedPromoCardItem key={`promo_${promoCards[1].id}_${idx}`} card={promoCards[1]} />
                      ) : null;
                      return promoToInsert ? [node, promoToInsert] : [node];
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODALS & DIALOGS (COMMON FOR BOTH VIEWPORTS)                            */}
      {/* ========================================================================= */}

      {/* Medical Filter Modal (Mobile, Tablet, and Desktop) */}
      <MedicalFilterModal
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        sortBy={medicalSortBy}
        specialtyId={activeSpecialty || ''}
        subspecialty={activeSubspecialty || ''}
        region={selectedRegion}
        insuranceName={selectedInsurance}
        openNowOnly={openNowFilter}
        directInsuranceOnly={directInsuranceOnly}
        appointmentOnly={appointmentOnly}
        favoritesOnly={favoritesOnly}
        userFavorites={userFavorites}
        onApplyFilters={(filters: AppliedMedicalFilters) => {
          setMedicalSortBy(filters.sortBy);
          setActiveSpecialty(filters.specialtyId || null);
          setActiveSubspecialty(filters.subspecialty || null);
          setSelectedRegion(filters.region);
          setSelectedInsurance(filters.insuranceName);
          setOpenNowFilter(filters.openNowOnly);
          setDirectInsuranceOnly(filters.directInsuranceOnly);
          setAppointmentOnly(filters.appointmentOnly);
          setFavoritesOnly(filters.favoritesOnly);
        }}
        businesses={businesses}
      />

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
                  className="w-full pr-10 pl-20 py-2.5 bg-white border border-stone-200 rounded-xl font-bold text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
                  <VoiceSearchButton
                    onTranscript={(text) => setModalSearchTerm(text)}
                    size="sm"
                  />
                  {modalSearchTerm && (
                    <button
                      onClick={() => setModalSearchTerm('')}
                      className="text-xs font-black text-stone-400 hover:text-stone-700 px-1"
                    >
                      مسح
                    </button>
                  )}
                </div>
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

      {/* FLOATING SEARCH BAR OVERLAY */}
      {isFloatingSearchOpen && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-xl z-[200] px-4 hidden lg:block animate-in fade-in slide-in-from-bottom-5 duration-300">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (searchInput.trim()) {
                navigate(`/search?q=${encodeURIComponent(searchInput.trim())}&tab=medical`);
              }
            }}
            className="relative shadow-2xl rounded-full"
          >
            <Search className="absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 pointer-events-none" />
            <input
              type="search"
              enterKeyHint="search"
              placeholder="ابحث عن طبيب، عيادة، تخصص، صيدلية..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-24 pr-13 py-3.5 bg-white border-2 border-blue-600 rounded-full text-sm font-bold placeholder:text-stone-400 focus:outline-none focus:ring-4 focus:ring-blue-600/15 shadow-2xl transition-all [&::-webkit-search-cancel-button]:appearance-none"
              autoFocus
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
              <VoiceSearchButton
                onTranscript={(text) => {
                  setSearchInput(text);
                  navigate(`/search?q=${encodeURIComponent(text.trim())}&tab=medical`);
                }}
                size="md"
              />
              <button
                type="button"
                onClick={() => setIsFloatingSearchOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer"
                title="إغلاق"
                aria-label="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FLOATING ACTION BUTTONS */}
      <div className="fixed bottom-8 right-8 z-[200] hidden lg:flex flex-col gap-3">
        {/* Floating Filter Button */}
        <button
          onClick={() => {
            setIsMobileFilterOpen(true);
            setIsFloatingSearchOpen(false);
          }}
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl border cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
          title="تصفية نتائج الرعاية الطبية"
          aria-label="تصفية نتائج الرعاية الطبية"
        >
          <SlidersHorizontal className="h-6 w-6 text-blue-600" />
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
              : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700'
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
