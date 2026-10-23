import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
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
  Store, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  AlertCircle,
  Lock,
  Stethoscope,
  Scissors,
  ShoppingBag,
  UtensilsCrossed,
  GraduationCap,
  Wrench
} from 'lucide-react';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import { JobOffer, Business } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, doc, setDoc, getDocs, query, where, limit } from 'firebase/firestore';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { BUSINESS_CATEGORIES } from '../../lib/categories';
import { isBotSubmission, checkSubmissionRateLimit, recordSubmissionTime, sanitizeInput } from '../../lib/security';

interface JobFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobSaved: (savedJob: JobOffer) => void;
  editingJob?: JobOffer | null;
  defaultBusinessId?: string;
  userBusinesses?: Business[];
}

type BusinessSector = 'medical' | 'beauty' | 'retail' | 'food' | 'education' | 'crafts' | 'general';

interface QuickJobPreset {
  title: string;
  jobType: string;
  salary: string;
  description: string;
  requirements: string;
}

const SECTOR_INFO: Record<BusinessSector, { name: string; categoryName: string; defaultSubCategories: string[] }> = {
  medical: {
    name: 'القطاع الطبي والصحي',
    categoryName: 'صحة وطب',
    defaultSubCategories: [
      'مستشفيات ومراكز طبية',
      'عيادات أطباء واستشاريين',
      'عيادات وجراحة الأسنان',
      'صيدليات ودواء',
      'مختبرات وأشعة وبصريات',
      'علاج طبيعي وتأهيل'
    ]
  },
  beauty: {
    name: 'الصالونات ومراكز التجميل',
    categoryName: 'عناية شخصية وتجميل',
    defaultSubCategories: [
      'صالونات حلاقة (رجال)',
      'مراكز تجميل وصالونات (سيدات)',
      'مراكز عناية بالبشرة والليزر',
      'نوادي رياضية وجيم (رجال/سيدات)',
      'مراكز تدليك ومساج وسبا'
    ]
  },
  retail: {
    name: 'المكتبات والمتاجر والتجزئة',
    categoryName: 'تسوق وتجزئة',
    defaultSubCategories: [
      'سوبرماركت وهايبرماركت',
      'قرطاسية ومكتبات وأدوات مدرسية',
      'ملابس وأزياء (رجالي، ستاتي، أطفال)',
      'هواتف محمولة وإكسسواراتها',
      'أجهزة كهربائية وإلكترونية',
      'عطور ومستحضرات تجميل',
      'هدايا وألعاب خردوات'
    ]
  },
  food: {
    name: 'المطاعم والمقاهي',
    categoryName: 'مأكولات ومشروبات',
    defaultSubCategories: [
      'مطاعم وجبات سريعة (شاورما، برجر، سناكات)',
      'مطاعم مشاوي ومأكولات شرقية',
      'مقاهي وكافيهات',
      'أكشاك القهوة والمشروبات الساخنة',
      'حلويات شرقية وغربية',
      'مخابز',
      'مطاعم بيتزا ومعجنات'
    ]
  },
  education: {
    name: 'التعليم والتدريب',
    categoryName: 'تعليم وتدريب',
    defaultSubCategories: [
      'مدارس خاصة ورياض أطفال',
      'مراكز تدريب ولغات',
      'مراكز ثقافية وتعليمية',
      'معاهد مهنية وتقنية',
      'معلمو ومعلمات لغات ومواد علمية'
    ]
  },
  crafts: {
    name: 'المهن الحرفية والإنشاءات',
    categoryName: 'صناعة وحرف وإنشاءات',
    defaultSubCategories: [
      'محلات ألمنيوم وزجاج وصيانة',
      'منجرة ومحلات نجارة ومطابخ',
      'محددة ومحلات حدادة وتشكيل معادن',
      'محلات مواد بناء ودهانات وديكور',
      'تمديدات صحية وكهربائية'
    ]
  },
  general: {
    name: 'خدمات وأعمال عامة',
    categoryName: 'خدمات وأعمال عامة',
    defaultSubCategories: [
      'خدمات تجارية وتسويق',
      'خدمات نقل وتوصيل',
      'صيانة وخدمات فنية',
      'خدمات إدارية ومكتبية'
    ]
  }
};

