import { Business, HousingItem, WorkingHours } from '../types';
import { normalizeArabic } from '../lib/arabicSearch';
import { getLiveWorkingStatus, LiveStatus } from '../lib/businessHoursHelper';

// =========================================================================
// 1. TYPES & STRUCTURED FILTER PARAMETERS INTERFACE
// =========================================================================

export type FilterDomain = 'business' | 'housing' | 'job' | 'product' | 'offer' | 'all' | 'none';
export type FilterSortOption = 'rating' | 'price_asc' | 'price_desc' | 'relevance' | 'newest' | 'reviews';
export type QueryIntent =
  | 'greeting'
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
  | 'product'
  | 'offer'
  | 'compare'
  | 'prayer'
  | 'transport'
  | 'tourism'
  | 'search'
  | 'recommendation'
  | 'general';

/**
 * Structured query parameters extracted from natural language input.
 */
export interface FilterParameters {
  // Required core parameters specified by prompt:
  isOpen?: boolean;
  isClosed?: boolean;
  minRating?: number;
  category?: string;

  // Extended structured parameters:
  rawQuery: string;
  cleanTerm: string;
  tokens: string[];
  intent: QueryIntent;
  domain: FilterDomain;
  isSearchOriented: boolean;
  isInformational: boolean;

  // Rating & Quality
  maxRating?: number;
  isHighRating?: boolean;

  // Category & Subcategory
  subCategory?: string;

  // Pricing & Budget
  minPrice?: number;
  maxPrice?: number;
  isBudgetFriendly?: boolean;
  isLuxury?: boolean;

  // Location & Campus Proximity
  location?: string;
  university?: 'اليرموك' | 'العلوم والتكنولوجيا' | 'جدارا' | 'إربد الأهلية' | string;

  // Housing / Target Demographics
  targetType?: 'طالبات' | 'طلاب' | 'شباب' | 'عائلات' | 'استوديو' | 'غرفة';

  // Career & Employment
  jobType?: 'دوام كامل' | 'دوام جزئي' | 'بارت تايم' | 'للطلاب' | 'عن بعد';

  // Verification & Highlights
  isVerified?: boolean;
  isVip?: boolean;
  hasDiscount?: boolean;

  // Sorting & Pagination
  sortBy: FilterSortOption;
  limit?: number;

  // Human-readable labels for badges and UI
  appliedFilterLabels: string[];
}

// Alias for backwards compatibility
export type ParsedFilterParams = FilterParameters;

export interface BusinessMatchResult {
  matches: boolean;
  score: number;
  liveStatus: LiveStatus;
  matchedCriteria: string[];
  rejectionReason?: string;
}

export interface HousingMatchResult {
  matches: boolean;
  score: number;
  matchedCriteria: string[];
  rejectionReason?: string;
}

export interface JobMatchResult {
  matches: boolean;
  score: number;
  matchedCriteria: string[];
  rejectionReason?: string;
}

export interface ProductMatchResult {
  matches: boolean;
  score: number;
  matchedCriteria: string[];
  rejectionReason?: string;
}

export interface FilterEngineExecutionResult {
  params: FilterParameters;
  businesses: { item: Business; score: number; liveStatus: LiveStatus }[];
  housings: { item: any; score: number }[];
  jobs: { item: any; score: number }[];
  products: { item: any; score: number }[];
  totalMatches: number;
  appliedFilterLabels: string[];
  summary: string;
}

// =========================================================================
// 2. DICTIONARIES & NLP CONSTANTS FOR IRBID
// =========================================================================

const IRBID_LOCATIONS = [
  'شارع الجامعة', 'دوار القبة', 'جامعة اليرموك', 'التكنولوجيا', 'جامعة العلوم والتكنولوجيا',
  'دوار الثقافة', 'شارع بغداد', 'شارع فلسطين', 'شارع الهاشمي', 'شارع السينما',
  'شارع الحصن', 'شارع البتراء', 'شارع الثلاثين', 'دوار الدرة', 'دوار وصفي التل',
  'مجمع عمان الجديد', 'مجمع عمان القديم', 'مجمع الشمال', 'دوار سال', 'دوار زبدة',
  'دوار النخلة', 'دوار الثورة العربية', 'الحي الشرقي', 'الحي الجنوبي', 'الحي الغربي',
  'حي الروضة', 'حي القصيلة', 'حي الحكمة', 'حي النزهة', 'حي الأندلس',
  'إيدون', 'الحصن', 'الصريح', 'حوارة', 'الرمثا', 'كفريوبا', 'بيت رأس', 'النعيمة', 'شطنا'
];

