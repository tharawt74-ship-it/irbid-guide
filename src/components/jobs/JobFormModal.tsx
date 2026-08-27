import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  X, 
  Send, 
  Building2, 
  MapPin, 
  DollarSign, 
  Clock, 
  Sparkles, 
  Briefcase, 
  Check, 
  Flame, 
  Phone, 
  MessageSquare, 
  Mail, 
  Users, 
  GraduationCap, 
  HelpCircle,
  Coffee,
  ShoppingBag,
  UtensilsCrossed,
  Laptop,
  CheckCircle2,
  Store
} from 'lucide-react';
import { JobOffer, Business } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { useNotifications } from '../../contexts/NotificationsContext';
import { SearchableSelect } from '../ui/SearchableSelect';
import { isBotSubmission, checkSubmissionRateLimit, recordSubmissionTime, sanitizeInput } from '../../lib/security';

interface JobFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobSaved: (savedJob: JobOffer) => void;
  editingJob?: JobOffer | null;
  defaultBusinessId?: string;
  userBusinesses?: Business[];
}

const COMMON_JOB_ROLES = [
  { title: 'باريستا ومعد مشروبات مختصة', category: 'مطاعم ومقاهي', jobType: 'دوام كامل', salary: '300 - 360 دينار', icon: Coffee },
  { title: 'كاشير ومسؤول محاسبة نقاط بيع', category: 'مطاعم ومقاهي', jobType: 'مناسب للطلاب', salary: '260 - 300 دينار', icon: ShoppingBag },
  { title: 'موظف مبيعات وخدمة زبائن', category: 'مبيعات وتجزئة', jobType: 'دوام كامل', salary: '280 - 350 دينار + عمولات', icon: Briefcase },
  { title: 'كابتن صالة ومقدم طعام', category: 'مطاعم ومقاهي', jobType: 'دوام جزئي', salary: '260 - 300 دينار + إكراميات', icon: UtensilsCrossed },
  { title: 'شيف / مساعد طاهي ومشاوي', category: 'مطاعم ومقاهي', jobType: 'دوام كامل', salary: '350 - 450 دينار', icon: UtensilsCrossed },
  { title: 'مسوق رقمي ومسؤول سوشيال ميديا', category: 'تسويق وتكنولوجيا', jobType: 'مناسب للطلاب', salary: '250 - 350 دينار', icon: Laptop },
  { title: 'مدرس / معلم خصوصي لصفوف التقوية', category: 'تعليم وتدريب', jobType: 'دوام جزئي', salary: 'بالساعة / حصص مجزية', icon: GraduationCap },
  { title: 'سائق ديليفري ومندوب توصيل', category: 'صحة وخدمات', jobType: 'دوام مرن', salary: 'حسب الطلبات + بدل بنزين', icon: Store },
];

const BENEFIT_OPTIONS = [
  '🍔 وجبة طعام يومية مجانية',
  '💰 عمولات وحوافز مبيعات مجزية',
  '🎓 ساعات مرنة متوافقة مع جداول الطلاب',
  '🚗 تأمين أو بدل مواصلات',
  '✨ تدريب وتأهيل مهني مدفوع',
  '🩺 تأمين صحي / بيئة عمل مريحة',
  '📈 فرص ترقية وتطور وظيفي سريع',
  '🎉 إكراميات (Tips) يومية أو أسبوعية'
];

const JOB_CATEGORIES = [
  'مطاعم ومقاهي',
  'مبيعات وتجزئة',
  'تسويق وتكنولوجيا',
  'تعليم وتدريب',
  'صحة وخدمات',
  'محاسبة وإدارة',
  'حرف ومهن يدوية'
];

const JOB_TYPES = [
  'دوام كامل',
  'دوام جزئي',
  'مناسب للطلاب',
  'تدريب / خريج جديد',
  'عمل عن بعد'
];