const SECTOR_QUICK_PRESETS: Record<BusinessSector, QuickJobPreset[]> = {
  medical: [
    {
      title: 'ممرض/ة قانوني',
      jobType: 'دوام كامل',
      salary: '320 - 400 دينار',
      description: 'متابعة شؤون المرضى وتقديم الرعاية التمريضية والإجراءات الطبية المعتمدة وفق أعلى معايير السلامة المهنية.',
      requirements: '- مزاولة مهنة تمريض سارية المفعول\n- خبرة سريرية سابقة\n- الالتزام واللباقة وحسن التعامل مع المرضى'
    },
    {
      title: 'موظف استقبال وعلاقات مرضى',
      jobType: 'دوام كامل',
      salary: '280 - 350 دينار',
      description: 'استقبال المراجعين وتنظيم المواعيد والسجلات الطبية والإجابة على الاستفسارات الهاتفية والمباشرة.',
      requirements: '- مهارات تواصل عالية واللباقة التامة\n- إجادة العمل على أنظمة الحاسوب والسجلات الطبية\n- القدرة على تنظيم الوقت وإدارة فترات الانتظار'
    },
    {
      title: 'مساعد صيدلي',
      jobType: 'دوام كامل',
      salary: '300 - 380 دينار',
      description: 'المساعدة في صرف الوصفات الطبية، ترتيب الأدوية وجرد المستودع، وخدمة رواد الصيدلية بلباقة.',
      requirements: '- دبلوم صيدلة أو تخصص ذو صلة\n- معرفة جيدة بالأسماء العلمية والتجارية للأدوية\n- الدقة والالتزام بأوقات الدوام'
    },
    {
      title: 'سكرتاريه طبية',
      jobType: 'دوام كامل',
      salary: '280 - 340 دينار',
      description: 'إدارة ملفات المرضى وتنسيق المواعيد وتنظيم جدول الطبيب ومتابعة الاتصالات والمراسلات.',
      requirements: '- خبرة سابقة في إدارة العيادات والمراكز الطبية\n- إجادة استخدام الحاسوب وبرامج الأوفيس\n- المظهر اللائق وحسن التعامل'
    }
  ],
  beauty: [
    {
      title: 'حلاق فئة أولى',
      jobType: 'دوام كامل',
      salary: '350 - 500 دينار',
      description: 'تقديم خدمات الحلاقة الرجالية، تصفيف الشعر، وتنسيق اللحى بأحدث القصات مع الالتزام بأعلى معايير النظافة والتعقيم.',
      requirements: '- خبرة عملية مثبتة في الحلاقة الرجالية\n- مهارة في استخدام الأدوات الحديثة والتعقيم\n- حسن المظهر والتعامل الراقي مع الزبائن'
    },
    {
      title: 'أخصائية تجميل وبشرة',
      jobType: 'دوام كامل',
      salary: '320 - 450 دينار',
      description: 'تقديم جلسات العناية بالبشرة، التنظيف العميق، وتطبيق مستحضرات التجميل المعتمدة وفق المعايير الصحية.',
      requirements: '- شهادة معتمدة أو دورات متخصصة في العناية بالبشرة\n- خبرة في استخدام الأجهزة التجميلية الحديثة\n- اللباقة والقدرة على كسب ثقة العميلات'
    },
    {
      title: 'مصفف شعر',
      jobType: 'دوام كامل',
      salary: '300 - 450 دينار',
      description: 'قص وتصفيف وصبغ الشعر وتقديم الاستشارات الجمالية للزبائن بأعلى درجات الإتقان.',
      requirements: '- خبرة مثبتة في الصبغات والتسريحات الحديثة\n- مهارات مهنية عالية والسرعة والإتقان\n- الالتزام بمواعيد العمل وأخلاقيات المهنة'
    }
  ],
  retail: [
    {
      title: 'موظف مبيعات وتنسيق بضائع',
      jobType: 'دوام كامل',
      salary: '280 - 350 دينار',
      description: 'مساعدة الزبائن وتقديم المشورة لهم، ترتيب وتنسيق البضائع على الرفوف، ومتابعة حركة المبيعات اليومية.',
      requirements: '- اللباقة وحسن التعامل والقدرة على الإقناع\n- النشاط والقدرة على ترتيب المعروضات وجردها\n- الالتزام والانضباط بمواعيد الشفتات'
    },
    {
      title: 'أمين صندوق / كاشير',
      jobType: 'دوام كامل',
      salary: '280 - 330 دينار',
      description: 'إدارة عمليات الدفع وإصدار الفواتير النقدية والإلكترونية ومطابقة الصندوق في نهاية الشفت.',
      requirements: '- الدقة والأمانة العالية في المعاملات المالية\n- إجادة استخدام برامج نقاط البيع\n- تحمل ضغط العمل وسرعة الإنجاز'
    }
  ],
  food: [
    {
      title: 'باريستا',
      jobType: 'دوام كامل',
      salary: '300 - 380 دينار',
      description: 'تحضير وتقديم المشروبات الساخنة والباردة والقهوة المختصة مع إتقان فن الرسم على القهوة.',
      requirements: '- خبرة سابقة في إعداد القهوة المختصة وتشغيل ماكينات الإسبريسو\n- النظافة الشخصية والاهتمام بتفاصيل مكان العمل\n- اللباقة والابتسامة في استقبال الرواد'
    },
    {
      title: 'شيف مشاوي',
      jobType: 'دوام كامل',
      salary: '380 - 500 دينار',
      description: 'تجهيز وتتبيل اللحوم والشواء على الفحم وفق المعايير الصحية والطهي الشرقي المتقن.',
      requirements: '- خبرة عملية مثبتة في مطاعم المشاوي والمأكولات الشرقية\n- الالتزام التام بمعايير النظافة وسلامة الغذاء\n- السرعة والدقة في تلبية الطلبات وقت الذروة'
    },
    {
      title: 'كابتن صالة',
      jobType: 'دوام كامل',
      salary: '270 - 340 دينار',
      description: 'استقبال رواد المطعم، أخذ الطلبات وتمريرها للمطبخ، وضمان رضا الزبائن وتقديم تجربة ضيافة استثنائية.',
      requirements: '- اللباقة وحسن المظهر وسرعة البديهة\n- العمل بروح الفريق والتعامل الودود مع الضيوف\n- القدرة على العمل في الشفتات المسائية وعطلات نهاية الأسبوع'
    }
  ],
  education: [
    {
      title: 'معلم / معلمة لغة إنجليزية',
      jobType: 'دوام كامل',
      salary: '300 - 420 دينار',
      description: 'تدريس منهاج اللغة الإنجليزية وإعداد الخطط التعليمية ومتابعة المستوى الأكاديمي للطلاب.',
      requirements: '- بكالوريوس في اللغة الإنجليزية أو تخصص ذو صلة\n- مهارات تدريس وشرح حديثة وتفاعلية\n- الصبر والقدرة على التعامل مع الفئات العمرية المختلفة'
    },
    {
      title: 'معلم خصوصي لصفوف التقوية',
      jobType: 'دوام جزئي',
      salary: 'بالساعة / حصص مجزية',
      description: 'إعطاء حصص تقوية مكثفة ومتابعة الواجبات المدرسية وتهيئة الطلاب للامتحانات المدرسية والتوجيهي.',
      requirements: '- التمكن الأكاديمي والقدرة على تبسيط المفاهيم\n- المرونة في المواعيد\n- الالتزام بالخطة التدريسية'
    },
    {
      title: 'موظف إداري وشؤون طلاب',
      jobType: 'دوام كامل',
      salary: '280 - 350 دينار',
      description: 'تنظيم تسجيل الطلاب، إعداد الجداول، متابعة الحضور، والتواصل الدوري مع أولياء الأمور.',
      requirements: '- إجادة استخدام برامج الحاسوب المكتبية\n- مهارات اتصال وتنظيم عالية\n- اللباقة وسرعة الاستجابة'
    }
  ],
  crafts: [
    {
      title: 'فني صيانة وتركيبات',
      jobType: 'دوام كامل',
      salary: '350 - 450 دينار',
      description: 'تنفيذ أعمال الصيانة الدورية والطارئة، التركيبات، والتعامل مع الأعطال بدقة واحترافية.',
      requirements: '- خبرة عملية في أعمال الصيانة والتمديدات\n- امتلاك المهارات اليدوية والمعرفة بأدوات السلامة\n- الالتزام بالمواعيد وجودة التنفيذ'
    },
    {
      title: 'معلم ألمنيوم وزجاج',
      jobType: 'دوام كامل',
      salary: '350 - 500 دينار',
      description: 'قص وتجميع وتركيب قطاعات الألمنيوم والزجاج والواجهات وفق المقاسات المحددة.',
      requirements: '- خبرة سابقة في ورش الألمنيوم والواجهات\n- الدقة في أخذ القياسات والتنفيذ\n- الالتزام والانضباط'
    }
  ],
  general: [
    {
      title: 'موظف مبيعات وخدمة زبائن',
      jobType: 'دوام كامل',
      salary: '280 - 350 دينار',
      description: 'التواصل مع الزبائن والرد على استفساراتهم وتقديم الدعم اللازم لتعزيز مبيعات المنشأة.',
      requirements: '- اللباقة والقدرة على التواصل الفعال\n- إجادة استخدام الحاسوب وتطبيقات التواصل\n- روح المبادرة والنشاط'
    },
    {
      title: 'مسوق رقمي ومسؤول سوشيال ميديا',
      jobType: 'مناسب للطلاب',
      salary: '260 - 350 دينار',
      description: 'إدارة صفحات التواصل الاجتماعي، إنشاء المحتوى الإعلاني، ومتابعة تفاعل الجمهور والرسائل.',
      requirements: '- خبرة في صناعة المحتوى والتصميم الأساسي\n- متابعة التوجهات الرائجة في منصات التواصل\n- الالتزام بالخطة التسويقية'
    },
    {
      title: 'سائق ومندوب توصيل',
      jobType: 'دوام مرن',
      salary: 'حسب الطلبات + بدل بنزين',
      description: 'توصيل الطلبات للزبائن في مناطق إربد بسرعة وأمانة مع الحفاظ على سلامة البضائع.',
      requirements: '- رخصة قيادة سارية المفعول ومعرفة بشوارع إربد\n- الالتزام بالمواعيد والأمانة واللباقة\n- امتلاك وسيلة نقل مناسبة'
    }
  ]
};