const STOP_WORDS = new Set([
  'في', 'من', 'إلى', 'على', 'عن', 'مع', 'بين', 'حول', 'قرب', 'جنب', 'عند',
  'شو', 'ايش', 'وين', 'كيف', 'هل', 'بدي', 'بديش', 'أريد', 'ابحث', 'أبحث',
  'احسن', 'أحسن', 'افضل', 'أفضل', 'ارخص', 'أرخص', 'اعلى', 'أعلى', 'توب', 'ممتاز',
  'بإربد', 'باربد', 'اربد', 'إربد', 'مدينة', 'منطقة', 'مكان', 'محل', 'محلية', 'محلات',
  'موجود', 'موجودة', 'الآن', 'الان', 'هسا', 'هسه', 'اليوم', 'حاليا', 'حالياً',
  'لو', 'سمحت', 'ممكن', 'عفوا', 'شكرا', 'يا', 'غالي', 'مرحبا', 'ألو', 'هلا'
]);

// =========================================================================
// 3. CORE NATURAL LANGUAGE PARSER FUNCTION
// =========================================================================

/**
 * Parses a natural language user query into structured filter parameters.
 * E.g. "بدي مطعم مفتوح هسا تقييمه عالي بشارع الجامعة" ->
 *      { isOpen: true, minRating: 4.5, category: 'مطاعم ومأكولات', location: 'شارع الجامعة', ... }
 *
 * @param rawQuery The user input string in Arabic/English
 * @returns Structured FilterParameters object
 */