export function JobFormModal({
  isOpen,
  onClose,
  onJobSaved,
  editingJob,
  defaultBusinessId,
  userBusinesses: propBusinesses
}: JobFormModalProps) {
  const { currentUser, isAdmin } = useAuth();
  const { addNotification } = useNotifications();

  const [businesses, setBusinesses] = useState<Business[]>(propBusinesses || []);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(defaultBusinessId || '');
  
  // Form fields
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [category, setCategory] = useState('مطاعم ومقاهي');
  const [jobType, setJobType] = useState('دوام كامل');
  const [location, setLocation] = useState('إربد');
  const [salary, setSalary] = useState('');
  const [workHours, setWorkHours] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('بدون خبرة (مرحب بالخريجين والطلبة)');
  const [genderPreference, setGenderPreference] = useState('all');
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [howToApply, setHowToApply] = useState('اتصال هاتفي أو واتساب');
  const [isUrgent, setIsUrgent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hpValue, setHpValue] = useState('');

  // Fetch businesses if not passed
  useEffect(() => {
    async function loadBusinesses() {
      if (propBusinesses && propBusinesses.length > 0) {
        setBusinesses(propBusinesses);
        return;
      }
      if (!currentUser || !db) return;
      try {
        setLoadingBusinesses(true);
        let fetched: Business[] = [];
        if (isAdmin) {
          const snap = await getDocs(collection(db, 'businesses'));
          snap.forEach(d => {
            const data = d.data();
            if (data.userId === currentUser.uid || data.ownerName === currentUser.displayName) {
              fetched.push({ id: d.id, ...data } as Business);
            }
          });
        } else {
          const q = query(collection(db, 'businesses'), where('userId', '==', currentUser.uid));
          const snap = await getDocs(q);
          snap.forEach(d => {
            fetched.push({ id: d.id, ...d.data() } as Business);
          });
        }
        setBusinesses(fetched);
        if (fetched.length > 0 && !selectedBusinessId && !editingJob) {
          handleSelectBusiness(fetched[0].id, fetched);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingBusinesses(false);
      }
    }

    if (isOpen) {
      loadBusinesses();
    }
  }, [isOpen, currentUser, propBusinesses]);

  // Fill form if editing or when modal opens
  useEffect(() => {
    if (editingJob) {
      setTitle(editingJob.title || '');
      setCompany(editingJob.company || '');
      setSelectedBusinessId(editingJob.businessId || '');
      setCategory(editingJob.category || 'مطاعم ومقاهي');
      setJobType(editingJob.jobType || 'دوام كامل');
      setLocation(editingJob.location || 'إربد');
      setSalary(editingJob.salary || '');
      setWorkHours(editingJob.workHours || '');
      setExperienceLevel(editingJob.experienceLevel || 'بدون خبرة (مرحب بالخريجين والطلبة)');
      setGenderPreference(editingJob.genderPreference || 'all');
      setSelectedBenefits(editingJob.benefits || []);
      setDescription(editingJob.description || '');
      setRequirements(editingJob.requirements ? editingJob.requirements.join('\n') : '');
      setContactPhone(editingJob.contactPhone || '');
      setContactWhatsapp(editingJob.contactWhatsapp || '');
      setContactEmail(editingJob.contactEmail || '');
      setHowToApply(editingJob.howToApply || 'اتصال هاتفي أو واتساب');
      setIsUrgent(!!editingJob.isUrgent);
    } else {
      // Reset defaults
      setTitle('');
      if (defaultBusinessId && businesses.length > 0) {
        handleSelectBusiness(defaultBusinessId, businesses);
      } else if (businesses.length > 0) {
        handleSelectBusiness(businesses[0].id, businesses);
      } else {
        setCompany('');
        setLocation('شارع الجامعة، إربد');
        setContactPhone('');
        setContactWhatsapp('');
      }
      setCategory('مطاعم ومقاهي');
      setJobType('دوام كامل');
      setSalary('280 - 350 دينار');
      setWorkHours('شفت 8 ساعات (أوقات مرنة)');
      setExperienceLevel('بدون خبرة (مرحب بالخريجين والطلبة)');
      setGenderPreference('all');
      setSelectedBenefits(['🍔 وجبة طعام يومية مجانية', '💰 عمولات وحوافز مبيعات مجزية']);
      setDescription('');
      setRequirements('- الالتزام والمظهر اللائق\n- اللباقة في التعامل مع الزبائن\n- القدرة على العمل بروح الفريق');
      setHowToApply('إرسال السيرة الذاتية عبر الواتساب أو الاتصال المباشر');
      setIsUrgent(false);
      setErrorMsg(null);
    }
  }, [editingJob, isOpen, defaultBusinessId]);

  const handleSelectBusiness = (bId: string, currentBusinesses = businesses) => {
    setSelectedBusinessId(bId);
    if (!bId || bId === 'manual') {
      return;
    }
    const found = currentBusinesses.find(b => b.id === bId);
    if (found) {
      setCompany(found.name);
      if (found.address) setLocation(found.address);
      if (found.phone) {
        setContactPhone(found.phone);
        setContactWhatsapp(found.phone);
      }
      // Match category if appropriate
      if (found.category) {
        const matchingCat = JOB_CATEGORIES.find(c => found.category.includes(c) || c.includes(found.category));
        if (matchingCat) setCategory(matchingCat);
      }
    }
  };

  const handleApplyRoleTemplate = (role: typeof COMMON_JOB_ROLES[0]) => {
    setTitle(role.title);
    setCategory(role.category);
    setJobType(role.jobType);
    setSalary(role.salary);
    if (!description) {
      setDescription(`نبحث عن ${role.title} للانضمام إلى فريق عملنا في إربد، مع توفير بيئة عمل مريحة ومحفزة وإمكانية التطور.`);
    }
  };

  const toggleBenefit = (benefit: string) => {
    setSelectedBenefits(prev => 
      prev.includes(benefit) ? prev.filter(b => b !== benefit) : [...prev, benefit]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !company.trim() || !description.trim() || !contactPhone.trim()) {
      setErrorMsg('يرجى تعبئة الحقول الأساسية: المسمى الوظيفي، اسم المحل/المنشأة، الوصف الوظيفي، ورقم الهاتف.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    // 1. Honeypot check (Bot protection)
    if (isBotSubmission(hpValue)) {
      // Trick the bot by pretending to save and closing modal
      onClose();
      setSaving(false);
      return;
    }

    // 2. Rate limit check (Prevention of spamming)
    const rateLimit = checkSubmissionRateLimit('job_submit', 60);
    if (!rateLimit.allowed) {
      setErrorMsg(`يرجى الانتظار ${rateLimit.timeLeft} ثانية قبل نشر وظيفة أخرى لتجنب السبام والمراسلات المتكررة.`);
      setSaving(false);
      return;
    }

    const now = Date.now();
    
    // Sanitize requirements
    const parsedReqs = requirements
      .split('\n')
      .map(r => sanitizeInput(r))
      .filter(r => r.length > 0);

    // 3. Sanitize inputs to prevent script injection & HTML spam
    const jobData: Omit<JobOffer, 'id'> = {
      title: sanitizeInput(title),
      company: sanitizeInput(company),
      businessId: selectedBusinessId && selectedBusinessId !== 'manual' ? selectedBusinessId : undefined,
      category,
      jobType,
      location: sanitizeInput(location) || 'محافظة إربد',
      salary: salary.trim() ? sanitizeInput(salary) : undefined,
      workHours: workHours.trim() ? sanitizeInput(workHours) : undefined,
      experienceLevel,
      genderPreference,
      benefits: selectedBenefits.length > 0 ? selectedBenefits : undefined,
      description: sanitizeInput(description),
      requirements: parsedReqs.length > 0 ? parsedReqs : undefined,
      contactPhone: sanitizeInput(contactPhone),
      contactWhatsapp: contactWhatsapp.trim() ? sanitizeInput(contactWhatsapp) : sanitizeInput(contactPhone),
      contactEmail: contactEmail.trim() ? sanitizeInput(contactEmail) : undefined,
      howToApply: howToApply.trim() ? sanitizeInput(howToApply) : undefined,
      isUrgent,
      status: 'active',
      userId: currentUser?.uid || undefined,
      createdAt: editingJob?.createdAt || now
    };

    try {
      let savedId = editingJob?.id || `job-${now}`;

      if (db) {
        if (editingJob) {
          await setDoc(doc(db, 'jobs', editingJob.id), jobData, { merge: true });
        } else {
          const docRef = await addDoc(collection(db, 'jobs'), jobData);
          savedId = docRef.id;
        }
      }

      const finalJob: JobOffer = {
        ...jobData,
        id: savedId
      };

      // Add system notification for new jobs so all users get notified
      if (!editingJob) {
        try {
          await addNotification({
            title: `وظيفة جديدة: ${finalJob.title}`,
            message: `أعلن (${finalJob.company}) في إربد عن شاغر وظيفي جديد: "${finalJob.title}" - ${finalJob.jobType}. اطلع على التفاصيل وقدم الآن.`,
            type: 'job',
            link: '/jobs',
            badge: isUrgent ? 'شاغر عاجل 🔥' : 'وظيفة جديدة 💼',
          });
        } catch (notifErr) {
          console.warn("Error triggering job notification:", notifErr);
        }
      }

      // 4. Record successful submission timestamp for rate limiting
      recordSubmissionTime('job_submit');

      onJobSaved(finalJob);
      onClose();
    } catch (err: any) {
      console.error("Error saving job:", err);
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ الشاغر الوظيفي.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200 relative my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1a4d2e] to-[#143e25] text-white flex items-center justify-center shadow-xs">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#2d2a26] tracking-tight">
                {editingJob ? 'تعديل بيانات الشاغر الوظيفي' : 'نشر فرصة عمل وشاغر جديد'}
              </h2>
              <p className="text-xs text-stone-500">
                انشر إعلانك بسهولة ليصل لآلاف الباحثين عن عمل والطلبة في محافظة إربد
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Honeypot field - 100% hidden from humans, bots will fill it */}
          <div className="absolute opacity-0 -z-50 pointer-events-none" style={{ width: 0, height: 0, overflow: 'hidden' }}>
            <label htmlFor="job_website_hp">لا تقم بتعبئة هذا الحقل إذا كنت بشراً</label>
            <input
              type="text"
              id="job_website_hp"
              name="job_website_hp"
              tabIndex={-1}
              autoComplete="off"
              value={hpValue}
              onChange={(e) => setHpValue(e.target.value)}
            />
          </div>
          
          {errorMsg && (
            <div className="p-4 bg-red-50 text-red-800 rounded-2xl border border-red-200 text-xs font-bold flex items-center gap-2">
              <X className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Business Linker / Selector */}
          <div className="bg-emerald-50/60 p-4 sm:p-5 rounded-2xl border border-emerald-100 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-[#1a4d2e] uppercase tracking-wider flex items-center gap-1.5">
                <Store className="h-4 w-4 text-[#ff9f1c]" />
                <span>المحل أو المنشأة المعلنة</span>
              </label>
              {businesses.length > 0 && (
                <span className="text-[11px] text-emerald-800 font-bold bg-white/80 px-2 py-0.5 rounded-md">
                  لديك {businesses.length} محل مسجل
                </span>
              )}
            </div>

            {businesses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <select
                    value={selectedBusinessId}
                    onChange={(e) => handleSelectBusiness(e.target.value)}
                    className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                  >
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        🏪 {b.name} ({b.category})
                      </option>
                    ))}
                    <option value="manual">✍️ كتابة اسم منشأة / محل آخر يدوياً</option>
                  </select>
                </div>

                <div>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="اسم المحل أو المطعم أو الشركة"
                    className="w-full p-2.5 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                  />
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="مثال: مطعم زمان، كافيه لافا، صيدلية الرعاية، مكتبة الشمال..."
                  className="w-full p-3 bg-white border border-emerald-200 rounded-xl text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                />
              </div>
            )}
          </div>

          {/* Quick Suggestions Chips */}
          {!editingJob && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-stone-500 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-[#ff9f1c]" />
                <span>اختر من الوظائف الأكثر طلباً لتعبئة سريعة تلقائية:</span>
              </span>
              <div className="flex flex-wrap gap-2">
                {COMMON_JOB_ROLES.map((r, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyRoleTemplate(r)}
                    className="text-[11px] font-bold bg-stone-100 hover:bg-[#1a4d2e] hover:text-white text-stone-700 px-3 py-1.5 rounded-xl border border-stone-200 transition-all cursor-pointer shadow-2xs hover:scale-102"
                  >
                    {r.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Job Core Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Job Title */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                المسمى الوظيفي <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: باريستا ومعد قهوة، كاشير، موظف مبيعات..."
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-[#2d2a26] focus:bg-white focus:border-[#1a4d2e] outline-none transition-colors"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                مجال وتصنيف الوظيفة
              </label>
              <SearchableSelect
                options={JOB_CATEGORIES}
                value={category}
                onChange={(val) => setCategory(val)}
                className="bg-stone-50 border-stone-200"
              />
            </div>

            {/* Job Type */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                نوع الدوام والارتباط
              </label>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-[#2d2a26] focus:bg-white focus:border-[#1a4d2e] outline-none transition-colors"
              >
                {JOB_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Salary Range */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                الراتب / الأجر المتوقع
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="مثال: 300 - 350 دينار / بالساعة / حسب الكفاءة"
                  className="w-full p-3 pr-9 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-[#2d2a26] focus:bg-white focus:border-[#1a4d2e] outline-none transition-colors"
                />
                <DollarSign className="h-4 w-4 text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Location in Irbid */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                موقع ومكان العمل في إربد
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="مثال: شارع الجامعة، سيتي سنتر، الحي الشرقي..."
                  className="w-full p-3 pr-9 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-[#2d2a26] focus:bg-white focus:border-[#1a4d2e] outline-none transition-colors"
                />
                <MapPin className="h-4 w-4 text-[#ff9f1c] absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Work Hours & Shifts */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                أوقات العمل والشفتات
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={workHours}
                  onChange={(e) => setWorkHours(e.target.value)}
                  placeholder="مثال: شفت صباحي من 8 ص - 4 م / شفت مسائي"
                  className="w-full p-3 pr-9 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-[#2d2a26] focus:bg-white focus:border-[#1a4d2e] outline-none transition-colors"
                />
                <Clock className="h-4 w-4 text-sky-600 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Experience Level */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                مستوى الخبرة المطلوب
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-[#2d2a26] focus:bg-white focus:border-[#1a4d2e] outline-none transition-colors"
              >
                <option value="بدون خبرة (مرحب بالخريجين والطلبة)">بدون خبرة (مرحب بالخريجين والطلبة)</option>
                <option value="خبرة من 6 أشهر إلى سنة">خبرة من 6 أشهر إلى سنة</option>
                <option value="خبرة من سنة إلى 3 سنوات">خبرة من سنة إلى 3 سنوات</option>
                <option value="خبرة متقدمة (3 سنوات فأكثر)">خبرة متقدمة (3 سنوات فأكثر)</option>
              </select>
            </div>

            {/* Gender Preference */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                الجنس المطلوب
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'all', label: 'كلا الجنسين' },
                  { key: 'males', label: 'ذكور فقط' },
                  { key: 'females', label: 'إناث فقط' },
                ].map(item => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setGenderPreference(item.key)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      genderPreference === item.key
                        ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-2xs'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Section 3: Benefits & Perks Checkboxes */}
          <div className="space-y-2.5 bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
            <label className="text-xs font-black text-stone-700 block">
              المزايا والحوافز الإضافية (اختر ما تقدمه لجذب أفضل الكفاءات):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BENEFIT_OPTIONS.map((benefit, idx) => {
                const isSelected = selectedBenefits.includes(benefit);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleBenefit(benefit)}
                    className={`p-2.5 rounded-xl text-xs font-bold text-right flex items-center justify-between border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-emerald-100/80 text-emerald-900 border-emerald-300 shadow-2xs' 
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100/80'
                    }`}
                  >
                    <span>{benefit}</span>
                    {isSelected && <Check className="h-4 w-4 text-emerald-700 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Description & Requirements */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                الوصف الوظيفي والمسؤوليات <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اشرح طبيعة العمل، المهام اليومية، وما يتوقعه صاحب المحل من الموظف..."
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-[#2d2a26] focus:bg-white focus:border-[#1a4d2e] outline-none transition-colors resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                الشروط والمتطلبات (اكتب كل شرط في سطر مستقل)
              </label>
              <textarea
                rows={3}
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="مثال:&#10;- اللباقة والمظهر اللائق&#10;- التفرغ للعمل ضمن الشفت المطلوب&#10;- حسن المعاملة مع الزبائن"
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-[#2d2a26] focus:bg-white focus:border-[#1a4d2e] outline-none transition-colors resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Section 5: Contact & Application */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50/70 p-4 rounded-2xl border border-stone-200">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                رقم هاتف الاتصال المباشر <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  dir="ltr"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                  className="w-full p-3 pr-9 bg-white border border-stone-200 rounded-xl text-sm font-bold text-[#2d2a26] text-right focus:border-[#1a4d2e] outline-none"
                />
                <Phone className="h-4 w-4 text-[#1a4d2e] absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                رقم الواتساب للتقديم السريع
              </label>
              <div className="relative">
                <input
                  type="tel"
                  dir="ltr"
                  value={contactWhatsapp}
                  onChange={(e) => setContactWhatsapp(e.target.value)}
                  placeholder="07XXXXXXXX"
                  className="w-full p-3 pr-9 bg-white border border-stone-200 rounded-xl text-sm font-bold text-[#2d2a26] text-right focus:border-[#1a4d2e] outline-none"
                />
                <MessageSquare className="h-4 w-4 text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                طريقة التقديم المفضلة
              </label>
              <input
                type="text"
                value={howToApply}
                onChange={(e) => setHowToApply(e.target.value)}
                placeholder="مثال: إرسال السيرة الذاتية عبر الواتساب، أو الحضور للمحل مباشرة من 2 - 6 مساءً"
                className="w-full p-3 bg-white border border-stone-200 rounded-xl text-sm text-[#2d2a26] focus:border-[#1a4d2e] outline-none"
              />
            </div>
          </div>

          {/* Section 6: Urgent Badge */}
          <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-amber-950">تمييز الشاغر كـ "فرصة عاجلة / فوري"</h4>
                <p className="text-xs text-amber-800">
                  إبراز الشاغر في أعلى قائمة الوظائف مع شارة حمراء مميزة لجذب المتقدمين سريعاً
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* Sticky Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-stone-200 font-bold text-sm text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={saving || !title.trim() || !company.trim() || !description.trim() || !contactPhone.trim()}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white font-black text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <span>جاري النشر...</span>
              ) : (
                <>
                  <Send className="h-4 w-4 text-[#ff9f1c]" />
                  <span>{editingJob ? 'حفظ التعديلات' : 'نشر الشاغر في صفحة الوظائف'}</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>,
    document.body
  );
}
