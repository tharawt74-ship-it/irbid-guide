// AI Site Assistant service for "شو في بإربد؟"
// 100% Free architecture with Smart Entity Search, Live Business Hours, Multi-Criteria Filtering,
// Price Comparisons, Cart Integration, and Missing Place Lead Generation.

import { collection, addDoc, getDocs, limit, query as firestoreQuery } from 'firebase/firestore';
import { db } from './firebase';
import { getCachedBusinesses, setCachedBusinesses } from './dataCache';
import { DEMO_SEED_DATA } from './demoDataHelper';
import { normalizeArabic } from './arabicSearch';
import { Business, MenuItem } from '../types';
import { getLiveWorkingStatus, LiveStatus } from './businessHoursHelper';
import { FilterEngine, FilterParameters, ParsedFilterParams, parseNaturalLanguageQuery } from '../utils/filterEngine';

export { FilterEngine, parseNaturalLanguageQuery };
export type { FilterParameters, ParsedFilterParams };

export interface ActionLink {
  label: string;
  path: string;
  icon?: string;
  description?: string;
}

export interface BusinessCardItem {
  id: string;
  name: string;
  category: string;
  address?: string;
  rating?: number;
  reviewsCount?: number;
  imageUrl?: string;
  phone?: string;
  whatsapp?: string;
  isVerified?: boolean;
  packagePlan?: string;
  path: string;
  type?: 'business' | 'housing' | 'job' | 'offer' | 'product';
  price?: string;
  oldPrice?: string;
  discountPercentage?: string;
  badge?: string;
  
  // 1. Live status
  isOpen?: boolean;
  statusText?: string;
  hoursDisplay?: string;
  isClosingSoon?: boolean;

  // 4. Cart & Instant Order integration
  canAddToCart?: boolean;
  canOrderInstant?: boolean;
  appliedFilters?: string[];
  cartItemData?: {
    id: string;
    name: string;
    price: string | number;
    originalPrice?: string;
    category?: string;
    image?: string;
    businessId: string;
    businessName: string;
    businessPhone?: string;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  actions?: ActionLink[];
  cards?: BusinessCardItem[];
  appliedFilters?: string[];
  timestamp: number;
  isMissingPlace?: boolean;
  missingPlaceName?: string;
  comparisonMode?: boolean;
}

// Complete knowledge registry for the website
export const SITE_PAGES: { [key: string]: { title: string; path: string; keywords: string[]; desc: string } } = {
  home: {
    title: 'الصفحة الرئيسية',
    path: '/',
    keywords: ['الرئيسية', 'البداية', 'الموقع', 'شو في باربد', 'اربد'],
    desc: 'تصفح أحدث المحلات، الأنشطة المميزة، وأبرز خدمات مدينة إربد.'
  },
  search: {
    title: 'البحث الشامل ودليل المحلات',
    path: '/search',
    keywords: ['بحث', 'دليل', 'محل', 'محلات', 'متجر', 'متاجر', 'دكان', 'سوق', 'اسواق', 'مطعم', 'مطاعم', 'كافيه', 'كافيهات', 'دكتور', 'عيادة', 'صيدلية', 'مستشفى', 'صالون', 'حلاق'],
    desc: 'ابحث في آلاف المحلات، المنتجات، والخدمات المسجلة في إربد مع التقييمات وساعات العمل.'
  },
  offers: {
    title: 'العروض والتخفيضات',
    path: '/offers',
    keywords: ['عروض', 'عرض', 'خصم', 'خصومات', 'تنزيلات', 'تخفيضات', 'توفير', 'كوبون', 'اوفر', 'رخيص'],
    desc: 'أقوى العروض الحصرية والخصومات اليومية من محلات ومطاعم إربد.'
  },
  housing: {
    title: 'سكنات وشقق للإيجار',
    path: '/housing',
    keywords: ['سكن', 'سكنات', 'شقة', 'شقق', 'ايجار', 'إيجار', 'استديو', 'غرفة', 'طلاب', 'طالبات', 'اليرموك', 'التكنو', 'عقارات', 'بيت'],
    desc: 'دليل السكنات الطلابية والشقق والعقارات المتاحة للإيجار في جميع أحياء إربد.'
  },
  jobs: {
    title: 'وظائف شاغرة',
    path: '/jobs',
    keywords: ['وظيفة', 'وظائف', 'عمل', 'شغل', 'شاغر', 'شواغر', 'توظيف', 'سيرة ذاتية', 'دوام', 'بارت تايم'],
    desc: 'أحدث فرص العمل والوظائف الشاغرة المتاحة في محافظة إربد لجميع التخصصات.'
  },
  prayerTimes: {
    title: 'مواقيت الصلاة في إربد',
    path: '/prayer-times',
    keywords: ['صلاة', 'مواقيت', 'أوقات الصلاة', 'الاذان', 'الأذان', 'الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء', 'جامع', 'مسجد'],
    desc: 'أوقات الأذان والصلوات الخمس بدقة متناهية حسب توقيت محافظة إربد مع عداد تنازلي.'
  },
  transportation: {
    title: 'مواعيد وخطوط الباصات والسرافيس',
    path: '/transportation',
    keywords: ['باص', 'باصات', 'سرفيس', 'سرافيس', 'مواصلات', 'خط', 'مجمع', 'مجمع عمان', 'مجمع الشمال', 'تكسي', 'موقف', 'جامعة'],
    desc: 'دليل خطوط ومسارات الباصات والسرافيس ومجمعات النقل في إربد.'
  },
  tourism: {
    title: 'السياحة والأماكن الترفيهية',
    path: '/tourism',
    keywords: ['سياحة', 'ترفيه', 'فسحة', 'طلعة', 'مشوار', 'ام قيس', 'أم قيس', 'برقش', 'وادي الريان', 'بيت عرار', 'طبقة فحل', 'متحف', 'حديقة'],
    desc: 'تعرف على أجمل المعالم السياحية، المحميات الطبيعية، والآثار في إربد ولواء الكورة والأغوار.'
  },
  news: {
    title: 'أخبار وفعاليات إربد',
    path: '/news',
    keywords: ['خبر', 'اخبار', 'أخبار', 'فعاليات', 'نشاطات', 'بلدية', 'احداث', 'مناسبات'],
    desc: 'متابعة حية لآخر الأخبار والفعاليات والنشاطات المحلية في محافظة إربد.'
  },
  pricing: {
    title: 'باقات الاشتراك لأصحاب المحلات',
    path: '/packages',
    keywords: ['باقة', 'باقات', 'اشتراك', 'اسعار', 'أسعار', 'اعلان', 'إعلان', 'اضافة محل', 'تسجيل محل', 'ترقية', 'vip', 'فضية', 'ذهبية'],
    desc: 'باقات مخصصة لأصحاب الأنشطة التجارية والمتاجر للإعلان وزيادة المبيعات والظهور في إربد.'
  },
  contact: {
    title: 'اتصل بنا والدعم الفني',
    path: '/contact',
    keywords: ['اتصل', 'تواصل', 'دعم', 'مساعدة', 'شكوى', 'اقتراح', 'رقم', 'هاتف', 'واتساب', 'ايميل'],
    desc: 'فريق دعم "شو في بإربد؟" جاهز لمساعدتك والرد على استفساراتك على مدار الساعة.'
  },
  register: {
    title: 'تسجيل حساب جديد',
    path: '/register',
    keywords: ['تسجيل', 'انشاء حساب', 'حساب جديد', 'تسجيل تاجر', 'تسجيل متجر', 'تسجيل مطعم'],
    desc: 'أنشئ حسابك المجاني في المنصة كزائر أو كصاحب عمل تجاري.'
  },
  login: {
    title: 'تسجيل الدخول',
    path: '/login',
    keywords: ['دخول', 'تسجيل دخول', 'كلمة السر', 'نسيت كلمة السر', 'حسابي'],
    desc: 'الدخول لحسابك لإدارة نشاطك التجاري أو مفضلاتك.'
  },
  cart: {
    title: 'سلة المشتريات والطلبات',
    path: '/cart',
    keywords: ['سلة', 'طلبات', 'طلب', 'شراء', 'توصيل', 'دفع'],
    desc: 'راجع المنتجات والطلبات المضافة إلى سلتك لإتمام عملية الشراء.'
  },
  about: {
    title: 'عن شو في بإربد؟',
    path: '/about',
    keywords: ['من نحن', 'عن الموقع', 'رؤيتنا', 'قصتنا', 'فريق العمل'],
    desc: 'تعرف على المنصة الرقمية الأولى الشاملة لكل ما يخص مدينة ومحافظة إربد.'
  }
};

// Local synonym expansion table
const AI_SYNONYMS: { [key: string]: string[] } = {
  "شاورما": ["مطعم", "وجبات", "اكل", "ساندويش", "لحوم", "دجاج"],
  "برجر": ["مطعم", "وجبات", "اكل", "برغر", "سناكات"],
  "بيتزا": ["مطعم", "معجنات", "ايطالي", "فطائر"],
  "كافيه": ["مقهى", "قهوة", "دراسة", "جلسات", "مشروبات"],
  "قهوة": ["كافيه", "مقهى", "اسبريسو", "لاتيه"],
  "كنافة": ["حلويات", "حلو", "حلويات حبيبة"],
  "حلويات": ["كنافة", "كيك", "حلو", "مخبز"],
  "سكن": ["شقة", "شقق", "استوديو", "طلاب", "طالبات", "ايجار"],
  "شقة": ["سكن", "ايجار", "مفروش", "عقار"],
  "دكتور": ["طبيب", "عيادة", "مستشفى", "صحة"],
  "اسنان": ["طبيب", "دكتور", "عيادة", "تقويم"],
  "صيدلية": ["دواء", "علاج", "صيدليات"]
};

export const ARABIC_STOPWORDS = new Set([
  'في', 'من', 'عن', 'على', 'إلى', 'الى', 'مع', 'هذا', 'هذه', 'ذلك', 'تلك',
  'ما', 'هي', 'هو', 'هم', 'هن', 'شو', 'ايش', 'ليش', 'كيف', 'وين', 'هل',
  'بدي', 'اريد', 'الموقع', 'موقع', 'حاليا', 'الان', 'الآن', 'هسا', 'هسه',
  'اليوم', 'لهذا', 'لهذه', 'لهن', 'لهم', 'انا', 'أنا', 'انت', 'أنت', 'انتم',
  'نحن', 'كان', 'صار', 'بين', 'عند', 'كل', 'جميع', 'بعض', 'غير', 'حيث',
  'اي', 'أي', 'مين', 'لو', 'سمحت', 'ممكن', 'عفوا'
]);

export interface StructuredFilterCriteria {
  query?: string;
  cleanTerm?: string;
  category?: string;
  domain?: 'business' | 'housing' | 'job' | 'product' | 'offer' | 'all';
  openNow?: boolean;
  closedNow?: boolean;
  lowPrice?: boolean;
  highRating?: boolean;
  minRating?: number;
  maxPrice?: number;
  minPrice?: number;
  location?: string;
  university?: 'اليرموك' | 'العلوم والتكنولوجيا' | 'جدارا' | string;
  targetType?: 'طالبات' | 'طلاب' | 'شباب' | 'عائلات' | 'استوديو' | 'غرفة';
  jobType?: 'دوام كامل' | 'دوام جزئي' | 'بارت تايم' | 'للطلاب' | 'عن بعد';
  sortBy?: 'rating' | 'price_asc' | 'price_desc' | 'relevance' | 'newest';
  limit?: number;
}

export interface StructuredFilterResult {
  cards: BusinessCardItem[];
  appliedFilters: string[];
  totalMatched: number;
  summary: string;
}

export interface MultiCriteriaFilter {
  cleanTerm: string;
  isSpecificSearch: boolean;
  intent:
    | 'terms'
    | 'privacy'
    | 'about'
    | 'packages'
    | 'contact'
    | 'closed_stores'
    | 'open_stores'
    | 'business'
    | 'housing'
    | 'job'
    | 'offer'
    | 'product'
    | 'tourism'
    | 'transport'
    | 'prayer'
    | 'compare'
    | 'general';
  