export function parseNaturalLanguageQuery(rawQuery: string): FilterParameters {
  const text = (rawQuery || '').trim();
  const norm = normalizeArabic(text);

  // 1. Intent & Domain Detection
  let intent: QueryIntent = 'general';
  let domain: FilterDomain = 'all';

  // Informational & Platform Policies
  if (/^(مرحبا|مرحباً|أهلا|اهلا|سلام|السلام عليكم|صباح الخير|مساء الخير|هاي|hello|hi)$/i.test(text)) {
    intent = 'greeting';
    domain = 'none';
  } else if (/(شروط|احكام|الأحكام|الشروط والأحكام|terms|سياسة الاستخدام|اتفاقية)/i.test(text) && !/(وظيفة|سكن|شقة)/i.test(text)) {
    intent = 'terms';
    domain = 'none';
  } else if (/(خصوصية|الخصوصية|privacy)/i.test(text)) {
    intent = 'privacy';
    domain = 'none';
  } else if (/(من انتم|من أنتم|عن الموقع|عن المنصة|شو هذا الموقع|شو هو الموقع|فكرة الموقع|ايش هذا الموقع|عن شو في باربد|مين انتم|about)/i.test(text)) {
    intent = 'about';
    domain = 'none';
  } else if (/(كيف اضيف محلي|كيف انشر|باقات|اضافة محل|إضافة محل|اشتراك المحلات|باقات الاشتراك|نشر اعلان)/i.test(text)) {
    intent = 'packages';
    domain = 'none';
  } else if (/(تواصل|اتصال|رقم الادارة|رقم الإدارة|الدعم الفني|الدعم|اتصل بنا|رقم الواتس|اشتكي|شكوى)/i.test(text)) {
    intent = 'contact';
    domain = 'none';
  } else if (/(صلاة|مواقيت|اذان|أذان|الفجر|الظهر|العصر|المغرب|العشاء|مسجد)/i.test(text) && !/(مطعم|كافيه|سكن)/i.test(text)) {
    intent = 'prayer';
    domain = 'none';
  } else if (/(باص|باصات|سرفيس|سرافيس|مواصلات|مجمع عمان|مجمع الشمال|كوستر)/i.test(text) && !/(وظيفة|سائق)/i.test(text)) {
    intent = 'transport';
    domain = 'none';
  } else if (/(سياحة|معالم|ترفيه|فسحة|طلعة|مشوار|وين اروح|وين اطلع|أم قيس|برقش|وادي الريان)/i.test(text) && !/(مطعم|كافيه)/i.test(text)) {
    intent = 'tourism';
    domain = 'none';
  } else if (/(المحال المغلقة|المحلات المغلقة|مين مسكر|مين مغلق|المتاجر المغلقة|مسكرين|مسكر حاليا|مغلقة حاليا|مغلق حاليا|مسكر هسا)/i.test(text)) {
    intent = 'closed_stores';
    domain = 'business';
  } else if (/(المحال المفتوحة|المحلات المفتوحة|مين فاتح|مين مفتوح|المتاجر المفتوحة|فاتحين|فاتح حاليا|مفتوحة حاليا|مفتوح حاليا|فاتح هسا)/i.test(text)) {
    intent = 'open_stores';
    domain = 'business';
  } else if (/(قارن|مقارنة|مين ارخص|مين أرخص|مين افضل|مين أحسن|اقوى عروض|أقوى عروض|مقارنة اسعار)/i.test(text)) {
    intent = 'compare';
    domain = 'offer';
  } else if (/(وظيفة|وظائف|شواغر|شاغر|توظيف|بدي اشتغل|أدور على شغل|ابحث عن شغل|فرص عمل|فرصة عمل|مطلوب موظف|باريستا|محاسب|كاشير|صيدلي|صيدلانية|سائق دليفري|مندوب مبيعات|سكرتيرة|ممرض)/i.test(text)) {
    intent = 'job';
    domain = 'job';
  } else if (/(شقة|شقق|سكن|سكنات|استوديو|أستوديو|عقار|ايجار|إيجار|غرفة طلاب|غرفة طالبات|مفروش)/i.test(text)) {
    intent = 'housing';
    domain = 'housing';
  } else if (/(عرض|عروض|خصم|خصومات|تخفيضات|وفر|وفرة|سعر خاص|بكج|تنزيلات|كوبون)/i.test(text)) {
    intent = 'offer';
    domain = 'offer';
  } else if (/(وجبة|ساندويش|كيلو|قطعة|منتج|طلب|اشتري|سعر ال|سعر الوجبة|قائمة|منيو|شاورما|برجر|برغر|بيتزا|كنافة|حلويات|قهوة|لاتيه)/i.test(text)) {
    intent = 'product';
    domain = 'product';
  } else if (/(مطعم|مطاعم|كافيه|كافيهات|محل|محلات|صيدلية|صيدليات|دكتور|طبيب|عيادة|سوبرماركت|صالون|حلاق|مكتبة|مستشفى)/i.test(text)) {
    intent = 'business';
    domain = 'business';
  } else if (/(ابحث|ابحثلي|دورلي|فتشلي|شوفلي|وين الاقي|وين بلاقي|وين موجود|هل يوجد)/i.test(text)) {
    intent = 'search';
    domain = 'business';
  } else if (/(أفضل|افضل|احسن|أنصحني|ترشيح|توب)/i.test(text)) {
    intent = 'recommendation';
    domain = 'business';
  }

  // 2. Operational Hours (Live Working Status)
  let isOpen: boolean | undefined;
  let isClosed: boolean | undefined;

  if (intent === 'open_stores' || /(مفتوح الآن|مفتوح هسا|مفتوح هسه|فاتح الآن|فاتح هسا|فاتح هسه|فاتحين|شغال الآن|24 ساعة|شغال هسا|شغال هسه|مفتوحين|فاتح)/i.test(text)) {
    isOpen = true;
  } else if (intent === 'closed_stores' || /(مغلق الآن|مغلق هسا|مسكر الآن|مسكر هسا|مسكرين|مغلقين|مسكر|مغلق)/i.test(text)) {
    isClosed = true;
  }

  // 3. Star Rating & Quality Expectations
  let minRating: number | undefined;
  let isHighRating = false;

  if (/(أعلى تقييم|اعلى تقييم|أفضل تقييم|افضل تقييم|توب|ممتاز|5 نجوم|خمس نجوم|أحسن تقييم|احسن تقييم|الأفضل|الافضل|أحسن شي|احسن اشي)/i.test(text)) {
    isHighRating = true;
    minRating = 4.5;
  }

  const explicitRatingMatch = text.match(/تقييم\s*(?:فوق|أعلى من|اعلى من|أكثر من|اكثر من)?\s*([345](?:\.\d+)?)/i) ||
                              text.match(/([345](?:\.\d+)?)\s*(?:نجوم|نجمة)/i);
  if (explicitRatingMatch && explicitRatingMatch[1]) {
    const r = parseFloat(explicitRatingMatch[1]);
    if (!isNaN(r) && r >= 3.0 && r <= 5.0) {
      minRating = r;
      if (r >= 4.5) isHighRating = true;
    }
  }

  // 4. Category Classification
  let category: string | undefined;
  let subCategory: string | undefined;

  if (/(مطعم|مطاعم|شاورما|برجر|برغر|بيتزا|مشاوي|فلافل|حمص|فطور|غداء|عشاء|وجبة|سناك|طعام|أكل|اكل)/i.test(text)) {
    category = 'مطاعم ومأكولات';
    if (/شاورما/i.test(text)) subCategory = 'شاورما';
    else if (/برجر|برغر/i.test(text)) subCategory = 'برجر';
    else if (/بيتزا/i.test(text)) subCategory = 'بيتزا';
    else if (/مشاوي/i.test(text)) subCategory = 'مشاوي';
  } else if (/(كافيه|كافيهات|مقهى|قهوة|لاتيه|اسبريسو|كابتشينو|شاي|قعدة دراسة|دراسة)/i.test(text)) {
    category = 'كافيهات ومقاهي';
  } else if (/(سكن|سكنات|شقة|شقق|استوديو|أستوديو|غرفة طلاب|غرفة طالبات|ايجار)/i.test(text)) {
    category = 'سكنات وشقق';
  } else if (/(وظيفة|وظائف|شواغر|شاغر|توظيف|باريستا|محاسب|كاشير|صيدلي|مندوب)/i.test(text)) {
    category = 'شواغر وظيفية';
  } else if (/(صيدلية|صيدليات|دواء|علاج|مركز طبي|دكتور|طبيب|عيادة|مستشفى|مختبر|أسنان)/i.test(text)) {
    category = 'صيدليات ومراكز طبية';
  } else if (/(حلويات|كنافة|وربات|بقلاوة|كيك|مخبز|معجنات|قشطة)/i.test(text)) {
    category = 'حلويات ومخابز';
  } else if (/(ملابس|أزياء|بوتيك|أحذية|حقائب|فستان|بدلة|رجالي|ستاتي|ولادي)/i.test(text)) {
    category = 'أزياء وملابس';
  } else if (/(سوبرماركت|هايبرماركت|بقالة|مواد تموينية|دكان)/i.test(text)) {
    category = 'سوبرماركت ومواد غذائية';
  } else if (/(صالون|حلاق|ميك اب|مكياج|تجميل|سبا|بدكير|مساج)/i.test(text)) {
    category = 'صالونات وتجميل';
  } else if (/(معلم|معلمة|معلمين|معلمات|أستاذ|استاذ|أستاذة|استاذة|مدرس|مدرسة|مدرسين|مدرسات|دكتور جامعة|درس خصوصية|دروس خصوصية|تأسيس|توجيهي|فيزياء|كيمياء|رياضيات|إنجليزي|انجليزي|عربي|تحفيظ قرآن)/i.test(text)) {
    category = '👩‍🏫 معلمات ومعلمون ودروس خصوصية';
  } else if (/(مشروع منزلي|مشاريع منزلية|أونلاين|اونلاين|شغل بيت|أكل بيت|تواصي|هاند ميد|أشغال يدوية|متجر إلكتروني|شمع|صابون طبيعي)/i.test(text)) {
    category = '🏠 مشاريع منزلية وأونلاين';
  } else if (/(مكتبة|قرطاسية|طباعة|أبحاث|تجليد|كتب)/i.test(text)) {
    category = 'قرطاسية ومكتبات';
  } else if (/(جيم|رياضة|لياقة|حديد|مسبح|نادي)/i.test(text)) {
    category = 'أندية ولياقة بدنية';
  } else if (/(صيانة|ميكانيك|كهرباء|سيارات|بناشر|غيار زيت|هايبرد)/i.test(text)) {
    category = 'خدمات وصيانة سيارات';
  }

  // 5. Price & Budget Boundaries
  let maxPrice: number | undefined;
  let minPrice: number | undefined;
  const isBudgetFriendly = /(رخيص|اقتصادي|توفير|شعبية|أسعار مناسبة|اسعار مناسبة|أرخص|ارخص|سعر قليل|اقل سعر|أقل سعر|على قد الجيبة)/i.test(text);
  const isLuxury = /(فاخر|راقي|بريميوم|VIP|vip|خمس نجوم|فخم|سياحي)/i.test(text);

  const priceMatch = text.match(/(?:أقل من|تحت|ما يزيد عن|حد أقصى|بحدود|بسعر|بـ)\s*(\d{1,4})/i) ||
                     text.match(/(\d{1,4})\s*(?:دينار|د\.أ)/i);
  if (priceMatch && priceMatch[1]) {
    const p = parseInt(priceMatch[1], 10);
    if (!isNaN(p) && p > 0 && p < 10000) {
      maxPrice = p;
    }
  }

  // 6. Geographic Proximity & Specific Districts in Irbid
  let location: string | undefined;
  for (const loc of IRBID_LOCATIONS) {
    if (norm.includes(normalizeArabic(loc))) {
      location = loc;
      break;
    }
  }

  // 7. University Campus Proximity
  let university: FilterParameters['university'] | undefined;
  if (/(اليرموك|جامعة اليرموك|بوابة اليرموك|اقتصاد اليرموك)/i.test(text)) {
    university = 'اليرموك';
    if (!location) location = 'شارع الجامعة';
  } else if (/(التكنو|جامعة العلوم والتكنولوجيا|علوم وتكنولوجيا|تكنو)/i.test(text)) {
    university = 'العلوم والتكنولوجيا';
    if (!location) location = 'شارع الثلاثين';
  } else if (/جدارا/i.test(text)) {
    university = 'جدارا';
    if (!location) location = 'طريق الحصن';
  } else if (/(إربد الأهلية|اربد الاهلية)/i.test(text)) {
    university = 'إربد الأهلية';
  }

  // 8. Student/Family Housing Target Demographics
  let targetType: FilterParameters['targetType'] | undefined;
  if (/طالبات|بنات|صبايا/i.test(text)) targetType = 'طالبات';
  else if (/طلاب|شباب/i.test(text)) targetType = 'طلاب';
  else if (/عائلات|عائلة|عوائل/i.test(text)) targetType = 'عائلات';
  else if (/استوديو|أستوديو/i.test(text)) targetType = 'استوديو';
  else if (/غرفة مفردة|غرفة خاصة/i.test(text)) targetType = 'غرفة';

  // 9. Employment & Career Commitment Type
  let jobType: FilterParameters['jobType'] | undefined;
  if (/(دوام جزئي|بارت تايم|part time)/i.test(text)) jobType = 'بارت تايم';
  else if (/(دوام كامل|full time)/i.test(text)) jobType = 'دوام كامل';
  else if (/(للطلاب|مناسب للطلاب)/i.test(text)) jobType = 'للطلاب';
  else if (/(عن بعد|اونلاين|من البيت)/i.test(text)) jobType = 'عن بعد';

  // 10. Sorting & Ranking Strategy
  let sortBy: FilterSortOption = 'relevance';
  if (isHighRating || (minRating && minRating >= 4.0)) {
    sortBy = 'rating';
  } else if (isBudgetFriendly || /(ارخص|الأرخص|أرخص|أقل سعر|اقل سعر)/i.test(text)) {
    sortBy = 'price_asc';
  } else if (/(أعلى سعر|اغلى|أغلى)/i.test(text)) {
    sortBy = 'price_desc';
  } else if (/(جديد|أحدث|احدث)/i.test(text)) {
    sortBy = 'newest';
  }

  const isVerified = /(موثق|رسمي|معتمد)/i.test(text);
  const isVip = /(مميز|في اي بي|vip)/i.test(text);
  const hasDiscount = /(خصم|خصومات|عرض|عروض|وفر|تخفيض)/i.test(text);

  // 11. Clean Search Term & Tokens
  let clean = text;
  const prefixes = [
    /^(مرحبا|مرحباً|أهلا|اهلا|سلام|السلام عليكم|صباح الخير|مساء الخير|هاي|لو سمحت|عفواً|عفوا|ممكن|بالله|بدي اسألك|بدي اسالك)\s*/i,
    /^(ابحث|ابحثلي|ابحث لي|بحث|فتشلي|دورلي|دور|شوفلي|شوف لي)\s+(عن|على|بالدليل عن|في الموقع عن)?\s*/i,
    /^(اريد|اريد البحث عن|بدي|بدي اعرف|بدي الاقي|بدي اشوف|بدي ابحث عن|بدي اشتري|بدي اطلب)\s*/i,
    /^(وظيفة كـ|وظيفة|شغل كـ|شغل|شاغر|شواغر)\s+/i,
    /^(سكن|شقة|استوديو|غرفة)\s+(في|بـ|عند|قريب من)?\s*/i,
    /^(وين الاقي|وين بلاقي|وين القى|وين فيه|وين موجود|وين مكان|وين موقع|هل يوجد|شو في|ايش في)\s*/i,
    /^(محل اسمه|مكان اسمه|متجر اسمه|مطعم اسمه|كافيه اسمه|دكان اسمه|محل|مطعم|كافيه|دكان|متجر)\s+/i,
    /^(قارن لي بين|قارن بين|مين عنده|مين ارخص|مين احسن)\s+/i,
  ];

  let prev = '';
  while (prev !== clean) {
    prev = clean;
    for (const p of prefixes) {
      clean = clean.replace(p, '').trim();
    }
  }

  clean = clean.replace(/(مفتوح الآن|مفتوح هسا|فاتح الآن|فاتح هسا|مسكر الآن|مسكر هسا|24 ساعة)/gi, '');
  clean = clean.replace(/(أعلى تقييم|اعلى تقييم|أفضل تقييم|أرخص|ارخص|اقتصادي|ممتاز|5 نجوم)/gi, '');
  clean = clean.replace(/[؟?!\.,;:_]+$/g, '').trim();

  if (!clean || clean.length < 2) {
    clean = text.replace(/[؟?!\.,;]+/g, '').trim();
  }

  const normClean = normalizeArabic(clean);
  const tokens = normClean
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));

  // 12. Determine if search-oriented vs informational
  const isInformational = [
    'greeting',
    'terms',
    'privacy',
    'about',
    'packages',
    'contact',
    'prayer',
    'transport',
    'tourism'
  ].includes(intent);

  const hasExplicitSearchKeyword = /(ابحث|دور|فتش|شوفلي|شوف لي|وين الاقي|وين بلاقي|وين فيه|محل اسمه|مطعم اسمه|كافيه اسمه|بدي اشتري|بدي اطلب|بدي احجز)/i.test(text);

  const isSearchOriented = !isInformational && (
    hasExplicitSearchKeyword ||
    ['job', 'housing', 'product', 'offer', 'business', 'compare', 'open_stores', 'closed_stores', 'search', 'recommendation'].includes(intent)
  );

  // 13. Generate Human-Readable Filter Badges
  const appliedFilterLabels: string[] = [];
  if (isOpen) appliedFilterLabels.push('🟢 مفتوح الآن');
  if (isClosed) appliedFilterLabels.push('🔴 مغلق حالياً');
  if (minRating) appliedFilterLabels.push(`⭐ تقييم ${minRating}+`);
  if (isBudgetFriendly || sortBy === 'price_asc') appliedFilterLabels.push('💰 اقتصادي / الأقل سعراً');
  if (isLuxury) appliedFilterLabels.push('💎 تجربة فاخرة');
  if (category) appliedFilterLabels.push(`🏷️ ${category}`);
  if (location) appliedFilterLabels.push(`📍 ${location}`);
  if (university) appliedFilterLabels.push(`🎓 جامعة ${university}`);
  if (targetType) appliedFilterLabels.push(`🏠 سكن ${targetType}`);
  if (jobType) appliedFilterLabels.push(`💼 ${jobType}`);
  if (maxPrice) appliedFilterLabels.push(`💵 حتى ${maxPrice} د.أ`);
  if (isVerified) appliedFilterLabels.push('🛡️ موثق');
  if (hasDiscount) appliedFilterLabels.push('🏷️ عروض وخصومات');

  return {
    rawQuery: text,
    cleanTerm: clean || text,
    tokens,
    intent,
    domain: isInformational ? 'none' : domain,
    isSearchOriented,
    isInformational,
    isOpen,
    isClosed,
    minRating,
    maxRating: undefined,
    isHighRating,
    category,
    subCategory,
    minPrice,
    maxPrice,
    isBudgetFriendly,
    isLuxury,
    location,
    university,
    targetType,
    jobType,
    isVerified: isVerified ? true : undefined,
    isVip: isVip ? true : undefined,
    hasDiscount: hasDiscount ? true : undefined,
    sortBy,
    appliedFilterLabels
  };
}

