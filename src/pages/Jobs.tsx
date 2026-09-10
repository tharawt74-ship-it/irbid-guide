import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Briefcase, Search, Plus, MapPin, Clock, DollarSign, 
  Phone, MessageSquare, Building2, CheckCircle2, Flame, 
  Filter, Sparkles, X, Send, GraduationCap, Check, Trash2, 
  Pencil, RefreshCw, Share2, Eye, Store, ExternalLink, Users, Award
} from 'lucide-react';
import { collection, getDocs, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { JobOffer, Business, HomepageBanner } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router';
import { JobFormModal } from '../components/jobs/JobFormModal';
import { getAppConfig } from '../lib/demoDataHelper';
import { BlueCheckIcon } from '../components/vip/VerifiedBadge';
import { ShareButton } from '../components/ShareButton';
import { getWhatsAppUrl, formatJobWhatsAppMessage } from '../lib/contactHelper';
import { WhatsApp3DIcon, Phone3DIcon } from '../components/common/PremiumContactButtons';
import { SEO } from '../components/common/SEO';
import { BannerSlideshow } from '../components/BannerSlideshow';
import { fetchPageBanners, DEFAULT_JOBS_BANNERS } from '../lib/pageBanners';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { getCategoryMeta } from '../lib/categoryMeta';
import { CategoryButtonLabel } from '../components/CategoryButtonLabel';
import { CategoriesModal } from '../components/CategoriesModal';
import { Pagination } from '../components/common/Pagination';
import { useConfirm } from '../contexts/ConfirmContext';

const JOB_TYPES = ['الكل', 'دوام كامل', 'دوام جزئي', 'مناسب للطلاب', 'عمل عن بعد'];

export function Jobs() {
  const { confirm } = useConfirm();
  const { currentUser, isAdmin, isStaff, isMerchant, ownedBusinesses } = useAuth();
  const { categories } = useSystemSettings();
  const mainCategories = categories.map(c => c.name);
  const getSubCats = (catName: string) => categories.find(c => c.name === catName)?.subcategories || [];

  const hasBusiness = Boolean(currentUser && (isAdmin || isStaff || isMerchant || (ownedBusinesses && ownedBusinesses.length > 0)));

  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [banners, setBanners] = useState<HomepageBanner[]>(DEFAULT_JOBS_BANNERS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [selectedJobType, setSelectedJobType] = useState('الكل');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedSubCategory, selectedJobType]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobOffer | null>(null);
  const [selectedDetailJob, setSelectedDetailJob] = useState<JobOffer | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  useEffect(() => {
    async function fetchJobsAndBanners() {
      setLoading(true);
      try {
        fetchPageBanners(['وظائف', 'شواغر', 'توظيف', 'شركات', 'عمل'], DEFAULT_JOBS_BANNERS, 'jobs')
          .then(res => setBanners(res))
          .catch(() => setBanners(DEFAULT_JOBS_BANNERS));

        if (!db) {
          setJobs([]);
          setLoading(false);
          return;
        }

        const appConfig = await getAppConfig();
        const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
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

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    let matchesCategory = true;
    if (selectedCategory && selectedCategory !== 'الكل') {
      const validSubCats = getSubCats(selectedCategory);
      if (selectedSubCategory) {
        matchesCategory = 
          job.category === selectedSubCategory || 
          job.category.includes(selectedSubCategory) ||
          selectedSubCategory.includes(job.category);
      } else {
        matchesCategory = 
          job.category === selectedCategory || 
          job.category.includes(selectedCategory) ||
          selectedCategory.includes(job.category) ||
          validSubCats.some(s => job.category === s || job.category.includes(s) || s.includes(job.category));
      }
    }

    const matchesType = selectedJobType === 'الكل' || job.jobType === selectedJobType;
    const matchesSearch = 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.category && job.category.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesType && matchesSearch;
  });

  return (
    <div className="w-full space-y-8 sm:space-y-10 pb-16 relative">
      <SEO 
        title="وظائف وشواغر إربد | أحدث فرص العمل في محافظة إربد"
        description="أحدث وظائف وفرص العمل الشاغرة في محافظة إربد: وظائف مطاعم ومقاهي، مبيعات، تسويق، شركات تكنولوجيا، فرص دوام جزئي وكامل ومناسبة لطلاب الجامعات."
        keywords={['وظائف إربد', 'شواغر إربد', 'عمل في إربد', 'وظائف طلاب إربد', 'وظائف اليرموك', 'سوق العمل إربد']}
        canonicalUrl="https://shofierbid.com/jobs"
      />
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1a4d2e] text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-500/30 animate-in fade-in zoom-in-95">
          <Check className="h-5 w-5 text-[#ff9f1c]" />
          <span className="font-bold text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Banner Slideshow */}
      <BannerSlideshow banners={banners} />

      {/* Page Header & Search Bar (Compact & Sleek) */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-3.5 sm:p-5 border border-[#e5e1da] shadow-xs space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="inline-flex items-center gap-1 bg-emerald-50 text-[#1a4d2e] border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-black">
                <Briefcase className="h-3 w-3 text-[#1a4d2e]" />
                <span>سوق عمل إربد</span>
              </div>
              <div className="hidden sm:inline-flex items-center gap-1 bg-stone-100 text-stone-700 border border-stone-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                <GraduationCap className="h-3 w-3 text-stone-600" />
                <span>شواغر المحلات والشركات والطلاب</span>
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              وظائف وشواغر إربد
            </h1>

            <p className="hidden sm:block text-stone-500 text-xs font-medium leading-relaxed">
              تصفح أحدث الفرص الشاغرة في محافظة إربد أو انشر إعلان توظيف لمحلك واستقطب أصحاب الكفاءات.
            </p>
          </div>

          {/* Quick Actions */}
          {hasBusiness && (
            <div className="shrink-0">
              <button
                onClick={openAddModal}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-[#1a4d2e] hover:bg-[#143e25] text-white px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>انشر وظيفة لمحلك</span>
              </button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث بمسمى الوظيفة (باريستا، كاشير، مسوق)، اسم المحل، أو المنطقة..."
            className="w-full bg-[#fdfcfb] text-stone-900 placeholder:text-stone-400 border border-[#e5e1da] rounded-xl px-3.5 py-2.5 pr-10 text-xs sm:text-sm focus:outline-none focus:border-[#1a4d2e] focus:bg-white transition-all shadow-inner"
          />
          <Search className="h-4 w-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
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
            <div className="relative">
              <div className="pointer-events-none absolute left-0 top-0 bottom-3 w-8 bg-gradient-to-r from-[#fdfcfb] to-transparent z-10 sm:hidden" />
              <div className="flex overflow-x-auto gap-2.5 pb-3 mt-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <button
                  onClick={() => setSelectedSubCategory('')}
                  className={`snap-start shrink-0 whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 border cursor-pointer ${
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
                    className={`snap-start shrink-0 whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 border cursor-pointer ${
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
      )}

      {/* Job Types Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-black text-stone-400 shrink-0 ml-1">نوع الدوام:</span>
        {JOB_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setSelectedJobType(type)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
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
      <div className="flex items-center justify-between text-xs text-stone-500 font-bold px-1">
        <span>عرض ({filteredJobs.length}) شاغر وظيفي متاح في إربد</span>
        {(selectedCategory !== 'الكل' || selectedSubCategory !== '' || selectedJobType !== 'الكل' || searchQuery) && (
          <button
            onClick={() => {
              setSelectedCategory('الكل');
              setSelectedSubCategory('');
              setSelectedJobType('الكل');
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
        <div className="flex justify-center items-center py-24">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-stone-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-[#1a4d2e] border-t-transparent animate-spin"></div>
          </div>
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
              .map((job) => (
              <div
                key={job.id}
                onClick={() => setSelectedDetailJob(job)}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e5e1da] hover:border-[#1a4d2e]/40 hover:shadow-lg transition-all flex flex-col justify-between group relative cursor-pointer"
              >
              <div className="space-y-3.5">
                
                {/* Top Badges */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="bg-stone-100 text-stone-700 text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                      {job.category}
                    </span>
                    <span className="bg-emerald-50 text-[#1a4d2e] text-[11px] font-bold px-2.5 py-0.5 rounded-md">
                      {job.jobType}
                    </span>
                  </div>

                  {job.isUrgent && (
                    <span className="bg-red-50 text-red-600 border border-red-200 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 animate-pulse">
                      <Flame className="h-3 w-3 fill-red-600" />
                      شاغر عاجل
                    </span>
                  )}
                </div>

                {/* Title & Company */}
                <div>
                  <h3 className="font-black text-lg text-[#2d2a26] group-hover:text-[#1a4d2e] transition-colors line-clamp-1">
                    {job.title}
                  </h3>
                  
                  <div className="flex items-center gap-1.5 text-xs font-bold text-stone-500 mt-1">
                    <Building2 className="h-3.5 w-3.5 text-[#ff9f1c] shrink-0" />
                    <span className="truncate">{job.company}</span>
                    {job.businessId && (
                      <span className="bg-sky-50 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-sky-200/80">
                        <BlueCheckIcon className="h-3 w-3" />
                        <span>محل موثّق</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Description snippet */}
                <p className="text-stone-600 text-xs leading-relaxed line-clamp-2">
                  {job.description}
                </p>

                {/* Benefits mini badges if available */}
                {job.benefits && job.benefits.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {job.benefits.slice(0, 2).map((b, idx) => (
                      <span key={idx} className="bg-stone-50 text-stone-600 border border-stone-200/60 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {b}
                      </span>
                    ))}
                    {job.benefits.length > 2 && (
                      <span className="text-[10px] font-bold text-[#1a4d2e] self-center">
                        +{job.benefits.length - 2} ميزات
                      </span>
                    )}
                  </div>
                )}

                {/* Meta details (Location, Salary, Shifts) */}
                <div className="pt-2 border-t border-stone-100 space-y-1.5 text-xs text-stone-500">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                    <span className="truncate">{job.location}</span>
                  </div>

                  {job.workHours && (
                    <div className="flex items-center gap-1.5 text-stone-600 font-bold">
                      <Clock className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                      <span className="truncate">{job.workHours}</span>
                    </div>
                  )}

                  {job.salary && (
                    <div className="flex items-center gap-1.5 text-[#1a4d2e] font-black">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{job.salary}</span>
                    </div>
                  )}
                </div>

              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#e5e1da] mt-4 flex flex-wrap items-center justify-between gap-y-3 gap-x-2">
                
                <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
                  <a
                    href={getWhatsAppUrl(job.contactWhatsapp || job.contactPhone, formatJobWhatsAppMessage(job.title, job.company))}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer shrink-0"
                  >
                    <WhatsApp3DIcon className="h-3.5 w-3.5 text-white" />
                    <span>واتساب</span>
                  </a>

                  <a
                    href={`tel:${job.contactPhone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#1a4d2e] hover:bg-[#133c23] text-white rounded-xl text-xs font-bold transition-colors shadow-xs shrink-0"
                  >
                    <Phone3DIcon className="h-3.5 w-3.5 text-white" />
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


                <div className="flex items-center gap-1 shrink-0 flex-nowrap">
                  {(isAdmin || currentUser?.uid === job.userId) && (
                    <div className="flex items-center gap-0.5 ml-1 shrink-0">
                      <button
                        onClick={(e) => openEditModal(job, e)}
                        className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors shrink-0"
                        title="تعديل الشاغر"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteJob(job.id);
                        }}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        title="حذف الشاغر"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  
                  <span className="text-xs font-black text-[#1a4d2e] group-hover:underline flex items-center gap-1 mr-1 shrink-0">
                    <span>التفاصيل</span>
                    <Eye className="h-3.5 w-3.5 text-[#ff9f1c]" />
                  </span>
                </div>

              </div>
            </div>
          ))}
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
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 relative my-auto animate-in fade-in zoom-in-95">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#e5e1da] pb-4">
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

                <h3 className="text-2xl font-black text-[#2d2a26]">
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
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

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

            {/* Contact & Apply Footer */}
            <div className="pt-4 border-t border-[#e5e1da] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-stone-500">
                <span>لأي استفسار يمكنك التواصل مع جهة التوظيف مباشرة:</span>
                <span className="block font-black text-stone-800 text-sm mt-0.5" dir="ltr">{selectedDetailJob.contactPhone}</span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <a
                  href={`https://wa.me/${(selectedDetailJob.contactWhatsapp || selectedDetailJob.contactPhone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مرحباً، أود التقدم لوظيفة (${selectedDetailJob.title}) لدى (${selectedDetailJob.company}) المعلنة على دليل شو في بإربد.`)}`}
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
