import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Briefcase, Search, Plus, MapPin, Clock, DollarSign, 
  Phone, MessageSquare, Building2, CheckCircle2, Flame, 
  Filter, Sparkles, X, Send, GraduationCap, Check, Trash2, 
  Pencil, RefreshCw, Share2, Eye, Store, ExternalLink, Users, Award, ChevronDown, Crown
} from 'lucide-react';
import { collection, getDocs, doc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCachedJobs, setCachedJobs, getCachedBusinesses, setCachedBusinesses } from '../lib/dataCache';
import { JobOffer, Business, HomepageBanner } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router';
import { JobFormModal } from '../components/jobs/JobFormModal';
import { getAppConfig } from '../lib/demoDataHelper';
import { BlueCheckIcon } from '../components/vip/VerifiedBadge';
import { getBusinessVipStatus, isItemCurrentlyFeatured } from '../lib/vipHelper';
import { ShareButton } from '../components/ShareButton';
import { getWhatsAppUrl, formatJobWhatsAppMessage } from '../lib/contactHelper';
import { WhatsApp3DIcon, Phone3DIcon } from '../components/common/PremiumContactButtons';
import { SEO } from '../components/common/SEO';
import { BannerSlideshow } from '../components/BannerSlideshow';
import { fetchPageBanners, DEFAULT_JOBS_BANNERS } from '../lib/pageBanners';
import { fetchPagePromoCards } from '../lib/promoCards';
import { InFeedPromoCardItem } from '../components/common/InFeedPromoCardItem';
import { InFeedPromoCard } from '../types';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { getCategoryMeta } from '../lib/categoryMeta';
import { CategoryButtonLabel } from '../components/CategoryButtonLabel';
import { CategoriesModal } from '../components/CategoriesModal';
import { Pagination } from '../components/common/Pagination';
import { JobCardSkeleton } from '../components/common/Skeleton';
import { useConfirm } from '../contexts/ConfirmContext';
import { cn } from '../lib/utils';
import { useHeaderVisibility } from '../lib/useHeaderVisibility';

import { BUSINESS_CATEGORIES, MainCategory, normalizeArabic } from '../lib/categories';

const JOB_TYPES = ['الكل', 'دوام كامل', 'دوام جزئي', 'مناسب للطلاب', 'عمل عن بعد'];

function isMatchingJobLocation(selectedReg: string, jobLocation: string, jobCompany: string): boolean {
  if (!selectedReg || selectedReg === 'الكل' || !selectedReg.trim()) return true;

  const selNorm = normalizeArabic(selectedReg);
  const locNorm = normalizeArabic(jobLocation || '');
  const compNorm = normalizeArabic(jobCompany || '');

  if (locNorm.includes(selNorm) || compNorm.includes(selNorm)) {
    return true;
  }

  const cleanReg = selectedReg.replace(/\(.*?\)/g, '').replace(/\/.*$/g, '').trim();
  const cleanNorm = normalizeArabic(cleanReg);

  if (cleanNorm && (locNorm.includes(cleanNorm) || compNorm.includes(cleanNorm))) {
    return true;
  }

  const tokens = selNorm.split(' ').filter(t => t.length > 2 && t !== 'شارع' && t !== 'طريق' && t !== 'لواء' && t !== 'قرى' && t !== 'مدينة' && t !== 'حي' && t !== 'مجمع');
  if (tokens.length === 0) return true;

  return tokens.some(t => locNorm.includes(t) || compNorm.includes(t));
}