// =========================================================================
// 4. BUSINESS LOGIC MATCHERS
// =========================================================================

export class FilterEngine {
  /**
   * Main entry point to parse queries into FilterParameters
   */
  public static parseQuery(rawQuery: string): FilterParameters {
    return parseNaturalLanguageQuery(rawQuery);
  }

  /**
   * Validates if a business entity matches the filter constraints
   */
  public static matchesBusiness(
    business: Business,
    params: FilterParameters,
    options?: { customHours?: WorkingHours }
  ): BusinessMatchResult {
    const liveStatus = getLiveWorkingStatus(options?.customHours || business.workingHours);
    const matchedCriteria: string[] = [];
    let score = 0;

    // 1. Live Hours Filter
    if (params.isOpen !== undefined && params.isOpen) {
      if (!liveStatus.isOpen) {
        return { matches: false, score: 0, liveStatus, matchedCriteria, rejectionReason: 'المحل مغلق حالياً' };
      }
      matchedCriteria.push('مفتوح الآن');
      score += 25;
    }

    if (params.isClosed !== undefined && params.isClosed) {
      if (liveStatus.isOpen) {
        return { matches: false, score: 0, liveStatus, matchedCriteria, rejectionReason: 'المحل مفتوح حالياً' };
      }
      matchedCriteria.push('مغلق حالياً');
      score += 25;
    }

    // 2. Minimum Rating Filter
    const rating = business.rating || 0;
    if (params.minRating !== undefined) {
      if (rating < params.minRating) {
        return {
          matches: false,
          score: 0,
          liveStatus,
          matchedCriteria,
          rejectionReason: `التقييم (${rating}) أقل من المطلوب (${params.minRating})`
        };
      }
      matchedCriteria.push(`تقييم ${rating} >= ${params.minRating}`);
      score += 20 + rating * 4;
    } else if (rating >= 4.5) {
      score += 15;
    }

    // 3. Category Match
    if (params.category) {
      const bCat = normalizeArabic(business.category || '');
      const pCat = normalizeArabic(params.category);
      if (bCat.includes(pCat) || pCat.includes(bCat)) {
        matchedCriteria.push(`فئة: ${business.category}`);
        score += 30;
      } else if (params.domain === 'business') {
        return { matches: false, score: 0, liveStatus, matchedCriteria, rejectionReason: 'عدم تطابق التصنيف' };
      }
    }

    // 4. Location Match
    if (params.location) {
      const bAddr = normalizeArabic(business.address || '');
      const bDist = normalizeArabic(business.district || '');
      const pLoc = normalizeArabic(params.location);
      if (bAddr.includes(pLoc) || bDist.includes(pLoc)) {
        matchedCriteria.push(`الموقع: ${params.location}`);
        score += 25;
      }
    }

    // 5. Keyword Matching against name and description
    if (params.cleanTerm && params.cleanTerm.length >= 2) {
      const normTerm = normalizeArabic(params.cleanTerm);
      const normName = normalizeArabic(business.name || '');
      const normDesc = normalizeArabic(business.description || '');

      if (normName.includes(normTerm)) {
        score += 50;
        matchedCriteria.push(`تطابق الاسم: ${business.name}`);
      } else if (normDesc.includes(normTerm)) {
        score += 20;
        matchedCriteria.push('تطابق الوصف');
      } else {
        let tokenMatches = 0;
        for (const token of params.tokens) {
          if (normName.includes(token) || normDesc.includes(token)) {
            tokenMatches++;
          }
        }
        if (tokenMatches > 0) {
          score += tokenMatches * 10;
          matchedCriteria.push(`تطابق جزئي (${tokenMatches} كلمات)`);
        } else if (params.tokens.length > 0 && !params.category && !params.isOpen && !params.isClosed) {
          return { matches: false, score: 0, liveStatus, matchedCriteria, rejectionReason: 'لا يوجد تطابق في النص' };
        }
      }
    }

    if (business.isVerified) score += 10;
    if (business.packagePlan === 'vip' || business.packagePlan === 'golden' || business.isVip) score += 10;

    return {
      matches: score > 0,
      score,
      liveStatus,
      matchedCriteria
    };
  }