const BENEFIT_OPTIONS = [
  'وجبة طعام يومية مجانية',
  'عمولات وحوافز مبيعات مجزية',
  'ساعات مرنة متوافقة مع جداول الطلاب',
  'تأمين أو بدل مواصلات',
  'تدريب وتأهيل مهني مدفوع',
  'تأمين صحي وبيئة عمل مريحة',
  'فرص ترقية وتطور وظيفي سريع',
  'إكراميات يومية أو أسبوعية'
];

const JOB_TYPES = [
  'دوام كامل',
  'دوام جزئي',
  'مناسب للطلاب',
  'تدريب / خريج جديد',
  'عمل عن بعد'
];

function detectBusinessSector(categoryStr?: string, nameStr?: string, subCategoryStr?: string): BusinessSector {
  const combined = `${categoryStr || ''} ${nameStr || ''} ${subCategoryStr || ''}`.toLowerCase();
  if (
    combined.includes('طب') || combined.includes('صح') || combined.includes('صيدل') ||
    combined.includes('عياد') || combined.includes('مستشف') || combined.includes('مختبر') ||
    combined.includes('أسنان') || combined.includes('علاج')
  ) {
    return 'medical';
  }
  if (
    combined.includes('صالون') || combined.includes('حلاق') || (combined.includes('تجميل') && !combined.includes('عطور') && !combined.includes('مستحضرات')) ||
    combined.includes('بشرة') || combined.includes('عناية شخصية') || combined.includes('مساج') ||
    (combined.includes('سبا') && !combined.includes('مناسب')) || combined.includes('مصفف')
  ) {
    return 'beauty';
  }
  if (
    combined.includes('مطعم') || combined.includes('مأكولات') || combined.includes('كافيه') ||
    combined.includes('مقهى') || combined.includes('شاورما') || combined.includes('برجر') ||
    combined.includes('حلويات') || combined.includes('مخبز') || combined.includes('مشاوي') ||
    combined.includes('سناك') || combined.includes('عصائر')
  ) {
    return 'food';
  }
  if (
    combined.includes('مكتب') || combined.includes('متجر') || combined.includes('تسوق') ||
    combined.includes('تجزئة') || combined.includes('مول') || combined.includes('سوبرماركت') ||
    combined.includes('ملابس') || combined.includes('أزياء') || combined.includes('أجهزة') ||
    combined.includes('هواتف') || combined.includes('خردوات') || combined.includes('بقالة')
  ) {
    return 'retail';
  }
  if (
    combined.includes('تعليم') || combined.includes('تدريب') || combined.includes('مدرس') ||
    combined.includes('روضة') || combined.includes('أكاديم') || combined.includes('جامع') ||
    combined.includes('معهد')
  ) {
    return 'education';
  }
  if (
    combined.includes('صناع') || combined.includes('حرف') || combined.includes('إنشاء') ||
    combined.includes('حداد') || combined.includes('نجار') || combined.includes('ألمنيوم') ||
    combined.includes('بناء') || combined.includes('صيانة')
  ) {
    return 'crafts';
  }
  return 'general';
}

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
  const { categories: systemCategories } = useSystemSettings();

  // Wizard state: 1, 2, 3, 4
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  const [businesses, setBusinesses] = useState<Business[]>(propBusinesses || []);
  const [loadingBusinesses, setLoadingBusinesses] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(defaultBusinessId || '');
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');

  // Form fields
  const [company, setCompany] = useState('');
  const [detectedSector, setDetectedSector] = useState<BusinessSector>('general');
  const [category, setCategory] = useState('مأكولات ومشروبات');
  const [subCategory, setSubCategory] = useState('');
  const [title, setTitle] = useState('');
  const [jobType, setJobType] = useState('دوام كامل');
  const [salary, setSalary] = useState('280 - 350 دينار');
  const [workHours, setWorkHours] = useState('شفت 8 ساعات (أوقات مرنة)');
  const [experienceLevel, setExperienceLevel] = useState('بدون خبرة (مرحب بالخريجين والطلبة)');
  const [genderPreference, setGenderPreference] = useState('all');
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>(['وجبة طعام يومية مجانية']);
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('- الالتزام والمظهر اللائق\n- اللباقة في التعامل مع الزبائن\n- القدرة على العمل بروح الفريق');
  const [location, setLocation] = useState('شارع الجامعة، إربد');
  const [locationDetailNotes, setLocationDetailNotes] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWhatsapp, setContactWhatsapp] = useState('');
  const [howToApply, setHowToApply] = useState('إرسال السيرة الذاتية عبر الواتساب أو الاتصال المباشر');
  const [isUrgent, setIsUrgent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hpValue, setHpValue] = useState('');

  // Fetch businesses if not provided
  useEffect(() => {
    async function loadBusinesses() {
      if (propBusinesses && propBusinesses.length > 0) {
        setBusinesses(propBusinesses);
        return;
      }
      if (!currentUser || !db) return;
      try {
        setLoadingBusinesses(true);
        const fetched: Business[] = [];
        if (isAdmin) {
          const qAdmin = query(collection(db, 'businesses'), where('userId', '==', currentUser.uid));
          const snap = await getDocs(qAdmin);
          snap.forEach(d => {
            fetched.push({ id: d.id, ...d.data() } as Business);
          });
          if (fetched.length === 0) {
            const snapRecent = await getDocs(query(collection(db, 'businesses'), limit(100)));
            snapRecent.forEach(d => {
              fetched.push({ id: d.id, ...d.data() } as Business);
            });
          }
        } else {
          const q = query(collection(db, 'businesses'), where('userId', '==', currentUser.uid));
          const snap = await getDocs(q);
          snap.forEach(d => {
            fetched.push({ id: d.id, ...d.data() } as Business);
          });
        }
        setBusinesses(fetched);
      } catch (e) {
        console.error('Error fetching businesses for job form:', e);
      } finally {
        setLoadingBusinesses(false);
      }
    }

    if (isOpen) {
      loadBusinesses();
    }
  }, [isOpen, currentUser, propBusinesses, isAdmin]);

  // Sync business data helper
  const applyBusinessData = (biz: Business | undefined, isManual = false) => {
    if (!biz || isManual) {
      setSelectedBusinessId('manual');
      if (!editingJob) {
        setCompany('');
        setContactPhone('');
        setContactWhatsapp('');
        setLocation('شارع الجامعة، إربد');
      }
      return;
    }

    setSelectedBusinessId(biz.id);
    setCompany(biz.name);
    
    // Auto-sync contact information
    if (biz.phone) {
      setContactPhone(biz.phone);
      setContactWhatsapp(biz.phone);
    }

    // Auto-sync fixed location binding from business profile
    const boundLocation = biz.district 
      ? (biz.address ? `${biz.district} - ${biz.address}` : biz.district)
      : (biz.address || 'إربد المركز');
    setLocation(boundLocation);

    // Auto-detect sector and strictly inherit category
    const sector = detectBusinessSector(biz.category, biz.name, biz.subCategory);
    setDetectedSector(sector);
    const sectorDetails = SECTOR_INFO[sector];
    setCategory(sectorDetails.categoryName);

    if (biz.subCategory) {
      setSubCategory(biz.subCategory);
    } else if (sectorDetails.defaultSubCategories.length > 0) {
      setSubCategory(sectorDetails.defaultSubCategories[0]);
    }
  };

  // Initialize or reset form on open / change of editingJob
  useEffect(() => {
    if (!isOpen) return;

    setCurrentStep(1);
    setErrorMsg(null);

    if (editingJob) {
      setTitle(editingJob.title || '');
      setCompany(editingJob.company || '');
      const bId = editingJob.businessId || '';
      setSelectedBusinessId(bId);

      if (bId && bId !== 'manual') {
        const foundBiz = businesses.find(b => b.id === bId);
        if (foundBiz) {
          if (foundBiz.parentBusinessId) {
            setSelectedParentId(foundBiz.parentBusinessId);
            setSelectedBranchId(foundBiz.id);
          } else {
            setSelectedParentId(foundBiz.id);
            setSelectedBranchId(foundBiz.id);
          }
        } else {
          setSelectedParentId(bId);
          setSelectedBranchId('');
        }
      } else {
        setSelectedParentId('manual');
        setSelectedBranchId('');
      }

      const sector = detectBusinessSector(editingJob.category, editingJob.company, editingJob.subCategory);
      setDetectedSector(sector);
      setCategory(editingJob.category || SECTOR_INFO[sector].categoryName);
      setSubCategory(editingJob.subCategory || '');
      setJobType(editingJob.jobType || 'دوام كامل');
      setLocation(editingJob.location || 'إربد المركز');
      setSalary(editingJob.salary || '');
      setWorkHours(editingJob.workHours || '');
      setExperienceLevel(editingJob.experienceLevel || 'بدون خبرة (مرحب بالخريجين والطلبة)');
      setGenderPreference(editingJob.genderPreference || 'all');
      setSelectedBenefits(editingJob.benefits || []);
      setDescription(editingJob.description || '');
      setRequirements(editingJob.requirements ? editingJob.requirements.join('\n') : '');
      setContactPhone(editingJob.contactPhone || '');
      setContactWhatsapp(editingJob.contactWhatsapp || '');
      setHowToApply(editingJob.howToApply || 'إرسال السيرة الذاتية عبر الواتساب أو الاتصال المباشر');
      setIsUrgent(!!editingJob.isUrgent);
    } else {
      // New Job mode: Select initial business or manual
      const initialBizId = defaultBusinessId || (businesses.length > 0 ? businesses[0].id : '');
      if (initialBizId && initialBizId !== 'manual') {
        const foundBiz = businesses.find(b => b.id === initialBizId);
        if (foundBiz) {
          if (foundBiz.parentBusinessId) {
            setSelectedParentId(foundBiz.parentBusinessId);
            setSelectedBranchId(foundBiz.id);
          } else {
            setSelectedParentId(foundBiz.id);
            setSelectedBranchId(foundBiz.id);
          }
          applyBusinessData(foundBiz);
        }
      } else {
        setSelectedParentId('manual');
        setSelectedBranchId('');
        setSelectedBusinessId('manual');
        setCompany('');
        setDetectedSector('general');
        setCategory(SECTOR_INFO.general.categoryName);
        setSubCategory(SECTOR_INFO.general.defaultSubCategories[0]);
        setLocation('شارع الجامعة، إربد');
        setContactPhone('');
        setContactWhatsapp('');
      }

      setTitle('');
      setJobType('دوام كامل');
      setSalary('280 - 350 دينار');
      setWorkHours('شفت 8 ساعات (أوقات مرنة)');
      setExperienceLevel('بدون خبرة (مرحب بالخريجين والطلبة)');
      setGenderPreference('all');
      setSelectedBenefits(['وجبة طعام يومية مجانية', 'عمولات وحوافز مبيعات مجزية']);
      setDescription('');
      setRequirements('- الالتزام والمظهر اللائق\n- اللباقة في التعامل مع الزبائن\n- القدرة على العمل بروح الفريق');
      setHowToApply('إرسال السيرة الذاتية عبر الواتساب أو الاتصال المباشر');
      setIsUrgent(false);
    }
  }, [isOpen, editingJob, defaultBusinessId, businesses]);

  // Handle parent business selection
  const handleSelectParent = (parentId: string) => {
    setSelectedParentId(parentId);
    if (!parentId || parentId === 'manual') {
      setSelectedBranchId('');
      applyBusinessData(undefined, true);
      return;
    }

    const branchesOfParent = businesses.filter(b => b.parentBusinessId === parentId);
    if (branchesOfParent.length > 0) {
      setSelectedBranchId(parentId);
      const mainBranch = businesses.find(b => b.id === parentId);
      applyBusinessData(mainBranch);
    } else {
      setSelectedBranchId('');
      const targetBiz = businesses.find(b => b.id === parentId);
      applyBusinessData(targetBiz);
    }
  };

  // Handle branch selection
  const handleSelectBranch = (branchId: string) => {
    setSelectedBranchId(branchId);
    const branchBiz = businesses.find(b => b.id === branchId);
    if (branchBiz) {
      applyBusinessData(branchBiz);
    }
  };

  // Handle quick role presets
  const handleApplyQuickPreset = (preset: QuickJobPreset) => {
    setTitle(preset.title);
    setJobType(preset.jobType);
    setSalary(preset.salary);
    if (preset.description) {
      setDescription(preset.description);
    }
    if (preset.requirements) {
      setRequirements(preset.requirements);
    }
  };

  const toggleBenefit = (benefit: string) => {
    setSelectedBenefits(prev => 
      prev.includes(benefit) ? prev.filter(b => b !== benefit) : [...prev, benefit]
    );
  };

  // Available subcategories based on sector
  const availableSubCategories = useMemo(() => {
    const defaultList = SECTOR_INFO[detectedSector]?.defaultSubCategories || [];
    const matchedCategoryName = SECTOR_INFO[detectedSector]?.categoryName;
    const fromSys = systemCategories.find(c => c.name === matchedCategoryName)?.subcategories;
    const fromBiz = (BUSINESS_CATEGORIES as Record<string, string[]>)[matchedCategoryName];
    const combined = Array.from(new Set([...(fromSys || []), ...(fromBiz || []), ...defaultList]));
    return combined.length > 0 ? combined : defaultList;
  }, [detectedSector, systemCategories]);

  // Sector presets list
  const currentPresets = useMemo(() => {
    return SECTOR_QUICK_PRESETS[detectedSector] || SECTOR_QUICK_PRESETS.general;
  }, [detectedSector]);

  // Active selected business object
  const activeBusiness = useMemo(() => {
    return businesses.find(b => b.id === selectedBusinessId);
  }, [businesses, selectedBusinessId]);

  // Step Validation & Navigation
  const goToNextStep = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setErrorMsg(null);
    if (currentStep === 1) {
      if (!company.trim()) {
        setErrorMsg('يرجى تحديد المنشأة الناشرة أو كتابة اسم المحل للمتابعة.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!title.trim()) {
        setErrorMsg('يرجى إدخال المسمى الوظيفي المطلوب.');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!description.trim()) {
        setErrorMsg('يرجى كتابة نبذة أو وصف موجز للمهام والمسؤوليات الوظيفية.');
        return;
      }
      setCurrentStep(4);
    }
  };

  const goToPreviousStep = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setErrorMsg(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    }
  };

  // Form submission (Strictly only when user clicks the publish button on step 4)
  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (currentStep !== 4) {
      return;
    }

    if (!title.trim() || !company.trim() || !description.trim() || !contactPhone.trim()) {
      setErrorMsg('يرجى استكمال البيانات الأساسية: اسم المنشأة، المسمى الوظيفي، الوصف، ورقم الهاتف.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    // Honeypot check
    if (isBotSubmission(hpValue)) {
      onClose();
      setSaving(false);
      return;
    }

    // Rate limit check
    const rateLimit = checkSubmissionRateLimit('job_submit', 60);
    if (!rateLimit.allowed) {
      setErrorMsg(`يرجى الانتظار ${rateLimit.timeLeft} ثانية قبل نشر شاغر آخر لضمان جودة المحتوى.`);
      setSaving(false);
      return;
    }

    const now = Date.now();
    const parsedReqs = requirements
      .split('\n')
      .map(r => sanitizeInput(r))
      .filter(r => r.length > 0);

    const finalLocation = locationDetailNotes.trim()
      ? `${location} (${sanitizeInput(locationDetailNotes)})`
      : location;

    const jobData: Omit<JobOffer, 'id'> = {
      title: sanitizeInput(title),
      company: sanitizeInput(company),
      businessId: selectedBusinessId && selectedBusinessId !== 'manual' ? selectedBusinessId : undefined,
      category,
      subCategory: subCategory || undefined,
      businessCategory: activeBusiness?.category || category,
      businessSubCategory: activeBusiness?.subCategory || subCategory || undefined,
      businessDistrict: activeBusiness?.district || undefined,
      businessAddress: activeBusiness?.address || undefined,
      jobType,
      location: sanitizeInput(finalLocation),
      salary: salary.trim() ? sanitizeInput(salary) : undefined,
      workHours: workHours.trim() ? sanitizeInput(workHours) : undefined,
      experienceLevel,
      genderPreference,
      benefits: selectedBenefits.length > 0 ? selectedBenefits : undefined,
      description: sanitizeInput(description),
      requirements: parsedReqs.length > 0 ? parsedReqs : undefined,
      contactPhone: sanitizeInput(contactPhone),
      contactWhatsapp: contactWhatsapp.trim() ? sanitizeInput(contactWhatsapp) : sanitizeInput(contactPhone),
      howToApply: howToApply.trim() ? sanitizeInput(howToApply) : undefined,
      isUrgent,
      status: isAdmin ? 'active' : 'pending',
      userId: currentUser?.uid || undefined,
      createdAt: editingJob?.createdAt || now
    };

    const cleanedJobData = Object.entries(jobData).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    try {
      let savedId = editingJob?.id || `job-${now}`;

      if (db) {
        if (editingJob) {
          await setDoc(doc(db, 'jobs', editingJob.id), cleanedJobData, { merge: true });
        } else {
          const docRef = await addDoc(collection(db, 'jobs'), cleanedJobData);
          savedId = docRef.id;
        }
      }

      const finalJob: JobOffer = {
        ...jobData,
        id: savedId
      };

      if (!editingJob) {
        try {
          await addNotification({
            title: `وظيفة جديدة: ${finalJob.title}`,
            message: `أعلن (${finalJob.company}) في إربد عن شاغر وظيفي جديد: "${finalJob.title}" - ${finalJob.jobType}. اطلع على التفاصيل وقدم الآن.`,
            type: 'job',
            link: '/jobs',
            badge: isUrgent ? 'شاغر عاجل' : 'وظيفة جديدة',
            jobId: savedId,
            targetId: savedId,
            businessId: selectedBusinessId && selectedBusinessId !== 'manual' ? selectedBusinessId : undefined,
            businessName: activeBusiness?.name || company || undefined,
            businessLogoUrl: activeBusiness?.logoUrl || undefined,
          });
        } catch (notifErr) {
          console.warn('Error triggering job notification:', notifErr);
        }
      }

      recordSubmissionTime('job_submit');
      onJobSaved(finalJob);
      onClose();
    } catch (err: any) {
      console.error('Error saving job:', err);
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

  if (!editingJob && !isAdmin && !loadingBusinesses && businesses.length === 0) {
    return createPortal(
      <div className="fixed inset-0 z-[100000] bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden" dir="rtl">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 text-center space-y-4 animate-in fade-in zoom-in-95">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200">
            <Lock className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-stone-900">نشر الوظائف متاح للمحلات والمنشآت فقط</h3>
            <p className="text-stone-500 text-xs sm:text-sm leading-relaxed">
              خاصية الإعلان عن الشواغر الوظيفية متاحة حصرياً لأصحاب المحلات التجارية والمنشآت الطبية المسجلة في الموقع.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-black text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[100000] bg-stone-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden" dir="rtl">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[92dvh] sm:max-h-[88vh] shadow-2xl border border-stone-200 relative my-0 sm:my-auto flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Modal Header with Wizard Progress */}
        <div className="shrink-0 bg-white border-b border-stone-100 px-6 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#1a4d2e] text-white flex items-center justify-center shadow-xs">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-[#2d2a26]">
                  {editingJob ? 'تعديل بيانات الشاغر الوظيفي' : 'نشر فرصة عمل وشاغر جديد'}
                </h2>
                <p className="text-[11px] text-stone-500 font-medium">
                  {currentStep === 1 && 'الخطوة 1 من 4: المنشأة الناشرة والمزامنة'}
                  {currentStep === 2 && 'الخطوة 2 من 4: المسمى وتصنيف القطاع'}
                  {currentStep === 3 && 'الخطوة 3 من 4: تفاصيل العمل والرواتب والمزايا'}
                  {currentStep === 4 && 'الخطوة 4 من 4: موقع العمل وقنوات التواصل والنشر'}
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

          {/* Progress Bar & Step Dots */}
          <div className="space-y-2">
            <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-[#1a4d2e] h-full transition-all duration-300 rounded-full"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              />
            </div>
            
            <div className="grid grid-cols-4 gap-1 text-center">
              {[
                { step: 1, title: 'المنشأة' },
                { step: 2, title: 'المسمى الوظيفي' },
                { step: 3, title: 'تفاصيل العمل' },
                { step: 4, title: 'الموقع والتواصل' },
              ].map((item) => {
                const isPassed = currentStep > item.step;
                const isCurrent = currentStep === item.step;
                return (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => {
                      if (item.step < currentStep) {
                        setCurrentStep(item.step as 1 | 2 | 3 | 4);
                      }
                    }}
                    disabled={item.step > currentStep}
                    className={`py-1 px-1.5 rounded-lg text-[10px] font-black transition-colors ${
                      isCurrent 
                        ? 'text-[#1a4d2e] bg-emerald-50' 
                        : isPassed 
                        ? 'text-stone-700 hover:bg-stone-100 cursor-pointer' 
                        : 'text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-1">
                      {isPassed && <Check className="h-3 w-3 text-emerald-600 inline" />}
                      <span>{item.title}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); }} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            
            {/* Honeypot field */}
            <div className="absolute opacity-0 -z-50 pointer-events-none" style={{ width: 0, height: 0, overflow: 'hidden' }}>
              <label htmlFor="job_website_hp">لا تقم بتعبئة هذا الحقل إذا كنت بشرا</label>
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
              <div className="p-3.5 bg-red-50 text-red-800 rounded-xl border border-red-200 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* STEP 1: المنشأة الناشرة والمزامنة */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-[#1a4d2e] uppercase tracking-wider flex items-center gap-1.5">
                    <Store className="h-4 w-4 text-[#ff9f1c]" />
                    <span>تحديد المنشأة أو المحل الناشر للشاغر</span>
                  </label>
                  {businesses.length > 0 && (
                    <span className="text-[11px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                      {businesses.length} منشأة مسجلة
                    </span>
                  )}
                </div>

                {businesses.length > 0 ? (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-xs font-bold text-stone-700 block mb-1">
                          اختر من منشآتك المسجلة في دليل إربد
                        </label>
                        <select
                          value={selectedParentId}
                          onChange={(e) => handleSelectParent(e.target.value)}
                          className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-bold text-stone-900 focus:outline-none focus:border-[#1a4d2e] focus:bg-white"
                        >
                          {businesses.filter(b => !b.parentBusinessId).map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name} - ({b.category || 'عام'})
                            </option>
                          ))}
                          <option value="manual">كتابة اسم منشأة أو محل آخر يدويا</option>
                        </select>
                      </div>

                      {/* Branch Selection if applicable */}
                      {selectedParentId && selectedParentId !== 'manual' && businesses.filter(b => b.parentBusinessId === selectedParentId).length > 0 && (
                        <div>
                          <label className="text-xs font-bold text-stone-700 block mb-1">
                            تحديد الفرع المخصص للوظيفة
                          </label>
                          <select
                            value={selectedBranchId}
                            onChange={(e) => handleSelectBranch(e.target.value)}
                            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-bold text-stone-900 focus:outline-none focus:border-[#1a4d2e] focus:bg-white"
                          >
                            {businesses.find(b => b.id === selectedParentId) && (
                              <option value={selectedParentId}>
                                المركز الرئيسي ({businesses.find(b => b.id === selectedParentId)?.address || 'شارع الجامعة'})
                              </option>
                            )}
                            {businesses.filter(b => b.parentBusinessId === selectedParentId).map((branch) => (
                              <option key={branch.id} value={branch.id}>
                                فرع: {branch.name} ({branch.address || 'العنوان المسجل'})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Manual Business Name Input if manual is selected */}
                      {selectedParentId === 'manual' && (
                        <div>
                          <label className="text-xs font-bold text-stone-700 block mb-1">
                            اسم المنشأة أو المحل <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={company}
                            onChange={(e) => {
                              setCompany(e.target.value);
                              const sector = detectBusinessSector(category, e.target.value, subCategory);
                              setDetectedSector(sector);
                              setCategory(SECTOR_INFO[sector].categoryName);
                            }}
                            placeholder="مثال: مطعم زمان، كافيه لافا، صيدلية الرعاية، مكتبة الشمال"
                            className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-bold text-[#2d2a26] focus:bg-white focus:border-[#1a4d2e] outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* Auto-Sync Confirmation Card */}
                    {activeBusiness && selectedParentId !== 'manual' && (
                      <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 space-y-2.5">
                        <div className="flex items-center gap-2 text-emerald-900 font-black text-xs">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          <span>تمت مزامنة بيانات المنشأة بنجاح من الدليل</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-700 font-medium">
                          <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100 flex items-center justify-between">
                            <span className="text-stone-500">اسم المنشأة:</span>
                            <span className="font-bold text-stone-900">{company}</span>
                          </div>
                          <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100 flex items-center justify-between">
                            <span className="text-stone-500">القطاع والنشاط:</span>
                            <span className="font-bold text-stone-900">{SECTOR_INFO[detectedSector].name}</span>
                          </div>
                          <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100 flex items-center justify-between">
                            <span className="text-stone-500">العنوان المسجل:</span>
                            <span className="font-bold text-stone-900 truncate max-w-[160px]">{location}</span>
                          </div>
                          <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100 flex items-center justify-between">
                            <span className="text-stone-500">هاتف التواصل:</span>
                            <span className="font-bold text-stone-900 dir-ltr">{contactPhone || 'غير مسجل'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      اسم المنشأة أو المحل الناشر <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={company}
                      onChange={(e) => {
                        setCompany(e.target.value);
                        const sector = detectBusinessSector(category, e.target.value, subCategory);
                        setDetectedSector(sector);
                        setCategory(SECTOR_INFO[sector].categoryName);
                      }}
                      placeholder="مثال: مطعم زمان، كافيه لافا، صيدلية الرعاية، مكتبة الشمال"
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-bold text-[#2d2a26] focus:bg-white focus:border-[#1a4d2e] outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: المسمى الوظيفي وتصنيف القطاع والمقترحات السريعة */}
            {currentStep === 2 && (
              <div className="space-y-4">
                {/* Sector Lock Banner */}
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-[#1a4d2e] shrink-0">
                      {detectedSector === 'medical' && <Stethoscope className="h-4 w-4" />}
                      {detectedSector === 'beauty' && <Scissors className="h-4 w-4" />}
                      {detectedSector === 'retail' && <ShoppingBag className="h-4 w-4" />}
                      {detectedSector === 'food' && <UtensilsCrossed className="h-4 w-4" />}
                      {detectedSector === 'education' && <GraduationCap className="h-4 w-4" />}
                      {detectedSector === 'crafts' && <Wrench className="h-4 w-4" />}
                      {detectedSector === 'general' && <Store className="h-4 w-4" />}
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 font-bold block">تصنيف النشاط المعتمد للمنشأة</span>
                      <span className="text-xs font-black text-stone-800">{SECTOR_INFO[detectedSector].name}</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    <Lock className="h-3 w-3" />
                    <span>توارث تلقائي للتصنيف</span>
                  </span>
                </div>

                {/* Sector-Aware Quick Job Presets */}
                <div className="space-y-2 bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-100">
                  <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-[#ff9f1c]" />
                    <span>الوظائف الأكثر طلبا المخصصة لقطاع ({SECTOR_INFO[detectedSector].name}):</span>
                  </span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {currentPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleApplyQuickPreset(preset)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                          title === preset.title
                            ? 'bg-[#1a4d2e] text-white border-[#1a4d2e]'
                            : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                        }`}
                      >
                        {preset.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Job Title Input */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    المسمى الوظيفي المطلوب <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: باريستا ومعد قهوة، كاشير، موظف مبيعات"
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-[#2d2a26] focus:bg-white focus:border-[#1a4d2e] outline-none"
                  />
                </div>

                {/* Category & SubCategory Inheritance */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5 flex items-center gap-1">
                      <Lock className="h-3 w-3 text-stone-400" />
                      <span>القسم الرئيسي (مقترن بالقطاع)</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      value={category}
                      className="w-full p-3 bg-stone-100 border border-stone-200 rounded-xl text-xs sm:text-sm font-bold text-stone-700 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      التصنيف والتخصص الفرعي
                    </label>
                    <select
                      value={subCategory}
                      onChange={(e) => setSubCategory(e.target.value)}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-bold text-[#2d2a26] focus:bg-white focus:border-[#1a4d2e] outline-none"
                    >
                      {availableSubCategories.map((sub, idx) => (
                        <option key={idx} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: تفاصيل العمل، نوع الدوام، والرواتب والمزايا */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Job Type */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      نوع الدوام والارتباط
                    </label>
                    <select
                      value={jobType}
                      onChange={(e) => setJobType(e.target.value)}
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-bold text-[#2d2a26] focus:bg-white focus:border-[#1a4d2e] outline-none"
                    >
                      {JOB_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Salary Range */}
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      الراتب أو الأجر المتوقع
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={salary}
                        onChange={(e) => setSalary(e.target.value)}
                        placeholder="مثال: 300 - 350 دينار أو حسب الكفاءة"
                        className="w-full p-3 pr-9 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-bold text-[#2d2a26] focus:bg-white focus:border-[#1a4d2e] outline-none"
                      />
                      <DollarSign className="h-4 w-4 text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />
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
                        placeholder="مثال: شفت صباحي من 8 ص إلى 4 م"
                        className="w-full p-3 pr-9 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-bold text-[#2d2a26] focus:bg-white focus:border-[#1a4d2e] outline-none"
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
                      className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-bold text-[#2d2a26] focus:bg-white focus:border-[#1a4d2e] outline-none"
                    >
                      <option value="بدون خبرة (مرحب بالخريجين والطلبة)">بدون خبرة (مرحب بالخريجين والطلبة)</option>
                      <option value="خبرة من 6 أشهر إلى سنة">خبرة من 6 أشهر إلى سنة</option>
                      <option value="خبرة من سنة إلى 3 سنوات">خبرة من سنة إلى 3 سنوات</option>
                      <option value="خبرة متقدمة (3 سنوات فأكثر)">خبرة متقدمة (3 سنوات فأكثر)</option>
                    </select>
                  </div>
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
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                          genderPreference === item.key
                            ? 'bg-[#1a4d2e] text-white border-[#1a4d2e]'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Benefits & Perks */}
                <div className="space-y-2 bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
                  <label className="text-xs font-black text-stone-700 block">
                    المزايا والحوافز الإضافية
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
                              ? 'bg-emerald-100/90 text-emerald-900 border-emerald-300' 
                              : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          <span>{benefit}</span>
                          {isSelected && <Check className="h-4 w-4 text-emerald-700 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Job Description */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    الوصف الوظيفي والمسؤوليات <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="اشرح طبيعة العمل، المهام اليومية، وما يتوقعه صاحب المنشأة من المتقدم"
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-[#2d2a26] focus:bg-white focus:border-[#1a4d2e] outline-none transition-colors resize-none leading-relaxed"
                  />
                </div>

                {/* Requirements */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    الشروط والمتطلبات
                  </label>
                  <textarea
                    rows={3}
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    placeholder="- اللباقة والمظهر اللائق&#10;- الالتزام بمواعيد الدوام&#10;- حسن المعاملة مع الزبائن"
                    className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-[#2d2a26] focus:bg-white focus:border-[#1a4d2e] outline-none transition-colors resize-none leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* STEP 4: موقع العمل وقنوات التواصل والنشر الفوري */}
            {currentStep === 4 && (
              <div className="space-y-4">
                {/* Fixed Location Binding Card */}
                <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-amber-600" />
                      <span>موقع العمل المعتمد في إربد</span>
                    </span>
                    <span className="text-[10px] font-black text-amber-800 bg-white/90 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-amber-600" />
                      <span>معتمد من الدليل</span>
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-amber-100 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <Store className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] text-stone-500 font-bold block">العنوان الجغرافي المربوط بالمنشأة</span>
                      <p className="text-xs font-black text-stone-900 truncate">{location}</p>
                    </div>
                  </div>

                  {/* Optional Landmark / Detail */}
                  <div>
                    <label className="text-[11px] font-bold text-stone-600 block mb-1">
                      إضافة معلم قريب أو تفصيل إضافي للموقع (اختياري)
                    </label>
                    <input
                      type="text"
                      value={locationDetailNotes}
                      onChange={(e) => setLocationDetailNotes(e.target.value)}
                      placeholder="مثال: بجانب دوار القبة، الطابق الثاني، مقابل المجمع"
                      className="w-full p-2.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-stone-800 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Auto-synced Contact Channels */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-stone-50 p-4 rounded-2xl border border-stone-200">
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
                        className="w-full p-3 pr-9 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm font-bold text-[#2d2a26] text-right focus:border-[#1a4d2e] outline-none"
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
                        className="w-full p-3 pr-9 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm font-bold text-[#2d2a26] text-right focus:border-[#1a4d2e] outline-none"
                      />
                      <WhatsAppIcon className="h-4 w-4 text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />
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
                      placeholder="مثال: إرسال السيرة الذاتية عبر الواتساب أو الحضور المباشر"
                      className="w-full p-3 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm text-[#2d2a26] focus:border-[#1a4d2e] outline-none"
                    />
                  </div>
                </div>

                {/* Urgent Opportunity Toggle */}
                <div className="flex items-center justify-between p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                      <Flame className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-amber-950">تمييز الشاغر كـ "فرصة عاجلة / فوري"</h4>
                      <p className="text-[11px] text-amber-800 font-medium">
                        إبراز الشاغر في أعلى قائمة الوظائف مع شارة مميزة لجذب المتقدمين سريعا
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
              </div>
            )}

          </div>

          {/* Wizard Navigation Footer */}
          <div className="p-4 sm:px-6 bg-stone-50 border-t border-stone-200 shrink-0 flex items-center justify-between gap-3">
            <div>
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-300 font-bold text-xs sm:text-sm text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  <ArrowRight className="h-4 w-4" />
                  <span>السابق</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 font-bold text-xs sm:text-sm text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStep < 4 ? (
                <button
                  key={`wizard-step-next-${currentStep}`}
                  type="button"
                  onClick={goToNextStep}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white font-black text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
                >
                  <span>التالي</span>
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : (
                <button
                  key="wizard-final-publish-btn"
                  type="button"
                  onClick={handleSubmit}
                  disabled={saving || !title.trim() || !company.trim() || !description.trim() || !contactPhone.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white font-black text-xs sm:text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
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
              )}
            </div>
          </div>

        </form>

      </div>
    </div>,
    document.body
  );
}