export function Jobs() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { currentUser, isAdmin, isStaff, isMerchant, ownedBusinesses } = useAuth();
  const { categories, neighborhoods } = useSystemSettings();
  const mainCategories = categories.map(c => c.name);
  const getSubCats = (catName: string) => categories.find(c => c.name === catName)?.subcategories || [];

  const hasBusiness = Boolean(currentUser && (isAdmin || isStaff || isMerchant || (ownedBusinesses && ownedBusinesses.length > 0)));

  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [businessMap, setBusinessMap] = useState<Record<string, Business>>({});
  const [banners, setBanners] = useState<HomepageBanner[]>(DEFAULT_JOBS_BANNERS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stickySearchInput, setStickySearchInput] = useState('');
  const [desktopSearchInput, setDesktopSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [selectedJobType, setSelectedJobType] = useState('الكل');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [promoCards, setPromoCards] = useState<InFeedPromoCard[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const activeJobTypeRef = useRef<HTMLButtonElement | null>(null);

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

  // Auto scroll selected job type pill into view
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollContainerToElement(activeJobTypeRef.current);
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedJobType]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedSubCategory, selectedJobType, selectedRegion]);

  // Modal states
  const showHeader = useHeaderVisibility();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [isSubCategoriesExpanded, setIsSubCategoriesExpanded] = useState(false);
  const [editingJob, setEditingJob] = useState<JobOffer | null>(null);
  const [selectedDetailJob, setSelectedDetailJob] = useState<JobOffer | null>(null);

  const activeFiltersCount = [
    selectedCategory !== 'الكل',
    selectedSubCategory !== '',
    selectedJobType !== 'الكل',
    selectedRegion !== ''
  ].filter(Boolean).length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  useEffect(() => {
    fetchPagePromoCards('jobs').then(cards => setPromoCards(cards)).catch(() => {});

    async function fetchJobsAndBanners() {
      setLoading(true);
      try {
        fetchPageBanners(['وظائف', 'شواغر', 'توظيف', 'شركات', 'عمل'], DEFAULT_JOBS_BANNERS, 'jobs')
          .then(res => setBanners(res))
          .catch(() => setBanners(DEFAULT_JOBS_BANNERS));

        // Load businesses to accurately map shop main/sub categories & districts
        const cachedBiz = getCachedBusinesses();
        if (cachedBiz && cachedBiz.length > 0) {
          const map: Record<string, Business> = {};
          cachedBiz.forEach(b => { map[b.id] = b; });
          setBusinessMap(map);
        } else if (db) {
          getDocs(query(collection(db, 'businesses'), limit(150))).then(snap => {
            const map: Record<string, Business> = {};
            const list: Business[] = [];
            snap.forEach(d => {
              const b = { id: d.id, ...d.data() } as Business;
              map[b.id] = b;
              list.push(b);
            });
            setBusinessMap(map);
            setCachedBusinesses(list);
          }).catch(console.error);
        }

        const cached = getCachedJobs();
        if (cached && cached.length > 0) {
          setJobs(cached);
          setLoading(false);
          return;
        }

        if (!db) {
          setJobs([]);
          setLoading(false);
          return;
        }

        const appConfig = await getAppConfig();
        const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'), limit(80));
        const snapshot = await getDocs(q);

        const list: JobOffer[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (!appConfig.showDemoData && data.isDemo) {
            return;
          }
          list.push({ id: docSnap.id, ...data } as JobOffer);
        });

        setJobs(list);
        setCachedJobs(list);
      } catch (err) {
        console.error('Error fetching jobs from Firestore:', err);
        setJobs([]);
      } finally {
        setLoading(false);
      }
    }

    fetchJobsAndBanners();
  }, []);

  const openAddModal = () => {
    setEditingJob(null);
    setIsModalOpen(true);
  };

  const openEditModal = (job: JobOffer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingJob(job);
    setIsModalOpen(true);
  };

  const handleJobSaved = (savedJob: JobOffer) => {
    if (editingJob) {
      const updatedList = jobs.map(j => j.id === savedJob.id ? savedJob : j);
      setJobs(updatedList);
      if (selectedDetailJob?.id === savedJob.id) {
        setSelectedDetailJob(savedJob);
      }
      showToast('تم تحديث بيانات الشاغر الوظيفي بنجاح');
    } else {
      const updatedList = [savedJob, ...jobs];
      setJobs(updatedList);
      showToast('تم نشر فرصة العمل بنجاح في دليل إربد!');
    }
  };

  const handleDeleteJob = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!(await confirm({ message: 'هل أنت متأكد من حذف هذه الوظيفة؟' }))) return;
    try {
      if (db) {
        try {
          await deleteDoc(doc(db, 'jobs', id));
        } catch (err) {
          console.error('Error deleting firestore job:', err);
        }
      }

      const updatedList = jobs.filter(j => j.id !== id);
      setJobs(updatedList);
      if (selectedDetailJob?.id === id) {
        setSelectedDetailJob(null);
      }
      showToast('تم حذف الوظيفة بنجاح');
    } catch (err) {
      console.error('Failed to delete job:', err);
      showToast('تعذر حذف الوظيفة');
    }
  };

  // Filter and sort jobs with business category, subcategory, and district enrichment
  const filteredJobs = useMemo(() => {
    const list = jobs.filter(job => {
      const biz = job.businessId ? businessMap[job.businessId] : null;

      // Derived category, subcategory, district, and company name from publishing business
      const effectiveCategory = biz?.category || job.businessCategory || job.category || '';
      const effectiveSubCat = biz?.subCategory || job.businessSubCategory || job.subCategory || '';
      const effectiveDistrict = biz?.district || biz?.address || biz?.region || job.businessDistrict || job.location || '';
      const effectiveCompany = biz?.name || job.company || '';

      // Category & Subcategory matching
      let matchesCategory = true;
      if (selectedCategory && selectedCategory !== 'الكل') {
        const validSubCats = getSubCats(selectedCategory);
        if (selectedSubCategory) {
          matchesCategory = 
            effectiveCategory === selectedSubCategory || 
            effectiveSubCat === selectedSubCategory ||
            job.category === selectedSubCategory ||
            (job.subCategory && job.subCategory === selectedSubCategory);
        } else {
          matchesCategory = 
            effectiveCategory === selectedCategory || 
            job.category === selectedCategory ||
            validSubCats.some(s => effectiveCategory === s || effectiveSubCat === s || job.category === s) ||
            effectiveCategory.includes(selectedCategory) ||
            selectedCategory.includes(effectiveCategory);
        }
      }

      // Job Type matching
      const matchesType = selectedJobType === 'الكل' || job.jobType === selectedJobType;

      // Location matching
      const matchesLocation = !selectedRegion || selectedRegion === 'الكل' || isMatchingJobLocation(selectedRegion, effectiveDistrict, effectiveCompany);

      // Search query matching
      const matchesSearch = !searchQuery ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        effectiveCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
        effectiveDistrict.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        effectiveCategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
        effectiveSubCat.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesType && matchesLocation && matchesSearch;
    });

    // Sorting: Featured / Sponsored jobs first (صدارة البحث والنتائج)
    return list.sort((a, b) => {
      const bizA = a.businessId ? businessMap[a.businessId] : null;
      const bizB = b.businessId ? businessMap[b.businessId] : null;
      const featA = isItemCurrentlyFeatured(a, bizA) ? 1 : 0;
      const featB = isItemCurrentlyFeatured(b, bizB) ? 1 : 0;
      if (featB !== featA) return featB - featA;

      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [jobs, businessMap, selectedCategory, selectedSubCategory, selectedJobType, selectedRegion, searchQuery]);

  return (
    <div className="w-full space-y-8 sm:space-y-10 pb-16 relative">
      <SEO 
        title="وظائف وشواغر إربد | أحدث فرص العمل في محافظة إربد"
        description="أحدث وظائف وفرص العمل الشاغرة في محافظة إربد: وظائف مطاعم ومقاهي، مبيعات، تسويق، شركات تكنولوجيا، فرص دوام جزئي وكامل ومناسبة لطلاب الجامعات."
        keywords={['وظائف إربد', 'شواغر إربد', 'عمل في إربد', 'وظائف طلاب إربد', 'وظائف اليرموك', 'سوق العمل إربد']}
        canonicalUrl="https://shofibirbid.site/jobs"
      />
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1a4d2e] text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-500/30 animate-in fade-in zoom-in-95">
          <Check className="h-5 w-5 text-[#ff9f1c]" />
          <span className="font-bold text-sm">{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE STICKY TOP APP BAR (Positioned Above Promotional Banner on Mobile) */}
      {/* ========================================================================= */}
      <div className={cn(
        "lg:hidden sticky z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-2xs px-4 py-2.5 space-y-2 transition-all duration-300",
        showHeader ? "top-[62px] sm:top-[68px] md:top-[72px]" : "top-0"
      )}>
        {/* Row 1: Search Bar & Filters Button */}
        <div className="flex items-center gap-2">
          {/* Integrated Search Input */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (stickySearchInput.trim()) {
                navigate(`/search?q=${encodeURIComponent(stickySearchInput.trim())}&tab=jobs`);
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

          {/* Filters Button (Replaces Categories Button) */}
          <button
            onClick={() => setShowFiltersMobile(true)}
            className="relative px-3.5 py-2 bg-[#1a4d2e] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Filter className="h-3.5 w-3.5 text-[#ff9f1c]" />
            <span>فلاتر</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 bg-amber-400 text-stone-900 rounded-full font-black text-[10px] flex items-center justify-center -mr-0.5">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Row 2: Job Types Horizontal Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pt-0.5 pb-1 -mx-2.5 px-2.5 sm:-mx-4 sm:px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {JOB_TYPES.map((type) => (
            <button
              key={type}
              ref={selectedJobType === type ? activeJobTypeRef : null}
              onClick={() => setSelectedJobType(type)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border min-h-[36px] ${
                selectedJobType === type
                  ? 'bg-gradient-to-r from-[#1a4d2e] to-emerald-700 text-white border-transparent shadow-xs font-black'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-300'
              }`}
            >
              <span>{type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Banner Slideshow */}
      <BannerSlideshow banners={banners} />

      {/* Mobile Wide Banner Action: "نشر وظيفة" button for shop owners */}
      {hasBusiness && (
        <div className="lg:hidden my-2.5">
          <button
            type="button"
            onClick={openAddModal}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-[#1a4d2e] via-emerald-800 to-[#1a4d2e] hover:from-emerald-800 hover:to-emerald-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-[0.99] border border-emerald-700/60 cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5 text-[#ff9f1c]" />
            <span>أعلن عن فرصة عمل جديدة لمشروعك</span>
          </button>
        </div>
      )}

      {/* Desktop Page Header (Preserved & Enhanced with Location Filter) */}
      <div className="hidden lg:block bg-gradient-to-br from-[#1a4d2e] via-[#153e25] to-[#0f2e1d] text-white rounded-3xl p-6 shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 text-emerald-300">
                <Briefcase className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white">
                  وظائف وشواغر إربد
                </h1>
                <p className="text-xs text-emerald-100/80 font-medium">
                  سوق العمل والشواغر المتاحة في المحلات والشركات
                </p>
              </div>
            </div>

            {hasBusiness && (
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ff9f1c] hover:bg-[#f08f0c] text-stone-950 font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>نشر وظيفة</span>
              </button>
            )}
          </div>

          {/* Search Input Bar & Location Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Search Input */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (desktopSearchInput.trim()) {
                  navigate(`/search?q=${encodeURIComponent(desktopSearchInput.trim())}&tab=jobs`);
                }
              }}
              className="relative md:col-span-2"
            >
              <input
                type="search"
                enterKeyHint="search"
                value={desktopSearchInput}
                onChange={(e) => setDesktopSearchInput(e.target.value)}
                placeholder="ابحث المسمى الوظيفي، المحل، أو المنطقة..."
                className="w-full bg-white/10 backdrop-blur-md text-white placeholder:text-stone-300 border border-white/20 rounded-2xl px-4 py-3 pr-10 text-sm focus:outline-none focus:bg-white/20 transition-all shadow-inner [&::-webkit-search-cancel-button]:appearance-none"
              />
              <Search className="h-4 w-4 text-emerald-200 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {desktopSearchInput && (
                <button 
                  type="button"
                  onClick={() => setDesktopSearchInput('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300 hover:text-white p-1.5 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>

            {/* Location Dropdown */}
            <div className="relative">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-2xl px-4 py-3 pr-10 pl-8 text-sm font-bold focus:outline-none focus:bg-white/20 transition-all shadow-inner cursor-pointer appearance-none"
              >
                <option value="" className="text-stone-900 font-bold">جميع مناطق وأحياء إربد</option>
                {neighborhoods && neighborhoods.map((group) => (
                  <optgroup key={group.groupName} label={group.groupName} className="text-stone-900 font-bold">
                    {group.areas.map((area) => (
                      <option key={area} value={area} className="text-stone-900 font-medium">{area}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <MapPin className="h-4 w-4 text-emerald-200 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="h-4 w-4 text-emerald-200 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Main and Sub Categories Section */}
      {mainCategories.length > 0 && (
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-[#2d2a26]">تصفح أقسام الوظائف حسب اختصاص المحلات</h2>
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

            <div className="flex overflow-x-auto pb-4 pt-1 gap-3.5 sm:gap-4 snap-x scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
                        ? 'bg-gradient-to-r from-[#1a4d2e] to-[#276e43] text-white border-transparent shadow-lg shadow-emerald-900/20 -translate-y-1' 
                        : 'bg-white text-[#2d2a26] border-[#e5e1da] hover:border-emerald-500/40 hover:bg-[#fcfbfa] hover:-translate-y-0.5 hover:shadow-md'
                    }`}
                  >
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-2.5 transition-transform group-hover:scale-110 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-emerald-50 text-[#1a4d2e]'
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
                        ? 'bg-gradient-to-r from-[#1a4d2e] to-[#276e43] text-white border-transparent shadow-lg shadow-emerald-900/20 -translate-y-1' 
                        : 'bg-white text-[#2d2a26] border-[#e5e1da] hover:border-emerald-500/40 hover:bg-[#fcfbfa] hover:-translate-y-0.5 hover:shadow-md'
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
                            ? 'bg-gradient-to-r from-[#1a4d2e] to-[#276e43] text-white border-transparent shadow-md shadow-emerald-900/10'
                            : 'bg-white text-stone-600 border-[#e5e1da] hover:border-emerald-300 hover:bg-stone-50'
                        }`}
                      >
                        عرض الكل الفرعي
                      </button>
                      {getSubCats(selectedCategory).map((subCat) => (
                        <button
                          key={subCat}
                          onClick={() => setSelectedSubCategory(selectedSubCategory === subCat ? '' : subCat)}
                          className={`snap-start shrink-0 whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 border cursor-pointer ${
                            selectedSubCategory === subCat
                              ? 'bg-gradient-to-r from-[#1a4d2e] to-[#276e43] text-white border-transparent shadow-md shadow-emerald-900/10'
                              : 'bg-white text-stone-600 border-[#e5e1da] hover:border-emerald-300 hover:bg-stone-50'
                          }`}
                        >
                          {subCat}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#fdfcfb] to-transparent z-10 sm:hidden" />
                      <div className="flex overflow-x-auto gap-2 sm:gap-2.5 pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide snap-x items-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <button
                          onClick={() => setSelectedSubCategory('')}
                          className={`snap-start shrink-0 whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 border cursor-pointer ${
                            selectedSubCategory === ''
                              ? 'bg-gradient-to-r from-[#1a4d2e] to-[#276e43] text-white border-transparent shadow-md shadow-emerald-900/10'
                              : 'bg-white text-stone-600 border-[#e5e1da] hover:border-emerald-300 hover:bg-stone-50'
                          }`}
                        >
                          عرض الكل الفرعي
                        </button>
                        {getSubCats(selectedCategory).map((subCat) => (
                          <button
                            key={subCat}
                            onClick={() => setSelectedSubCategory(selectedSubCategory === subCat ? '' : subCat)}
                            className={`snap-start shrink-0 whitespace-nowrap px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 border cursor-pointer ${
                              selectedSubCategory === subCat
                                ? 'bg-gradient-to-r from-[#1a4d2e] to-[#276e43] text-white border-transparent shadow-md shadow-emerald-900/10'
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

                {/* Fixed circular expand/collapse button */}
                <button
                  onClick={() => setIsSubCategoriesExpanded(!isSubCategoriesExpanded)}
                  className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white border border-stone-200 hover:border-emerald-500/40 hover:bg-stone-50 text-stone-600 hover:text-stone-900 shadow-xs flex items-center justify-center transition-all duration-300 cursor-pointer"
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

      {/* Job Types Bar (Preserved on Desktop, Hidden on Mobile as it is present in Sticky Header) */}
      <div className="hidden lg:flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x -mx-4 px-4 sm:mx-0 sm:px-0">
        <span className="text-xs font-black text-stone-400 shrink-0 ml-1">نوع الدوام:</span>
        {JOB_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setSelectedJobType(type)}
            className={`snap-start px-4 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer min-h-[40px] sm:min-h-[36px] flex items-center active:scale-95 ${
              selectedJobType === type
                ? 'bg-[#ff9f1c] text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between text-xs text-stone-500 font-bold px-1 gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span>عرض ({filteredJobs.length}) شاغر وظيفي متاح في إربد</span>
          {selectedRegion && (
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-[#1a4d2e] px-2.5 py-0.5 rounded-full text-xs font-bold border border-emerald-200">
              <MapPin className="h-3 w-3 text-[#ff9f1c]" />
              <span>{selectedRegion}</span>
              <button onClick={() => setSelectedRegion('')} className="hover:text-red-600 p-0.5 cursor-pointer" title="إزالة فلتر المنطقة">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
        {(selectedCategory !== 'الكل' || selectedSubCategory !== '' || selectedJobType !== 'الكل' || selectedRegion !== '' || searchQuery) && (
          <button
            onClick={() => {
              setSelectedCategory('الكل');
              setSelectedSubCategory('');
              setSelectedJobType('الكل');
              setSelectedRegion('');
              setSearchQuery('');
            }}
            className="text-[#1a4d2e] hover:underline cursor-pointer"
          >
            إعادة تعيين الفلاتر
          </button>
        )}
      </div>

      {/* Jobs Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <JobCardSkeleton key={idx} />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#e5e1da] space-y-4">
          <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto text-stone-400">
            <Briefcase className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-stone-800">لا توجد وظائف مطابقة للبحث حالياً</h3>
          <p className="text-stone-500 text-sm max-w-md mx-auto">
            جرّب تغيير كلمات البحث أو تصفح جميع التصنيفات، أو أعلن عن وظيفة جديدة لمستفيدي إربد.
          </p>
          {hasBusiness && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1a4d2e] text-white rounded-xl font-bold text-sm hover:bg-[#133b22] transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>نشر وظيفة جديدة</span>
            </button>
          )}
        </div>
      ) : (
        <div>
          <div id="jobs-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {filteredJobs
              .slice((currentPage - 1) * 15, currentPage * 15)
              .flatMap((job, idx) => {
                const biz = job.businessId ? businessMap[job.businessId] : null;
                const effectiveCategory = biz?.category || job.businessCategory || job.category || '';
                const effectiveSubCat = biz?.subCategory || job.businessSubCategory || job.subCategory || '';
                const effectiveDistrict = biz?.district || biz?.address || biz?.region || job.businessDistrict || job.location || '';
                const effectiveCompany = biz?.name || job.company || '';

                const displayCategoryTag = (effectiveSubCat && effectiveSubCat.trim() !== effectiveCategory.trim() && !effectiveCategory.includes(effectiveSubCat))
                  ? `${effectiveCategory} • ${effectiveSubCat}`
                  : effectiveCategory;

                const isFeaturedJob = isItemCurrentlyFeatured(job, biz);

                const jobCardNode = (
                  <div
                    key={job.id}
                    onClick={() => setSelectedDetailJob(job)}
                    className={cn(
                      "bg-white rounded-3xl p-4 sm:p-6 transition-all flex flex-col justify-between group relative cursor-pointer active:scale-[0.99]",
                      isFeaturedJob
                        ? "border-2 border-amber-400/90 ring-2 ring-amber-400/40 shadow-[0_0_22px_rgba(245,158,11,0.3)] hover:shadow-[0_0_35px_rgba(245,158,11,0.55)] hover:border-amber-400"
                        : "border border-[#e5e1da] hover:border-[#1a4d2e]/40 shadow-xs hover:shadow-lg"
                    )}
                  >
                  <div className="space-y-3">
                    
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#1a4d2e] border border-emerald-100 flex items-center justify-center shrink-0 font-black text-sm">
                          <Building2 className="h-5 w-5 text-[#1a4d2e]" />
                        </div>
                        <div>
                          <h3 className="font-black text-base text-[#2d2a26] group-hover:text-[#1a4d2e] transition-colors line-clamp-1">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 mt-0.5">
                            <span className="truncate">{effectiveCompany}</span>
                            {job.businessId && (
                              <span className="bg-sky-50 text-sky-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 border border-sky-200">
                                <BlueCheckIcon className="h-3 w-3" />
                                <span>موثّق</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                        {isFeaturedJob && (
                          <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-yellow-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest shadow-md flex items-center gap-1 w-fit border border-amber-300/60 shrink-0">
                            <Crown className="h-3 w-3 fill-current shrink-0 text-amber-950" />
                            <span>ممول</span>
                          </span>
                        )}
                        {job.isUrgent && (
                          <span className="bg-red-50 text-red-600 border border-red-200 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                            <Flame className="h-3 w-3 fill-red-600" />
                            <span>عاجل</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Job Types & Category Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="bg-[#1a4d2e]/10 text-[#1a4d2e] text-[11px] font-bold px-2.5 py-1 rounded-xl">
                        {displayCategoryTag}
                      </span>
                      <span className="bg-emerald-50 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-xl">
                        {job.jobType}
                      </span>
                      {job.salary && (
                        <span className="bg-amber-50 text-amber-900 border border-amber-200/80 text-[11px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1 mr-auto">
                          <DollarSign className="h-3 w-3 text-amber-600 shrink-0" />
                          <span>{job.salary}</span>
                        </span>
                      )}
                    </div>

                    {/* Snippet */}
                    <p className="text-stone-600 text-xs leading-relaxed line-clamp-2">
                      {job.description}
                    </p>

                    {/* Meta Row */}
                    <div className="flex items-center justify-between text-xs text-stone-500 font-bold pt-2 border-t border-stone-100 gap-2">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="h-3.5 w-3.5 text-[#ff9f1c] shrink-0" />
                        <span className="truncate">{effectiveDistrict}</span>
                      </div>
                      {job.workHours && (
                        <div className="flex items-center gap-1 text-stone-600 shrink-0">
                          <Clock className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                          <span>{job.workHours}</span>
                        </div>
                      )}
                    </div>
              </div>

              {/* Action Buttons Row */}
              <div className="pt-3 border-t border-[#e5e1da] mt-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <a
                    href={getWhatsAppUrl(job.contactWhatsapp || job.contactPhone, formatJobWhatsAppMessage(job.title, job.company))}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center justify-center min-h-[44px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <WhatsApp3DIcon className="h-4 w-4 text-white" />
                    <span>واتساب</span>
                  </a>

                  <a
                    href={`tel:${job.contactPhone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center justify-center min-h-[44px] px-3 py-2 bg-[#1a4d2e] hover:bg-[#133c23] active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    <Phone3DIcon className="h-4 w-4 text-white" />
                    <span>اتصال</span>
                  </a>

                  <ShareButton
                    title={`وظيفة: ${job.title} - ${job.company}`}
                    text={`شاغر وظيفي في إربد: ${job.title} لدى ${job.company}`}
                    url={`/jobs`}
                    size="sm"
                    variant="ghost"
                  />
                </div>

                <div className="flex items-center gap-1">
                  {(isAdmin || currentUser?.uid === job.userId) && (
                    <div className="flex items-center gap-0.5 ml-1">
                      <button
                        onClick={(e) => openEditModal(job, e)}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors"
                        title="تعديل الشاغر"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteJob(job.id);
                        }}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="حذف الشاغر"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  
                      <span className="text-xs font-black text-[#1a4d2e] group-hover:underline flex items-center gap-1 px-2 py-2 min-h-[44px]">
                        <span>التفاصيل</span>
                        <Eye className="h-4 w-4 text-[#ff9f1c]" />
                      </span>
                    </div>
                  </div>
                </div>
              );

                const currentSlice = filteredJobs.slice((currentPage - 1) * 15, currentPage * 15);
                const shouldInsertPromo0 = (idx === 2 || (idx === currentSlice.length - 1 && currentSlice.length < 3)) && promoCards[0];
                const shouldInsertPromo1 = (idx === 8) && promoCards[1];
                const promoToInsert = shouldInsertPromo0 ? (
                  <InFeedPromoCardItem key={`promo_${promoCards[0].id}_${idx}`} card={promoCards[0]} />
                ) : shouldInsertPromo1 ? (
                  <InFeedPromoCardItem key={`promo_${promoCards[1].id}_${idx}`} card={promoCards[1]} />
                ) : null;

                return promoToInsert ? [jobCardNode, promoToInsert] : [jobCardNode];
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredJobs.length / 15)}
            onPageChange={(p) => {
              setCurrentPage(p);
              window.scrollTo({ top: 300, behavior: 'smooth' });
            }}
            totalItems={filteredJobs.length}
            itemsPerPage={15}
          />
        </div>
      )}

      {/* Comprehensive Job Details Modal */}
      {selectedDetailJob && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100000] bg-stone-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden" dir="rtl">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-3xl w-full max-h-[88dvh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-stone-200 relative my-0 sm:my-auto animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 text-right">
            
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />

            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#e5e1da] p-4 sm:p-6 shrink-0 bg-white">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-[#1a4d2e]/10 text-[#1a4d2e] text-xs font-black px-2.5 py-0.5 rounded-md">
                    {selectedDetailJob.category}
                  </span>
                  <span className="bg-stone-100 text-stone-600 text-xs font-bold px-2.5 py-0.5 rounded-md">
                    {selectedDetailJob.jobType}
                  </span>
                  {selectedDetailJob.isUrgent && (
                    <span className="bg-red-600 text-white text-xs font-black px-2.5 py-0.5 rounded-md flex items-center gap-1">
                      <Flame className="h-3 w-3 fill-white" />
                      شاغر عاجل وفوري
                    </span>
                  )}
                </div>

                <h3 className="text-lg sm:text-2xl font-black text-[#2d2a26]">
                  {selectedDetailJob.title}
                </h3>
                
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-bold text-stone-700 flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-[#ff9f1c]" />
                    <span>{selectedDetailJob.company}</span>
                  </p>

                  {selectedDetailJob.businessId && (
                    <Link
                      to={`/business/${selectedDetailJob.businessId}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <Store className="h-3.5 w-3.5" />
                      <span>زيارة صفحة المحل في الدليل</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedDetailJob(null)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors shrink-0 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

            {/* Comprehensive Meta Specs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-stone-50 p-4 rounded-2xl border border-[#e5e1da]">
              
              <div className="space-y-0.5">
                <span className="text-[11px] text-stone-400 font-bold block">الموقع في إربد:</span>
                <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-[#ff9f1c]" />
                  {selectedDetailJob.location}
                </span>
              </div>

              {selectedDetailJob.salary && (
                <div className="space-y-0.5">
                  <span className="text-[11px] text-stone-400 font-bold block">الراتب / الأجر:</span>
                  <span className="text-xs font-black text-emerald-700 flex items-center gap-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    {selectedDetailJob.salary}
                  </span>
                </div>
              )}

              {selectedDetailJob.workHours && (
                <div className="space-y-0.5">
                  <span className="text-[11px] text-stone-400 font-bold block">أوقات العمل والشفت:</span>
                  <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-sky-600" />
                    {selectedDetailJob.workHours}
                  </span>
                </div>
              )}

              {selectedDetailJob.experienceLevel && (
                <div className="space-y-0.5">
                  <span className="text-[11px] text-stone-400 font-bold block">الخبرة المطلوبة:</span>
                  <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-purple-600" />
                    {selectedDetailJob.experienceLevel}
                  </span>
                </div>
              )}

              {selectedDetailJob.genderPreference && (
                <div className="space-y-0.5">
                  <span className="text-[11px] text-stone-400 font-bold block">الجنس:</span>
                  <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-stone-500" />
                    {selectedDetailJob.genderPreference === 'males' ? 'ذكور فقط' : selectedDetailJob.genderPreference === 'females' ? 'إناث فقط' : 'متاح للذكور والإناث'}
                  </span>
                </div>
              )}

            </div>

            {/* Benefits if available */}
            {selectedDetailJob.benefits && selectedDetailJob.benefits.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-black text-xs text-stone-700 uppercase tracking-wider">
                  المزايا والحوافز المقدمة:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-emerald-50/40 p-3 rounded-2xl border border-emerald-100">
                  {selectedDetailJob.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Job Description */}
            <div className="space-y-2">
              <h4 className="font-black text-xs text-stone-700 uppercase tracking-wider">
                الوصف الوظيفي والمسؤوليات:
              </h4>
              <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line bg-white p-4 rounded-2xl border border-stone-200">
                {selectedDetailJob.description}
              </p>
            </div>

            {/* Requirements */}
            {selectedDetailJob.requirements && selectedDetailJob.requirements.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-black text-xs text-stone-700 uppercase tracking-wider">
                  المتطلبات والشروط:
                </h4>
                <ul className="space-y-2 text-sm text-stone-700 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  {selectedDetailJob.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#1a4d2e] shrink-0 mt-0.5" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* How to apply */}
            {selectedDetailJob.howToApply && (
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900">
                <span className="font-black block mb-0.5">طريقة التقديم المحددة من صاحب العمل:</span>
                <span>{selectedDetailJob.howToApply}</span>
              </div>
            )}

            </div>

            {/* Contact & Apply Footer */}
            <div className="p-4 sm:px-6 bg-stone-50/90 border-t border-[#e5e1da] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 sticky bottom-0 z-10">
              <div className="text-xs text-stone-500 text-center sm:text-right">
                <span>لأي استفسار يمكنك التواصل مع جهة التوظيف مباشرة:</span>
                <span className="block font-black text-stone-800 text-sm mt-0.5" dir="ltr">{selectedDetailJob.contactPhone}</span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <a
                  href={`https://wa.me/${selectedDetailJob.contactWhatsapp || selectedDetailJob.contactPhone}?text=${encodeURIComponent('مرحباً، أود التقدم لوظيفة (' + selectedDetailJob.title + ') لدى (' + selectedDetailJob.company + ') المعلنة على دليل شو في بإربد.')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 sm:flex-initial inline-flex justify-center items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  <WhatsApp3DIcon className="h-5 w-5 text-white" />
                  <span>قدم عبر الواتساب الآن</span>
                </a>

                <a
                  href={`tel:${selectedDetailJob.contactPhone}`}
                  className="inline-flex justify-center items-center gap-2 px-4 py-3 bg-[#1a4d2e] hover:bg-[#133c23] text-white font-bold text-sm rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  <Phone3DIcon className="h-5 w-5 text-white" />
                  <span>اتصال</span>
                </a>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Reusable Job Form Modal for Shop Owners */}
      <JobFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onJobSaved={handleJobSaved}
        editingJob={editingJob}
      />

      {/* Mobile Overlay Filter Bottom Sheet */}
      {showFiltersMobile && createPortal(
        <div className="fixed inset-0 z-[100000] lg:hidden bg-stone-900/60 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-200" dir="rtl">
          <div className="w-full bg-white max-h-[85vh] rounded-t-[2rem] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden">
            {/* Fixed Header */}
            <div className="p-5 pb-3 border-b border-stone-100 flex flex-col shrink-0">
              <div className="w-12 h-1 bg-stone-200 rounded-full mx-auto mb-3 shrink-0" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-[#1a4d2e]">
                    <Filter className="h-4 w-4 text-[#ff9f1c]" />
                  </span>
                  <h3 className="font-black text-stone-900 text-base">تصفية الوظائف والشواغر</h3>
                </div>
                <button
                  onClick={() => setShowFiltersMobile(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:text-stone-900 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Filters Content */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* 1. Location Selection (التحديد حسب المنطقة) */}
              <div className="space-y-2">
                <label className="font-black text-xs text-stone-800 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#ff9f1c]" />
                  <span>تحديد المنطقة أو الحي بإربد</span>
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2.5 px-3 font-bold text-xs text-stone-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
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

              {/* 2. Main Category Selection (التخصص / القسم) */}
              <div className="space-y-2">
                <label className="font-black text-xs text-stone-800 flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-emerald-700" />
                  <span>تخصص الوظيفة / القسم الرئيسي</span>
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedSubCategory('');
                  }}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2.5 px-3 font-bold text-xs text-stone-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
                >
                  <option value="الكل">جميع التخصصات والأقسام</option>
                  {mainCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Subcategory Selection if category is chosen */}
              {selectedCategory && selectedCategory !== 'الكل' && getSubCats(selectedCategory).length > 0 && (
                <div className="space-y-2">
                  <label className="font-black text-xs text-stone-700 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    <span>التخصص الفرعي</span>
                  </label>
                  <select
                    value={selectedSubCategory}
                    onChange={(e) => setSelectedSubCategory(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2.5 px-3 font-bold text-xs text-stone-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    <option value="">جميع التخصصات الفرعية</option>
                    {getSubCats(selectedCategory).map((subCat) => (
                      <option key={subCat} value={subCat}>{subCat}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 3. Job Type Selection (نوع الدوام) */}
              <div className="space-y-2">
                <label className="font-black text-xs text-stone-800 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span>نوع الدوام</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {JOB_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedJobType(type)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        selectedJobType === type
                          ? 'bg-[#1a4d2e] text-white border-transparent shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fixed Footer Actions */}
            <div className="p-4 border-t border-stone-100 bg-stone-50/80 flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('الكل');
                  setSelectedSubCategory('');
                  setSelectedJobType('الكل');
                  setSelectedRegion('');
                  setSearchQuery('');
                }}
                className="py-3 px-4 bg-white border border-stone-200 text-stone-700 hover:text-stone-900 rounded-xl font-bold text-xs transition-colors shrink-0 cursor-pointer"
              >
                إعادة تعيين
              </button>
              <button
                type="button"
                onClick={() => setShowFiltersMobile(false)}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-[#1a4d2e] to-emerald-700 text-white rounded-xl font-black text-xs shadow-md active:scale-98 transition-all cursor-pointer"
              >
                تطبيق الفلاتر ({filteredJobs.length} شاغر)
              </button>
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
    </div>
  );
}

export default Jobs;