  /**
   * Validates if a student housing / apartment matches constraints
   */
  public static matchesHousing(
    housing: HousingItem | any,
    params: FilterParameters
  ): HousingMatchResult {
    const matchedCriteria: string[] = [];
    let score = 0;

    // 1. Gender / Demographic Segregation
    if (params.targetType) {
      const hType = housing.housingType || housing.targetType || '';
      const hTitle = housing.title || '';
      const hDesc = housing.description || '';
      const combo = normalizeArabic(`${hType} ${hTitle} ${hDesc}`);

      if (params.targetType === 'طالبات') {
        if (!combo.includes('طالبات') && !combo.includes('بنات') && !combo.includes('صبايا')) {
          return { matches: false, score: 0, matchedCriteria, rejectionReason: 'السكن غير مخصص للطالبات' };
        }
        matchedCriteria.push('مخصص للطالبات');
        score += 35;
      } else if (params.targetType === 'طلاب') {
        if (!combo.includes('طلاب') && !combo.includes('شباب')) {
          return { matches: false, score: 0, matchedCriteria, rejectionReason: 'السكن غير مخصص للطلاب الشباب' };
        }
        matchedCriteria.push('مخصص للطلاب');
        score += 35;
      }
    }

    // 2. University Proximity
    if (params.university) {
      const hUniv = normalizeArabic(housing.university || housing.nearestUniversity || '');
      const hAddress = normalizeArabic(housing.address || housing.location || '');
      const pUniv = normalizeArabic(params.university);

      if (hUniv.includes(pUniv) || hAddress.includes(pUniv)) {
        matchedCriteria.push(`قريب من جامعة ${params.university}`);
        score += 30;
      } else if (params.location && hAddress.includes(normalizeArabic(params.location))) {
        matchedCriteria.push(`الموقع: ${params.location}`);
        score += 20;
      }
    }

    // 3. Maximum Price Boundary
    const price = typeof housing.price === 'number' ? housing.price : parseFloat(housing.price || '0');
    if (params.maxPrice !== undefined && price > 0) {
      if (price > params.maxPrice) {
        return {
          matches: false,
          score: 0,
          matchedCriteria,
          rejectionReason: `الإيجار (${price} د.أ) أعلى من الميزانية (${params.maxPrice} د.أ)`
        };
      }
      matchedCriteria.push(`سعر ${price} <= ${params.maxPrice}`);
      score += 25;
    }

    // 4. Keyword relevance
    if (params.cleanTerm) {
      const term = normalizeArabic(params.cleanTerm);
      const title = normalizeArabic(housing.title || housing.name || '');
      const desc = normalizeArabic(housing.description || '');

      if (title.includes(term)) {
        score += 40;
        matchedCriteria.push('تطابق العنوان');
      } else if (desc.includes(term)) {
        score += 20;
        matchedCriteria.push('تطابق الوصف');
      }
    }

    return {
      matches: score > 0,
      score,
      matchedCriteria
    };
  }

  /**
   * Filter and rank any collection of businesses, housings, or products.
   */
  public static filterBusinesses(
    businesses: Business[],
    params: FilterParameters
  ): { item: Business; score: number; liveStatus: LiveStatus }[] {
    const results: { item: Business; score: number; liveStatus: LiveStatus }[] = [];

    for (const b of businesses) {
      const match = FilterEngine.matchesBusiness(b, params);
      if (match.matches) {
        results.push({ item: b, score: match.score, liveStatus: match.liveStatus });
      }
    }

    // Apply Sorting
    results.sort((a, b) => {
      if (params.sortBy === 'rating') {
        const diff = (b.item.rating || 0) - (a.item.rating || 0);
        if (diff !== 0) return diff;
      }
      if (params.sortBy === 'reviews') {
        const diff = (b.item.reviewCount || 0) - (a.item.reviewCount || 0);
        if (diff !== 0) return diff;
      }
      return b.score - a.score;
    });

    if (params.limit && params.limit > 0) {
      return results.slice(0, params.limit);
    }
    return results;
  }
}