  // Criteria 1: Location & University
  locationKeyword?: string;
  university?: 'اليرموك' | 'العلوم والتكنولوجيا' | 'جدارا' | string;
  
  // Criteria 2: Category & Target Type
  category?: string;
  targetType?: 'طالبات' | 'طلاب' | 'شباب' | 'عائلات' | 'استوديو' | 'غرفة';
  businessType?: string;
  jobType?: 'دوام كامل' | 'دوام جزئي' | 'بارت تايم' | 'للطلاب' | 'عن بعد';
  
  // Criteria 3: Budget / Max Price
  maxPrice?: number;
  minPrice?: number;
  isBudgetFriendly?: boolean;
  
  // Criteria 4: Live Status
  mustBeOpenNow?: boolean;
  mustBeClosedNow?: boolean;

  // Criteria 5: Quality & Rating
  highRating?: boolean;
  minRating?: number;
  sortBy?: 'rating' | 'price_asc' | 'price_desc' | 'relevance';
  
  // Criteria 6: Comparison
  isComparisonQuery?: boolean;
}

// Catalog of featured products, meals, and services in Irbid linked to real businesses
export interface ProductOffering {
  id: string;
  name: string;
  category: string;
  price: number;
  oldPrice?: number;
  discountPercentage?: string;
  image: string;
  businessId: string;
  businessName: string;
  businessPhone: string;
  businessWhatsapp: string;
  badge?: string;
  path: string;
  keywords: string[];
}

export const FEATURED_PRODUCTS_CATALOG: ProductOffering[] = [
  {
    id: 'prod-lava-latte',
    name: 'سبانش لاتيه بارد ومشروبات مختصة',
    category: 'كافيهات ومشروبات',
    price: 2.20,
    oldPrice: 2.80,
    discountPercentage: '21%',
    image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&q=80&w=600',
    businessId: 'demo-biz-1',
    businessName: 'كافيه لافا (Lava Specialty Coffee)',
    businessPhone: '0788123456',
    businessWhatsapp: '962788123456',
    badge: 'قهوة مختصة ☕',
    path: '/@lava_coffee',
    keywords: ['قهوة', 'لاتيه', 'سبانش لاتيه', 'كابتشينو', 'اسبريسو', 'فلات وايت', 'كافيه', 'مشروبات', 'قهوة مختصة', 'v60', 'ماتشا']
  },
  {
    id: 'prod-roma-pizza',
    name: 'وجبة بيتزا عائلية (2 بيتزا كبيرة + بطاطا وكولا)',
    category: 'مطاعم ووجبات',
    price: 11.70,
    oldPrice: 18.00,
    discountPercentage: '35%',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=600',
    businessId: 'demo-biz-2',
    businessName: 'مطعم بيتزا روما الإيطالية',
    businessPhone: '0799876543',
    businessWhatsapp: '962799876543',
    badge: 'عرض عائلي 🍕',
    path: '/@pizza_roma',
    keywords: ['بيتزا', 'وجبة', 'بيتزا بيبروني', 'مارغريتا', 'بيتزا ايطالية', 'مطعم بيتزا', 'اكل ايطالي', 'غداء', 'عشاء']
  },
  {
    id: 'prod-habiba-knafeh',
    name: 'سدر كنافة نابلسية خشنة بالسمن البلدي والجبن',
    category: 'حلويات شرقية',
    price: 7.50,
    oldPrice: 9.00,
    discountPercentage: '16%',
    image: 'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?auto=format&fit=crop&q=80&w=600',
    businessId: 'demo-biz-3',
    businessName: 'حلويات حبيبة إربد',
    businessPhone: '027241234',
    businessWhatsapp: '962795123456',
    badge: 'سمن بلدي فاخر 🍯',
    path: '/@habiba_sweets',
    keywords: ['كنافة', 'حلويات', 'كنافة نابلسية', 'كنافة ناعمة', 'كنافة خشنة', 'وربات', 'حلو', 'قشطة', 'بقلاوة']
  },
  {
    id: 'prod-diwan-shawarma',
    name: 'وجبة شاورما عربي سوبر مع بطاطا ومثومة',
    category: 'مطاعم وشاورما',
    price: 3.50,
    oldPrice: 4.25,
    discountPercentage: '18%',
    image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&q=80&w=600',
    businessId: 'demo-biz-4',
    businessName: 'مطعم ومشاوي ديوان زمان',
    businessPhone: '0777123456',
    businessWhatsapp: '962777123456',
    badge: 'الأكثر طلباً 🌯',
    path: '/@diwan_zaman',
    keywords: ['شاورما', 'وجبة شاورما', 'شاورما عربي', 'دجاج', 'مشاوي', 'كباب', 'ساندويش', 'مطعم']
  },
  {
    id: 'prod-anaqah-suit',
    name: 'بدلة عريس رجالية إيطالية كاملة 3 قطع',
    category: 'أزياء وملابس رجالية',
    price: 75.00,
    oldPrice: 95.00,
    discountPercentage: '21%',
    image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&q=80&w=600',
    businessId: 'demo-biz-5',
    businessName: 'محل الأناقة الفاخرة للأزياء',
    businessPhone: '0788998877',
    businessWhatsapp: '962788998877',
    badge: 'تفصيل وخياطة 👔',
    path: '/@anaqah_fashion',
    keywords: ['بدلة', 'بدلات', 'بدلة عريس', 'ملابس رجالية', 'قميص', 'بنطلون', 'أزياء', 'خياط']
  },
  {
    id: 'prod-pharmacy-vitamins',
    name: 'باقة فيتامينات ومقويات ومستحضرات عناية بالبشرة',
    category: 'صيدلية وصحة',
    price: 14.50,
    oldPrice: 19.00,
    discountPercentage: '24%',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=600',
    businessId: 'demo-biz-6',
    businessName: 'صيدلية فارماسي بلس',
    businessPhone: '027255555',
    businessWhatsapp: '962799555555',
    badge: 'مرخص ومضمون 💊',
    path: '/@pharmacy_plus',
    keywords: ['صيدلية', 'فيتامينات', 'مكملات', 'دواء', 'بشرة', 'عناية', 'أدوية', 'كريمات', 'صحة']
  },
  {
    id: 'prod-captain-hybrid',
    name: 'فحص كمبيوتر سيارات شامل وبرمجة بطاريات هايبرد',
    category: 'خدمات سيارات',
    price: 15.00,
    oldPrice: 20.00,
    discountPercentage: '25%',
    image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=600',
    businessId: 'demo-biz-8',
    businessName: 'مركز الكابتن لصيانة السيارات والهايبرد',
    businessPhone: '0788654321',
    businessWhatsapp: '962788654321',
    badge: 'فحص إلكتروني دقيق 🚗',
    path: '/@captain_auto',
    keywords: ['سيارات', 'هايبرد', 'فحص كمبيوتر', 'صيانة سيارات', 'بطارية', 'ميكانيك', 'كهرباء سيارات', 'فحص شامل']
  },
  {
    id: 'prod-newlife-gym',
    name: 'اشتراك شهري كامل بنادي اللياقة وبناء الأجسام والساونا',
    category: 'رياضة ولياقة',
    price: 25.00,
    oldPrice: 35.00,
    discountPercentage: '28%',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=600',
    businessId: 'demo-biz-9',
    businessName: 'مركز نيو لايف للياقة البدنية والجيم',
    businessPhone: '0799112233',
    businessWhatsapp: '962799112233',
    badge: 'شامل الأجهزة والمدرب 🏋️',
    path: '/@newlife_gym',
    keywords: ['جيم', 'نادي', 'اشتراك جيم', 'لياقة', 'حديد', 'رياضة', 'تخسيس', 'فتنس', 'كمال اجسام']
  },
  {
    id: 'prod-yarmouk-printing',
    name: 'طباعة وتجليد رسائل ماجستير وأبحاث تخرج كاملة',
    category: 'خدمات طلابية ومكتبات',
    price: 12.00,
    oldPrice: 16.00,
    discountPercentage: '25%',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600',
    businessId: 'demo-biz-7',
    businessName: 'مكتبة وسنتر اليرموك للخدمات الطلابية',
    businessPhone: '0777445566',
    businessWhatsapp: '962777445566',
    badge: 'تجليد حلزوني وفاخر 📚',
    path: '/@yarmouk_center',
    keywords: ['طباعة', 'تصوير', 'تجليد', 'رسائل ماجستير', 'ابحاث', 'قرطاسية', 'مكتبة', 'تخرج']
  },
  {
    id: 'prod-nour-bakery',
    name: 'سلة معجنات مشكلة شامية (زعتر، جبنة، صفيحة) وخبز فرنسي',
    category: 'مخابز ومعجنات',
    price: 3.00,
    oldPrice: 4.00,
    discountPercentage: '25%',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600',
    businessId: 'demo-biz-10',
    businessName: 'مخابز وأفران النور الآلية',
    businessPhone: '027271122',
    businessWhatsapp: '962788001122',
    badge: 'طازج وساخن 🥐',
    path: '/@al_nour_bakery',
    keywords: ['معجنات', 'مخبز', 'خبز', 'فطائر', 'صفيحة', 'زعتر', 'جبنة', 'كعك']
  }
];

/**
 * Multi-Criteria Smart Extractor.
 * Parses natural language input using FilterEngine.
 */
export function extractFilterCriteria(rawInput: string): MultiCriteriaFilter {
  const parsed = FilterEngine.parseQuery(rawInput);
  
  let mappedIntent: MultiCriteriaFilter['intent'] = 'general';
  if (parsed.intent === 'greeting') mappedIntent = 'general';
  else if (parsed.intent === 'search' || parsed.intent === 'recommendation') mappedIntent = 'business';
  else mappedIntent = parsed.intent as MultiCriteriaFilter['intent'];

  return {
    cleanTerm: parsed.cleanTerm,
    isSpecificSearch: parsed.isSearchOriented,
    intent: mappedIntent,
    locationKeyword: parsed.location,
    university: parsed.university,
    category: parsed.category,
    targetType: parsed.targetType,
    jobType: parsed.jobType,
    maxPrice: parsed.maxPrice,
    minPrice: parsed.minPrice,
    isBudgetFriendly: parsed.isBudgetFriendly,
    highRating: parsed.isHighRating,
    minRating: parsed.minRating,
    sortBy: parsed.sortBy as any,
    mustBeOpenNow: parsed.isOpen,
    mustBeClosedNow: parsed.isClosed,
    isComparisonQuery: parsed.intent === 'compare'
  };
}

export function extractCleanSearchTerm(rawInput: string) {
  const criteria = extractFilterCriteria(rawInput);
  return {
    cleanTerm: criteria.cleanTerm,
    isSpecificSearch: criteria.isSpecificSearch,
    intent: criteria.intent === 'compare' ? 'offer' : criteria.intent
  };
}

/**
 * Searches and generates comparison cards for offers and products (Feature #3).
 */
export async function getOffersComparison(
  filterTerm?: string
): Promise<{ cards: BusinessCardItem[]; text: string }> {
  const demoOffers = DEMO_SEED_DATA.offers || [];
  const normFilter = filterTerm ? normalizeArabic(filterTerm) : '';

  let matchedOffers = demoOffers;
  if (normFilter && normFilter.length > 1) {
    matchedOffers = demoOffers.filter(o => {
      const normTitle = normalizeArabic(o.title || '');
      const normBiz = normalizeArabic(o.businessName || '');
      const normDesc = normalizeArabic(o.description || '');
      return normTitle.includes(normFilter) || normBiz.includes(normFilter) || normDesc.includes(normFilter);
    });
  }

  if (matchedOffers.length === 0) {
    matchedOffers = demoOffers;
  }

  const cards: BusinessCardItem[] = matchedOffers.slice(0, 4).map(offer => {
    // Parse numeric prices if possible for cart integration
    const numericPrice = parseFloat(offer.newPrice.replace(/[^\d.]/g, '')) || 5.0;

    return {
      id: `offer-${offer.code || Math.random().toString()}`,
      name: `${offer.businessName}: ${offer.title}`,
      category: offer.category || 'عرض خاص',
      address: offer.location || 'إربد',
      imageUrl: offer.image || '',
      price: offer.newPrice,
      oldPrice: offer.oldPrice,
      discountPercentage: offer.discountPercentage,
      badge: `خصم ${offer.discountPercentage} 🔥`,
      path: '/offers',
      type: 'offer',
      phone: offer.phone,
      whatsapp: offer.whatsapp,
      canAddToCart: true,
      canOrderInstant: true,
      cartItemData: {
        id: `offer-item-${offer.code || Date.now()}`,
        name: `${offer.title} (${offer.businessName})`,
        price: numericPrice,
        originalPrice: offer.oldPrice,
        image: offer.image,
        category: offer.category,
        businessId: `biz-${offer.businessName}`,
        businessName: offer.businessName,
        businessPhone: offer.phone
      }
    };
  });

  const comparisonText = `إليك **مقارنة ذكية** لأبرز العروض والخصومات المتاحة حالياً في إربد 🏷️✨\n\n` +
    matchedOffers.slice(0, 3).map((o, idx) => 
      `${idx + 1}️⃣ **${o.businessName}**: ${o.title}\n   - **السعر بعد الخصم:** ${o.newPrice} *(بدلاً من ${o.oldPrice})* - **خصم ${o.discountPercentage}** 🔥\n   - **كود الخصم:** \`${o.code}\``
    ).join('\n\n') +
    `\n\nيمكنك طلب العرض فوراً عبر الواتساب أو إضافته مباشرة إلى سلة مشترياتك بالأسفل 👇`;

  return { cards, text: comparisonText };
}

/**
 * Structured Data Filtering Engine for "شو في بإربد؟".
 * Enables the AI and search modules to strictly filter businesses, housing, jobs,
 * products, and offers based on explicit categories and constraints:
 * - 'open now' / 'closed now' live status
 * - 'high rating' / min rating threshold (e.g., >= 4.5 stars)
 * - 'low price' / budget bounds / ascending price sort
 * - specific categories (e.g., 'مطاعم ومأكولات', 'كافيهات ومقاهي', 'سكنات', 'شواغر')
 * - location / proximity (e.g., 'شارع الجامعة', 'اليرموك', 'إيدون')
 * - student housing target type (girls vs boys)
 * 
 * Prevents returning irrelevant content by strictly enforcing domain and category guards.
 */
export async function filterStructuredEntities(
  params: StructuredFilterCriteria,
  rawQuery: string = ''
): Promise<StructuredFilterResult> {
  const query = rawQuery || params.query || params.cleanTerm || '';
  const criteria = extractFilterCriteria(query);

  const cleanTerm = params.cleanTerm !== undefined ? params.cleanTerm : criteria.cleanTerm;
  const normTerm = normalizeArabic(cleanTerm);
  const termTokens = normTerm
    .split(/\s+/)
    .filter(t => t.length > 1 && !ARABIC_STOPWORDS.has(t));
  const synonyms = AI_SYNONYMS[cleanTerm] || [];

  const openNow = params.openNow !== undefined ? params.openNow : criteria.mustBeOpenNow;
  const closedNow = params.closedNow !== undefined ? params.closedNow : criteria.mustBeClosedNow;
  const lowPrice = params.lowPrice !== undefined ? params.lowPrice : criteria.isBudgetFriendly;
  const highRating = params.highRating !== undefined ? params.highRating : criteria.highRating;
  const minRating = params.minRating !== undefined ? params.minRating : criteria.minRating;
  const maxPrice = params.maxPrice !== undefined ? params.maxPrice : criteria.maxPrice;
  const minPrice = params.minPrice !== undefined ? params.minPrice : criteria.minPrice;
  const location = params.location || criteria.locationKeyword;
  const university = params.university || criteria.university;
  const targetType = params.targetType || criteria.targetType;
  const jobType = params.jobType || criteria.jobType;
  const category = params.category || criteria.category;
  const sortBy = params.sortBy || criteria.sortBy || (highRating ? 'rating' : lowPrice ? 'price_asc' : 'relevance');
  const maxLimit = params.limit || 4;

  const appliedFilters: string[] = [];
  if (openNow) appliedFilters.push('🟢 مفتوح الآن');
  if (closedNow) appliedFilters.push('🔴 مغلق حالياً');
  if (highRating || (minRating && minRating >= 4.0)) appliedFilters.push(`⭐ تقييم ${minRating || 4.5}+`);
  if (lowPrice || sortBy === 'price_asc') appliedFilters.push('💰 اقتصادي / الأقل سعراً');
  if (category) appliedFilters.push(`🏷️ ${category}`);
  if (location) appliedFilters.push(`📍 ${location}`);
  if (university) appliedFilters.push(`🎓 قرب جامعة ${university}`);
  if (targetType) appliedFilters.push(`🏠 سكن ${targetType}`);
  if (jobType) appliedFilters.push(`💼 ${jobType}`);
  if (maxPrice) appliedFilters.push(`💵 حتى ${maxPrice} د.أ`);

  // Target domain determination:
  // Strictly prevent domain crossover
  let targetDomain = params.domain;
  if (!targetDomain) {
    if (criteria.intent === 'job') targetDomain = 'job';
    else if (criteria.intent === 'housing') targetDomain = 'housing';
    else if (criteria.intent === 'product') targetDomain = 'product';
    else if (criteria.intent === 'offer') targetDomain = 'offer';
    else if (criteria.intent === 'business' || criteria.intent === 'open_stores' || criteria.intent === 'closed_stores') targetDomain = 'business';
    else targetDomain = 'all';
  }

  const allCards: { card: BusinessCardItem; score: number; rawPrice: number; rawRating: number }[] = [];

  // ==========================================
  // 1. JOBS DOMAIN FILTERING
  // ==========================================
  if (targetDomain === 'job' || (targetDomain === 'all' && criteria.intent === 'job')) {
    const demoJobs = (DEMO_SEED_DATA?.jobs || []) as any[];
    for (const j of demoJobs) {
      const normTitle = normalizeArabic(j.title || '');
      const normCompany = normalizeArabic(j.company || '');
      const normCat = normalizeArabic(j.category || '');
      const normLoc = normalizeArabic(j.location || '');
      const normDesc = normalizeArabic(j.description || '');
      const normJType = normalizeArabic(j.jobType || '');

      // Strict jobType filter
      if (jobType) {
        const normReqType = normalizeArabic(jobType);
        if (!normJType.includes(normReqType) && !normDesc.includes(normReqType)) {
          continue;
        }
      }

      // Strict location filter
      if (location) {
        const normReqLoc = normalizeArabic(location);
        if (!normLoc.includes(normReqLoc) && !normDesc.includes(normReqLoc)) {
          continue;
        }
      }

      let score = 50;
      if (normTerm.length > 1) {
        if (normTitle.includes(normTerm)) score += 100;
        if (normCompany.includes(normTerm)) score += 60;
        if (normCat.includes(normTerm)) score += 40;
      }
      for (const token of termTokens) {
        if (normTitle.includes(token)) score += 30;
      }

      allCards.push({
        card: {
          id: j.id || `job-${Math.random()}`,
          name: `${j.title} - ${j.company}`,
          category: j.category || 'شواغر وظيفية',
          address: j.location || 'إربد',
          rating: 4.9,
          imageUrl: j.image || 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&q=80&w=600',
          phone: j.contactPhone || '0799887766',
          whatsapp: j.contactWhatsapp || (j.contactPhone ? `962${j.contactPhone.replace(/\D/g, '').replace(/^0/, '')}` : '962799887766'),
          price: j.salary || 'راتب مجزٍ',
          badge: `${j.jobType || 'دوام كامل'} 💼`,
          path: `/jobs?q=${encodeURIComponent(cleanTerm)}`,
          type: 'job',
          canOrderInstant: true,
          appliedFilters: appliedFilters.length > 0 ? appliedFilters : undefined
        },
        score,
        rawPrice: 0,
        rawRating: 4.9
      });
    }
  }

  // ==========================================
  // 2. HOUSING DOMAIN FILTERING
  // ==========================================
  if (targetDomain === 'housing' || (targetDomain === 'all' && criteria.intent === 'housing')) {
    const demoHousings = (DEMO_SEED_DATA?.housings || []) as any[];
    for (const h of demoHousings) {
      const normTitle = normalizeArabic(h.title || '');
      const normLoc = normalizeArabic(h.location || '');
      const normUni = normalizeArabic(h.university || '');
      const normType = normalizeArabic(h.type || '');
      const normDesc = normalizeArabic(h.description || '');

      // Strict targetType filter (طالبات vs طلاب)
      if (targetType) {
        const normTarget = normalizeArabic(targetType);
        if (!normType.includes(normTarget) && !normTitle.includes(normTarget) && !normDesc.includes(normTarget)) {
          continue; // Strict rejection of irrelevant gender/housing type
        }
      }

      // Strict university filter
      if (university) {
        const normReqUni = normalizeArabic(university);
        if (!normUni.includes(normReqUni) && !normLoc.includes(normReqUni)) {
          continue;
        }
      }

      // Strict maxPrice filter
      if (maxPrice && typeof h.price === 'number') {
        if (h.price > maxPrice) {
          continue;
        }
      }

      // Strict location filter
      if (location) {
        const normReqLoc = normalizeArabic(location);
        if (!normLoc.includes(normReqLoc) && !normTitle.includes(normReqLoc)) {
          continue;
        }
      }

      let score = 50;
      if (normTerm.length > 1) {
        if (normTitle.includes(normTerm)) score += 100;
        if (normLoc.includes(normTerm)) score += 50;
        if (normUni.includes(normTerm)) score += 40;
      }
      for (const token of termTokens) {
        if (normTitle.includes(token)) score += 25;
      }

      const numPrice = typeof h.price === 'number' ? h.price : parseFloat(String(h.price)) || 100;

      allCards.push({
        card: {
          id: h.id || `housing-${Math.random()}`,
          name: h.title,
          category: h.type || 'سكن طلاب',
          address: `${h.location || 'إربد'} (${h.university || ''})`,
          rating: 4.9,
          imageUrl: h.image || (h.images && h.images[0]) || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=600',
          phone: h.contactPhone || h.phone || '0799887766',
          whatsapp: h.contactWhatsapp || h.whatsapp || (h.contactPhone ? `962${h.contactPhone.replace(/\D/g, '').replace(/^0/, '')}` : '962799887766'),
          price: `${h.price} د.أ / ${h.pricePeriod || 'شهري'}`,
          isVerified: h.isVerified,
          path: `/housing?q=${encodeURIComponent(cleanTerm)}`,
          type: 'housing',
          badge: `${h.type || 'سكن'} 🏠`,
          canOrderInstant: true,
          appliedFilters: appliedFilters.length > 0 ? appliedFilters : undefined
        },
        score,
        rawPrice: numPrice,
        rawRating: 4.9
      });
    }
  }

  // ==========================================
  // 3. PRODUCTS & OFFERS FILTERING
  // ==========================================
  if (targetDomain === 'product' || targetDomain === 'offer' || (targetDomain === 'all' && (criteria.intent === 'product' || criteria.intent === 'offer'))) {
    for (const p of FEATURED_PRODUCTS_CATALOG) {
      const normName = normalizeArabic(p.name);
      const normCat = normalizeArabic(p.category);
      const normBiz = normalizeArabic(p.businessName);

      if (maxPrice && p.price > maxPrice) continue;
      if (minPrice && p.price < minPrice) continue;
      if (category && !normCat.includes(normalizeArabic(category))) continue;

      let score = 0;
      if (normTerm.length > 1) {
        if (normName.includes(normTerm)) score += 150;
        if (normCat.includes(normTerm)) score += 70;
        if (normBiz.includes(normTerm)) score += 50;
      }
      for (const kw of p.keywords) {
        const normKw = normalizeArabic(kw);
        if (normTerm.includes(normKw) || normKw.includes(normTerm)) score += 80;
      }
      for (const token of termTokens) {
        if (normName.includes(token)) score += 30;
      }

      if (score >= 35 || targetDomain === 'product' || targetDomain === 'offer') {
        allCards.push({
          card: {
            id: p.id,
            name: p.name,
            category: p.category,
            address: p.businessName,
            rating: 4.9,
            imageUrl: p.image,
            phone: p.businessPhone,
            whatsapp: p.businessWhatsapp,
            price: `${p.price.toFixed(2)} د.أ`,
            oldPrice: p.oldPrice ? `${p.oldPrice.toFixed(2)} د.أ` : undefined,
            discountPercentage: p.discountPercentage,
            badge: p.badge || 'منتج متاح 🛍️',
            path: p.path,
            type: 'product',
            canAddToCart: true,
            canOrderInstant: true,
            appliedFilters: appliedFilters.length > 0 ? appliedFilters : undefined,
            cartItemData: {
              id: p.id,
              name: p.name,
              price: p.price,
              originalPrice: p.oldPrice ? `${p.oldPrice.toFixed(2)} د.أ` : undefined,
              image: p.image,
              category: p.category,
              businessId: p.businessId,
              businessName: p.businessName,
              businessPhone: p.businessPhone
            }
          },
          score: score || 50,
          rawPrice: p.price,
          rawRating: 4.9
        });
      }
    }
  }

  // ==========================================
  // 4. BUSINESSES & STORES FILTERING
  // ==========================================
  if (targetDomain === 'business' || targetDomain === 'all' || ['closed_stores', 'open_stores', 'compare', 'general'].includes(criteria.intent)) {
    let allBusinesses: Business[] = getCachedBusinesses() || [];
    if (allBusinesses.length === 0) {
      try {
        if (db) {
          const snap = await getDocs(firestoreQuery(collection(db, 'businesses'), limit(60)));
          if (!snap.empty) {
            allBusinesses = snap.docs.map(d => ({ id: d.id, ...d.data() } as Business));
            setCachedBusinesses(allBusinesses);
          }
        }
      } catch (e) {
        // fallback
      }
    }
    if (allBusinesses.length === 0 && DEMO_SEED_DATA?.businesses) {
      allBusinesses = DEMO_SEED_DATA.businesses as unknown as Business[];
    }

    for (const b of allBusinesses) {
      if (b.isHidden || b.status === 'hidden') continue;

      const normName = normalizeArabic(b.name || '');
      const normCat = normalizeArabic(b.category || '');
      const normDesc = normalizeArabic(b.description || '');
      const normAddr = normalizeArabic(b.address || '');
      const liveStatus = getLiveWorkingStatus(b.workingHours);
      const bRating = typeof b.rating === 'number' ? b.rating : 4.8;

      // 1. Strict live hours check
      if (openNow && !liveStatus.isOpen) {
        continue; // Exclude closed venues when openNow requested
      }
      if (closedNow && liveStatus.isOpen) {
        continue; // Exclude open venues when closedNow requested
      }

      // 2. Strict rating filter
      const effectiveMinRating = minRating !== undefined ? minRating : (highRating ? 4.5 : undefined);
      if (effectiveMinRating !== undefined && bRating < effectiveMinRating) {
        continue; // Exclude low-rated venues
      }

      // 3. Strict category filter
      if (category) {
        const normReqCat = normalizeArabic(category);
        if (!normCat.includes(normReqCat) && !normDesc.includes(normReqCat)) {
          continue;
        }
      }

      // 4. Strict location filter
      if (location) {
        const normReqLoc = normalizeArabic(location);
        if (!normAddr.includes(normReqLoc) && !normDesc.includes(normReqLoc)) {
          continue;
        }
      }

      // Calculate matching score
      let score = 0;
      if (normTerm.length > 1) {
        if (normName === normTerm) score += 300;
        else if (normName.includes(normTerm)) score += 150;
        else if (normTerm.includes(normName)) score += 100;

        if (normCat.includes(normTerm)) score += 60;
        if (normDesc.includes(normTerm)) score += 30;
        if (normAddr.includes(normTerm)) score += 25;
      }

      for (const token of termTokens) {
        if (normName.includes(token)) score += 40;
        else if (normCat.includes(token)) score += 25;
      }

      for (const syn of synonyms) {
        const normSyn = normalizeArabic(syn);
        if (normName.includes(normSyn)) score += 35;
        if (normCat.includes(normSyn)) score += 25;
      }

      if (liveStatus.isOpen && !closedNow) score += 15;
      if (bRating >= 4.7) score += 10;

      // Include if it matches criteria or explicit search
      if (score >= 40 || (openNow && liveStatus.isOpen && (category || normTerm.length <= 1))) {
        const isFoodOrMarket = normCat.includes('مطاعم') || normCat.includes('حلويات') || normCat.includes('سوبرماركت') || normCat.includes('كافيهات');
        
        allCards.push({
          card: {
            id: b.id || Math.random().toString(),
            name: b.name,
            category: b.category || 'محل تجاري',
            address: b.address || b.district || 'إربد',
            rating: bRating,
            reviewsCount: b.reviewCount || (b as any).reviewsCount || 0,
            imageUrl: b.imageUrl || (b as any).image || (b as any).coverImage || '',
            phone: b.phone || '',
            whatsapp: b.socialLinks?.whatsapp || (b as any).whatsapp || '',
            isVerified: b.isVerified,
            packagePlan: b.packagePlan,
            path: b.username ? `/@${b.username}` : `/business/${b.id}`,
            type: 'business',
            isOpen: liveStatus.isOpen,
            statusText: liveStatus.statusText,
            hoursDisplay: liveStatus.hoursDisplay,
            isClosingSoon: liveStatus.isClosingSoon,
            canAddToCart: isFoodOrMarket,
            canOrderInstant: Boolean(b.phone || b.socialLinks?.whatsapp || (b as any).whatsapp),
            appliedFilters: appliedFilters.length > 0 ? appliedFilters : undefined,
            cartItemData: {
              id: `sample-order-${b.id}`,
              name: `طلب مميز من ${b.name}`,
              price: 4.00,
              businessId: b.id,
              businessName: b.name,
              businessPhone: b.phone || (b as any).whatsapp
            }
          },
          score: score || 45,
          rawPrice: 5,
          rawRating: bRating
        });
      }
    }
  }

  // ==========================================
  // 5. SORTING BASED ON STRUCTURED PREFERENCE
  // ==========================================
  if (sortBy === 'rating') {
    allCards.sort((a, b) => b.rawRating - a.rawRating || b.score - a.score);
  } else if (sortBy === 'price_asc') {
    allCards.sort((a, b) => a.rawPrice - b.rawPrice || b.score - a.score);
  } else if (sortBy === 'price_desc') {
    allCards.sort((a, b) => b.rawPrice - a.rawPrice || b.score - a.score);
  } else {
    allCards.sort((a, b) => b.score - a.score);
  }

  const finalCards = allCards.slice(0, maxLimit).map(item => item.card);

  // Summary generation
  let summary = '';
  if (finalCards.length > 0) {
    const filterDesc = appliedFilters.length > 0 ? ` بتطبيق الفلاتر (${appliedFilters.join('، ')})` : '';
    summary = `تم العثور على ${finalCards.length} خيار مطابق${filterDesc}.`;
  } else {
    summary = 'لم يتم العثور على نتائج مطابقة لجميع الفلاتر المحددة بدقة.';
  }

  return {
    cards: finalCards,
    appliedFilters,
    totalMatched: allCards.length,
    summary
  };
}

/**
 * Searches businesses, housings, jobs, products, and offers with:
 * 1. Extreme Precision multi-criteria matching across all four core domains.
 * 2. Live business open/close badges via `getLiveWorkingStatus`.
 * 3. Direct Cart & Instant Order integration.
 */
export async function searchEntitiesForAssistant(
  cleanTerm: string,
  rawQuery: string
): Promise<BusinessCardItem[]> {
  const result = await filterStructuredEntities({ cleanTerm }, rawQuery);
  return result.cards;
}

/**
 * Submits a missing place lead to Firestore and localStorage (Feature #5).
 */
export async function reportMissingPlaceLead(
  placeName: string,
  userContact?: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  const cleanName = (placeName || '').trim();
  if (!cleanName) return { success: false, message: 'يرجى إدخال اسم المحل' };

  const leadPayload = {
    placeName: cleanName,
    userContact: userContact || '',
    notes: notes || '',
    timestamp: Date.now(),
    status: 'pending',
    source: 'ai_chat_lead'
  };

  // 1. Save to localStorage backup
  try {
    const existing = JSON.parse(localStorage.getItem('irbid_missing_place_leads') || '[]');
    existing.push(leadPayload);
    localStorage.setItem('irbid_missing_place_leads', JSON.stringify(existing));
  } catch (e) {
    // ignore
  }

  // 2. Save to Firestore
  try {
    if (db) {
      await addDoc(collection(db, 'missing_places'), leadPayload);
    }
  } catch (e) {
    // Firestore might be in local mode; fallback to localStorage is preserved
  }

  return {
    success: true,
    message: `شكراً لمساعدتك! تم استلام طلب إضافة محل "${cleanName}" وسيقوم فريقنا بالتواصل معه وتوثيقه بالمنصة.`
  };
}

/**
 * Built-in intelligent matcher for Arabic queries with Zero Cost.
 * Integrates FilterEngine for deterministic parsing of natural language into structured constraints.
 * Differentiates strictly between general/informational queries and search-oriented queries.
 */
export async function getSmartLocalResponse(
  rawQuery: string
): Promise<{
  text: string;
  actions: ActionLink[];
  cards?: BusinessCardItem[];
  isMissingPlace?: boolean;
  missingPlaceName?: string;
  comparisonMode?: boolean;
  appliedFilters?: string[];
}> {
  const query = rawQuery.toLowerCase().trim();
  const parsed = FilterEngine.parseQuery(rawQuery);
  const { cleanTerm, intent, domain, isSearchOriented, isInformational } = parsed;

  // =========================================================================
  // 1. GENERAL / INFORMATIONAL QUERIES (Zero Cards Guaranteed)
  // =========================================================================

  // 1.1 Greetings & Pleasantries
  if (intent === 'greeting' || /^(مرحبا|مرحباً|أهلا|اهلا|سلام|السلام عليكم|صباح الخير|مساء الخير|هاي|hello|hi)$/i.test(query)) {
    return {
      text: `أهلاً وسهلاً بك في **شو في بإربد؟** 🌸✨\n\nأنا **ربداوي AI**، دليلك في المنصة المزود بميزات:\n- 🟢 **فحص حالة المحل الحية** (مفتوح الآن أم مغلق) ومواعيد العمل.\n- 🏢 **فلترة السكنات والشقق** حسب الجامعة والميزانية ونوع السكن (طالبات/طلاب).\n- 💼 **البحث السريع عن الوظائف** وإمكانية التقديم الفوري عبر الواتساب.\n- 🛍️ **البحث عن المنتجات والوجبات** مع زر "إضافة للسلة" و"طلب فوري".\n- 🏷️ **مقارنة الأسعار والعروض** الحصرية في إربد.\n\nما الذي تبحث عنه اليوم؟`,
      actions: [
        { label: '🍽️ مطاعم مفتوحة الآن', path: '/search?category=مطاعم' },
        { label: '🏠 سكنات طالبات اليرموك', path: '/housing?q=طالبات' },
        { label: '💼 وظائف شاغرة اليوم', path: '/jobs' },
        { label: '🏷️ مقارنة أقوى العروض', path: '/offers' }
      ]
    };
  }

  // 1.2 Terms & Conditions (الشروط والأحكام)
  if (intent === 'terms') {
    return {
      text: `أهلاً بك! إليك ملخص **الشروط والأحكام** لمنصة "شو في بإربد؟" 📜⚖️:\n\n1. **طبيعة المنصة:** "شو في بإربد؟" هي دليل محلي رقمي تفاعلي يهدف لربط أهالي وزوار محافظة إربد بالمحلات التجارية، السكنات الطلابية، والوظائف الشاغرة.\n2. **التواصل المباشر:** المنصة وسيط إرشادي وتوفر أرقام الهواتف وروابط الواتساب للتواصل المباشر بين المستخدم ومزود الخدمة بدون أي عمولات خفية.\n3. **مصداقية البيانات:** يتم تدقيق الأنشطة التجارية والإعلانات بشكل دوري، ويلتزم أصحاب العمل والمعلنون بصحة المعلومات والأسعار المعروضة.\n4. **الاستخدام العادل:** يُمنع نشر أي محتوى مضلل أو مخالف للقوانين والأنظمة المعمول بها في المملكة الأردنية الهاشمية.\n\nيمكنك قراءة الوثيقة الكاملة للشروط والأحكام عبر الرابط أدناه:`,
      actions: [
        { label: '📜 صفحة الشروط والأحكام الكاملة', path: '/terms' },
        { label: '🔒 سياسة الخصوصية والأمان', path: '/privacy' },
        { label: '🏢 تصفح دليل إربد', path: '/search' }
      ]
    };
  }

  // 1.3 Privacy Policy (سياسة الخصوصية)
  if (intent === 'privacy') {
    return {
      text: `خصوصيتك وأمان بياناتك هي أولويتنا في **شو في بإربد؟** 🔒🛡️\n\n- نحن لا نقوم ببيع أو مشاركة بياناتك الشخصية مع أي طرف ثالث.\n- نستخدم بيانات الموقع والبحث محلياً فقط لتقديم نتائج دقيقة تلائم احتياجاتك في إربد.\n- المعاملات والطلبات المباشرة تتم بأمان تام عبر قنوات الاتصال الرسمية للمحلات (مثل الواتساب والاتصال الهاتفي).\n\nلمزيد من التفاصيل يمكنك مراجعة وثيقة سياسة الخصوصية الكاملة:`,
      actions: [
        { label: '🔒 قراءة سياسة الخصوصية', path: '/privacy' },
        { label: '📜 الشروط والأحكام', path: '/terms' },
        { label: '📞 اتصل بنا للاستفسار', path: '/contact' }
      ]
    };
  }

  // 1.4 About Platform (من نحن / عن المنصة)
  if (intent === 'about') {
    return {
      text: `منصة **"شو في بإربد؟"** هي الدليل الرقمي الشامل لعروس الشمال محافظة إربد 🏛️✨\n\nتأسست المنصة لتكون المنظومة المتكاملة التي تجمع:\n- 🏢 **دليل المحلات والشركات:** استعراض كافة الأنشطة والمحلات مع أوقات الدوام المباشرة والتقييمات.\n- 🏠 **السكنات والشقق:** قاعدة بيانات مفصلة لسكنات الطلاب والطالبات بالقرب من جامعة اليرموك والتكنو وجدارا.\n- 💼 **بوابة الوظائف:** منصة إعلانات وظيفية للشركات والباحثين عن عمل مع تقديم فوري عبر الواتساب.\n- 🏷️ **العروض والخصومات:** رصد يومي لأقوى التخفيضات ومقارنة الأسعار مع إمكانية الطلب المباشر.\n- 🚌 **المواصلات ومواقيت الصلاة والسياحة:** خدمات إرشادية يومية تخدم الجميع.`,
      actions: [
        { label: 'ℹ️ صفحة من نحن', path: '/about' },
        { label: '🏢 تصفح دليل المحلات والشركات', path: '/search' },
        { label: '📞 اتصل بنا', path: '/contact' }
      ]
    };
  }

  // 1.5 Packages & Adding Business (باقات الاشتراك وإضافة محل)
  if (intent === 'packages') {
    return {
      text: `هل تملك محلاً تجارياً، عيادة، كافيه، أو مكتباً في إربد وترغب بزيادة مبيعاتك وظهورك للآلاف؟ 📈🚀\n\nتوفر منصة **"شو في بإربد؟"** باقات اشتراك مرنة تشمل:\n- صفحة مخصصة لمحلك مع رابط خاص (username@).\n- عرض ساعات العمل الحية، المنتجات، المنيو، وأرقام التواصل المباشر.\n- ظهور مميز في نتائج البحث ورسائل المساعد الذكي.\n- إمكانية نشر العروض والخصومات والشواغر الوظيفية.`,
      actions: [
        { label: '📦 تصفح باقات الاشتراك والأسعار', path: '/packages' },
        { label: '📢 نشر شاغر وظيفي جديد', path: '/jobs?action=add' },
        { label: '🏠 إضافة إعلان سكن أو شقة', path: '/housing?action=add' }
      ]
    };
  }

  // 1.6 Contact & Support (الدعم والتواصل)
  if (intent === 'contact') {
    return {
      text: `فريق منصة **شو في بإربد؟** جاهز دائماً لمساعدتك والإجابة على أي استفسار أو اقتراح 🤝📞\n\n- **هاتف الإدارة:** 0799887766\n- **البريد الإلكتروني:** info@shofieirbid.com\n- **ساعات العمل:** يومياً من 9:00 صباحاً وحتى 9:00 مساءً\n\nيمكنك مراسلتنا فوراً عبر صفحة اتصل بنا أو محادثة الواتساب:`,
      actions: [
        { label: '📞 الانتقال لصفحة اتصل بنا', path: '/contact' },
        { label: '💬 محادثة واتساب الإدارة', path: 'https://wa.me/962799887766' }
      ]
    };
  }

  // 1.7 Prayer Times (مواقيت الصلاة)
  if (intent === 'prayer' || /(صلاة|مواقيت|اذان|أذان|الفجر|الظهر|العصر|المغرب|العشاء|مسجد)/i.test(query)) {
    return {
      text: `تقبل الله طاعتكم 🕌🤲\n\nمواقيت الصلاة الدقيقة لمدينة إربد وضواحيها مع عداد تنازلي للأذان القادم:`,
      actions: [
        { label: '🕌 مواقيت الصلاة في إربد', path: '/prayer-times' }
      ]
    };
  }

  // 1.8 Transportation & Buses (المواصلات)
  if (intent === 'transport' || /(باص|باصات|سرفيس|سرافيس|مواصلات|مجمع عمان|مجمع الشمال|كوستر)/i.test(query)) {
    return {
      text: `دليل المواصلات ومسارات الباصات والسرافيس في إربد ومجمعاتها في خدمتك! 🚌🚦`,
      actions: [
        { label: '🚌 مواعيد وخطوط الباصات والسرافيس', path: '/transportation' }
      ]
    };
  }

  // 1.9 Tourism & Leisure (السياحة)
  if (intent === 'tourism' || /(سياحة|ترفيه|فسحة|طلعة|مشوار|وين اروح|وين اطلع|أم قيس|برقش|وادي الريان)/i.test(query)) {
    return {
      text: `إربد غنية بالطبيعة الخلابة والتاريخ العريق! 🌳🏛️\n\nمن أم قيس إلى غابات برقش ووادي الريان وطبقة فحل؛ إليك الدليل السياحي الكامل:`,
      actions: [
        { label: '🌿 دليل السياحة والمعالم في إربد', path: '/tourism' }
      ]
    };
  }

  // =========================================================================
  // 2. SEARCH-ORIENTED QUERIES (Structured Data Matching with FilterEngine)
  // =========================================================================

  // 2.1 Live Hours Status Queries (Open / Closed Stores)
  if (intent === 'closed_stores') {
    const filterRes = await filterStructuredEntities({ closedNow: true, limit: 4 }, rawQuery);
    return {
      text: `إليك قائمة ببعض المحال والأنشطة المسجلة في إربد والمغلقة حالياً وفق جدول دوامها الرسمي المعتمد 🕒🔴\n\n(ملاحظة: أغلب المحال في إربد تغلق ما بين الساعة 10:00 مساءً و 12:00 منتصف الليل، وتستأنف عملها صباحاً بين 8:00 و 10:00 صباحاً):`,
      cards: filterRes.cards.length > 0 ? filterRes.cards : undefined,
      appliedFilters: filterRes.appliedFilters,
      actions: [
        { label: '🟢 استعراض المحال المفتوحة الآن', path: '/search' },
        { label: '🏢 تصفح كافة المحلات في إربد', path: '/search' }
      ]
    };
  }

  if (intent === 'open_stores') {
    const filterRes = await filterStructuredEntities({ openNow: true, limit: 4 }, rawQuery);
    return {
      text: `إليك المحال والأنشطة التجارية **المفتوحة حالياً** وجاهزة لاستقبالك وتلبية طلباتك في إربد 🟢✨:`,
      cards: filterRes.cards.length > 0 ? filterRes.cards : undefined,
      appliedFilters: filterRes.appliedFilters,
      actions: [
        { label: '🍽️ مطاعم وكافيهات مفتوحة الآن', path: '/search?category=مطاعم' },
        { label: '🏢 استعراض كافة المحلات', path: '/search' }
      ]
    };
  }

  // 2.2 Price & Offer Comparison
  if (intent === 'compare' || /(قارن|مقارنة|مين ارخص|أرخص|احسن عرض|أفضل عرض)/i.test(query)) {
    const comparison = await getOffersComparison(cleanTerm);
    return {
      text: comparison.text,
      cards: comparison.cards,
      comparisonMode: true,
      actions: [
        { label: '🏷️ كافة عروض وتخفيضات إربد', path: '/offers' },
        { label: '🛒 عرض سلة المشتريات', path: '/cart' }
      ]
    };
  }

  // 2.3 Jobs & Vacancies Search
  if (intent === 'job' || domain === 'job') {
    const filterRes = await filterStructuredEntities({
      domain: 'job',
      cleanTerm,
      jobType: parsed.jobType,
      location: parsed.location,
      limit: 4
    }, rawQuery);

    if (filterRes.cards.length > 0) {
      return {
        text: `وجدت لك **الوظائف الشاغرة** المطابقة لـ "**${cleanTerm}**" في إربد 💼✨\n\nيمكنك التقديم الفوري لصاحب العمل عبر الواتساب بنقرة واحدة أو الاتصال المباشر:`,
        cards: filterRes.cards,
        appliedFilters: filterRes.appliedFilters,
        actions: [
          { label: `💼 كافة وظائف "${cleanTerm}"`, path: `/jobs?q=${encodeURIComponent(cleanTerm)}` },
          { label: '💼 قسم الوظائف الشاغرة', path: '/jobs' },
          { label: '📢 نشر إعلان طلب موظفين', path: '/jobs?action=add' }
        ]
      };
    } else {
      return {
        text: `لم أجد حالياً شواغر وظيفية تطابق "**${cleanTerm}**" في إربد 💼\n\nيتم تحديث وإضافة الوظائف الشاغرة في المحافظة بشكل يومي ومستمر. يمكنك تصفح كافة الوظائف المتاحة حالياً:`,
        actions: [
          { label: '💼 تصفح كافة الوظائف الشاغرة', path: '/jobs' },
          { label: '📢 نشر إعلان طلب موظفين', path: '/jobs?action=add' }
        ]
      };
    }
  }

  // 2.4 Housing & Apartments Search
  if (intent === 'housing' || domain === 'housing') {
    const filterRes = await filterStructuredEntities({
      domain: 'housing',
      cleanTerm,
      university: parsed.university,
      targetType: parsed.targetType,
      maxPrice: parsed.maxPrice,
      minPrice: parsed.minPrice,
      location: parsed.location,
      limit: 4
    }, rawQuery);

    let filterSummary = '';
    if (parsed.university) filterSummary += ` بالقرب من جامعة ${parsed.university}`;
    if (parsed.targetType) filterSummary += ` مخصصة لـ ${parsed.targetType}`;
    if (parsed.maxPrice) filterSummary += ` بميزانية حتى ${parsed.maxPrice} د.أ`;

    if (filterRes.cards.length > 0) {
      return {
        text: `وجدت لك **أفضل خيارات السكن والشقق** لـ "**${cleanTerm}**"${filterSummary} 🏢🔑\n\nتواصل مباشرة مع المالك عبر الهاتف أو الواتساب للمعاينة والحجز:`,
        cards: filterRes.cards,
        appliedFilters: filterRes.appliedFilters,
        actions: [
          { label: `🏠 تصفح سكنات "${cleanTerm}"`, path: `/housing?q=${encodeURIComponent(cleanTerm)}` },
          { label: '🏢 قسم السكن والشقق في إربد', path: '/housing' },
          { label: '➕ نشر إعلان سكن جديد', path: '/housing?action=add' }
        ]
      };
    } else {
      return {
        text: `لم أجد حالياً سكنات أو شقق تطابق "**${cleanTerm}**"${filterSummary} في إربد 🏢\n\nيمكنك استعراض كافة السكنات والشقق الطلابية المتاحة حالياً في المنصة:`,
        actions: [
          { label: '🏢 تصفح قسم السكنات والشقق', path: '/housing' },
          { label: '➕ نشر إعلان سكن جديد', path: '/housing?action=add' }
        ]
      };
    }
  }

  // 2.5 Products & Meals Search
  if (intent === 'product' || intent === 'offer' || domain === 'product' || domain === 'offer') {
    const filterRes = await filterStructuredEntities({
      domain: intent === 'offer' ? 'offer' : 'product',
      cleanTerm,
      lowPrice: parsed.isBudgetFriendly,
      maxPrice: parsed.maxPrice,
      limit: 4
    }, rawQuery);

    if (filterRes.cards.length > 0) {
      return {
        text: `وجدت لك **أفضل الأصناف والخيارات** لـ "**${cleanTerm}**" في إربد 🛍️🍕\n\nيمكنك إضافة الصنف لسلة مشترياتك فوراً أو طلبه مباشرة عبر الواتساب:`,
        cards: filterRes.cards,
        appliedFilters: filterRes.appliedFilters,
        actions: [
          { label: '🛒 عرض سلة المشتريات', path: '/cart' },
          { label: '🏷️ أقوى العروض والخصومات', path: '/offers' }
        ]
      };
    }
  }

  // 2.6 Businesses & Stores Specific Search
  if (isSearchOriented && cleanTerm.length >= 2) {
    const filterRes = await filterStructuredEntities({
      domain: 'business',
      cleanTerm,
      openNow: parsed.isOpen,
      closedNow: parsed.isClosed,
      highRating: parsed.isHighRating,
      minRating: parsed.minRating,
      category: parsed.category,
      location: parsed.location,
      lowPrice: parsed.isBudgetFriendly,
      sortBy: parsed.sortBy as any,
      limit: 4
    }, rawQuery);

    if (filterRes.cards.length > 0) {
      let filterSummary = '';
      if (parsed.isOpen) filterSummary += ' (المفتوحة الآن 🟢)';
      if (parsed.isHighRating || parsed.minRating) filterSummary += ` (⭐ تقييم ${parsed.minRating || 4.5}+)`;
      return {
        text: `وجدت لك المحلات والأماكن المطابقة لـ "**${cleanTerm}**"${filterSummary} 📍✨\n\nتحقق من حالة الدوام وساعات العمل وتواصل مع المحل مباشرة:`,
        cards: filterRes.cards,
        appliedFilters: filterRes.appliedFilters,
        actions: [
          { label: `🔍 عرض نتائج "${cleanTerm}" في الدليل`, path: `/search?q=${encodeURIComponent(cleanTerm)}` },
          { label: '🏢 دليل المحلات والشركات', path: '/search' }
        ]
      };
    }

    // Missing place lead generation - Only for store-specific searches
    if (/(محل اسمه|مكان اسمه|مطعم اسمه|كافيه اسمه|ابحث عن محل|بدي محل|دورلي على محل|وين الاقي محل)/i.test(rawQuery)) {
      return {
        text: `بحثت لك في منصة "شو في بإربد؟" عن محل باسم "**${cleanTerm}**". 🔍\n\nيبدو أن هذا المحل غير مسجل لدينا حالياً بالاسم المباشر، أو لم يقم صاحبه بإضافته بعد.\n\nيمكنك تسجيل طلب لإضافة هذا المحل فوراً وسيقوم فريقنا بالتواصل معه وتوثيقه، أو تسجيله بنفسك إذا كنت صاحب العمل!`,
        isMissingPlace: true,
        missingPlaceName: cleanTerm,
        actions: [
          { label: `🔍 البحث عن "${cleanTerm}" في صفحة البحث`, path: `/search?q=${encodeURIComponent(cleanTerm)}` },
          { label: '🏢 تصفح دليل المحلات في إربد', path: '/search' },
          { label: `➕ إضافة محل "${cleanTerm}" للمنصة`, path: '/packages' }
        ]
      };
    }
  }

  // 2.7 Match registered pages
  let bestMatch: { title: string; path: string } | null = null;
  for (const key of Object.keys(SITE_PAGES)) {
    const page = SITE_PAGES[key];
    if (page.keywords.some(k => query.includes(k))) {
      bestMatch = { title: page.title, path: page.path };
      break;
    }
  }

  if (bestMatch) {
    return {
      text: `يمكنك زيارة صفحة **${bestMatch.title}** حيث ستجد كافة المعلومات والتفاصيل:`,
      actions: [
        { label: `الانتقال إلى: ${bestMatch.title}`, path: bestMatch.path },
        { label: `🔍 البحث في الدليل عن "${cleanTerm}"`, path: `/search?q=${encodeURIComponent(cleanTerm)}` }
      ]
    };
  }

  // 2.8 Conversational Fallback (Zero Irrelevant Cards!)
  return {
    text: `أنا هنا لمساعدتك في كل ما يخص محافظة إربد ومنصة **شو في بإربد؟** 🌟\n\nيمكنك أن تسألني بدقة عن:\n- 🏢 **المحلات والأنشطة:** (مطاعم، كافيهات، صيدليات، مراكز صيانة) مع حالة الدوام الحية.\n- 🏠 **السكنات والشقق:** لطلاب وطالبات جامعات اليرموك والتكنو وجدارا حسب الميزانية.\n- 💼 **الوظائف الشاغرة:** في مختلف قطاعات إربد والتقديم المباشر عبر الواتساب.\n- 🛍️ **المنتجات والوجبات:** والطلب الفوري مع الإضافة لسلة المشتريات.\n- 🏷️ **أقوى العروض والخصومات:** ومقارنة الأسعار الذكية.\n- 📜 **شروط الاستخدام والخصوصية:** ومعلومات المنصة.`,
    actions: [
      { label: '🏢 دليل المحلات والأنشطة', path: '/search' },
      { label: '🏷️ مقارنة العروض والخصومات', path: '/offers' },
      { label: '🏠 الشقق وسكن الطلاب', path: '/housing' },
      { label: '💼 الوظائف الشاغرة', path: '/jobs' },
      { label: '📜 الشروط والأحكام', path: '/terms' }
    ]
  };
}

/**
 * Master AI Assistant Function.
 * Runs prompt through FilterEngine first to classify intent and extract structured filters.
 * Differentiates between general/informational queries and search-oriented queries before querying data.
 */
export async function askAiAssistant(
  userMessage: string
): Promise<{
  text: string;
  actions?: ActionLink[];
  cards?: BusinessCardItem[];
  isMissingPlace?: boolean;
  missingPlaceName?: string;
  comparisonMode?: boolean;
  appliedFilters?: string[];
}> {
  // CRITICAL: Always parse the prompt through FilterEngine before fetching data or responding
  const parsed = FilterEngine.parseQuery(userMessage);

  // 1. Informational & FAQ Queries:
  // Must return instant targeted conversational answer with ZERO irrelevant cards
  if (parsed.isInformational || parsed.domain === 'none') {
    return await getSmartLocalResponse(userMessage);
  }

  // 2. Specific Search-Oriented Queries:
  // If the query is search-oriented with domain filters, comparison, or specific keywords
  if (parsed.isSearchOriented || parsed.intent === 'compare') {
    const localResult = await getSmartLocalResponse(userMessage);
    if (localResult.cards && localResult.cards.length > 0) {
      return localResult;
    }
  }

  // 3. Conversational / Complex Queries:
  // Query backend LLM with a 3.0s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.text && !data.fallback) {
        const domain = data.domain || 'none';
        let matchingCards: BusinessCardItem[] = [];

        // STRICT DOMAIN & FILTERENGINE GUARD:
        // ONLY attach cards if the LLM and FilterEngine confirm a valid search domain
        if (domain !== 'none' && domain !== 'general') {
          const searchTarget = data.cleanQuery || parsed.cleanTerm;
          const filterRes = await filterStructuredEntities({
            domain: domain as any,
            cleanTerm: searchTarget,
            openNow: parsed.isOpen,
            closedNow: parsed.isClosed,
            highRating: parsed.isHighRating,
            minRating: parsed.minRating,
            category: parsed.category,
            location: parsed.location,
            university: parsed.university,
            targetType: parsed.targetType,
            jobType: parsed.jobType,
            maxPrice: parsed.maxPrice,
            minPrice: parsed.minPrice,
            lowPrice: parsed.isBudgetFriendly,
            limit: 4
          }, userMessage);

          matchingCards = filterRes.cards;
        }

        const sanitizedActions: ActionLink[] = (data.actions && data.actions.length > 0)
          ? data.actions.map((act: ActionLink) => ({
              ...act,
              label: act.label.replace(/(ابحث عن محل اسمه|ابحث عن محل|بدي محل اسمه)/g, '').trim()
            }))
          : [
              { label: '🏢 دليل المحلات والأنشطة', path: '/search' },
              { label: '🏷️ أقوى العروض والتخفيضات', path: '/offers' }
            ];

        // Check if missing place lead applies (only when searching for a store that wasn't found)
        const isMissing = matchingCards.length === 0 && domain === 'business' && /(محل اسمه|مكان اسمه|مطعم اسمه|كافيه اسمه|ابحث عن محل)/i.test(userMessage);

        return {
          text: data.text,
          actions: sanitizedActions,
          cards: matchingCards.length > 0 ? matchingCards : undefined,
          isMissingPlace: isMissing,
          missingPlaceName: isMissing ? (data.cleanQuery || parsed.cleanTerm) : undefined,
          comparisonMode: parsed.intent === 'compare',
          appliedFilters: parsed.appliedFilterLabels.length > 0 ? parsed.appliedFilterLabels : undefined
        };
      }
    }
  } catch (e) {
    // Fallback to local matcher
  }

  return await getSmartLocalResponse(userMessage);
}
