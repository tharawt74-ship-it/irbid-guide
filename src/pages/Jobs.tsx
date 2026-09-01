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
import { JobOffer, Business } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router';
import { JobFormModal } from '../components/jobs/JobFormModal';
import { getAppConfig } from '../lib/demoDataHelper';
import { BlueCheckIcon } from '../components/vip/VerifiedBadge';
import { ShareButton } from '../components/ShareButton';
import { getWhatsAppUrl, formatJobWhatsAppMessage } from '../lib/contactHelper';
import { WhatsApp3DIcon, Phone3DIcon } from '../components/common/PremiumContactButtons';
import { SEO } from '../components/common/SEO';

const CATEGORIES = ['الكل', 'مطاعم ومقاهي', 'تسويق وتكنولوجيا', 'مبيعات وتجزئة', 'تعليم وتدريب', 'صحة وخدمات', 'محاسبة وإدارة', 'صناعة وحرف', 'زراعة ومزارع'];
const JOB_TYPES = ['الكل', 'دوام كامل', 'دوام جزئي', 'مناسب للطلاب', 'عمل عن بعد'];

export function Jobs() {
  const { currentUser, isAdmin } = useAuth();
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [selectedJobType, setSelectedJobType] = useState('الكل');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobOffer | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedDetailJob, setSelectedDetailJob] = useState<JobOffer | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  useEffect(() => {
    async function fetchJobs() {
      setLoading(true);
      try {
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

    fetchJobs();
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
      setDeleteConfirmId(null);
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
    const matchesCategory = selectedCategory === 'الكل' || job.category === selectedCategory;
    const matchesType = selectedJobType === 'الكل' || job.jobType === selectedJobType;
    const matchesSearch = 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase());

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

      {/* Hero Header */}
      <div className="bg-gradient-to-l from-[#1a4d2e] via-[#143e25] to-[#0c2617] rounded-3xl p-6 sm:p-10 text-white relative overflow-hidden shadow-lg border border-[#1a4d2e]/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#ff9f1c]/15 rounded-full blur-2xl pointer-events-none -ml-10 -mb-10"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 bg-[#ff9f1c] text-white px-3.5 py-1.5 rounded-full text-xs font-black shadow-xs">
                <Briefcase className="h-4 w-4" />
                <span>سوق العمل والوظائف في إربد</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md text-emerald-300 px-3 py-1.5 rounded-full text-xs font-bold">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>شواغر مخصصة للمحلات، الشركات والطلاب</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              وظائف وشواغر إربد
            </h1>

            <p className="text-stone-200 text-sm sm:text-base leading-relaxed max-w-xl font-normal">
              منصة التوظيف الأولى في محافظة إربد؛ يمكن لكل صاحب محل أو منشأة نشر شواغره بتفاصيل شاملة وسهلة، وتتيح للباحثين عن عمل التقديم والتواصل المباشر.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <button
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2.5 bg-[#ff9f1c] hover:bg-[#f39209] text-white px-6 py-3.5 rounded-2xl font-black text-sm sm:text-base transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="h-5 w-5" />
              <span>انشر وظيفة لمحلك الآن</span>
            </button>
          </div>
        </div>

        {/* Search Bar inside Header */}
        <div className="pt-6 relative z-10 max-w-2xl">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بمسمى الوظيفة (باريستا، كاشير، مسوق، معلم)، اسم المحل، أو المنطقة..."
              className="w-full bg-white/10 backdrop-blur-md text-white placeholder:text-stone-300 border border-white/20 rounded-2xl px-5 py-3.5 pr-11 text-sm focus:outline-none focus:bg-white/20 focus:border-white transition-colors"
            />
            <Search className="h-5 w-5 text-stone-300 absolute right-3.5 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-300 hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="space-y-4">
        
        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-black text-stone-400 shrink-0 ml-1">التصنيف:</span>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#1a4d2e] text-white shadow-xs'
                  : 'bg-white text-stone-600 border border-[#e5e1da] hover:bg-stone-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

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

      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between text-xs text-stone-500 font-bold px-1">
        <span>عرض ({filteredJobs.length}) شاغر وظيفي متاح في إربد</span>
        {(selectedCategory !== 'الكل' || selectedJobType !== 'الكل' || searchQuery) && (
          <button
            onClick={() => {
              setSelectedCategory('الكل');
              setSelectedJobType('الكل');
              setSearchQuery('');
            }}
            className="text-[#1a4d2e] hover:underline"
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
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1a4d2e] text-white rounded-xl font-bold text-sm hover:bg-[#133b22] transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>نشر وظيفة جديدة</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredJobs.map((job) => (
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
                          setDeleteConfirmId(job.id);
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-red-100 space-y-4 my-auto animate-in fade-in zoom-in-95 text-center">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="h-7 w-7" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-stone-900">هل أنت متأكد من حذف هذه الوظيفة؟</h3>
              <p className="text-stone-500 text-sm">
                سيتم إزالة الشاغر نهائياً من قائمة وظائف إربد.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-5 py-2.5 rounded-xl border border-stone-200 font-bold text-sm text-stone-600 hover:bg-stone-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDeleteJob(deleteConfirmId)}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors shadow-xs"
              >
                نعم، احذف الشاغر
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
