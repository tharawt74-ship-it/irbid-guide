export interface PresetImage {
  name: string;
  url: string;
}

export interface CategoryTheme {
  title: string;
  subtitle: string;
  addItemLabel: string;
  addItemPlaceholder: string;
  categoryLabel: string;
  categoryPlaceholder: string;
  presetCategories: string[];
  presetImages: PresetImage[];
  priceLabel: string;
  pricePlaceholder: string;
  prepTimeLabel: string;
  prepTimeUnit: string;
  prepTimePlaceholder: string;
  prepTimeHelper: string;
  versionTypeSizesLabel: string;
  versionTypeAddonsLabel: string;
  sizesTitle: string;
  sizesSub: string;
  sizesNameLabel: string;
  sizesNamePlaceholder: string;
  presetSizes: string[];
  addonsTitle: string;
  addonsSub: string;
  addonsNameLabel: string;
  addonsNamePlaceholder: string;
  presetAddons: string[];
  badges: {
    popular: string;
    new: string;
    spicyOrFeatured: string;
    vegetarianOrPromo: string;
  };
  buttonAddText: string;
  buttonAddShort: string;
  whatsappOrderLabel: string;
  cartIconType: 'food' | 'home' | 'medical' | 'retail' | 'edu' | 'wrench' | 'party' | 'car';
  // Studio dynamic aliases
  studioTitle?: string;
  studioSubtitle?: string;
  saveItemLabel?: string;
  timeLabel?: string;
  timePlaceholder?: string;
  timeHelper?: string;
  timePresets?: number[];
  sizesSectionTitle?: string;
  addonsSectionTitle?: string;
  sizePresets?: string[];
  addonPresets?: string[];
  sizeNameLabel?: string;
  addonNameLabel?: string;
  sizeNamePlaceholder?: string;
  addonNamePlaceholder?: string;
  // Backward compatibility fields
  optionsLabel: string;
  optionsSub: string;
  optionsPlaceholder: string;
}

function normalizeTheme(theme: CategoryTheme): CategoryTheme {
  return {
    ...theme,
    studioTitle: theme.studioTitle || theme.addItemLabel.replace(/ \*$/, ''),
    studioSubtitle: theme.studioSubtitle || theme.subtitle,
    saveItemLabel: theme.saveItemLabel || 'حفظ الصنف للكتالوج',
    timeLabel: theme.timeLabel || theme.prepTimeLabel,
    timePlaceholder: theme.timePlaceholder || theme.prepTimePlaceholder,
    timeHelper: theme.timeHelper || theme.prepTimeHelper,
    timePresets: theme.timePresets || [10, 15, 20, 30, 45, 60],
    sizesSectionTitle: theme.sizesSectionTitle || theme.sizesTitle,
    addonsSectionTitle: theme.addonsSectionTitle || theme.addonsTitle,
    sizePresets: theme.sizePresets || theme.presetSizes,
    addonPresets: theme.addonPresets || theme.presetAddons,
    sizeNameLabel: theme.sizeNameLabel || theme.sizesNameLabel,
    addonNameLabel: theme.addonNameLabel || theme.addonsNameLabel,
    sizeNamePlaceholder: theme.sizeNamePlaceholder || theme.sizesNamePlaceholder,
    addonNamePlaceholder: theme.addonNamePlaceholder || theme.addonsNamePlaceholder,
  };
}

// Fallback high-quality images
export const PRESET_IMAGES: PresetImage[] = [
  { name: 'شاورما عربية', url: 'https://images.unsplash.com/photo-1644704170910-a0cdf183649b?auto=format&fit=crop&w=600&q=80' },
  { name: 'برجر كلاسيك', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80' },
  { name: 'بيتزا إيطالية', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80' },
  { name: 'قهوة اسبريسو', url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80' },
  { name: 'شقة سكنية فخمة', url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80' },
  { name: 'جلسة صالون تجميل', url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80' },
  { name: 'عيادة مجهزة', url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=600&q=80' },
  { name: 'منتجات موضة وملابس', url: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80' },
];

export function getCategoryTheme(
  businessCategory: string,
  businessSubcategory?: string,
  businessName?: string,
  businessSpecialty?: string
): CategoryTheme {
  return normalizeTheme(resolveCategoryTheme(businessCategory, businessSubcategory, businessName, businessSpecialty));
}

function resolveCategoryTheme(
  businessCategory: string,
  businessSubcategory?: string,
  businessName?: string,
  businessSpecialty?: string
): CategoryTheme {
  const cat = (businessCategory || '').toLowerCase();
  const sub = (businessSubcategory || '').toLowerCase();
  const name = (businessName || '').toLowerCase();
  const spec = (businessSpecialty || '').toLowerCase();
  const text = `${cat} ${sub} ${name} ${spec}`;

  // =========================================================================
  // 0. SPECIALIZED & PROFESSIONAL SERVICES (HIGH PRIORITY SUB-CATEGORIES)
  // =========================================================================

  // 0.0 Tutoring, University Teaching & Academic Subjects (مدرسو ومدرسات تدريس جامعي ومواد طبية وهندسية ودروس خصوصية)
  if (
    sub.includes('تدريس') ||
    sub.includes('مدرس') ||
    sub.includes('تدريس جامعي') ||
    sub.includes('مواد طبية وهندسية') ||
    sub.includes('مدرسو ومدرسات') ||
    cat.includes('تدريس') ||
    cat.includes('مدرس') ||
    cat.includes('تدريس جامعي') ||
    cat.includes('مواد طبية وهندسية') ||
    cat.includes('مدرسو ومدرسات') ||
    text.includes('تدريس جامعي') ||
    text.includes('مواد طبية وهندسية') ||
    text.includes('مدرسو ومدرسات')
  ) {
    return {
      title: 'دليل المساقات والمواد الجامعية والتدريس التخصصي',
      subtitle: 'استعرض المواد الجامعية، المساقات الهندسية والطبية، ومواعيد الحصص والمحاضرات.',
      addItemLabel: 'اسم المساق أو المادة الجامعية التدريسية *',
      addItemPlaceholder: 'مثال: مساق كيمياء عامة، فيزياء طبية، تفاضل وتكامل هندسي، إحصاء حيوي',
      categoryLabel: 'الكلية أو التخصص الأكاديمي *',
      categoryPlaceholder: 'مثال: مواد طبية، مواد هندسية، علوم أساسية، لغات ومساقات عامة',
      presetCategories: [
        'مساقات ومواد كليات الهندسة',
        'مساقات ومواد الكليات الطبية والصحية',
        'مواد العلوم الأساسية والرياضيات',
        'متابعة مشاريع التخرج والأبحاث',
        'مراجعات امتحانات مكثفة',
        'حصص تقوية فردية وجماعية'
      ],
      presetImages: [
        { name: 'محاضرة وتدريس جامعي', url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80' },
        { name: 'كتب دراسية ومساقات', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80' },
        { name: 'دراسة وأبحاث جامعية', url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80' },
        { name: 'جلسة تدريس وشرح علمي', url: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'أجرة الساعة أو المادة التدريسية (د.أ) *',
      pricePlaceholder: 'مثال: 20.00',
      prepTimeLabel: 'مدة المحاضرة أو الجلسة التدريسية (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 60)',
      prepTimePlaceholder: 'مثال: 60',
      prepTimeHelper: 'توضح للطالب مدة كل جلسة أو محاضرة تدريسية.',
      versionTypeSizesLabel: 'نظام الساعات والباقات',
      versionTypeAddonsLabel: 'ملخصات وملازم جامعية',
      sizesTitle: 'إضافة باقات الساعات والمتابعة الفصلية',
      sizesSub: 'تتيح اختيار نظام الحصص مثل ساعة فردية، باقة 10 ساعات، كورس مساق كامل.',
      sizesNameLabel: 'نظام الحصص أو باقة المساق',
      sizesNamePlaceholder: 'مثال: ساعة تدريس فردية، باقة 5 ساعات، كورس مادة كامل، مراجعة فاينل',
      presetSizes: [
        'ساعة تدريس فردية',
        'باقة 5 ساعات مكثفة',
        'باقة 10 ساعات فصلية',
        'كورس المساق كاملاً'
      ],
      addonsTitle: 'إضافة ملخصات وملازم مساندة',
      addonsSub: 'ملخصات مساندة مثل ملخص الشباتر، حلول أسئلة سنوات سابقة.',
      addonsNameLabel: 'اسم الملخص أو الملحق الأكاديمي',
      addonsNamePlaceholder: 'مثال: دوسية حلول سنوات سابقة، ملخص القوانين والشباتر، مراجعة مكثفة',
      presetAddons: [
        'دوسية تلخيص شامل للمساق',
        'حلول وتجميعات امتحانات سابقة',
        'بنك أسئلة وتدريبات عملية',
        'جلسة مراجعة ليلة الامتحان'
      ],
      badges: {
        popular: 'المساق الأكثر طلباً',
        new: 'شرح أحدث الخطط الدراسية',
        spicyOrFeatured: 'خبرة تدريسية وتفوق أكاديمي',
        vegetarianOrPromo: 'جلسة تمهيدية مجانية'
      },
      buttonAddText: 'حجز موعد مساق/جلسة تدريس',
      buttonAddShort: 'حجز جلسة',
      whatsappOrderLabel: 'إرسال استفسار أو حجز حصة تدريس جامعي عبر الواتساب',
      cartIconType: 'edu',
      optionsLabel: 'مكان وطريقة التدريس',
      optionsSub: 'توضح إمكانية التدريس وجاهياً أو عبر الزووم أونلاين.',
      optionsPlaceholder: 'مثال: وجاهي بالمنزل، أو أونلاين عبر المنصات'
    };
  }

  // 0.01 Medicine & Cosmetic Factories & Supplies (مصانع أدوية ومستلزمات طبية وتجميلية)
  if (
    sub.includes('مصانع أدوية') ||
    sub.includes('مستلزمات طبية وتجميلية') ||
    cat.includes('مصانع أدوية') ||
    cat.includes('مستلزمات طبية وتجميلية') ||
    (text.includes('مصانع') && text.includes('أدوية')) ||
    (text.includes('مصنع') && text.includes('أدوية')) ||
    text.includes('مستلزمات طبية وتجميلية')
  ) {
    return {
      title: 'دليل المنتجات الدوائية والمستلزمات الطبية والتجميلية المصنعة',
      subtitle: 'استعرض خطوط الإنتاج، العبوات الدوائية، المستلزمات الطبية المعتمدة والمستحضرات المصنعة.',
      addItemLabel: 'اسم الصنف أو المنتج الدوائي أو المستحضر المصنع *',
      addItemPlaceholder: 'مثال: محلول معقم طبي، عبوة مستحضر تجميلي مرخص، مستلزمات ضماد طبية، كبسولات مكمل مصنعة',
      categoryLabel: 'خط الإنتاج أو قسم التصنيع *',
      categoryPlaceholder: 'مثال: خط المحاليل الطبية، خط مستحضرات التجميل، خط المستلزمات الطبية، خط التعبئة والتغليف',
      presetCategories: [
        'خطوط الإنتاج الدوائي والصيدلاني',
        'المستلزمات والأجهزة الطبية المصنعة',
        'مستحضرات التجميل والعناية المرخصة',
        'المعقمات والمطهرات الطبية والمخبرية',
        'عبوات التعبئة والتغليف الصناعي',
        'طلبات التوريد وتجارة الجملة'
      ],
      presetImages: [
        { name: 'خط إنتاج وتعبئة دوائي', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=80' },
        { name: 'عبوات ومستحضرات طبية مصنعة', url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=600&q=80' },
        { name: 'مختبر ضبط جودة وتصنيع', url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80' },
        { name: 'مستودعات شحن وتوريد طبي', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر الوحدة أو كرتونة التوريد (د.أ) *',
      pricePlaceholder: 'مثال: 5.00',
      prepTimeLabel: 'مدة التجهيز والتوريد المتوقعة (اختياري)',
      prepTimeUnit: 'بالساعات (مثال: 24)',
      prepTimePlaceholder: 'مثال: 24',
      prepTimeHelper: 'توضح للمشتري أو الوكيل مدة تجهيز طلبية التوريد والإنتاج.',
      versionTypeSizesLabel: 'أحجام العبوات والتعبئة',
      versionTypeAddonsLabel: 'خيارات التغليف والشحن',
      sizesTitle: 'إضافة أحجام العبوات وسعات التعبئة',
      sizesSub: 'تتيح للعميل اختيار سعة العبوة أو كرتونة التوريد.',
      sizesNameLabel: 'حجم العبوة أو سعة الكرتونة',
      sizesNamePlaceholder: 'مثال: عبوة 100 مل، كرتونة 50 قطعة، برميل تعبئة 20 لتر',
      presetSizes: [
        'عبوة 100 مل',
        'عبوة 250 مل',
        'كرتونة توريد 24 قطعة',
        'كرتونة توريد 48 قطعة'
      ],
      addonsTitle: 'إضافة خدمات الشحن والتغليف المرافقة',
      addonsSub: 'خيارات مرافقة للشحن مثل تغليف خاص، شحن مبرد معقم.',
      addonsNameLabel: 'اسم الخدمة أو الخيار الإضافي',
      addonsNamePlaceholder: 'مثال: شحن مبرد مخصص، تغليف تصدير مقاوم للكسر',
      presetAddons: [
        'شحن وتوصيل مبرد معقم',
        'تغليف تصدير مقوى',
        'شهادة مطابقة فحص مخبري'
      ],
      badges: {
        popular: 'المنتج الأكثر طلباً',
        new: 'خط إنتاج جديد',
        spicyOrFeatured: 'معتمد ومطابق للمواصفات',
        vegetarianOrPromo: 'سعر جملة خاص'
      },
      buttonAddText: 'طلب توريد أو شراء منتج',
      buttonAddShort: 'طلب توريد',
      whatsappOrderLabel: 'إرسال طلب توريد صناعي أو شراء مستحضرات عبر الواتساب',
      cartIconType: 'retail',
      optionsLabel: 'خيارات ومواصفات المنتج',
      optionsSub: 'توضح شروط التوريد والمطابقة للمواصفات.',
      optionsPlaceholder: 'مثال: مطابق لمواصفات الغذاء والدواء، كفالة جودة'
    };
  }

  // 0.02 Perfumes & Cosmetics (عطور ومستحضرات تجميل)
  if (
    sub.includes('عطور ومستحضرات تجميل') ||
    cat.includes('عطور ومستحضرات تجميل') ||
    text.includes('عطور ومستحضرات تجميل') ||
    (sub.includes('عطور') && !sub.includes('معطرات جو')) ||
    (cat.includes('عطور') && !cat.includes('سيارات'))
  ) {
    return {
      title: 'كتالوج العطور الفاخرة ومستحضرات التجميل',
      subtitle: 'استعرض العطور الفرنسية والشرقية، البخور ومستحضرات التجميل الأصلية.',
      addItemLabel: 'اسم العطر أو مستحضر التجميل *',
      addItemPlaceholder: 'مثال: عطر عود ملكي فاخر، ماء عطر فرنسي 100 مل، سيروم نضارة بشرة',
      categoryLabel: 'قسم العطور والتجميل *',
      categoryPlaceholder: 'مثال: عطور شرقية، عطور فرنسية، مستحضرات مكياج، بوكسات هدايا',
      presetCategories: [
        'عطور شرقية وبخور وزيوت',
        'عطور فرنسية وعالمية',
        'مستحضرات تجميل ومكياج',
        'عناية بالبشرة والشعر',
        'معطرات جو ومفارش',
        'بوكسات هدايا وتوزيعات'
      ],
      presetImages: [
        { name: 'عطر فرنسي فاخر', url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80' },
        { name: 'عطور شرقية وبخور', url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=600&q=80' },
        { name: 'مستحضرات تجميل ومكياج', url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80' },
        { name: 'بوكس هدايا عطور', url: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر العطر أو المستحضر (د.أ) *',
      pricePlaceholder: 'مثال: 25.00',
      prepTimeLabel: 'مدة التجهيز أو التغليف (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 15)',
      prepTimePlaceholder: 'مثال: 15',
      prepTimeHelper: 'توضح للزبون الوقت المطلوب لتجهيز العطر أو تغليف الهدية.',
      versionTypeSizesLabel: 'سعة وحجم الزجاجة',
      versionTypeAddonsLabel: 'تغليف وهدايا مرفقة',
      sizesTitle: 'إضافة سعة وحجم زجاجة العطر',
      sizesSub: 'تتيح للزبون اختيار سعة العطر مثل: 50 مل، 100 مل.',
      sizesNameLabel: 'سعة الزجاجة أو الحجم',
      sizesNamePlaceholder: 'مثال: سعة 50 مل، سعة 100 مل، تستر 10 مل',
      presetSizes: [
        'سعة 50 مل',
        'سعة 100 مل',
        'سعة 150 مل',
        'تستر 10 مل'
      ],
      addonsTitle: 'إضافة تغليف وإضافات هدايا',
      addonsSub: 'خيارات تضاف مع العطر مثل كيس هدايا فاخر أو كرت إهداء.',
      addonsNameLabel: 'اسم الإضافة أو التغليف',
      addonsNamePlaceholder: 'مثال: تغليف هدايا ملكي، كيس مخملي فاخر، كرت إهداء خاص',
      presetAddons: [
        'تغليف هدايا ملكي فاخر',
        'كيس مخملي مخصص للعطور',
        'كرت إهداء وكتابة عبارة خاصة',
        'عينة عطر مجانية إضافية'
      ],
      badges: {
        popular: 'العطر الأكثر مبيعاً',
        new: 'إصدار حديث وحصري',
        spicyOrFeatured: 'ثبات وفوحان عالي',
        vegetarianOrPromo: 'عرض وخصم خاص'
      },
      buttonAddText: 'إضافة لسلة الشراء',
      buttonAddShort: 'إضافة للسلة',
      whatsappOrderLabel: 'إرسال طلب شراء العطور ومستحضرات التجميل عبر الواتساب',
      cartIconType: 'retail',
      optionsLabel: 'نوع وتركيز العطر',
      optionsSub: 'توضح للزبون ثبات وتركيز العطر.',
      optionsPlaceholder: 'مثال: تركيز أو دو بارفان (Eau de Parfum) ثبات 24 ساعة'
    };
  }

  // 0.1 Banking & Financial Institutions (بنوك ومصارف)
  if (
    sub.includes('بنوك') ||
    sub.includes('مصارف') ||
    text.includes('بنوك ومصارف') ||
    name.includes('بنك') ||
    name.includes('مصرف')
  ) {
    return {
      title: 'دليل الخدمات والحلول المصرفية والتمويلية',
      subtitle: 'استعرض الحسابات البنكية، باقات التمويل الشخصي والسكني، والخدمات المصرفية المعتمدة.',
      addItemLabel: 'اسم الخدمة المصرفية أو باقة التمويل *',
      addItemPlaceholder: 'مثال: فتح حساب جاري أو توفير، تمويل شخصي ميسر، بطاقة ائتمانية بلاتينية، تمويل عقاري',
      categoryLabel: 'نوع الخدمة أو القسم المصرفي *',
      categoryPlaceholder: 'مثال: حسابات مصرفية، تمويل وقروض، بطاقات ائتمانية، حلول استثمارية',
      presetCategories: [
        'حسابات مصرفية وودائع',
        'تمويل شخصي وسكني',
        'بطاقات ائتمانية ودفع إلكتروني',
        'تمويل المشاريع والشركات',
        'حلول مصرفية واستثمارية',
        'شهادات إيداع وادخار'
      ],
      presetImages: [
        { name: 'خدمات مصرفية وحسابات', url: 'https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?auto=format&fit=crop&w=600&q=80' },
        { name: 'تمويل شخصي وعقاري', url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80' },
        { name: 'بطاقات ائتمانية ودفع', url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80' },
        { name: 'استشارات مالية واستثمار', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'الحد الأدنى أو الرسوم المصرفية (د.أ) *',
      pricePlaceholder: 'مثال: 10.00',
      prepTimeLabel: 'مدة الموافقة أو فتح الحساب (اختياري)',
      prepTimeUnit: 'بالأيام أو الساعات',
      prepTimePlaceholder: 'مثال: 24',
      prepTimeHelper: 'توضح للعميل الفترة الزمنية المتوقعة لفتح الحساب أو معالجة طلب التمويل.',
      versionTypeSizesLabel: 'فئة الحساب أو مستوى التمويل',
      versionTypeAddonsLabel: 'خدمات ومزايا مصرفية مرافقة',
      sizesTitle: 'إضافة فئات الحساب أو باقات التمويل',
      sizesSub: 'تتيح للعميل اختيار فئة الحساب مثل حساب فضي أو ذهبي أو بلاتيني.',
      sizesNameLabel: 'فئة الحساب أو التمويل',
      sizesNamePlaceholder: 'مثال: حساب كلاسيكي، حساب ذهبي VIP، تمويل مرن',
      presetSizes: [
        'حساب كلاسيكي أفراد',
        'حساب ذهبي للرواتب',
        'حساب بلاتيني VIP للشركات',
        'تمويل ميسر بأقساط مرنة'
      ],
      addonsTitle: 'إضافة مزايا مصرفية مرافقة',
      addonsSub: 'مزايا إضافية مثل دفتر شيكات، بطاقة ائتمان إضافية، وتطبيق هاتف.',
      addonsNameLabel: 'اسم الميزة أو الخدمة الإضافية',
      addonsNamePlaceholder: 'مثال: إصدار دفتر شيكات فوري، بطاقة تابعة مجانية، تأمين تكافلي',
      presetAddons: [
        'إصدار دفتر شيكات رسمي',
        'بطاقة تابعة مجانية لأحد أفراد الأسرة',
        'تأمين تكافلي على الرصيد',
        'خدمة التنبيهات والرسائل المصرفية الفورية'
      ],
      badges: {
        popular: 'الخدمة الأكثر طلباً',
        new: 'منتج مصرفي جديد',
        spicyOrFeatured: 'موافقة وتمويل سريع',
        vegetarianOrPromo: 'عروض تحويل الراتب'
      },
      buttonAddText: 'طلب الخدمة المصرفية',
      buttonAddShort: 'طلب الخدمة',
      whatsappOrderLabel: 'إرسال طلب استفسار وتقديم على خدمة مصرفية عبر الواتساب',
      cartIconType: 'wrench',
      optionsLabel: 'شروط ووثائق فتح الحساب والتمويل',
      optionsSub: 'توضح الوثائق المطلوبة كإثبات الدخل والهوية الشخصية.',
      optionsPlaceholder: 'مثال: إثبات دخل معتمد، هوية شخصية سارية المفعول'
    };
  }

  // 0.2 Currency Exchange & Money Transfers (محلات صرافة وحوالات مالية)
  if (
    sub.includes('صرافة') ||
    sub.includes('حوالات مالية') ||
    text.includes('صرافة وحوالات') ||
    name.includes('صرافة') ||
    name.includes('للصرافة')
  ) {
    return {
      title: 'دليل خدمات الصرافة والتحويلات المالية الدولية',
      subtitle: 'استعرض خدمات تصريف العملات بأسعار منافسة، التحويلات السريعة، وتعبئة البطاقات الائتمانية.',
      addItemLabel: 'اسم خدمة الصرافة أو الحوالة المالية *',
      addItemPlaceholder: 'مثال: تصريف وتداول العملات الرئيسية، حوالات ويسترن يونيون، شحن بطاقات الدفع المسبق',
      categoryLabel: 'نوع الخدمة أو مسار التحويل *',
      categoryPlaceholder: 'مثال: تصريف عملات، تحويلات دولية سريعة، بطاقات مسبقة الدفع، خدمات نقدية',
      presetCategories: [
        'بيع وشراء العملات الأجنبية',
        'تحويلات مالية دولية صادرة وواردة',
        'شحن بطاقات دفع وتسوق إلكتروني',
        'حوالات داخلية سريعة',
        'شيكات مصرفية وتسويات',
        'خدمات صرافة للشركات والمسافرين'
      ],
      presetImages: [
        { name: 'تصريف وتداول عملات', url: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?auto=format&fit=crop&w=600&q=80' },
        { name: 'حوالات دولية سريعة', url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80' },
        { name: 'شحن بطاقات وتسوق', url: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=600&q=80' },
        { name: 'عد نقود وتدقيق مالي', url: 'https://images.unsplash.com/photo-1565372195458-9de0b320ef04?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'عمولة التحويل أو أدنى قيمة (د.أ) *',
      pricePlaceholder: 'مثال: 3.00',
      prepTimeLabel: 'مدة وصول الحوالة للمستفيد (اختياري)',
      prepTimeUnit: 'بالدقائق أو الساعات',
      prepTimePlaceholder: 'مثال: 15',
      prepTimeHelper: 'توضح للعميل سرعة وصول الحوالة للجهة المستلمة.',
      versionTypeSizesLabel: 'مسار وشبكة التحويل',
      versionTypeAddonsLabel: 'خدمات استلام وإشعار',
      sizesTitle: 'إضافة شبكات ومسارات التحويل',
      sizesSub: 'تتيح للعميل اختيار شبكة التحويل مثل ويسترن يونيون أو موني غرام.',
      sizesNameLabel: 'شبكة أو نمط التحويل',
      sizesNamePlaceholder: 'مثال: ويسترن يونيون، موني غرام، تحويل مصرفي مباشر IBAN',
      presetSizes: [
        'تحويل فوري ويسترن يونيون',
        'تحويل دولي موني غرام',
        'تحويل مصرفي مباشر لحساب بنكي',
        'صرف نقدي مباشر بالمكتب'
      ],
      addonsTitle: 'إضافة خدمات مرافقة للحوالة',
      addonsSub: 'مزايا مثل الإشعار بالرسائل النصية وتوصيل الحوالة للمنزل.',
      addonsNameLabel: 'اسم الخدمة المضافة',
      addonsNamePlaceholder: 'مثال: إشعار استلام SMS، تثبيت سعر الصرف لمدة 24 ساعة',
      presetAddons: [
        'إشعار رسائل SMS فوري عند الاستلام',
        'تثبيت وتأكيد سعر الصرف',
        'إيصال تحويل إلكتروني فوري عبر واتساب',
        'خدمة تسليم المبالغ النقدية الكبيرة بأمان'
      ],
      badges: {
        popular: 'الخدمة الأكثر طلباً',
        new: 'مسار تحويل جديد',
        spicyOrFeatured: 'أفضل أسعار صرف منافسة',
        vegetarianOrPromo: 'عمولة تحويل مخفضة'
      },
      buttonAddText: 'طلب خدمة التحويل أو الصرف',
      buttonAddShort: 'طلب الخدمة',
      whatsappOrderLabel: 'إرسال استفسار عن أسعار الصرف أو تحويل مالي عبر الواتساب',
      cartIconType: 'wrench',
      optionsLabel: 'شروط التحويل والوثائق المطلوبة',
      optionsSub: 'توضح متطلبات الهوية وسقف المبالغ النقدية المسموحة.',
      optionsPlaceholder: 'مثال: إبراز الهوية الشخصية للمحول والمستلم'
    };
  }

  // 0.3 Insurance Companies & Policies (شركات تأمين)
  if (
    sub.includes('تأمين') ||
    text.includes('شركات تأمين') ||
    name.includes('تأمين') ||
    name.includes('للتأمين')
  ) {
    return {
      title: 'دليل برامج ووثائق التأمين والحلول التكافلية',
      subtitle: 'استعرض وثائق التأمين الشامل للمركبات، التأمين الصحي للأفراد والشركات، وتأمين الممتلكات.',
      addItemLabel: 'اسم وثيقة التأمين أو البرنامج التكافلي *',
      addItemPlaceholder: 'مثال: تأمين مركبات شامل، تأمين صحي عائلي، تأمين منازل ضد الحريق، تأمين سفر دولي',
      categoryLabel: 'نوع التأمين أو فئة التغطية *',
      categoryPlaceholder: 'مثال: تأمين مركبات، تأمين صحي، تأمين ممتلكات وحرائق، تأمين سفر',
      presetCategories: [
        'تأمين مركبات شامل وإلزامي',
        'تأمين صحي للأفراد والعائلات',
        'تأمين شركات ومؤسسات',
        'تأمين منازل وممتلكات ومصانع',
        'تأمين سفر دولي معتمد للفيزا',
        'تأمين حياة وحلول تكافلية'
      ],
      presetImages: [
        { name: 'تأمين مركبات شامل', url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=600&q=80' },
        { name: 'تأمين صحي عائلي', url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80' },
        { name: 'تأمين ممتلكات ومنازل', url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80' },
        { name: 'عقود ووثائق تأمين', url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'قسط التأمين السنوي أو الشهري (د.أ) *',
      pricePlaceholder: 'مثال: 180.00',
      prepTimeLabel: 'مدة إصدار الوثيقة وتفعيلها (اختياري)',
      prepTimeUnit: 'بالساعات أو الأيام',
      prepTimePlaceholder: 'مثال: 2',
      prepTimeHelper: 'توضح للمؤمن له سرعة إصدار وتفعيل وثيقة التأمين.',
      versionTypeSizesLabel: 'نطاق التغطية وفئة الوثيقة',
      versionTypeAddonsLabel: 'تغطيات وملاحق إضافية',
      sizesTitle: 'إضافة مستويات التغطية التأمينية',
      sizesSub: 'تتيح للعميل اختيار مستوى التغطية مثل تأمين أساسي أو شامل VIP.',
      sizesNameLabel: 'مستوى التغطية التأمينية',
      sizesNamePlaceholder: 'مثال: تغطية إلزامية ضد الغير، شامل فضي، شامل ذهبي VIP بدون نسبة إهلاك',
      presetSizes: [
        'تأمين إلزامي معتمد ضد الغير',
        'تأمين شامل فضي',
        'تأمين شامل ذهبي VIP مع تبديل زجاج',
        'تأمين شامل بلاتيني مع سيارة بديلة'
      ],
      addonsTitle: 'إضافة ملاحق وتغطيات إضافية',
      addonsSub: 'ميزات مرافقة مثل خدمة المساعدة على الطريق والسيارة البديلة.',
      addonsNameLabel: 'اسم التغطية الإضافية',
      addonsNamePlaceholder: 'مثال: خدمة ونش ومساعدة على الطريق 24 ساعة، تغطية الحوادث الشخصية',
      presetAddons: [
        'خدمة الونش والمساعدة على الطريق 24/7',
        'توفير سيارة بديلة أثناء فترة التصليح',
        'تغطية الكوارث الطبيعية والبرد',
        'علاج بالدرجة الأولى وشبكة مستشفيات واسعة'
      ],
      badges: {
        popular: 'البرنامج الأكثر طلباً',
        new: 'باقة تأمينية جديدة',
        spicyOrFeatured: 'تغطية شاملة بدون نسبة تحمل',
        vegetarianOrPromo: 'خصم خاص للسائق المثالي'
      },
      buttonAddText: 'طلب عرض سعر التأمين',
      buttonAddShort: 'طلب وثيقة',
      whatsappOrderLabel: 'إرسال طلب عرض سعر أو إصدار وثيقة تأمين عبر الواتساب',
      cartIconType: 'wrench',
      optionsLabel: 'شروط التغطية والاستثناءات',
      optionsSub: 'توضح شروط التحمل والأعمار المشمولة بالوثيقة.',
      optionsPlaceholder: 'مثال: نسبة تحمل صفرية عند التصليح بوكالة معتمدة'
    };
  }

  // 0.4 Software, Apps & Systems Development (شركات تطوير البرمجيات والتطبيقات والأنظمة)
  if (
    sub.includes('تطوير البرمجيات') ||
    sub.includes('تطبيقات والأنظمة') ||
    (sub.includes('برمجيات') && (sub.includes('تطبيقات') || sub.includes('أنظمة') || sub.includes('تطوير'))) ||
    text.includes('تطوير البرمجيات') ||
    text.includes('برمجة وتطوير') ||
    name.includes('للبرمجيات') ||
    name.includes('سوفت وير')
  ) {
    return {
      title: 'دليل الحلول البرمجية وتطوير التطبيقات والأنظمة المخصصة',
      subtitle: 'استعرض باقات تطوير تطبيقات الهواتف الذكية، أنظمة إدارة المنشآت ERP، والمواقع الإلكترونية المتطورة.',
      addItemLabel: 'اسم الحل البرمجي أو المشروع التطويري *',
      addItemPlaceholder: 'مثال: تطوير تطبيق iOS وأندرويد، نظام إدارة موارد ERP مخصص، متجر إلكتروني متكامل، بوابة دفع إلكتروني',
      categoryLabel: 'نوع التطوير أو التخصص البرمجي *',
      categoryPlaceholder: 'مثال: تطبيقات جوال، أنظمة سحابية وERP، مواقع ومتاجر ويب، واجهات برمجة API',
      presetCategories: [
        'تطوير تطبيقات الجوال (iOS & Android)',
        'أنظمة إدارة الشركات والمؤسسات (ERP & CRM)',
        'مواقع ويب ومنصات وتجارة إلكترونية',
        'تكامل بوابات الدفع والربط البرمجي (API)',
        'صيانة ودعم فني وتطوير مستمر للأنظمة',
        'استشارات تقنية وتصميم بنية برمجية'
      ],
      presetImages: [
        { name: 'برمجة وتطوير تطبيقات', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80' },
        { name: 'أنظمة سحابية وERP', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80' },
        { name: 'واجهات مستخدم وتطبيقات جوال', url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=600&q=80' },
        { name: 'شاشات كود وبرمجة', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'تكلفة الباقة أو المشروع البرمجي (د.أ) *',
      pricePlaceholder: 'مثال: 500.00',
      prepTimeLabel: 'المدة التقديرية لإنجاز المشروع (اختياري)',
      prepTimeUnit: 'بالأيام أو الأسابيع',
      prepTimePlaceholder: 'مثال: 30',
      prepTimeHelper: 'توضح للعميل الفترة الزمنية اللازمة لبرمجة واختبار النظام وتسليمه.',
      versionTypeSizesLabel: 'نطاق المشروع وحجم النظام',
      versionTypeAddonsLabel: 'خدمات برمجية وسحابية إضافية',
      sizesTitle: 'إضافة نطاقات وحجم المشروع البرمجي',
      sizesSub: 'تتيح للعميل الاختيار بين نسخة أولية MVP أو نظام متكامل متعدد المنصات.',
      sizesNameLabel: 'نطاق التطوير البرمجي',
      sizesNamePlaceholder: 'مثال: نموذج أولي MVP، تطبيق هجين، تطبيق أصيل Native كامل',
      presetSizes: [
        'نموذج أولي وتصميم واجهات UI/UX',
        'تطبيق هجين متعدد المنصات Flutter/React Native',
        'نظام سحابي متكامل مع لوحة تحكم إدارية',
        'تطبيق أصيل Native عالي الأداء'
      ],
      addonsTitle: 'إضافة ميزات وخدمات برمجية إضافية',
      addonsSub: 'ميزات مثل الدعم الفني السنوي، استضافة سحابية، ونشر في المتاجر.',
      addonsNameLabel: 'اسم الميزة أو الخدمة التقنية',
      addonsNamePlaceholder: 'مثال: اشتراك دعم فني وصيانة سنة، رفع وتوثيق على متجر App Store',
      presetAddons: [
        'عقد صيانة ودعم فني وتحديثات لمدة سنة',
        'تهيئة الخوادم السحابية وقواعد البيانات AWS/Google Cloud',
        'إدارة ونشر التطبيق على متجري Apple App Store وGoogle Play',
        'ربط بوابات دفع إلكتروني محلية ودولية'
      ],
      badges: {
        popular: 'الحل الأكثر طلباً',
        new: 'تقنية برمجية حديثة',
        spicyOrFeatured: 'كود معياري وأداء فائق',
        vegetarianOrPromo: 'باقة الشركات الناشئة'
      },
      buttonAddText: 'طلب دراسة مشروع برمجي',
      buttonAddShort: 'طلب النظام',
      whatsappOrderLabel: 'إرسال طلب استشارة وتطوير نظام أو تطبيق برمجي عبر الواتساب',
      cartIconType: 'wrench',
      optionsLabel: 'التقنيات ومنصات الاستضافة المعتمدة',
      optionsSub: 'توضح لغات البرمجة والبيئات السحابية المستخدمة في التطوير.',
      optionsPlaceholder: 'مثال: React, Node.js, Flutter, PostgreSQL, Docker'
    };
  }

  // 0.5 AI Solutions, IT & Cybersecurity (شركات حلول الذكاء الاصطناعي وتكنولوجيا المعلومات والأمن السيبراني)
  if (
    sub.includes('ذكاء اصطناعي') ||
    sub.includes('أمن سيبراني') ||
    sub.includes('تكنولوجيا المعلومات') ||
    text.includes('حلول الذكاء الاصطناعي') ||
    text.includes('الأمن السيبراني') ||
    name.includes('أمن سيبراني') ||
    name.includes('ذكاء اصطناعي')
  ) {
    return {
      title: 'دليل حلول الذكاء الاصطناعي وتكنولوجيا المعلومات والأمن السيبراني',
      subtitle: 'استعرض نماذج وحلول الذكاء الاصطناعي، إدارة البنية التحتية والخوادم، واختبار الاختراق والحماية.',
      addItemLabel: 'اسم حل الذكاء الاصطناعي أو الخدمة الأمنية والتقنية *',
      addItemPlaceholder: 'مثال: حل أتمتة وذكاء اصطناعي، اختبار اختراق وتقييم ثغرات، إدارة خوادم سحابية Cloud، حماية شبكات المؤسسات',
      categoryLabel: 'المجال التقني أو التخصص الأمني *',
      categoryPlaceholder: 'مثال: ذكاء اصطناعي وأتمتة، أمن سيبراني واختراق، بنية تحتية وسحابة، شبكات ودعم فني',
      presetCategories: [
        'حلول ونماذج الذكاء الاصطناعي والأتمتة',
        'اختبار الاختراق والتدقيق الأمني السيبراني',
        'إدارة الخوادم والبنية التحتية السحابية Cloud',
        'حماية البيانات والامتثال للسياسات الأمنية',
        'تأمين الشبكات وجدران الحماية Firewall',
        'استشارات أمن معلومات وتخطيط استراتيجي'
      ],
      presetImages: [
        { name: 'ذكاء اصطناعي وأتمتة', url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=600&q=80' },
        { name: 'أمن سيبراني واختبار اختراق', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80' },
        { name: 'خوادم وبنية تحتية سحابية', url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80' },
        { name: 'تحليل بيانات وحماية شبكات', url: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'تكلفة الحل التقني أو الاستشارة الأمنية (د.أ) *',
      pricePlaceholder: 'مثال: 300.00',
      prepTimeLabel: 'مدة التقييم أو التنفيذ الفني (اختياري)',
      prepTimeUnit: 'بالأيام أو الأسابيع',
      prepTimePlaceholder: 'مثال: 14',
      prepTimeHelper: 'توضح للمؤسسة المدة اللازمة لإتمام فحص الثغرات أو دمج حلول الذكاء الاصطناعي.',
      versionTypeSizesLabel: 'نطاق الفحص وحجم البنية التحتية',
      versionTypeAddonsLabel: 'تقارير أمنية ودعم تقني إضافي',
      sizesTitle: 'إضافة نطاقات وحجم التدقيق الأمني',
      sizesSub: 'تتيح اختيار نطاق الفحص مثل فحص تطبيقات الويب أو تدقيق شامل للبنية التحتية.',
      sizesNameLabel: 'نطاق الخدمة التقنية',
      sizesNamePlaceholder: 'مثال: فحص ثغرات خارجي، اختبار اختراق كامل للمؤسسة، تدريب أمني للموظفين',
      presetSizes: [
        'فحص وتقييم ثغرات تطبيقات الويب',
        'اختبار اختراق متقدم للبنية التحتية والشبكات',
        'بناء نموذج ذكاء اصطناعي مخصص وتوليدي',
        'مراقبة أمنية واستجابة للحوادث على مدار الساعة'
      ],
      addonsTitle: 'إضافة خدمات وتقارير أمنية مرافقة',
      addonsSub: 'خدمات مثل تقارير المعالجة والتأهيل لشهادات الآيزو ISO 27001.',
      addonsNameLabel: 'اسم الخدمة أو التقرير الإضافي',
      addonsNamePlaceholder: 'مثال: تقرير تنفيذي وتقني مفصل مع خطوات المعالجة، إعادة الفحص بعد الإغلاق',
      presetAddons: [
        'تقرير فني وتنفيذي شامل مع خطوات المعالجة التفصيلية',
        'إعادة فحص مجاني للثغرات بعد تصحيحها',
        'جلسة توجيهية وإرشادية مع فريق التطوير الداخلي',
        'تأهيل الشركة لمتطلبات شهادات الأمان الدولية'
      ],
      badges: {
        popular: 'الخدمة الأكثر طلباً',
        new: 'حل ذكاء اصطناعي متطور',
        spicyOrFeatured: 'معايير أمان عالمية معتمدة',
        vegetarianOrPromo: 'تقييم أمني مبدئي مجاني'
      },
      buttonAddText: 'طلب استشارة أو حل تقني',
      buttonAddShort: 'طلب الخدمة',
      whatsappOrderLabel: 'إرسال طلب استشارة في الأمن السيبراني أو الذكاء الاصطناعي عبر الواتساب',
      cartIconType: 'wrench',
      optionsLabel: 'معايير الامتثال والأنظمة المدعومة',
      optionsSub: 'توضح الأطر الأمنية والبيئات التقنية كـ OWASP, NIST, ISO.',
      optionsPlaceholder: 'مثال: OWASP Top 10, NIST Framework, ISO 27001'
    };
  }

  // 0.6 Co-working Spaces & Tech Hubs (مساحات العمل المشتركة وحاضنات الأعمال التقنية)
  if (
    sub.includes('مساحات العمل المشتركة') ||
    sub.includes('حاضنات الأعمال') ||
    sub.includes('co-working') ||
    text.includes('مساحات العمل المشتركة') ||
    text.includes('حاضنات الأعمال') ||
    text.includes('co-working') ||
    name.includes('مساحة عمل') ||
    name.includes('work space')
  ) {
    return {
      title: 'دليل باقات مساحات العمل المشتركة والمكاتب وقاعات الاجتماعات',
      subtitle: 'استعرض اشتراكات المكاتب الخاصة والمشتركة، حجز قاعات التدريب والاجتماعات المجهزة بالكامل.',
      addItemLabel: 'اسم مساحة العمل أو باقة المكتب أو القاعة *',
      addItemPlaceholder: 'مثال: مكتب خاص شهري لشخصين، اشتراك مساحة مشتركة أسبوعي، قاعة اجتماعات مجهزة بالساعة، مكتب افتراضي',
      categoryLabel: 'نوع المساحة أو باقة العمل *',
      categoryPlaceholder: 'مثال: مكاتب خاصة، مساحات مشتركة Hot Desk، قاعات اجتماعات، مكاتب افتراضية',
      presetCategories: [
        'مكاتب خاصة مغلقة للفرق والشركات',
        'مساحات عمل مكتبية مشتركة (Hot Desks)',
        'قاعات اجتماعات وورش عمل مجهزة بشاشات',
        'عناوين ومكاتب افتراضية واستقبال بريد',
        'باقات اشتراك يومية وأسبوعية وشهرية',
        'استضافة فعاليات تقنية ومجتمعية'
      ],
      presetImages: [
        { name: 'مساحات عمل مشتركة ومكاتب', url: 'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=600&q=80' },
        { name: 'قاعات اجتماعات مجهزة', url: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=600&q=80' },
        { name: 'مكاتب خاصة مغلقة', url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=600&q=80' },
        { name: 'بيئة عمل تقنية وإبداعية', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'أجرة المساحة أو الاشتراك (د.أ) *',
      pricePlaceholder: 'مثال: 50.00',
      prepTimeLabel: 'مدة الحجز أو فترة الاشتراك (اختياري)',
      prepTimeUnit: 'بالساعات أو الأيام',
      prepTimePlaceholder: 'مثال: 30',
      prepTimeHelper: 'توضح للمستأجر مدة حجز القاعة أو فترة سريان الاشتراك الشهري.',
      versionTypeSizesLabel: 'فترة وفئة الحجز أو السعة',
      versionTypeAddonsLabel: 'خدمات ومرافق مرافقة',
      sizesTitle: 'إضافة فترات وسعات المساحة',
      sizesSub: 'تتيح للعميل الاختيار بين حجز يومي أو أسبوعي أو شهري.',
      sizesNameLabel: 'فترة الحجز أو سعة المكتب',
      sizesNamePlaceholder: 'مثال: حجز يومي Pass، اشتراك شهري مخصص، قاعة 8 أشخاص',
      presetSizes: [
        'تصريح يومي حر (Day Pass)',
        'اشتراك شهري مساحة مشتركة مرنة',
        'مكتب خاص مجهز لفريق عمل',
        'حجز قاعة اجتماعات بالساعة'
      ],
      addonsTitle: 'إضافة خدمات ومرافق مرافقة',
      addonsSub: 'ميزات مثل طباعة مستندات، مشروبات قهوة غير محدودة، ومواقف سيارات.',
      addonsNameLabel: 'اسم الخدمة المضافة',
      addonsNamePlaceholder: 'مثال: رصيد طباعة وتصوير مستندات، خزانة أمانات Locker شخصية',
      presetAddons: [
        'إنترنت فايبر فائق السرعة مخصص للأعمال',
        'مشروبات وقهوة غير محدودة طوال اليوم',
        'خزانة أمانات شخصية شهرية Locker',
        'استقبال وتسليم المراسلات والبريد الرسمي'
      ],
      badges: {
        popular: 'الباقة الأكثر طلباً',
        new: 'مساحة عمل حديثة',
        spicyOrFeatured: 'بيئة هادئة وإنترنت فايبر سريع',
        vegetarianOrPromo: 'خصم خاص للطلاب ورواد الأعمال'
      },
      buttonAddText: 'طلب حجز مساحة عمل أو مكتب',
      buttonAddShort: 'حجز مساحة',
      whatsappOrderLabel: 'إرسال طلب حجز مكتب أو مساحة عمل مشتركة عبر الواتساب',
      cartIconType: 'wrench',
      optionsLabel: 'ساعات الدوام ومرافق المكان',
      optionsSub: 'توضح إمكانية الدخول 24/7 والمرافق الخدمية المتاحة.',
      optionsPlaceholder: 'مثال: إمكانية الدخول 24/7 للمشتركين الشهريين، كراج خاص'
    };
  }

  // 0.7 Customer Service & Call Centers & BPO (شركات ومراكز خدمة العملاء والتعهيد)
  if (
    sub.includes('خدمة العملاء والتعهيد') ||
    sub.includes('call centers') ||
    sub.includes('تعهيد') ||
    (sub.includes('خدمة العملاء') && cat.includes('تقنية')) ||
    text.includes('خدمة العملاء والتعهيد') ||
    text.includes('call center') ||
    name.includes('كول سنتر') ||
    name.includes('call center')
  ) {
    return {
      title: 'دليل خدمات مراكز الاتصال وخدمة العملاء والتعهيد',
      subtitle: 'استعرض خدمات إدارة مراكز خدمة العملاء (Call Center)، الدعم الفني عبر الشات، وتعهيد العمليات (BPO).',
      addItemLabel: 'اسم خدمة التعهيد أو باقة مركز الاتصال *',
      addItemPlaceholder: 'مثال: إدارة اتصالات خدمة العملاء الواردة 24/7، دعم فني ومحادثات شات، حملات اتصالات تسويقية صادرة',
      categoryLabel: 'نوع خدمة التعهيد أو مركز الاتصال *',
      categoryPlaceholder: 'مثال: خدمة عملاء واردة، حملات اتصالات صادرة، دعم فني متعدد القنوات، تعهيد عمليات',
      presetCategories: [
        'إدارة اتصالات ومكالمات خدمة العملاء الواردة',
        'حملات الاتصال والمبيعات عبر الهاتف الصادرة',
        'دعم فني عبر الدردشة الحية والبريد الإلكتروني',
        'تعهيد العمليات الإدارية وخدمات الإسناد (BPO)',
        'خدمات الرد الآلي وتوزيع المكالمات التفاعلي IVR',
        'تدريب وتأهيل ممثلي خدمة العملاء'
      ],
      presetImages: [
        { name: 'فريق مركز اتصال ودعم فني', url: 'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?auto=format&fit=crop&w=600&q=80' },
        { name: 'سماعات كول سنتر وخدمة عملاء', url: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=600&q=80' },
        { name: 'إدارة عمليات وتعهيد BPO', url: 'https://images.unsplash.com/photo-1556745757-8d76bdb6984b?auto=format&fit=crop&w=600&q=80' },
        { name: 'دعم محادثات وشات فوري', url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'تكلفة الباقة الشهرية أو الساعة (د.أ) *',
      pricePlaceholder: 'مثال: 250.00',
      prepTimeLabel: 'مدة الإطلاق وتجهيز الفريق (اختياري)',
      prepTimeUnit: 'بالأيام أو الأسابيع',
      prepTimePlaceholder: 'مثال: 7',
      prepTimeHelper: 'توضح للشركة الوقت المطلوب لتدريب الفريق وإطلاق مركز الاتصال.',
      versionTypeSizesLabel: 'حجم الفريق وساعات التغطية',
      versionTypeAddonsLabel: 'أنظمة وتقارير أداء مرافقة',
      sizesTitle: 'إضافة مستويات وساعات التغطية',
      sizesSub: 'تتيح اختيار التغطية مثل ساعات الدوام الرسمي أو تغطية 24/7 كاملة.',
      sizesNameLabel: 'نطاق ساعات التغطية',
      sizesNamePlaceholder: 'مثال: دوام 8 ساعات، دوام مسائي، تغطية شاملة 24/7',
      presetSizes: [
        'تغطية ساعات العمل الرسمية (8 ساعات)',
        'تغطية فترتين صباحية ومسائية (16 ساعة)',
        'تغطية مستمرة على مدار الساعة 24/7',
        'فريق مخصص متعدد اللغات عربي وإنجليزي'
      ],
      addonsTitle: 'إضافة تقارير وأنظمة تقنية مرافقة',
      addonsSub: 'ميزات مثل تسجيل المكالمات، لوحات تحكم حية، وتكامل مع CRM.',
      addonsNameLabel: 'اسم الميزة أو النظام المرفق',
      addonsNamePlaceholder: 'مثال: ربط مباشر مع نظام الـ CRM، تقارير جودة أسبوعية',
      presetAddons: [
        'تسجيل كافة المكالمات وتدقيق الجودة الصوتي',
        'لوحة معلومات ومؤشرات أداء حية (Live Dashboard)',
        'ربط وتكامل مع نظام إدارة علاقات العملاء CRM',
        'استبيانات رضا العملاء الفورية بعد انتهاء المكالمة'
      ],
      badges: {
        popular: 'الباقة الأكثر طلباً',
        new: 'خدمة تعهيد حديثة',
        spicyOrFeatured: 'جاهزية عالية ومعايير أداء عالمية',
        vegetarianOrPromo: 'باقة تجريبية للشركات الناشئة'
      },
      buttonAddText: 'طلب باقة خدمة عملاء وتعهيد',
      buttonAddShort: 'طلب الخدمة',
      whatsappOrderLabel: 'إرسال طلب استشارة وتعهيد خدمة عملاء عبر الواتساب',
      cartIconType: 'wrench',
      optionsLabel: 'قنوات الاتصال واللغات المدعومة',
      optionsSub: 'توضح القنوات كالهاتف، الواتساب، والبريد الإلكتروني.',
      optionsPlaceholder: 'مثال: مكالمات هاتفية، واتساب للأعمال، بريد إلكتروني، شات'
    };
  }

  // 0.8 Furniture Moving & Packaging (شركات نقل أثاث وتغليف)
  if (
    sub.includes('نقل أثاث') ||
    sub.includes('تغليف') ||
    (sub.includes('نقل') && sub.includes('أثاث')) ||
    text.includes('نقل أثاث') ||
    text.includes('نقل عفش') ||
    name.includes('نقل أثاث') ||
    name.includes('لنقل الأثاث') ||
    name.includes('نقل عفش')
  ) {
    return {
      title: 'دليل خدمات نقل الأثاث والفك والتركيب والتغليف الشامل',
      subtitle: 'استعرض خدمات نقل العفش المنزلي والمكتبي، التغليف الآمن، الفك والتركيب بواسطة نجارين، وونش الرفع.',
      addItemLabel: 'اسم خدمة نقل الأثاث أو باقة الترحيل *',
      addItemPlaceholder: 'مثال: نقل أثاث منزل كامل مع فك وتركيب، نقل عفش بالونش الهيدروليكي، تغليف كرتوني كامل للأواني والتحف',
      categoryLabel: 'نوع الخدمة أو مرحلة النقل *',
      categoryPlaceholder: 'مثال: نقل عفش منزلي، فك وتركيب غرف ومطابخ، تغليف وتخزين، ونش رفع هيدروليكي',
      presetCategories: [
        'نقل أثاث منزلي ومكتبي متكامل',
        'فك وتركيب غرف النوم والمطابخ والستائر',
        'تغليف كرتوني وفقاعات وبطانيات حماية',
        'خدمة الونش الهيدروليكي لرفع وتنزيل الأثاث',
        'تخزين أثاث في مستودعات آمنة',
        'نقل بضائع وشحن جزئي داخل وخارج إربد'
      ],
      presetImages: [
        { name: 'شاحنات نقل أثاث مجهزة', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80' },
        { name: 'تغليف وحماية كرتونية للأثاث', url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=600&q=80' },
        { name: 'فك وتركيب غرف ومطابخ', url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80' },
        { name: 'ونش رفع هيدروليكي للأدوار العالية', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'أجرة النقل أو تكلفة الخدمة (د.أ) *',
      pricePlaceholder: 'مثال: 70.00',
      prepTimeLabel: 'المدة المقدرة لعملية النقل (اختياري)',
      prepTimeUnit: 'بالساعات',
      prepTimePlaceholder: 'مثال: 4',
      prepTimeHelper: 'توضح للعميل الوقت المقدر لإنهاء الفك والتحميل والتنزيل والتركيب.',
      versionTypeSizesLabel: 'حجم الحمولة وعدد الغرف',
      versionTypeAddonsLabel: 'مواد ومعدات إضافية',
      sizesTitle: 'إضافة أحجام المنازل والحمولات',
      sizesSub: 'تتيح اختيار سعة النقل مثل شقة صغيرة، فيلا كاملة، أو نقل مكتبي.',
      sizesNameLabel: 'حجم الشحنة أو المنزل',
      sizesNamePlaceholder: 'مثال: شقة غرفتين وصالة، شقة 3 غرف، فيلا دوبلكس كاملة',
      presetSizes: [
        'نقل شقة صغيرة (غرفتين)',
        'نقل شقة عائلية (3 إلى 4 غرف)',
        'نقل فيلا متكاملة مع التغليف والونش',
        'نقل مكاتب وشركات مع أرشيف ومعدات'
      ],
      addonsTitle: 'إضافة خدمات ومعدات مرافقة',
      addonsSub: 'ميزات مثل استخدام الونش، كراتين إضافية، وتغليف التحف الزجاجية.',
      addonsNameLabel: 'اسم الخدمة أو المادة المضافة',
      addonsNamePlaceholder: 'مثال: استخدام الونش الهيدروليكي، كراتين مقواة لتعبئة الأواني',
      presetAddons: [
        'استخدام الونش الهيدروليكي الخارجي للأدوار العالية',
        'توفير صناديق وكراتين مقواة مع لصق تغليف',
        'تغليف خاص للتحف والقطع الزجاجية الحساسة',
        'فك وتركيب مكيفات وشاشات تلفاز وأجهزة كهربائية'
      ],
      badges: {
        popular: 'الخدمة الأكثر طلباً',
        new: 'شاحنات نقل مغلقة حديثة',
        spicyOrFeatured: 'ضمان سلامة الأثاث وعدم الخدش',
        vegetarianOrPromo: 'عرض التغليف الشامل المجاني'
      },
      buttonAddText: 'طلب حجز خدمة نقل عفش',
      buttonAddShort: 'طلب نقل',
      whatsappOrderLabel: 'إرسال طلب معاينة وحجز نقل أثاث عبر الواتساب',
      cartIconType: 'wrench',
      optionsLabel: 'شروط النقل والموقع والارتفاع',
      optionsSub: 'توضح الطابق، توفر مصعد، والمسافة بين الموقعين.',
      optionsPlaceholder: 'مثال: شقة طابق ثالث بدون مصعد، يتطلب ونش هيدروليكي'
    };
  }

  // 0.9 Cleaning, Dry Clean & Carpet Wash (تنظيف ودراي كلين وسجاد)
  if (
    sub.includes('تنظيف ودراي كلين') ||
    sub.includes('دراي كلين وسجاد') ||
    (sub.includes('تنظيف') && (sub.includes('سجاد') || sub.includes('دراي كلين'))) ||
    text.includes('تنظيف ودراي كلين') ||
    text.includes('غسيل سجاد') ||
    name.includes('دراي كلين') ||
    name.includes('غسيل سجاد')
  ) {
    return {
      title: 'دليل خدمات التنظيف والدراي كلين وغسيل السجاد والكنب',
      subtitle: 'استعرض خدمات تنظيف المنازل والفلل بعد التشطيب، غسيل السجاد والكنب بالبخار، ودراي كلين الملابس.',
      addItemLabel: 'اسم خدمة التنظيف أو الغسيل أو الدراي كلين *',
      addItemPlaceholder: 'مثال: تنظيف عميق لشقة أو فيلا، غسيل طقم كنب بالبخار والتجفيف الفوري، غسيل سجادة مع التعقيم، دراي كلين بدل وفساتين',
      categoryLabel: 'نوع التنظيف أو قسم الغسيل *',
      categoryPlaceholder: 'مثال: تنظيف منازل وعمائر، غسيل سجاد وموكيت، تنظيف كنب ومفروشات، دراي كلين ملابس',
      presetCategories: [
        'تنظيف شقق وفلل بعد البناء والتشطيب',
        'غسيل سجاد وموكيت بالبخار والتعقيم',
        'تنظيف وغسيل أطقم الكنب والمفروشات',
        'دراي كلين ملابس وبدل وفساتين سهرة',
        'تنظيف واجهات زجاجية ومكاتب وشركات',
        'خدمة عاملات بنظام اليومية والساعة'
      ],
      presetImages: [
        { name: 'غسيل سجاد وموكيت بالبخار', url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80' },
        { name: 'تنظيف عميق للمنازل والفلل', url: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=600&q=80' },
        { name: 'تنظيف كنب ومفروشات', url: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=600&q=80' },
        { name: 'دراي كلين وكي ملابس وبدل', url: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'تكلفة الخدمة أو المتر المربع (د.أ) *',
      pricePlaceholder: 'مثال: 20.00',
      prepTimeLabel: 'مدة التنظيف أو الغسيل والتسليم (اختياري)',
      prepTimeUnit: 'بالساعات أو الأيام',
      prepTimePlaceholder: 'مثال: 3',
      prepTimeHelper: 'توضح للعميل المدة المقدرة لإنهاء أعمال التنظيف أو استلام السجاد المغسول.',
      versionTypeSizesLabel: 'حجم المساحة أو عدد القطع',
      versionTypeAddonsLabel: 'خدمات تعقيم ومواد خاصة',
      sizesTitle: 'إضافة أحجام المساحات أو أطقم الكنب',
      sizesSub: 'تتيح اختيار مساحة المنزل أو مقاس السجادة أو نوع الكنب.',
      sizesNameLabel: 'المساحة أو نوع القطعة',
      sizesNamePlaceholder: 'مثال: شقة حتى 150 متر، طقم كنب 7 مقاعد، سجادة 3x4 متر',
      presetSizes: [
        'تنظيف شقة حتى 150 متر مربع',
        'تنظيف فيلا أو مساحة واسعة مع تعقيم',
        'غسيل طقم كنب مقعد L-Shape أو 7 مقاعد',
        'غسيل سجادة تركي أو عجمي فاخرة'
      ],
      addonsTitle: 'إضافة خدمات تعقيم وتعطير مرافقة',
      addonsSub: 'ميزات مثل التعقيم بالأوزون، إزالة البقع المستعصية، والتوصيل السريع.',
      addonsNameLabel: 'اسم الميزة أو المادة الإضافية',
      addonsNamePlaceholder: 'مثال: تعقيم مضاد للبكتيريا، تعطير لافندر طويل الأمد',
      presetAddons: [
        'تعقيم عميق بالبخار الحار للقضاء على عث الغبار',
        'معالجة بقع الشاي والقهوة والزيوت المستعصية',
        'تعطير فرنسي طويل الأمد للأقمشة والسجاد',
        'استلام وتسليم مجاني من وإلى باب المنزل'
      ],
      badges: {
        popular: 'الخدمة الأكثر طلباً',
        new: 'تقنية تنظيف بالبخار حديثة',
        spicyOrFeatured: 'مواد تنظيف إيطالية صديقة للبيئة',
        vegetarianOrPromo: 'خصم غسيل السجاد المتعدد'
      },
      buttonAddText: 'طلب حجز خدمة تنظيف/غسيل',
      buttonAddShort: 'طلب تنظيف',
      whatsappOrderLabel: 'إرسال طلب موعد تنظيف منازل أو غسيل سجاد عبر الواتساب',
      cartIconType: 'wrench',
      optionsLabel: 'خيارات المواعيد وموقع الخدمة',
      optionsSub: 'توضح إمكانية التنظيف الفوري داخل موقع العميل أو بالمغسلة.',
      optionsPlaceholder: 'مثال: غسيل وتجفيف فوري داخل المنزل، استلام وتسليم'
    };
  }

  // 0.10 Home Services: Electrical, Plumbing, Carpentry (خدمات منزلية - كهرباء، سباكة، نجار)
  if (
    sub.includes('خدمات منزلية') ||
    (sub.includes('كهرباء') && (sub.includes('سباكة') || sub.includes('نجار'))) ||
    (sub.includes('سباكة') && sub.includes('نجار')) ||
    text.includes('خدمات منزلية (كهرباء') ||
    text.includes('كهرباء وسباكة')
  ) {
    return {
      title: 'دليل خدمات الصيانة المنزلية والكهرباء والسباكة والنجارة',
      subtitle: 'استعرض خدمات التأسيس والصيانة الفورية للكهرباء المنزلية، تمديدات السباكة والصحي، وأعمال النجارة والصيانة.',
      addItemLabel: 'اسم خدمة الصيانة المنزلية أو أعمال الورشة *',
      addItemPlaceholder: 'مثال: فحص وصيانة لوحات الكهرباء والقواطع، تمديد وتصليح سباكة ومضخات، صيانة وفك وتركيب أبواب وخزائن خشبية',
      categoryLabel: 'الحرفة أو تخصص الصيانة المنزلية *',
      categoryPlaceholder: 'مثال: أعمال كهرباء، تمديدات سباكة وصحي، أعمال نجارة وأبواب، صيانة عامة فورية',
      presetCategories: [
        'أعمال كهرباء وتمديدات وإنارة داخلية وخارجية',
        'سباكة وتمديدات صحية ومضخات وفلاتر مياه',
        'نجارة وصيانة أبواب وشبابيك ومطابخ خشبية',
        'كشف تسربات المياه ومعالجة الأعطال الفورية',
        'صيانة سخانات مياه شمسية وكهربائية (بويلرات)',
        'خدمات صيانة منزلية دورية وطارئة'
      ],
      presetImages: [
        { name: 'أعمال كهرباء وتمديدات منزلية', url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=600&q=80' },
        { name: 'سباكة وتمديدات صحية ومضخات', url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80' },
        { name: 'نجارة وصيانة أبواب ومطابخ', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80' },
        { name: 'أدوات فحص وصيانة فورية', url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'أجرة الفحص أو المعاينة التقريبية (د.أ) *',
      pricePlaceholder: 'مثال: 10.00',
      prepTimeLabel: 'وقت الوصول وإنجاز الصيانة (اختياري)',
      prepTimeUnit: 'بالدقائق أو الساعات',
      prepTimePlaceholder: 'مثال: 45',
      prepTimeHelper: 'توضح للمستفيد وقت وصول الفني والمدة المتوقعة لتنفيذ الإصلاح.',
      versionTypeSizesLabel: 'نطاق وطبيعة العطل أو التركيب',
      versionTypeAddonsLabel: 'قطع غيار وضمان إضافي',
      sizesTitle: 'إضافة نطاق أعمال الصيانة المنزلية',
      sizesSub: 'تتيح للعميل تحديد حجم العمل كفحص أولي أو تصليح شامل.',
      sizesNameLabel: 'نطاق العمل المطلوب',
      sizesNamePlaceholder: 'مثال: فحص ومعاينة عطل، صيانة وتمديد خط، صيانة شاملة مع قطع',
      presetSizes: [
        'كشف ومعاينة عطل أولي',
        'صيانة فورية لعطل محدد',
        'تأسيس وتمديد خطوط ونقاط جديدة',
        'خدمة طوارئ وصيانة ليلية سريعة'
      ],
      addonsTitle: 'إضافة قطع غيار وضمانات',
      addonsSub: 'ميزات مرافقة مثل توفير قطع إيطالية أصلية وكفالة الخدمة.',
      addonsNameLabel: 'اسم القطعة أو الخدمة المرفقة',
      addonsNamePlaceholder: 'مثال: كفالة خطية على الصيانة، توفير مفاتيح وقواطع أصلية',
      presetAddons: [
        'توفير قطع غيار وتمديدات أصلية معتمدة',
        'كفالة وضمان خطي على الإصلاح المنفذ',
        'تنظيف مكان العمل بالكامل بعد الانتهاء',
        'فحص شامل للأمان الكهربائي أو ضغط السباكة'
      ],
      badges: {
        popular: 'الخدمة الأكثر طلباً',
        new: 'حلول صيانة حديثة',
        spicyOrFeatured: 'فنيون محترفون وكفالة معتمدة',
        vegetarianOrPromo: 'كشف مجاني عند تنفيذ الإصلاح'
      },
      buttonAddText: 'طلب فني صيانة منزلية',
      buttonAddShort: 'طلب فني',
      whatsappOrderLabel: 'طلب فني كهرباء أو سباكة أو نجارة للمنزل عبر الواتساب',
      cartIconType: 'wrench',
      optionsLabel: 'أوقات الزيارة وساعات الطوارئ',
      optionsSub: 'توضح توفر الفنيين طوال أيام الأسبوع والزيارات الليلية الطارئة.',
      optionsPlaceholder: 'مثال: متاح طوال الأسبوع، خدمة طوارئ 24 ساعة'
    };
  }

  // 0.11 Pest Control & Sterilization (مكافحة حشرات وتعقيم)
  if (
    sub.includes('مكافحة حشرات') ||
    sub.includes('تعقيم') ||
    (sub.includes('حشرات') && sub.includes('تعقيم')) ||
    text.includes('مكافحة حشرات') ||
    text.includes('رش مبيدات') ||
    name.includes('مكافحة حشرات') ||
    name.includes('لرش المبيدات')
  ) {
    return {
      title: 'دليل خدمات مكافحة الحشرات والقوارض والتعقيم المعتمد',
      subtitle: 'استعرض خدمات رش المبيدات الآمنة، القضاء على بق الفراش والصراصير والقوارض، والتعقيم الشامل مع الكفالة.',
      addItemLabel: 'اسم خدمة الرش والمكافحة أو باقة التعقيم *',
      addItemPlaceholder: 'مثال: رش مبيدات حشرية للمنازل بدون مغادرة، مكافحة بق الفراش مع الكفالة، مكافحة القوارض والجرذان، تعقيم فيروسات شامل',
      categoryLabel: 'نوع الآفة أو قسم المكافحة والتعقيم *',
      categoryPlaceholder: 'مثال: مكافحة صراصير وحشرات زاحفة، بق الفراش، قوارض وفئران، تعقيم منازل ومنشآت',
      presetCategories: [
        'مكافحة الصراصير والنمل والحشرات الزاحفة',
        'مكافحة بق الفراش بحقن البخار والمبيدات المعتمدة',
        'مكافحة القوارض والفئران والجرذان بالطعوم',
        'تعقيم شامل للمنازل والعيادات والشركات',
        'مكافحة النمل الأبيض وحشرات الأخشاب (الأرضة)',
        'عقود صيانة دورية للمطاعم والمستودعات'
      ],
      presetImages: [
        { name: 'رش مبيدات ومكافحة حشرات', url: 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?auto=format&fit=crop&w=600&q=80' },
        { name: 'مكافحة قوارض وفئران آمنة', url: 'https://images.unsplash.com/photo-1584744982491-665216d95f8b?auto=format&fit=crop&w=600&q=80' },
        { name: 'تعقيم منازل ومنشآت بالرذاذ', url: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=600&q=80' },
        { name: 'معدات رش وتعقيم متطورة', url: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'أجرة الرش أو تكلفة الزيارة (د.أ) *',
      pricePlaceholder: 'مثال: 25.00',
      prepTimeLabel: 'مدة الجلسة أو فترة التهوية (اختياري)',
      prepTimeUnit: 'بالساعات (مثال: 2)',
      prepTimePlaceholder: 'مثال: 2',
      prepTimeHelper: 'توضح للعميل الوقت المستغرق للرش وفترة الأمان بعد المعالجة.',
      versionTypeSizesLabel: 'مساحة العقار ونوع المنشأة',
      versionTypeAddonsLabel: 'خدمات وقائية وكفالة إضافية',
      sizesTitle: 'إضافة أحجام العقارات والمساحات',
      sizesSub: 'تتيح اختيار مساحة الشقة أو المستودع ونوع المبيدات المطلوبة.',
      sizesNameLabel: 'مساحة العقار أو نوع الباقة',
      sizesNamePlaceholder: 'مثال: شقة حتى 120 متر، فيلا مستقلة مع حديقة، مطعم أو مستودع',
      presetSizes: [
        'رش شقة سكنية بدون مغادرة المنزل',
        'رش فيلا كاملة مع الحديقة والأسوار',
        'مكافحة متكاملة لمطعم أو منشأة تجارية',
        'جلسة مكافحة بق الفراش بالحقن والبخار'
      ],
      addonsTitle: 'إضافة خدمات وقائية وكفالات',
      addonsSub: 'ميزات مرافقة مثل وضع طعوم جل أمريكية، ومتابعة دورية مجانية.',
      addonsNameLabel: 'اسم الخدمة الوقائية المضافة',
      addonsNamePlaceholder: 'مثال: جل ألماني للصراصير، طعوم قوارض آمنة مع علب محكمة',
      presetAddons: [
        'كفالة خطية رسمية تمتد من 6 أشهر إلى سنة',
        'توزيع جل ألماني غير مرئي لمكافحة الصراصير بالمطبخ',
        'وضع محطات طعوم آمنة للأطفال والحيوانات الأليفة',
        'زيارة متابعة وتأكيد مجانية بعد أسبوعين'
      ],
      badges: {
        popular: 'الخدمة الأكثر طلباً',
        new: 'مبيدات آمنة بدون رائحة',
        spicyOrFeatured: 'كفالة خطية مضمونة 100%',
        vegetarianOrPromo: 'عرض رش الشقق المتكامل'
      },
      buttonAddText: 'طلب خدمة مكافحة حشرات وتعقيم',
      buttonAddShort: 'طلب مكافحة',
      whatsappOrderLabel: 'إرسال طلب موعد رش ومكافحة حشرات أو تعقيم عبر الواتساب',
      cartIconType: 'wrench',
      optionsLabel: 'معايير الأمان وسلامة المواد',
      optionsSub: 'توضح استخدام مبيدات مرخصة من وزارة الصحة وآمنة على الأسرة.',
      optionsPlaceholder: 'مثال: مبيدات ألمانية وأمريكية مرخصة وآمنة، بدون رائحة'
    };
  }

  // 0.12 Satellite, Security Cameras & Surveillance Systems (ستالايت وكاميرات مراقبة وأنظمة حماية)
  if (
    sub.includes('ستالايت وكاميرات') ||
    sub.includes('كاميرات مراقبة') ||
    sub.includes('أنظمة حماية') ||
    (sub.includes('ستالايت') && sub.includes('حماية')) ||
    text.includes('كاميرات مراقبة') ||
    text.includes('أنظمة حماية') ||
    text.includes('ستالايت وكاميرات') ||
    name.includes('كاميرات مراقبة') ||
    name.includes('أنظمة أمنية')
  ) {
    return {
      title: 'دليل تركيب وصيانة كاميرات المراقبة والأنظمة الأمنية والستالايت',
      subtitle: 'استعرض باقات تركيب كاميرات المراقبة الذكية بدقة عالية، أجهزة الحضور والإنصراف، وصيانة الستالايت المركزي.',
      addItemLabel: 'اسم النظام الأمني أو خدمة المراقبة والستالايت *',
      addItemPlaceholder: 'مثال: باقة تركيب 4 كاميرات مراقبة 5MP مع جهاز DVR وتمديد، جهاز إنذار ضد السرقة، صيانة ستالايت وبرمجة ريسيفر',
      categoryLabel: 'نوع النظام أو قسم التركيبات *',
      categoryPlaceholder: 'مثال: كاميرات مراقبة، أنظمة إنذار وأمان، ستالايت ورسيفر، شبكات وأجهزة بصمة',
      presetCategories: [
        'كاميرات مراقبة سلكية ولاسلكية (IP & Analog)',
        'أنظمة إنذار وحماية ضد السرقة والاقتحام',
        'أجهزة بصمة وتحكم في الدخول (Access Control)',
        'تركيب وصيانة ستالايت فردي ومركزي للعمارات',
        'تمديد وتركيب شبكات الإنترنت والمقويات',
        'عقود صيانة دورية للأنظمة الأمنية والشركات'
      ],
      presetImages: [
        { name: 'تركيب كاميرات مراقبة ذكية', url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=600&q=80' },
        { name: 'أنظمة إنذار وأجهزة بصمة', url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156a?auto=format&fit=crop&w=600&q=80' },
        { name: 'ستالايت ورسيفر وشبكات', url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80' },
        { name: 'غرفة مراقبة وشاشات تحكم', url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'تكلفة النظام أو باقة التركيب (د.أ) *',
      pricePlaceholder: 'مثال: 120.00',
      prepTimeLabel: 'مدة التركيب والبرمجة والتشغيل (اختياري)',
      prepTimeUnit: 'بالساعات (مثال: 4)',
      prepTimePlaceholder: 'مثال: 4',
      prepTimeHelper: 'توضح للعميل المدة المستغرقة لتمديد الكابلات وتثبيت الكاميرات والربط بالهاتف.',
      versionTypeSizesLabel: 'عدد الكاميرات ودقة التصوير',
      versionTypeAddonsLabel: 'ملحقات وتخزين وكفالات',
      sizesTitle: 'إضافة فئات الباقات وعدد الكاميرات',
      sizesSub: 'تتيح اختيار عدد الكاميرات وسعة الهارديسك كباقة 2 كاميرا أو 4 أو 8.',
      sizesNameLabel: 'فئة الباقة أو عدد الكاميرات',
      sizesNamePlaceholder: 'مثال: باقة منزلية 2 كاميرا، باقة محلات 4 كاميرات، باقة مصانع 8 كاميرات IP',
      presetSizes: [
        'باقة 2 كاميرا مراقبة مع مسجل هارد ديسك',
        'باقة 4 كاميرات مراقبة 5MP فائقة الدقة',
        'باقة 8 كاميرات IP ذكية مع رؤية ليلية ملونة',
        'صيانة وبرمجة ستالايت مركزي أو فردي'
      ],
      addonsTitle: 'إضافة ملحقات وسعات تخزين',
      addonsSub: 'ميزات مثل شاشات عرض، كابلات شيلد محمية، وهارديسك مراقبة احترافي.',
      addonsNameLabel: 'اسم الملحق أو الخدمة المضافة',
      addonsNamePlaceholder: 'مثال: ترقية الهارديسك إلى 2TB، تمديد سلكي إضافي مع مواسير حماية',
      presetAddons: [
        'ترقية سعة التخزين إلى هارديسك WD Purple للمراقبة',
        'ربط النظام بالهاتف الذكي للمشاهدة عن بعد عبر الإنترنت',
        'وحدة تغذية كهربائية احتياطية UPS لمنع انقطاع الكاميرات',
        'كفالة خطية معتمدة على الأجهزة والتركيب لمدة سنتين'
      ],
      badges: {
        popular: 'الباقة الأكثر طلباً',
        new: 'كاميرات ملونة بالليل والنهار',
        spicyOrFeatured: 'دقة عالية مع تطبيق هاتف فوري',
        vegetarianOrPromo: 'شامل التمديد والتركيب المجاني'
      },
      buttonAddText: 'طلب عرض سعر أو تركيب نظام أمني',
      buttonAddShort: 'طلب التركيب',
      whatsappOrderLabel: 'إرسال طلب تركيب كاميرات مراقبة أو صيانة ستالايت عبر الواتساب',
      cartIconType: 'wrench',
      optionsLabel: 'ميزات التصوير والربط الذكي',
      optionsSub: 'توضح ميزات كشف الحركة، الإشعارات الذكية، والمايكروفون المدمج.',
      optionsPlaceholder: 'مثال: تصوير ليلي ملون ColorVu، تسجيل صوتي، كشف حركة بالذكاء الاصطناعي'
    };
  }

  // 0.13 Wedding Halls & Event Venues (صالات أفراح ومناسبات)
  if (
    sub.includes('صالات أفراح') ||
    (sub.includes('صالات') && sub.includes('أفراح')) ||
    text.includes('صالات أفراح ومناسبات') ||
    name.includes('قاعة أفراح') ||
    name.includes('صالة أفراح')
  ) {
    return {
      title: 'دليل حجز قاعات الأفراح وصالات المناسبات والاحتفالات',
      subtitle: 'استعرض باقات حجز قاعات الزفاف، التجهيزات الملكية، خدمات الضيافة والبوفيه، وهندسة الصوت والإضاءة.',
      addItemLabel: 'اسم باقة حجز القاعة أو صالة المناسبات *',
      addItemPlaceholder: 'مثال: حجز قاعة ملكية مسائية 250 شخص، باقة حفل خطوبة متكاملة، باقة تخرج وسهرات خاصة',
      categoryLabel: 'فئة القاعة أو نوع المناسبة *',
      categoryPlaceholder: 'مثال: حفلات زفاف وأعراس، حفلات خطوبة، تخرج وتكريم، اجتماعات ومؤتمرات',
      presetCategories: [
        'باقات حفلات الزفاف والأعراس الملكية',
        'حفلات الخطوبة والجاهات العائلية',
        'حفلات التخرج والتكريم السنوية',
        'قاعات اجتماعات ومؤتمرات للشركات',
        'تجهيزات كوشة عرسان وإضاءة وليزر',
        'بوفيهات مفتوحة وخدمات ضيافة متكاملة'
      ],
      presetImages: [
        { name: 'قاعة أفراح ملكية فاخرة', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80' },
        { name: 'كوشة وضيافة عرسان متكاملة', url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=600&q=80' },
        { name: 'إضاءة وليزر وهندسة صوتية', url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&q=80' },
        { name: 'طاولات وبوفيه ضيافة مميز', url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر حجز القاعة أو الباقة (د.أ) *',
      pricePlaceholder: 'مثال: 450.00',
      prepTimeLabel: 'مدة الحفل أو الساعات المتاحة (اختياري)',
      prepTimeUnit: 'بالساعات (مثال: 4)',
      prepTimePlaceholder: 'مثال: 4',
      prepTimeHelper: 'توضح للمستأجر المدة الزمنية المخصصة للحفل واستقبال الضيوف.',
      versionTypeSizesLabel: 'سعة القاعة وفئة الباقة',
      versionTypeAddonsLabel: 'خدمات ضيافة وتجهيزات مرافقة',
      sizesTitle: 'إضافة فئات الحجز وسعات الضيوف',
      sizesSub: 'تتيح اختيار سعة الصالة مثل 150 أو 300 شخص ومستوى التجهيزات.',
      sizesNameLabel: 'سعة الضيوف أو فئة الباقة',
      sizesNamePlaceholder: 'مثال: باقة 150 ضيف، باقة 250 ضيف شامل، باقة VIP ملكية 400 ضيف',
      presetSizes: [
        'باقة فضية أساسية (قاعة وخدمة قهوة)',
        'باقة ذهبية متكاملة مع ضيافة وكوشة',
        'باقة ملكية VIP مع بوفيه عشاء وتصوير',
        'حجز صباحي لحفلات الخطوبة والجاهات'
      ],
      addonsTitle: 'إضافة خدمات ضيافة ومؤثرات',
      addonsSub: 'ميزات مثل شاشات LED عملاقة، شوكولاتة فاخرة، وتصوير طائرة درون.',
      addonsNameLabel: 'اسم الخدمة الإضافية',
      addonsNamePlaceholder: 'مثال: شاشات عرض LED داخلية، تصوير طائرة درون، جناح عرسان مجهز',
      presetAddons: [
        'شاشات عرض LED عملاقة لعرض الصور والذكريات',
        'تصوير فيديو احترافي مع طائرة درون جوية',
        'جناح خاص مستقل للعرسان مع إطلالة خاصة',
        'بوفيه حلويات ومشروبات وعصائر طبيعية فاخرة'
      ],
      badges: {
        popular: 'القاعة الأكثر طلباً',
        new: 'ديكورات وتصميم حديث',
        spicyOrFeatured: 'أحدث أنظمة الإضاءة والصوت',
        vegetarianOrPromo: 'عرض حجز مبكر للمناسبات'
      },
      buttonAddText: 'طلب حجز واستفسار عن القاعة',
      buttonAddShort: 'حجز القاعة',
      whatsappOrderLabel: 'إرسال طلب استفسار وتأكيد حجز صالة الأفراح عبر الواتساب',
      cartIconType: 'party',
      optionsLabel: 'خدمات الكوادر والضيافة المشمولة',
      optionsSub: 'توضح توفر مشرفات ومشرفين وضيافة نسائية ورجالية منفصلة.',
      optionsPlaceholder: 'مثال: صالات منفصلة للرجال والنساء، مشرفات خبيرات'
    };
  }

  // 0.14 Event & Hospitality Equipment Rental (تأجير مستلزمات مناسبات وضيافة)
  if (
    sub.includes('تأجير مستلزمات مناسبات') ||
    sub.includes('مستلزمات مناسبات وضيافة') ||
    (sub.includes('تأجير مستلزمات') && sub.includes('ضيافة')) ||
    text.includes('تأجير مستلزمات مناسبات')
  ) {
    return {
      title: 'دليل تأجير مستلزمات المناسبات ومعدات الضيافة والحفلات',
      subtitle: 'استعرض خدمات تأجير الكراسي الملكية، طاولات الضيافة، الخيام، بوفيهات القهوة، ومعدات الإضاءة والصوتيات.',
      addItemLabel: 'اسم مستلزم المناسبة أو باقة التأجير والضيافة *',
      addItemPlaceholder: 'مثال: تأجير 100 كرسي نابليون فندقي مع تلبيس، طاولات ضيافة مستديرة، طقم صبابين قهوة سادة، خيمة مناسبات مكيفة',
      categoryLabel: 'نوع التجهيز أو قسم المستلزمات *',
      categoryPlaceholder: 'مثال: كراسي وطاولات، خيام ومظلات، ضيافة وصبابين، إضاءة وصوتيات',
      presetCategories: [
        'كراسي فندقية ونابليون وشيفاري ملونة',
        'طاولات ضيافة مستديرة ومستطيلة مع مفارش',
        'خيام وصواوين مناسبات مكيفة ومضاءة',
        'أطقم ضيافة ودلال قهوة وفناجين مع كوادر صبابين',
        'معدات إضاءة ومكبرات صوت وليزر للحفلات',
        'مداخل ورد وتزيين بوابات استقبال'
      ],
      presetImages: [
        { name: 'تأجير كراسي وطاولات مناسبات', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80' },
        { name: 'معدات ضيافة وبوفيهات قهوة', url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=600&q=80' },
        { name: 'خيام ومظلات مناسبات خارجية', url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=600&q=80' },
        { name: 'إضاءة وصوتيات وتزيين حفلات', url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'أجرة التأجير لليوم أو للقطعة (د.أ) *',
      pricePlaceholder: 'مثال: 50.00',
      prepTimeLabel: 'مدة التجهيز والتوصيل قبل المناسبة (اختياري)',
      prepTimeUnit: 'بالساعات (مثال: 2)',
      prepTimePlaceholder: 'مثال: 2',
      prepTimeHelper: 'توضح للعميل موعد وصول وتركيب التجهيزات قبل بدء الحفل.',
      versionTypeSizesLabel: 'الكمية والعدد ونوع التجهيز',
      versionTypeAddonsLabel: 'خدمات عمال ونقل وتنزيل',
      sizesTitle: 'إضافة كميات وأعداد التجهيزات',
      sizesSub: 'تتيح اختيار عدد الكراسي أو حجم الخيمة المطلوبة.',
      sizesNameLabel: 'العدد أو الحجم المطلوب',
      sizesNamePlaceholder: 'مثال: 50 كرسي، 100 كرسي مع طاولات، خيمة 10x20 متر',
      presetSizes: [
        'طقم 50 كرسي فندقي مع طاولات ومفارش',
        'طقم 100 كرسي نابليون فخم مع التلبيس',
        'خيمة مناسبات خارجية متكاملة مع إضاءة وتكييف',
        'باقة ضيافة قهوة عربية متكاملة مع صبابين'
      ],
      addonsTitle: 'إضافة خدمات عمالة وتوصيل',
      addonsSub: 'ميزات مثل التوصيل والتركيب وفريق خدمة صبابين بالزي الرسمي.',
      addonsNameLabel: 'اسم الخدمة الإضافية',
      addonsNamePlaceholder: 'مثال: طاقم صبابين قهوة سادة بالزي التقليدي، توصيل وتنزيل',
      presetAddons: [
        'طاقم صبابين قهوة عربية بالزي التراثي الأنيق',
        'توصيل وتركيب وتنزيل مجاني لموقع المناسبة',
        'مكيفات ومراوح رذاذ مائية للخيام الخارجية',
        'أجهزة تدفئة خارجية للمناسبات الشتوية'
      ],
      badges: {
        popular: 'الباقة الأكثر طلباً',
        new: 'مستلزمات وكراسي جديدة ونظيفة',
        spicyOrFeatured: 'توصيل والتزام تام بالمواعيد',
        vegetarianOrPromo: 'خصم للمناسبات الكبيرة'
      },
      buttonAddText: 'طلب تأجير مستلزمات مناسبات',
      buttonAddShort: 'طلب تأجير',
      whatsappOrderLabel: 'إرسال طلب تأجير كراسي ومستلزمات مناسبات عبر الواتساب',
      cartIconType: 'party',
      optionsLabel: 'ألوان المفارش ومواقع التركيب',
      optionsSub: 'توضح الألوان المتوفرة للمفارش وإمكانية التركيب في أي موقع.',
      optionsPlaceholder: 'مثال: مفارش أبيض أو سكري أو كحلي، تركيب في الحدائق والأسطح'
    };
  }

  // =========================================================================
  // 1. MEDICAL FACILITIES & CLINICS SUB-CATEGORIES
  // =========================================================================

  const isExplicitNonMedicalTheme =
    sub.includes('تدريس') ||
    sub.includes('مدرس') ||
    sub.includes('تدريس جامعي') ||
    sub.includes('مواد طبية وهندسية') ||
    sub.includes('مدرسو ومدرسات') ||
    sub.includes('دروس خصوصية') ||
    sub.includes('معلمات ومعلمون') ||
    sub.includes('معلمو ومعلمات') ||
    sub.includes('مصانع أدوية') ||
    sub.includes('مستلزمات طبية وتجميلية') ||
    sub.includes('عطور ومستحضرات تجميل') ||
    sub.includes('عطور') ||
    sub.includes('شمع وصابون') ||
    sub.includes('طبيعية بيتية') ||
    sub.includes('مستحضرات تجميل') ||
    sub.includes('مراكز تجميل وصالونات') ||
    sub.includes('صالونات') ||
    sub.includes('صالون') ||
    sub.includes('حلاقة') ||
    sub.includes('طباعة ثلاثية الأبعاد') ||
    sub.includes('3d printing') ||
    sub.includes('النمذجة') ||
    cat.includes('تدريس') ||
    cat.includes('مدرس') ||
    cat.includes('معلمات ومعلمون') ||
    cat.includes('مشاريع منزلية') ||
    cat.includes('عناية شخصية وتجميل') ||
    cat.includes('تسوق وتجزئة') ||
    cat.includes('صناعة وإنتاج') ||
    cat.includes('مصانع أدوية') ||
    cat.includes('مستلزمات طبية وتجميلية') ||
    cat.includes('عطور ومستحضرات تجميل') ||
    text.includes('تدريس جامعي') ||
    text.includes('مواد طبية وهندسية') ||
    text.includes('مدرسو ومدرسات') ||
    text.includes('مصانع أدوية') ||
    text.includes('مستلزمات طبية وتجميلية') ||
    text.includes('عطور ومستحضرات تجميل');

  // 1.1 Dental & Orthodontics
  if (
    !isExplicitNonMedicalTheme &&
    (
      text.includes('أسنان') ||
      text.includes('اسنان') ||
      text.includes('تقويم') ||
      text.includes('زراعة أسنان') ||
      text.includes('لثة') ||
      text.includes('dental')
    )
  ) {
    return {
      title: 'قائمة خدمات وإجراءات طب الأسنان',
      subtitle: 'استعرض معالجات الأسنان، جلسات التنظيف، زراعة وتقويم الأسنان واحجز موعدك.',
      addItemLabel: 'اسم الخدمة أو إجراء علاج الأسنان *',
      addItemPlaceholder: 'مثال: تنظيف وتلميع أسنان، زراعة سن مع كفالة، تبييض زووم، علاج عصب وجذور',
      categoryLabel: 'القسم أو التخصص داخل عيادة الأسنان *',
      categoryPlaceholder: 'مثال: تنظيف وتبييض، زراعة وتقويم، علاج الجذور، تركيبات',
      presetCategories: [
        'تنظيف وتبييض الأسنان',
        'زراعة وتقويم الأسنان',
        'علاج العصب والجذور',
        'تركيبات وعدسات تجميلية',
        'حشوات تجميلية وليزرية',
        'طب أسنان الأطفال',
        'كشفية واستشارات تخصصية'
      ],
      presetImages: [
        { name: 'فحص وتنظيف أسنان', url: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&w=600&q=80' },
        { name: 'ابتسامة وتبييض', url: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=600&q=80' },
        { name: 'أدوات عيادة الأسنان', url: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=600&q=80' },
        { name: 'تقويم وزراعة', url: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'تكلفة الإجراء أو المعاينة (د.أ) *',
      pricePlaceholder: 'مثال: 25.00',
      prepTimeLabel: 'مدة جلسة العلاج أو الإجراء المتوقعة (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 30)',
      prepTimePlaceholder: 'مثال: 30',
      prepTimeHelper: 'توضح مدة جلسة الأسنان للمراجع لتنظيم مواعيد العيادة قبل الحجز.',
      versionTypeSizesLabel: 'فئات ونطاق الإجراء',
      versionTypeAddonsLabel: 'ملحقات وخدمات إضافية',
      sizesTitle: 'إضافة خيارات الإجراء أو الفئات',
      sizesSub: 'تتيح للمراجع معرفة النطاق مثل: سن واحد، فك كامل، تركيبة زركونيا.',
      sizesNameLabel: 'اسم الفئة أو نطاق الإجراء',
      sizesNamePlaceholder: 'مثال: سن واحد، فك علوي، زركونيا ألماني، إيماكس سويسري',
      presetSizes: [
        'سن واحد',
        'فك علوي',
        'فك سفلي',
        'كلا الفكين',
        'تركيبة زركونيا ألماني',
        'تركيبة إيماكس تجميلية',
        'حشوة ليزرية تجميلية'
      ],
      addonsTitle: 'إضافة ملحقات أو خدمات إضافية',
      addonsSub: 'خدمات تكميلية للسن مثل: صورة أشعة، واقي أسنان ليلي.',
      addonsNameLabel: 'اسم الخدمة أو الملحق الإضافي',
      addonsNamePlaceholder: 'مثال: صورة أشعة بانوراما، واقي ليلي للأسنان، معجون علاجي',
      presetAddons: [
        'صورة أشعة تشخيصية',
        'فلورايد حماية للأسنان',
        'واقي ليلي ضد الصكيك',
        'معجون أسنان طبي علاجي',
        'تخدير موضعي إضافي'
      ],
      badges: {
        popular: 'الخدمة الأكثر طلباً',
        new: 'تقنية حديثة معتمدة',
        spicyOrFeatured: 'يشمل التأمين الصحي',
        vegetarianOrPromo: 'جلسة وقائية دورية'
      },
      buttonAddText: 'طلب حجز موعد أسنان',
      buttonAddShort: 'حجز موعد',
      whatsappOrderLabel: 'إرسال طلب استفسار وحجز موعد أسنان عبر الواتساب',
      cartIconType: 'medical',
      optionsLabel: 'خيارات ومرفقات إجراء الأسنان',
      optionsSub: 'تفاصيل مشمولة مثل: صورة أشعة، كفالة خطية.',
      optionsPlaceholder: 'مثال: يشمل صورة أشعة، كفالة 5 سنوات'
    };
  }

  // 1.2 Dermatology, Laser & Aesthetics
  if (
    !isExplicitNonMedicalTheme &&
    (
      text.includes('جلدية') ||
      text.includes('ليزر') ||
      text.includes('تجميل وبشرة') ||
      text.includes('هيدرافيشيل') ||
      text.includes('فيلر') ||
      text.includes('بوتوكس') ||
      text.includes('dermatology')
    )
  ) {
    return {
      title: 'قائمة جلسات الجلدية والليزر والعناية بالبشرة',
      subtitle: 'استعرض جلسات الليزر، تنظيف البشرة وعلاجات النضارة واحجز جلستك.',
      addItemLabel: 'اسم الجلسة أو الإجراء التجميلي أو الليزر *',
      addItemPlaceholder: 'مثال: جلسة تنظيف بشرة هيدرافيشل، ليزر إزالة شعر الوجه، بلازما نضارة',
      categoryLabel: 'القسم أو التخصص داخل المركز التجميلي *',
      categoryPlaceholder: 'مثال: جلسات ليزر، عناية بالبشرة، حقن وفيلر، معالجات خاصة',
      presetCategories: [
        'جلسات الليزر وإزالة الشعر',
        'جلسات تنظيف البشرة والهيدرافيشل',
        'حقن الفيلر والبوتوكس والميزوثيرابي',
        'علاجات النضارة والبلازما (PRP)',
        'تقشير كيميائي وكربوني',
        'مستحضرات طبية موصى بها'
      ],
      presetImages: [
        { name: 'هيدرافيشل للوجه', url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80' },
        { name: 'جلسة ليزر وعناية', url: 'https://images.unsplash.com/photo-1512290900672-1f486419e7fd?auto=format&fit=crop&w=600&q=80' },
        { name: 'سيروم وعلاج بشرة', url: 'https://images.unsplash.com/photo-1608248597359-52e85a6db467?auto=format&fit=crop&w=600&q=80' },
        { name: 'ماسك نضارة طبيعي', url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر الجلسة أو الباقة (د.أ) *',
      pricePlaceholder: 'مثال: 35.00',
      prepTimeLabel: 'مدة الجلسة العلاجية أو التجميلية المتوقعة (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 25)',
      prepTimePlaceholder: 'مثال: 25',
      prepTimeHelper: 'توضح مدة الجلسة للمراجعة لتنسيق جدول المواعيد والحجز بدقة.',
      versionTypeSizesLabel: 'عدد الجلسات والمناطق',
      versionTypeAddonsLabel: 'ماسكات ومواد إضافية',
      sizesTitle: 'إضافة باقات الجلسات والمناطق',
      sizesSub: 'تتيح للمراجعة اختيار عدد الجلسات أو المنطقة المعالجة بدقة.',
      sizesNameLabel: 'اسم الباقة أو المنطقة المعالجة',
      sizesNamePlaceholder: 'مثال: جلسة واحدة، باقة 3 جلسات، منطقة الوجه فقط، كامل الجسم',
      presetSizes: [
        'جلسة واحدة فردية',
        'باقة 3 جلسات متكاملة',
        'باقة 6 جلسات مكثفة',
        'منطقة محددة',
        'كامل الوجه والرقبة',
        'كامل الجسم VIP'
      ],
      addonsTitle: 'إضافة ماسكات ومواد إضافية',
      addonsSub: 'مواد مغذية إضافية تضاف للجلسة مثل: كولاجين، فيتامين سي.',
      addonsNameLabel: 'اسم المادة أو الماسك الإضافي',
      addonsNamePlaceholder: 'مثال: ماسك كولاجين مهدئ، أمبولة فيتامين سي، تبريد مهدئ',
      presetAddons: [
        'ماسك كولاجين ترطيب عميق',
        'أمبولة فيتامين سي نضارة',
        'كريم طبي مهدئ بعد الليزر',
        'جلسة تبريد ملطفة للبشرة',
        'واقي شمس طبي معتمد'
      ],
      badges: {
        popular: 'الجلسة الأكثر طلباً',
        new: 'أحدث أجهزة الليزر',
        spicyOrFeatured: 'باقة عناية متكاملة',
        vegetarianOrPromo: 'مواد طبيعية معتمدة'
      },
      buttonAddText: 'طلب حجز جلسة تجميل',
      buttonAddShort: 'حجز جلسة',
      whatsappOrderLabel: 'إرسال طلب استفسار وحجز جلسة تجميل أو ليزر عبر الواتساب',
      cartIconType: 'medical',
      optionsLabel: 'تفاصيل ومرفقات الجلسة',
      optionsSub: 'توضح للمراجعة تفاصيل الجلسة والأجهزة المستخدمة.',
      optionsPlaceholder: 'مثال: أجهزة دويتو تبريد متقدم، استشارة مجانية'
    };
  }

  // 1.3 Pharmacies & Medications
  if (
    !isExplicitNonMedicalTheme &&
    (
      text.includes('صيدل') ||
      text.includes('دواء') ||
      text.includes('علاج صيدلاني') ||
      text.includes('pharmacy')
    )
  ) {
    return {
      title: 'كتالوج الأدوية والمستلزمات الصيدلانية',
      subtitle: 'استعرض الأدوية، الفيتامينات، مستحضرات العناية والمستلزمات الطبية المنزلية.',
      addItemLabel: 'اسم الدواء أو المستحضر الطبي أو المكمل *',
      addItemPlaceholder: 'مثال: مسكن بنادول إكسترا، فيتامين سي فوار 1000، جهاز فحص سكر، كريم ترطيب',
      categoryLabel: 'القسم داخل الصيدلية *',
      categoryPlaceholder: 'مثال: مسكنات وأدوية شائعة، فيتامينات ومكملات، مستلزمات طبية',
      presetCategories: [
        'أدوية ومسكنات شائعة',
        'فيتامينات ومعادن ومكملات',
        'أجهزة ومستلزمات طبية منزلية',
        'عناية بالبشرة والشعر الطبية',
        'رعاية الأم والطفل',
        'إسعافات أولية وضمادات'
      ],
      presetImages: [
        { name: 'أدوية ومستحضرات', url: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&w=600&q=80' },
        { name: 'فيتامينات ومكملات', url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80' },
        { name: 'مستحضرات صيدلانية', url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=600&q=80' },
        { name: 'مستلزمات طبية', url: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر المستحضر أو الدواء (د.أ) *',
      pricePlaceholder: 'مثال: 3.50',
      prepTimeLabel: 'وقت تجهيز وتحضير الطلب (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 10)',
      prepTimePlaceholder: 'مثال: 10',
      prepTimeHelper: 'يوضح للمشتري الوقت المطلوب لتحضير وتجهيز المستحضرات قبل الاستلام أو التوصيل.',
      versionTypeSizesLabel: 'أحجام وعبوات الدواء',
      versionTypeAddonsLabel: 'مستلزمات مرفقة',
      sizesTitle: 'إضافة أحجام العبوات والعيارات',
      sizesSub: 'تتيح للزبون اختيار عيار الدواء أو حجم العبوة المطلوب.',
      sizesNameLabel: 'حجم العبوة أو تركيز العيار',
      sizesNamePlaceholder: 'مثال: عبوة 30 حبة، عيار 500 ملغم، سعة 200 مل، حجم عائلي',
      presetSizes: [
        'عبوة 20 حبة',
        'عبوة 30 حبة',
        'عيار 500 ملغم',
        'عيار 1000 ملغم',
        'سعة 100 مل',
        'سعة 250 مل',
        'حجم عائلي اقتصادي'
      ],
      addonsTitle: 'إضافة مستلزمات وملحقات مرفقة',
      addonsSub: 'خيارات تضاف مع الصنف مثل: ضمادات، كحول معقم.',
      addonsNameLabel: 'اسم المستلزم أو الملحق المرفق',
      addonsNamePlaceholder: 'مثال: لصقات جروح، كحول طبي معقم، قطن طبي معقم',
      presetAddons: [
        'شاش ولواصق طبية',
        'كحول طبي معقم 70%',
        'قطن طبي معقم',
        'مرطب شفاه طبي',
        'توصيل سريع مبرد'
      ],
      badges: {
        popular: 'الأكثر طلباً واستخداماً',
        new: 'منتج حديث معتمد',
        spicyOrFeatured: 'مرخص من الغذاء والدواء',
        vegetarianOrPromo: 'بدون وصفة طبية'
      },
      buttonAddText: 'طلب من الصيدلية',
      buttonAddShort: 'طلب دواء',
      whatsappOrderLabel: 'إرسال طلب استفسار أو طلب أدوية عبر الواتساب',
      cartIconType: 'medical',
      optionsLabel: 'خيارات الجرعة والاستخدام',
      optionsSub: 'توضح للمشتري شروط الاستخدام أو الإرشادات الصيدلانية.',
      optionsPlaceholder: 'مثال: متوفر بنكهة البرتقال، مناسب للأطفال'
    };
  }

  // 1.4 Medical Laboratories & Radiology
  if (
    !isExplicitNonMedicalTheme &&
    (
      (text.includes('مختبر') && !text.includes('طباعة') && !text.includes('3d')) ||
      text.includes('تحاليل') ||
      text.includes('أشعة') ||
      text.includes('رنين') ||
      text.includes('فحص دم') ||
      text.includes('فحوصات طبية')
    )
  ) {
    return {
      title: 'دليل الفحوصات المخبرية والأشعة التشخيصية',
      subtitle: 'استعرض الفحوصات الدورية، باقات الفحص الشامل ومواعيد استلام النتائج.',
      addItemLabel: 'اسم الفحص المخبري أو التحليل أو الأشعة *',
      addItemPlaceholder: 'مثال: فحص دم شامل (CBC)، فحص وظائف الكلى والكبد، فحص فيتامين د، أشعة سينية',
      categoryLabel: 'قسم الفحص المخبري أو الأشعة *',
      categoryPlaceholder: 'مثال: فحوصات دورية، هرمونات، باقات شاملة، أشعة وتصوير',
      presetCategories: [
        'فحوصات الدم الشاملة',
        'فحوصات الهرمونات والغدد',
        'تحاليل الفيتامينات والمعادن',
        'وظائف الكلى والكبد والدهنيات',
        'باقات الفحص الدوري الشامل',
        'تصوير بالأشعة والموجات فوق الصوتية'
      ],
      presetImages: [
        { name: 'تحاليل عينات دم', url: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80' },
        { name: 'مجهر مخبري حديث', url: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?auto=format&fit=crop&w=600&q=80' },
        { name: 'أشعة وفحص طبي', url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80' },
        { name: 'تقرير فحص معتمد', url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'تكلفة الفحص أو الباقة (د.أ) *',
      pricePlaceholder: 'مثال: 15.00',
      prepTimeLabel: 'الوقت المقدر لظهور النتيجة أو الفحص (اختياري)',
      prepTimeUnit: 'بالدقائق أو الساعات (مثال: 60)',
      prepTimePlaceholder: 'مثال: 60',
      prepTimeHelper: 'توضح للمراجع المدة التقريبية لإجراء الفحص أو موعد صدور النتائج المخبرية.',
      versionTypeSizesLabel: 'نطاق وباقات الفحص',
      versionTypeAddonsLabel: 'خدمات مرافقة',
      sizesTitle: 'إضافة باقات ونطاق الفحص',
      sizesSub: 'تتيح للمراجع الاختيار بين فحص فردي أو باقة فحص موسعة.',
      sizesNameLabel: 'اسم باقة أو نطاق الفحص',
      sizesNamePlaceholder: 'مثال: فحص أساسي، باقة متقدمة، فحص شامل VIP، فحص فوري عاجل',
      presetSizes: [
        'فحص أساسي منفرد',
        'باقة فحص متقدمة',
        'فحص شامل لكامل الجسم VIP',
        'فحص عاجل فوري'
      ],
      addonsTitle: 'إضافة خدمات وتقارير مرافقة',
      addonsSub: 'خدمات إضافية مثل: سحب عينات منزلي، تقرير رسمي معتمد.',
      addonsNameLabel: 'اسم الخدمة أو الملحق الإضافي',
      addonsNamePlaceholder: 'مثال: سحب منزلي، تقرير مطبوع معتمد، استشارة طبيب للنتيجة',
      presetAddons: [
        'خدمة السحب من المنزل',
        'إرسال التقرير عبر الواتساب',
        'تقرير رسمي معتمد ومختوم',
        'استشارة طبيب مع النتيجة',
        'فحص بول مجاني مرافق'
      ],
      badges: {
        popular: 'الفحص الأكثر طلباً',
        new: 'نتائج دقيقة وسريعة',
        spicyOrFeatured: 'يشمل التأمين الطبي',
        vegetarianOrPromo: 'باقة فحص وقائي دوري'
      },
      buttonAddText: 'حجز موعد فحص مخبري',
      buttonAddShort: 'حجز فحص',
      whatsappOrderLabel: 'إرسال استفسار أو طلب حجز فحص مخبري عبر الواتساب',
      cartIconType: 'medical',
      optionsLabel: 'شروط وتعليمات الفحص',
      optionsSub: 'تعليمات هامة مثل: يشترط الصيام 10 ساعات.',
      optionsPlaceholder: 'مثال: يشترط صيام 8 إلى 12 ساعة'
    };
  }

  // 1.5 Physical Therapy & Rehabilitation
  if (
    !isExplicitNonMedicalTheme &&
    (
      text.includes('علاج طبيعي') ||
      text.includes('تأهيل') ||
      text.includes('فيزيائي') ||
      text.includes('مساج طبي') ||
      text.includes('حركي')
    )
  ) {
    return {
      title: 'قائمة جلسات العلاج الطبيعي والتأهيل الحركي',
      subtitle: 'استعرض برامج تأهيل العمود الفقري والمفاصل، إصابات الملاعب والعلاج الفيزيائي.',
      addItemLabel: 'اسم جلسة العلاج الطبيعي أو التأهيل *',
      addItemPlaceholder: 'مثال: جلسة تأهيل العمود الفقري، علاج إصابات الملاعب، مساج علاجي فيزيائي',
      categoryLabel: 'قسم العلاج والتأهيل *',
      categoryPlaceholder: 'مثال: تأهيل عمود فقري، إصابات رياضية، أجهزة علاجية، مساج طبي',
      presetCategories: [
        'تأهيل العمود الفقري والمفاصل',
        'علاج الإصابات الرياضية والملاعب',
        'تأهيل ما بعد العمليات الجراحية',
        'علاج فيزيائي وأجهزة تحفيز',
        'مساج علاجي وتدليك طبي',
        'تمارين استطالة وتوازن حركي'
      ],
      presetImages: [
        { name: 'جلسة تأهيل وعلاج', url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80' },
        { name: 'تمارين تأهيل حركي', url: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&w=600&q=80' },
        { name: 'مساج علاجي وفيزيائي', url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80' },
        { name: 'عيادة علاج طبيعي', url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'تكلفة الجلسة أو البرنامج (د.أ) *',
      pricePlaceholder: 'مثال: 20.00',
      prepTimeLabel: 'مدة جلسة العلاج الطبيعي أو التأهيل (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 45)',
      prepTimePlaceholder: 'مثال: 45',
      prepTimeHelper: 'توضح مدة الجلسة التأهيلية للمراجع لترتيب الحضور والمتابعة.',
      versionTypeSizesLabel: 'مدة الجلسة والباقات',
      versionTypeAddonsLabel: 'أجهزة وخدمات مرافقة',
      sizesTitle: 'إضافة مدة الجلسات وباقات العلاج',
      sizesSub: 'تتيح للمراجع اختيار مدة الجلسة أو باقة جلسات موفرة.',
      sizesNameLabel: 'مدة الجلسة أو نوع الباقة',
      sizesNamePlaceholder: 'مثال: جلسة 30 دقيقة، جلسة 60 دقيقة، باقة 5 جلسات، باقة 10 جلسات',
      presetSizes: [
        'جلسة 30 دقيقة',
        'جلسة 45 دقيقة',
        'جلسة 60 دقيقة مكثفة',
        'باقة 5 جلسات تأهيل',
        'باقة 10 جلسات متكاملة'
      ],
      addonsTitle: 'إضافة أجهزة وخدمات مرافقة',
      addonsSub: 'تقنيات مرافقة للجلسة مثل: كمادات حارة، لاصق كينيزيو الرياضي.',
      addonsNameLabel: 'اسم الجهاز أو الخدمة المرافقة',
      addonsNamePlaceholder: 'مثال: كمادات حرارية مهدئة، لاصق كينيزيو، علاج بالأمواج',
      presetAddons: [
        'جلسة كمادات ساخنة مهدئة',
        'تدليك علاجي إضافي',
        'لاصق طبي كينيزيو للرياضيين',
        'برنامج تمارين منزلية مخصص',
        'علاج بالتيار الكهربائي (TENS)'
      ],
      badges: {
        popular: 'البرنامج الأكثر طلباً',
        new: 'تقنيات تأهيل حديثة',
        spicyOrFeatured: 'معتمد من أخصائيين',
        vegetarianOrPromo: 'خطة علاجية مخصصة'
      },
      buttonAddText: 'حجز جلسة علاج طبيعي',
      buttonAddShort: 'حجز جلسة',
      whatsappOrderLabel: 'إرسال طلب حجز جلسة علاج طبيعي وتأهيل عبر الواتساب',
      cartIconType: 'medical',
      optionsLabel: 'خيارات الجلسة والمرفقات',
      optionsSub: 'توضح للمراجع ما تشمله الجلسة التأهيلية.',
      optionsPlaceholder: 'مثال: يشمل فحص وتقييم أولي، مع تمارين منزلية'
    };
  }

  // 1.6 Optics, Eyewear & Vision
  if (
    !isExplicitNonMedicalTheme &&
    (
      text.includes('بصريات') ||
      text.includes('نظارات') ||
      text.includes('عدسات') ||
      text.includes('فحص نظر') ||
      text.includes('optics')
    )
  ) {
    return {
      title: 'كتالوج النظارات الطبية والشمسية وفحص النظر',
      subtitle: 'استعرض أحدث إطارات النظارات الطبية، النظارات الشمسية الماركات والعدسات اللاصقة.',
      addItemLabel: 'اسم النظارة أو العدسة أو الخدمة البصرية *',
      addItemPlaceholder: 'مثال: نظارة طبية إطار تيتانيوم، عدسات بلو لايت، نظارة شمسية بولارايزد',
      categoryLabel: 'القسم داخل مركز البصريات *',
      categoryPlaceholder: 'مثال: نظارات طبية، نظارات شمسية، عدسات لاصقة، فحص نظر',
      presetCategories: [
        'إطارات ونظارات طبية رجالية ونسائية',
        'نظارات شمسية ماركات أصلية',
        'عدسات لاصقة طبية وتجميلية',
        'فحوصات البصر والكمبيوتر المتقدمة',
        'نظارات أطفال مقاومة للصدمات',
        'إكسسوارات ومحاليل تنظيف العدسات'
      ],
      presetImages: [
        { name: 'إطارات نظارات طبية', url: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=600&q=80' },
        { name: 'نظارات شمسية ماركات', url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80' },
        { name: 'فحص نظر وبصريات', url: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=600&q=80' },
        { name: 'عدسات ومستلزمات', url: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر النظارة أو العدسة (د.أ) *',
      pricePlaceholder: 'مثال: 30.00',
      prepTimeLabel: 'مدة فحص النظر أو تجهيز العدسات (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 20)',
      prepTimePlaceholder: 'مثال: 20',
      prepTimeHelper: 'توضح للمراجع الوقت المطلوب لإجراء فحص النظر أو تفصيل العدسات الطبية.',
      versionTypeSizesLabel: 'نوع وضغط العدسات',
      versionTypeAddonsLabel: 'ملحقات وإكسسوارات',
      sizesTitle: 'إضافة أنواع العدسات والطلاءات',
      sizesSub: 'تتيح للزبون اختيار حماية العدسة المناسبة مثل: بلو لايت، عدسات مضغوطة.',
      sizesNameLabel: 'نوع العدسة أو طلاء الحماية',
      sizesNamePlaceholder: 'مثال: عدسات عادية، حماية بلو لايت، عدسات فوتوكروميك، عدسات مضغوطة',
      presetSizes: [
        'عدسات عادية بيضاء',
        'عدسات حماية بلو لايت ضد الشاشات',
        'عدسات فوتوكروميك متغيرة مع الشمس',
        'عدسات مضغوطة عالية الرقة'
      ],
      addonsTitle: 'إضافة ملحقات وإكسسوارات النظارة',
      addonsSub: 'ملحقات إضافية مثل: علبة فاخرة، بخاخ تنظيف مع مايكروفايبر.',
      addonsNameLabel: 'اسم الملحق أو الإضافة',
      addonsNamePlaceholder: 'مثال: علبة نظارة جلدية، بخاخ تنظيف مع مايكروفايبر، محلول عدسات',
      presetAddons: [
        'حافظة نظارة جلدية فاخرة',
        'سلسلة نظارة أنيقة',
        'بخاخ تنظيف مع قطعة مايكروفايبر',
        'محلول عدسات لاصقة معقم'
      ],
      badges: {
        popular: 'الموديل الأكثر مبيعاً',
        new: 'تشكيلة الموسم الحديثة',
        spicyOrFeatured: 'ماركة أصلية وكفالة',
        vegetarianOrPromo: 'فحص نظر مجاني'
      },
      buttonAddText: 'طلب النظارة أو الفحص',
      buttonAddShort: 'طلب نظارة',
      whatsappOrderLabel: 'إرسال استفسار أو طلب نظارة عبر الواتساب',
      cartIconType: 'medical',
      optionsLabel: 'خيارات القياس والمقاسات',
      optionsSub: 'توضح المقاسات والألوان المتوفرة للإطار.',
      optionsPlaceholder: 'مثال: مقاس الإطار 52-18، كفالة سنة ضد الكسر'
    };
  }

  // 1.7 General Clinics, Specialty Doctors & Hospitals
  if (
    !isExplicitNonMedicalTheme &&
    (
      text.includes('عياد') ||
      text.includes('مستشف') ||
      text.includes('طبيب') ||
      text.includes('دكتور') ||
      text.includes('استشاري') ||
      (text.includes('طب') && !text.includes('طباعة') && !text.includes('مواد طبية') && !text.includes('مستلزمات طبية وتجميلية')) ||
      (text.includes('صحة') && !text.includes('عناية شخصية'))
    )
  ) {
    return {
      title: 'قائمة الكشوفات والخدمات الطبية والاستشارات',
      subtitle: 'استعرض قائمة المعاينات، الكشوفات التخصصية، الإجراءات الطبية ومواعيد الدخول.',
      addItemLabel: 'اسم الكشفية أو الخدمة الطبية أو المعاينة *',
      addItemPlaceholder: 'مثال: كشفية استشاري باطنية، معاينة طوارئ، تخطيط قلب، فحص دوري شامل',
      categoryLabel: 'قسم العيادة أو التخصص الطبي *',
      categoryPlaceholder: 'مثال: كشوفات ومعاينات، استشارات تخصصية، طوارئ، إجراءات وفحوصات',
      presetCategories: [
        'معاينات وكشوفات تخصصية',
        'استشارات طبية ومتابعة دورية',
        'إجراءات علاجية صغرى وتضميد',
        'فحوصات وتخطيط قلب وأشعة',
        'خدمات طوارئ واستقبال',
        'باقات الرعاية الصحية المتكاملة'
      ],
      presetImages: [
        { name: 'كشفية ومعاينة استشاري', url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=600&q=80' },
        { name: 'سماعة طبية وفحص', url: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=600&q=80' },
        { name: 'غرفة كشف حديثة', url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80' },
        { name: 'استشارة طبية للمريض', url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'تكلفة الكشفية أو الخدمة (د.أ) *',
      pricePlaceholder: 'مثال: 15.00',
      prepTimeLabel: 'مدة الكشفية أو المعاينة المتوقعة (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 20)',
      prepTimePlaceholder: 'مثال: 20',
      prepTimeHelper: 'توضح مدة المعاينة الطبية للمراجعين لتنظيم المواعيد وتقليل فترة الانتظار.',
      versionTypeSizesLabel: 'فئات ونوع المعاينة',
      versionTypeAddonsLabel: 'خدمات مرافقة للكشفية',
      sizesTitle: 'إضافة فئات المعاينة والكشفية',
      sizesSub: 'تتيح تحديد نوع الكشفية مثل: كشفية عادية، استشارة مستعجلة، مراجعة.',
      sizesNameLabel: 'فئة المعاينة أو نوع الكشفية',
      sizesNamePlaceholder: 'مثال: كشفية عادية، كشفية استشارية متخصصة، مراجعة مجانية، زيارة منزلية',
      presetSizes: [
        'كشفية عادية',
        'كشفية استشارية متخصصة',
        'معاينة مستعجلة',
        'استشارة تقييم ومتابعة',
        'زيارة منزلية للمريض'
      ],
      addonsTitle: 'إضافة خدمات وتقارير مرافقة للكشفية',
      addonsSub: 'ملحقات مرافقة مثل: تقرير طبي رسمي، إجازة مرضية معتمدة.',
      addonsNameLabel: 'اسم الخدمة أو التقرير المرفق',
      addonsNamePlaceholder: 'مثال: تقرير طبي رسمي، إجازة مرضية معتمدة، فحص ضغط وسكر',
      presetAddons: [
        'تقرير طبي رسمي معتمد',
        'إجازة مرضية معتمدة',
        'فحص ضغط وسكر مجاني',
        'متابعة هاتفية مخصصة'
      ],
      badges: {
        popular: 'الأكثر حجزاً وطلباً',
        new: 'استشارة تخصصية دقيقة',
        spicyOrFeatured: 'يشمل بطاقات التأمين',
        vegetarianOrPromo: 'كشفية تقييم ومتابعة'
      },
      buttonAddText: 'احجز موعد كشفية',
      buttonAddShort: 'حجز كشفية',
      whatsappOrderLabel: 'إرسال طلب استفسار وحجز موعد كشفية عبر الواتساب',
      cartIconType: 'medical',
      optionsLabel: 'تفاصيل ومرفقات الخدمة الطبية',
      optionsSub: 'تساعد المراجع على فهم ما تشمله الكشفية.',
      optionsPlaceholder: 'مثال: تشمل الفحص السريري وقياس العلامات الحيوية'
    };
  }

  // =========================================================================
  // 2. FOOD & RESTAURANTS SUB-CATEGORIES
  // =========================================================================

  // 2.1 Shawarma & Fast Food Wraps
  if (
    text.includes('شاورما') ||
    text.includes('سناك') ||
    text.includes('صاج')
  ) {
    return {
      title: 'منيو الشاورما والوجبات السريعة',
      subtitle: 'تصفح وجبات الشاورما العربي، السندويشات والسناكات واطلبها فوراً.',
      addItemLabel: 'اسم وجبة الشاورما أو السندويش *',
      addItemPlaceholder: 'مثال: وجبة شاورما عربي دبل، ساندويش سوبر كلاسيك، وجبة صاروخ، شاورما إيطالي',
      categoryLabel: 'قسم الشاورما داخل المنيو *',
      categoryPlaceholder: 'مثال: وجبات شاورما عربي، سندويشات فردية، وجبات عائلية، مقبلات',
      presetCategories: [
        'وجبات شاورما عربي',
        'سندويشات شاورما فردية',
        'شاورما بالصحن وأطباق مقطعة',
        'وجبات عائلية وتوفير',
        'بطاطا ومقبلات وصوصات',
        'مشروبات غازية وعصائر'
      ],
      presetImages: [
        { name: 'شاورما عربي مقطع', url: 'https://images.unsplash.com/photo-1644704170910-a0cdf183649b?auto=format&fit=crop&w=600&q=80' },
        { name: 'ساندويش شاورما', url: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=600&q=80' },
        { name: 'شاورما بالصحن', url: 'https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=600&q=80' },
        { name: 'بطاطا مقلية مقرمشة', url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر الوجبة أو السندويش (د.أ) *',
      pricePlaceholder: 'مثال: 3.50',
      prepTimeLabel: 'وقت التحضير المتوقع للوجبة (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 12)',
      prepTimePlaceholder: 'مثال: 12',
      prepTimeHelper: 'يظهر وقت التحضير المتوقع للزبائن على كرت الوجبة وفي تفاصيل السلة لضبط توقعات الوقت قبل الطلب.',
      versionTypeSizesLabel: 'أحجام الشاورما',
      versionTypeAddonsLabel: 'إضافات وصوصات',
      sizesTitle: 'إضافة أحجام وجبة الشاورما',
      sizesSub: 'تتيح للزبون اختيار حجم الشاورما مثل: عادي، دبل، تربل، صاروخ.',
      sizesNameLabel: 'اسم حجم الوجبة أو السندويش',
      sizesNamePlaceholder: 'مثال: عادي سوبر، دبل عربي، تربل عائلي، صاروخ كبير',
      presetSizes: [
        'ساندويش عادي (سوبر)',
        'وجبة عربي دبل',
        'وجبة عربي تربل',
        'صحن مقطع كبير',
        'صاروخ كبير مشبع',
        'وجبة عائلية 5 أشخاص'
      ],
      addonsTitle: 'إضافة صوصات ومقبلات الشاورما',
      addonsSub: 'إضافات شائعة مثل: زيادة ثوم، زيادة دبس رمان، بطاطا إضافية.',
      addonsNameLabel: 'اسم الإضافة أو الصوص',
      addonsNamePlaceholder: 'مثال: زيادة ثومية، دبس رمان، بطاطا مقلية، جبنة موزاريلا',
      presetAddons: [
        'زيادة ثومية',
        'زيادة دبس رمان',
        'بطاطا مقلية إضافية',
        'مخلل حار إضافي',
        'جبنة موزاريلا ذائبة',
        'مشروب غازي بارد'
      ],
      badges: {
        popular: 'الأكثر طلباً',
        new: 'جديد ومميز',
        spicyOrFeatured: 'حار سبايسي',
        vegetarianOrPromo: 'عرض التوفير'
      },
      buttonAddText: 'إضافة للطلب',
      buttonAddShort: 'إضافة للسلة',
      whatsappOrderLabel: 'إرسال طلب الشاورما الفوري عبر الواتساب',
      cartIconType: 'food',
      optionsLabel: 'خيارات وتفضيلات السندويش',
      optionsSub: 'تتيح للزبون تحديد رغبته مثل: بدون مخلل، زيادة ثوم.',
      optionsPlaceholder: 'مثال: بدون بصل، زيادة شطة، خبز صاج مقرمش'
    };
  }

  // 2.2 Burgers & Sandwiches
  if (
    text.includes('برجر') ||
    text.includes('برغر') ||
    text.includes('burger')
  ) {
    return {
      title: 'منيو البرجر والسندويشات الفاخرة',
      subtitle: 'استعرض ساندويشات البرجر اللحم والدجاج، الكومبو والمقبلات المقرمشة.',
      addItemLabel: 'اسم ساندويش البرجر أو الوجبة *',
      addItemPlaceholder: 'مثال: برجر دبل تشيز بيف، برجر دجاج كرسبي، ترافل برجر فاخر، زنجر سبايسي',
      categoryLabel: 'قسم البرجر داخل المنيو *',
      categoryPlaceholder: 'مثال: برجر لحم، برجر دجاج، وجبات كومبو، أطباق بطاطا ومقبلات',
      presetCategories: [
        'برجر لحم بقري بلدي',
        'برجر دجاج وكرسبي',
        'وجبات كومبو مع بطاطا ومشروب',
        'أطباق مقبلات وبطاطا محملة',
        'وجبات أطفال',
        'ميلك شيك ومشروبات منعشة'
      ],
      presetImages: [
        { name: 'برجر كلاسيك بيف', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80' },
        { name: 'برجر دجاج كرسبي', url: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80' },
        { name: 'برجر دبل تشيز', url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80' },
        { name: 'وجبة برجر وبطاطا', url: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر البرجر أو الوجبة (د.أ) *',
      pricePlaceholder: 'مثال: 4.50',
      prepTimeLabel: 'وقت التحضير المتوقع للوجبة (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 15)',
      prepTimePlaceholder: 'مثال: 15',
      prepTimeHelper: 'يظهر وقت التحضير المتوقع للزبائن على كرت الوجبة وفي تفاصيل السلة لضبط توقعات الوقت قبل الطلب.',
      versionTypeSizesLabel: 'أحجام البرجر',
      versionTypeAddonsLabel: 'إضافات وصوصات',
      sizesTitle: 'إضافة أحجام وقطع البرجر',
      sizesSub: 'تتيح للزبون اختيار عدد قطع اللحم أو الترقية لوجبة كومبو.',
      sizesNameLabel: 'حجم البرجر أو عدد قطع اللحم',
      sizesNamePlaceholder: 'مثال: سنجل قطعة واحدة، دبل لحم، تربل، وجبة كومبو مع بطاطا',
      presetSizes: [
        'سنجل (قطعة واحدة)',
        'دبل لحم (قطعتين)',
        'تربل لحم وجبنة',
        'وجبة كومبو مع بطاطا ومشروب'
      ],
      addonsTitle: 'إضافة جبنة وصوصات البرجر',
      addonsSub: 'إضافات مميزة مثل: جبنة شيدر، بيكون مقدد، صوص خاص.',
      addonsNameLabel: 'اسم الإضافة أو الصوص',
      addonsNamePlaceholder: 'مثال: جبنة شيدر إضافية، بيكون لحم مقدد، صوص ترافل، بطاطا',
      presetAddons: [
        'جبنة شيدر إضافية ذائبة',
        'بيكون لحم مقدد',
        'صوص خاص إضافي',
        'حلقات بصل مقرمشة',
        'أصابع موزاريلا مقلية',
        'مشروب غازي بارد'
      ],
      badges: {
        popular: 'الأكثر طلباً',
        new: 'جديد القائمة',
        spicyOrFeatured: 'حار وناري',
        vegetarianOrPromo: 'وجبة توفير كومبو'
      },
      buttonAddText: 'إضافة للطلب',
      buttonAddShort: 'إضافة للسلة',
      whatsappOrderLabel: 'إرسال طلب البرجر الفوري عبر الواتساب',
      cartIconType: 'food',
      optionsLabel: 'تفضيلات تحضير البرجر',
      optionsSub: 'تتيح للزبون تحديد رغبته مثل: بدون مخلل، خبز بريوش.',
      optionsPlaceholder: 'مثال: بدون بصل، خبز بريوش محمص، صوص جانبي'
    };
  }

  // 2.3 Pizza & Italian Pastries
  if (
    text.includes('بيتزا') ||
    text.includes('معجنات') ||
    text.includes('فطائر') ||
    text.includes('مناقيش') ||
    text.includes('pizza')
  ) {
    return {
      title: 'منيو البيتزا والمعجنات الإيطالية والأفران',
      subtitle: 'استعرض أشهى أنواع البيتزا، المعجنات، الفطائر والمقبلات الإيطالية الساخنة.',
      addItemLabel: 'اسم البيتزا أو الفطيرة أو المعجنات *',
      addItemPlaceholder: 'مثال: بيتزا مارغريتا إيطالية، بيتزا بيبروني خاصة، بيتزا باربيكيو دجاج',
      categoryLabel: 'قسم البيتزا أو المعجنات *',
      categoryPlaceholder: 'مثال: بيتزا إيطالية، معجنات وفطائر، باستا ولازانيا، مقبلات',
      presetCategories: [
        'بيتزا إيطالية كلاسيك',
        'بيتزا خاصة ومميزة',
        'معجنات ومناقيش أفران',
        'باستا ولازانيا ساخنة',
        'خبز بالثوم ومقبلات',
        'مشروبات غازية وعصائر'
      ],
      presetImages: [
        { name: 'بيتزا مارغريتا', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80' },
        { name: 'بيتزا بيبروني', url: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80' },
        { name: 'بيتزا خضار', url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80' },
        { name: 'معجنات ومناقيش', url: 'https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر البيتزا أو الفطيرة (د.أ) *',
      pricePlaceholder: 'مثال: 5.00',
      prepTimeLabel: 'وقت الخبز والتحضير المتوقع (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 20)',
      prepTimePlaceholder: 'مثال: 20',
      prepTimeHelper: 'يظهر وقت الخبز والتحضير المتوقع للزبائن على كرت الوجبة لضبط الوقت قبل الطلب.',
      versionTypeSizesLabel: 'مقاسات البيتزا',
      versionTypeAddonsLabel: 'إضافات وأطراف محشوة',
      sizesTitle: 'إضافة مقاسات وأحجام البيتزا',
      sizesSub: 'تتيح للزبون اختيار مقاس البيتزا مثل: صغير، وسط، كبير، عائلي.',
      sizesNameLabel: 'مقاس البيتزا أو الفطيرة',
      sizesNamePlaceholder: 'مثال: صغير 25 سم، وسط 30 سم، كبير 35 سم، عائلي 40 سم',
      presetSizes: [
        'صغير (Small)',
        'وسط (Medium)',
        'كبير (Large)',
        'عائلي (Family)'
      ],
      addonsTitle: 'إضافة جبنة وحشوات البيتزا',
      addonsSub: 'خيارات تضاف مع البيتزا مثل: أطراف محشوة جبنة، زيادة موزاريلا.',
      addonsNameLabel: 'اسم الإضافة أو الحشوة',
      addonsNamePlaceholder: 'مثال: أطراف محشوة جبنة، زيادة موزاريلا، فلفل هالبينو',
      presetAddons: [
        'جبنة موزاريلا إضافية',
        'أطراف محشوة جبنة شيدر',
        'صوص رانش إضافي',
        'فلفل هالبينو حار',
        'فطر طازج إضافي'
      ],
      badges: {
        popular: 'الأكثر طلباً',
        new: 'صنف جديد',
        spicyOrFeatured: 'أطراف محشوة',
        vegetarianOrPromo: 'خيار نباتي صحي'
      },
      buttonAddText: 'إضافة للطلب',
      buttonAddShort: 'إضافة للسلة',
      whatsappOrderLabel: 'إرسال طلب البيتزا والمعجنات عبر الواتساب',
      cartIconType: 'food',
      optionsLabel: 'خيارات العجينة والخبز',
      optionsSub: 'تتيح للزبون تحديد سمك العجينة أو نوع الجبنة.',
      optionsPlaceholder: 'مثال: عجينة رقيقة كرانشي، عجينة سميكة إيطالية'
    };
  }

  // 2.4 Grills & Oriental Food
  if (
    text.includes('مشاوي') ||
    text.includes('كباب') ||
    text.includes('شيش') ||
    text.includes('لحوم مشوية') ||
    text.includes('مأكولات شرقية') ||
    text.includes('طواجن') ||
    text.includes('منسف') ||
    text.includes('ملاحم') ||
    text.includes('قصابين')
  ) {
    return {
      title: 'منيو المشاوي والمأكولات الشرقية الفاخرة',
      subtitle: 'استعرض أطباق المشاوي عالفحم، الكباب، الشيش طاووق والوجبات الشرقية الأصيلة.',
      addItemLabel: 'اسم طبق المشاوي أو الوجبة الشرقية *',
      addItemPlaceholder: 'مثال: وجبة كباب بلدي مشكل، كيلو شيش طاووق، ريش خاروف، وجبة منسف بلدي',
      categoryLabel: 'قسم المشاوي داخل المنيو *',
      categoryPlaceholder: 'مثال: مشاوي عالفحم، وجبات مشكلة، مقبلات شرقية، مشروبات',
      presetCategories: [
        'مشاوي مشكلة عالفحم',
        'كباب وشقف بلدية',
        'شيش طاووق ودجاج مشوي',
        'وجبات أرز وطواجن شرقية',
        'مقبلات وسلطات ومتبلات',
        'مشروبات وعصائر طبيعية'
      ],
      presetImages: [
        { name: 'مشاوي مشكلة', url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80' },
        { name: 'شيش طاووق عالفحم', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80' },
        { name: 'كباب عالفحم بلدي', url: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&w=600&q=80' },
        { name: 'مقبلات وحمص', url: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر الطبق أو الوجبة (د.أ) *',
      pricePlaceholder: 'مثال: 7.00',
      prepTimeLabel: 'وقت الشواء والتحضير المتوقع (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 25)',
      prepTimePlaceholder: 'مثال: 25',
      prepTimeHelper: 'يظهر وقت الشواء والتجهيز المتوقع للزبائن على كرت الوجبة وفي تفاصيل السلة.',
      versionTypeSizesLabel: 'أوزان المشاوي',
      versionTypeAddonsLabel: 'مقبلات وإضافات',
      sizesTitle: 'إضافة أوزان وحصص المشاوي',
      sizesSub: 'تتيح للزبون اختيار وزن المشاوي مثل: وجبة، نصف كيلو، كيلو كامل.',
      sizesNameLabel: 'الوزن أو حجم الوجبة',
      sizesNamePlaceholder: 'مثال: وجبة فردية، نصف كيلو، كيلو كامل، سرفيس عائلي',
      presetSizes: [
        'وجبة فردية (صحن)',
        'ربع كيلو',
        'نصف كيلو',
        'كيلو كامل',
        'سرفيس عائلي مشكل'
      ],
      addonsTitle: 'إضافة مقبلات وصوصات المشاوي',
      addonsSub: 'مقبلات مرافقة مثل: صحن حمص، متبل باذنجان، سلطة عربية.',
      addonsNameLabel: 'اسم المقبلات أو الإضافة المرفقة',
      addonsNamePlaceholder: 'مثال: صحن حمص صغير، متبل باذنجان، بطاطا حارة، ثومية',
      presetAddons: [
        'صحن حمص صغير',
        'متبل باذنجان مشوي',
        'سلطة عربية طازجة',
        'خبز بيواظ حار إضافي',
        'علبة ثومية ومخللات'
      ],
      badges: {
        popular: 'الأكثر طلباً',
        new: 'طبق الشيف المميز',
        spicyOrFeatured: 'لحم بلدي طازج',
        vegetarianOrPromo: 'عرض التوفير العائلي'
      },
      buttonAddText: 'إضافة للطلب',
      buttonAddShort: 'إضافة للسلة',
      whatsappOrderLabel: 'إرسال طلب المشاوي والمأكولات الشرقية عبر الواتساب',
      cartIconType: 'food',
      optionsLabel: 'خيارات التقديم والاستواء',
      optionsSub: 'تتيح للزبون تحديد درجة الشواء أو نوع الخبز.',
      optionsPlaceholder: 'مثال: شواء وسط، بدون بصل، خبز محمص إضافي'
    };
  }

  // 2.5 Cafes, Coffee & Hot/Cold Drinks
  if (
    text.includes('قهوة') ||
    text.includes('كافيه') ||
    text.includes('مقهى') ||
    text.includes('اسبريسو') ||
    text.includes('شاي') ||
    text.includes('مشروبات') ||
    text.includes('عصائر') ||
    text.includes('coffee') ||
    text.includes('cafe')
  ) {
    return {
      title: 'منيو القهوة المختصة والمشروبات الساخنة والباردة',
      subtitle: 'استكشف أصناف الاسبريسو، اللاتيه المثلج، المشروبات المنعشة والحلى الفاخر.',
      addItemLabel: 'اسم المشروب أو القهوة أو الحلى *',
      addItemPlaceholder: 'مثال: فلات وايت اسبريسو، سبانش لاتيه بارد، كيمكس قهوة مختصة، آيس شيكن',
      categoryLabel: 'قسم المشروبات داخل المنيو *',
      categoryPlaceholder: 'مثال: قهوة ساخنة، قهوة باردة ومثلجة، عصائر وموهيتو، حلى وكيك',
      presetCategories: [
        'قهوة ساخنة واسبريسو',
        'قهوة مثلجة وباردة',
        'قهوة مختصة مقطرة (V60/Chemex)',
        'مشروبات منعشة وموهيتو',
        'شاي وأعشاب طبيعية',
        'كيك وحلويات الكافيه'
      ],
      presetImages: [
        { name: 'قهوة اسبريسو وفلات', url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80' },
        { name: 'لاتيه مثلج منعش', url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80' },
        { name: 'قهوة مقطرة مختصة', url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80' },
        { name: 'كرواسون وكيك كافيه', url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر المشروب أو الحلى (د.أ) *',
      pricePlaceholder: 'مثال: 2.50',
      prepTimeLabel: 'وقت تجهيز وتحضير المشروب (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 7)',
      prepTimePlaceholder: 'مثال: 7',
      prepTimeHelper: 'يوضح للزبون الوقت التقريبي لإعداد وتجهيز مشروبه المختص.',
      versionTypeSizesLabel: 'أحجام الأكواب',
      versionTypeAddonsLabel: 'نكهات وشوتات إضافية',
      sizesTitle: 'إضافة أحجام أكواب القهوة',
      sizesSub: 'تتيح للزبون اختيار حجم الكوب المناسب مثل: صغير، وسط، كبير.',
      sizesNameLabel: 'حجم الكوب أو السعة',
      sizesNamePlaceholder: 'مثال: صغير 8 أونص، وسط 12 أونص، كبير 16 أونص',
      presetSizes: [
        'صغير (8 أونص)',
        'وسط (12 أونص)',
        'كبير (16 أونص)'
      ],
      addonsTitle: 'إضافة نكهات وشوتات قهوة إضافية',
      addonsSub: 'تخصيصات تضاف للكوب مثل: شوت اسبريسو، حليب لوز، سيروب فانيلا.',
      addonsNameLabel: 'اسم النكهة أو الإضافة',
      addonsNamePlaceholder: 'مثال: شوت اسبريسو إضافي، حليب لوز نباتي، سيروب كراميل',
      presetAddons: [
        'شوت اسبريسو إضافي',
        'حليب لوز نباتي',
        'حليب شوفان',
        'سيروب فانيلا',
        'سيروب كراميل مملح',
        'كريمة مخفوقة'
      ],
      badges: {
        popular: 'المشروب الأكثر طلباً',
        new: 'إصدار موسمي جديد',
        spicyOrFeatured: 'قهوة مختصة ممتازة',
        vegetarianOrPromo: 'خالي من السكر'
      },
      buttonAddText: 'طلب المشروب',
      buttonAddShort: 'إضافة للسلة',
      whatsappOrderLabel: 'إرسال طلب القهوة والمشروبات عبر الواتساب',
      cartIconType: 'food',
      optionsLabel: 'خيارات الحليب والسكر',
      optionsSub: 'تتيح للزبون تخصيص نسبة السكر أو نوع الحليب.',
      optionsPlaceholder: 'مثال: سكر خفيف، حليب قليل الدسم، بدون ثلج'
    };
  }

  // 2.6 Sweets, Bakeries & Ice Cream
  if (
    text.includes('حلويات') ||
    text.includes('كنافة') ||
    text.includes('كيك') ||
    text.includes('مخبز') ||
    text.includes('مخابز') ||
    text.includes('بوظة') ||
    text.includes('آيس كريم') ||
    text.includes('وافل') ||
    text.includes('كريب')
  ) {
    return {
      title: 'منيو الحلويات الشرقية والغربية والمخبوزات',
      subtitle: 'استعرض أشهى أطباق الكنافة، البقلاوة، الكيك والمخبوزات الطازجة يومياً.',
      addItemLabel: 'اسم الحلوى أو الصنف أو المخبوز *',
      addItemPlaceholder: 'مثال: كنافة خشنة بالجبنة البلدية، صحن بقلاوة بالفستق، تشيز كيك لوتس، كريب نوتيلا',
      categoryLabel: 'قسم الحلويات داخل المنيو *',
      categoryPlaceholder: 'مثال: حلويات شرقية، كيك وتورتات، معمول وبقلاوة، بوظة وآيس كريم',
      presetCategories: [
        'كنافة وحلويات شرقية ساخنة',
        'بقلاوة ومعمول مشكل',
        'كيك وتورتات مناسبات',
        'وافل وكريب وبان كيك',
        'بوظة وآيس كريم عربي',
        'معجنات وخبز طازج'
      ],
      presetImages: [
        { name: 'حلويات شرقية وكنافة', url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&q=80' },
        { name: 'كيك وتورتة مناسبات', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=600&q=80' },
        { name: 'وافل وبان كيك نوتيلا', url: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80' },
        { name: 'آيس كريم وبوظة', url: 'https://images.unsplash.com/photo-1560008581-09826d1de69e?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر الصنف أو الطبق (د.أ) *',
      pricePlaceholder: 'مثال: 4.00',
      prepTimeLabel: 'وقت التجهيز أو الخبز المتوقع (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 15)',
      prepTimePlaceholder: 'مثال: 15',
      prepTimeHelper: 'يوضح للزبون وقت تجهيز الحلويات أو تسخينها طازجة قبل الاستلام.',
      versionTypeSizesLabel: 'أوزان وأحجام الصحن',
      versionTypeAddonsLabel: 'مكسرات وإضافات',
      sizesTitle: 'إضافة أوزان وأحجام الحلويات',
      sizesSub: 'تتيح للزبون اختيار وزن الصنف مثل: صحن فردي، نصف كيلو، كيلو كامل، سدر.',
      sizesNameLabel: 'الوزن أو حجم الصحن',
      sizesNamePlaceholder: 'مثال: صحن فردي، نصف كيلو، كيلو كامل، سدر عائلي 2 كيلو',
      presetSizes: [
        'صحن صغير فردي',
        'نصف كيلو',
        'كيلو كامل',
        'سدر عائلي (2 كيلو)'
      ],
      addonsTitle: 'إضافة مكسرات وتزيين للحلويات',
      addonsSub: 'تزيين إضافي مثل: فستق حلبي، قشطة بلدية، كرة بوظة.',
      addonsNameLabel: 'اسم الإضافة أو التزيين',
      addonsNamePlaceholder: 'مثال: فستق حلبي إضافي، قشطة بلدية طازجة، كرة بوظة عربية',
      presetAddons: [
        'فستق حلبي إضافي',
        'قشطة بلدية طازجة',
        'كرة بوظة عربية على الصحن',
        'صوص نوتيلا إضافي',
        'قطر خفيف على جنب'
      ],
      badges: {
        popular: 'الأكثر طلباً ومبيعاً',
        new: 'طازج يومياً',
        spicyOrFeatured: 'بالسمن والجبن البلدي',
        vegetarianOrPromo: 'بدون سكر مضاف'
      },
      buttonAddText: 'طلب الحلويات',
      buttonAddShort: 'إضافة للسلة',
      whatsappOrderLabel: 'إرسال طلب الحلويات والمخبوزات عبر الواتساب',
      cartIconType: 'food',
      optionsLabel: 'خيارات التقديم والحرارة',
      optionsSub: 'تتيح للزبون تحديد درجة التسخين أو التغليف.',
      optionsPlaceholder: 'مثال: تسخين ساخن، تغليف هدايا فاخر'
    };
  }

  // 2.7 Seafood & Fish
  if (
    text.includes('سمك') ||
    text.includes('أسماك') ||
    text.includes('بحريات') ||
    text.includes('جمبري') ||
    text.includes('seafood')
  ) {
    return {
      title: 'منيو المأكولات البحرية والأسماك الطازجة',
      subtitle: 'استعرض أشهى أطباق السمك المشوي والمقلي، الجمبري وثمار البحر الطازجة.',
      addItemLabel: 'اسم وجبة السمك أو الطبق البحري *',
      addItemPlaceholder: 'مثال: سمك دنيس مشوي عالفحم، وجبة جمبري مقلي، طاجن فيليه سمك صيادية',
      categoryLabel: 'قسم المأكولات البحرية *',
      categoryPlaceholder: 'مثال: أسماك مشوية، أسماك مقلية، جمبري، شوربات ومقبلات',
      presetCategories: [
        'أسماك طازجة مشوية عالفحم',
        'أسماك مقلية مقرمشة',
        'جمبري وقريدس وثمار بحر',
        'طواجن بحرية وصيادية',
        'شوربات بحرية ومقبلات',
        'مشروبات منعشة'
      ],
      presetImages: [
        { name: 'سمك دنيس مشوي', url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80' },
        { name: 'جمبري مقلي مقرمش', url: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=600&q=80' },
        { name: 'طبق بحري مشكل', url: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80' },
        { name: 'شوربة سي فود', url: 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر الوجبة أو الطبق (د.أ) *',
      pricePlaceholder: 'مثال: 8.50',
      prepTimeLabel: 'وقت الشواء أو القلي المتوقع (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 25)',
      prepTimePlaceholder: 'مثال: 25',
      prepTimeHelper: 'يظهر وقت طهي الوجبة البحرية الطازجة على كرت الصنف قبل الطلب.',
      versionTypeSizesLabel: 'أوزان وحجم الأسماك',
      versionTypeAddonsLabel: 'مقبلات وأرز إضافي',
      sizesTitle: 'إضافة أوزان وحجم الوجبة البحرية',
      sizesSub: 'تتيح للزبون اختيار وزن السمكة أو حجم الوجبة.',
      sizesNameLabel: 'وزن السمك أو حجم الوجبة',
      sizesNamePlaceholder: 'مثال: وجبة فردية 500 غرام، سمكة كاملة 1 كغم، وجبة عائلية',
      presetSizes: [
        'وجبة فردية (500 غرام)',
        'سمكة كاملة (1 كغم)',
        'وجبة عائلية مشكلة',
        'كيلو كامل'
      ],
      addonsTitle: 'إضافة مقبلات وصوصات بحرية',
      addonsSub: 'مقبلات مرافقة مثل: أرز صيادية، صوص طرطور، بطاطا حارة.',
      addonsNameLabel: 'اسم المقبلات أو الصوص البحري',
      addonsNamePlaceholder: 'مثال: صحن أرز صيادية إضافي، صوص طرطور، شوربة سي فود ميني',
      presetAddons: [
        'صحن أرز صيادية إضافي',
        'صوص طرطور وطحينية',
        'بطاطا حرة مقلية',
        'شوربة سي فود ميني',
        'خبز تنور حار'
      ],
      badges: {
        popular: 'الأكثر طلباً',
        new: 'صيد اليوم الطازج',
        spicyOrFeatured: 'وجبة بحرية ملكية',
        vegetarianOrPromo: 'عرض التوفير'
      },
      buttonAddText: 'إضافة للطلب',
      buttonAddShort: 'إضافة للسلة',
      whatsappOrderLabel: 'إرسال طلب المأكولات البحرية عبر الواتساب',
      cartIconType: 'food',
      optionsLabel: 'خيارات الطهي والتتبيل',
      optionsSub: 'تتيح للزبون اختيار طريقة الطهي: مشوي أو مقلي.',
      optionsPlaceholder: 'مثال: مشوي سنجاري عالفحم، تتبيلة حارة'
    };
  }

  // =========================================================================
  // 3. RETAIL & SHOPPING SUB-CATEGORIES
  // =========================================================================

  // 3.1 Clothing & Fashion
  if (
    text.includes('ملابس') ||
    text.includes('أزياء') ||
    text.includes('بدلات') ||
    text.includes('فساتين') ||
    text.includes('قمصان') ||
    text.includes('جاكيت') ||
    text.includes('خياطة')
  ) {
    return {
      title: 'كتالوج الملابس والأزياء والموضة',
      subtitle: 'استعرض أحدث تشكيلات الملابس الرجالية، النسائية والأطفال واختر مقاسك.',
      addItemLabel: 'اسم القطعة أو الموديل *',
      addItemPlaceholder: 'مثال: قميص رسمي قطن 100%، فستان سهرة مخمل، بنطال جينز كلاسيك، هودي شتوي',
      categoryLabel: 'قسم الملابس داخل الكتالوج *',
      categoryPlaceholder: 'مثال: رجالي رسمي، سبورات كاجوال، فساتين وبدلات، ملابس أطفال',
      presetCategories: [
        'ملابس رجالية رسمية وكاجوال',
        'أزياء وفساتين نسائية',
        'ملابس أطفال ومواليد',
        'جاكيتات ومعاطف شتوية',
        'بناطيل جينز وبدلات رسمية',
        'أطقم وإطلالات متكاملة',
        'عروض وتخفيضات خاصة'
      ],
      presetImages: [
        { name: 'بدلة رجالية رسمية فاخرة', url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=600&q=80' },
        { name: 'قميص قطني كاجوال', url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80' },
        { name: 'فستان نسائي أنيق', url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=600&q=80' },
        { name: 'عباية وثوب مطرز', url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80' },
        { name: 'جاكيت ومعطف شتوي', url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80' },
        { name: 'ملابس أطفال كاجوال', url: 'https://images.unsplash.com/photo-1514090458221-65bb69cf63e6?auto=format&fit=crop&w=600&q=80' },
        { name: 'بنطال جينز كلاسيك', url: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=600&q=80' },
        { name: 'طقم متناسق عصري', url: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر بيع القطعة (د.أ) *',
      pricePlaceholder: 'مثال: 18.00',
      prepTimeLabel: 'وقت تجهيز وتغليف الطلب (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 15)',
      prepTimePlaceholder: 'مثال: 15',
      prepTimeHelper: 'يوضح للزبون الوقت المقدر لتجهيز الملابس وتغليفها قبل الاستلام أو التوصيل.',
      versionTypeSizesLabel: 'مقاسات الملابس',
      versionTypeAddonsLabel: 'تغليف وتعديلات',
      sizesTitle: 'إضافة مقاسات الملابس المتوفرة',
      sizesSub: 'تتيح للزبون اختيار مقاسه المطلوب من القطعة المعروضة.',
      sizesNameLabel: 'المقاس المتوفر',
      sizesNamePlaceholder: 'مثال: مقاس S، مقاس M، مقاس L، مقاس XL، مقاس XXL',
      presetSizes: [
        'مقاس S',
        'مقاس M',
        'مقاس L',
        'مقاس XL',
        'مقاس XXL',
        'مقاس حر (Free Size)'
      ],
      addonsTitle: 'إضافة تغليف هدايا وخدمات تعديل',
      addonsSub: 'خيارات تضاف مع القطعة مثل: تغليف هدايا ملكي، تقصير وتعديل المقاس.',
      addonsNameLabel: 'اسم الخدمة أو الخيار الإضافي',
      addonsNamePlaceholder: 'مثال: تغليف هدايا ملكي، كيس حفظ قماشي، تقصير وتعديل المقاس',
      presetAddons: [
        'تغليف هدايا ملكي مع كرت',
        'كيس حفظ قماشي فاخر',
        'تقصير وتعديل المقاس',
        'علاقة ملابس خشبية'
      ],
      badges: {
        popular: 'الأكثر مبيعاً',
        new: 'وصل حديثاً',
        spicyOrFeatured: 'قطن 100% فاخر',
        vegetarianOrPromo: 'خصم وتخفيض خاص'
      },
      buttonAddText: 'إضافة لسلة الشراء',
      buttonAddShort: 'إضافة للسلة',
      whatsappOrderLabel: 'إرسال طلب شراء الملابس عبر الواتساب',
      cartIconType: 'retail',
      optionsLabel: 'الألوان والمواصفات المتوفرة',
      optionsSub: 'تتيح للزبون اختيار اللون أو نوع القماش.',
      optionsPlaceholder: 'مثال: متوفر بلون أسود وكحلي وزيتي'
    };
  }

  // 3.2 Perfumes, Makeup & Cosmetics
  if (
    text.includes('عطور') ||
    text.includes('عطر') ||
    text.includes('مكياج') ||
    text.includes('تجميل ومكياج') ||
    text.includes('بخور') ||
    text.includes('عود')
  ) {
    return {
      title: 'كتالوج العطور الفاخرة ومستحضرات التجميل',
      subtitle: 'استعرض العطور الفرنسية والشرقية، البخور ومستحضرات التجميل الأصلية.',
      addItemLabel: 'اسم العطر أو مستحضر التجميل *',
      addItemPlaceholder: 'مثال: عطر عود ملكي فاخر، ماء عطر فرنسي كلاسيك 100 مل، سيروم نضارة بشرة',
      categoryLabel: 'قسم العطور والتجميل *',
      categoryPlaceholder: 'مثال: عطور شرقية، عطور فرنسية، مستحضرات مكياج، بوكسات هدايا',
      presetCategories: [
        'عطور شرقية وبخور وزيوت',
        'عطور فرنسية وعالمية',
        'مستحضرات تجميل ومكياج',
        'منتجات عناية بالبشرة والجسم',
        'بوكسات ومجموعات هدايا',
        'معطرات جو ومفارش'
      ],
      presetImages: [
        { name: 'عطر فرنسي فاخر', url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=80' },
        { name: 'عطور شرقية وبخور', url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=600&q=80' },
        { name: 'مستحضرات مكياج', url: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=600&q=80' },
        { name: 'بوكس هدايا عطور', url: 'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر العبوة أو المستحضر (د.أ) *',
      pricePlaceholder: 'مثال: 25.00',
      prepTimeLabel: 'وقت التجهيز والتغليف (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 10)',
      prepTimePlaceholder: 'مثال: 10',
      prepTimeHelper: 'يوضح للزبون وقت تجهيز وتغليف العبوة قبل التوصيل أو الاستلام من المتجر.',
      versionTypeSizesLabel: 'سعة العبوة',
      versionTypeAddonsLabel: 'تغليف ونقش الاسم',
      sizesTitle: 'إضافة سعة وحجم زجاجة العطر',
      sizesSub: 'تتيح للزبون اختيار سعة العطر مثل: 50 مل، 100 مل.',
      sizesNameLabel: 'سعة العبوة أو التركيز',
      sizesNamePlaceholder: 'مثال: سعة 50 مل، سعة 100 مل، سعة 200 مل، تستر أصلي',
      presetSizes: [
        'سعة 30 مل',
        'سعة 50 مل',
        'سعة 100 مل',
        'سعة 200 مل',
        'تستر أصلي'
      ],
      addonsTitle: 'إضافة بوكسات هدايا ونقش الاسم',
      addonsSub: 'خيارات إهداء مميزة مثل: بوكس مخملي، نقش الاسم بالليزر.',
      addonsNameLabel: 'اسم الإضافة أو التغليف',
      addonsNamePlaceholder: 'مثال: بوكس إهداء مخملي، نقش الاسم بالليزر، عينة مجانية',
      presetAddons: [
        'بوكس إهداء مخملي مع شريطة',
        'نقش الاسم بالليزر على الزجاجة',
        'عينة عطر مجانية إضافية',
        'كيس ورقي ماركة فاخر'
      ],
      badges: {
        popular: 'الأكثر مبيعاً ورواجاً',
        new: 'إصدار جديد وحصري',
        spicyOrFeatured: 'ثبات وفوحان عالي',
        vegetarianOrPromo: 'ماركة أصلية مكفولة'
      },
      buttonAddText: 'إضافة لسلة الشراء',
      buttonAddShort: 'إضافة للسلة',
      whatsappOrderLabel: 'إرسال طلب شراء العطور ومستحضرات التجميل عبر الواتساب',
      cartIconType: 'retail',
      optionsLabel: 'خيارات التركيز والرائحة',
      optionsSub: 'توضح درجة التركيز: أو دو بارفيوم أو إكستري دو بارفيوم.',
      optionsPlaceholder: 'مثال: تركيز عالي Eau De Parfum، أصلي مكفول'
    };
  }

  // 3.3 Phones, Computers & Electronics
  if (
    text.includes('هواتف') ||
    text.includes('موبايل') ||
    text.includes('إلكترون') ||
    text.includes('كمبيوتر') ||
    text.includes('لابتوب') ||
    text.includes('شواحن') ||
    text.includes('أجهزة كهربائية')
  ) {
    return {
      title: 'كتالوج الهواتف الذكية والإلكترونيات والإكسسوارات',
      subtitle: 'استعرض أحدث الهواتف الذكية، الأجهزة اللوحية، الشواحن وسماعات البلوتوث مع الكفالة.',
      addItemLabel: 'اسم الجهاز أو الهاتف أو الإكسسوار *',
      addItemPlaceholder: 'مثال: هاتف آيفون 16 سعة 256 جيجا، شاحن جداري سريع 65W، سماعات بلوتوث ANC',
      categoryLabel: 'قسم الإلكترونيات داخل الكتالوج *',
      categoryPlaceholder: 'مثال: هواتف ذكية، إكسسوارات وشواحن، لابتوب وكمبيوتر، ساعات ذكية',
      presetCategories: [
        'هواتف ذكية وأجهزة لوحية',
        'إكسسوارات وشواحن وسماعات',
        'شاشات حماية وكفرات مقاومة',
        'أجهزة لابتوب وكمبيوتر',
        'ساعات ذكية وأساور رياضية',
        'أجهزة إلكترونية ومنزلية'
      ],
      presetImages: [
        { name: 'هواتف ذكية حديثة', url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80' },
        { name: 'سماعات وشواحن', url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80' },
        { name: 'أجهزة لابتوب وكمبيوتر', url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=600&q=80' },
        { name: 'ساعات ذكية وإكسسوارات', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر بيع الجهاز أو الملحق (د.أ) *',
      pricePlaceholder: 'مثال: 150.00',
      prepTimeLabel: 'وقت تجهيز الجهاز وفحصه (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 15)',
      prepTimePlaceholder: 'مثال: 15',
      prepTimeHelper: 'يوضح للزبون الوقت المطلوب لفحص وتجهيز الجهاز وملحقاته قبل التسليم.',
      versionTypeSizesLabel: 'سعات التخزين والطرازات',
      versionTypeAddonsLabel: 'ملحقات وكفالات إضافية',
      sizesTitle: 'إضافة سعة التخزين وطراز الجهاز',
      sizesSub: 'تتيح للزبون اختيار سعة الجهاز مثل: 128 جيجا، 256 جيجا.',
      sizesNameLabel: 'سعة التخزين أو الطراز',
      sizesNamePlaceholder: 'مثال: سعة 128 جيجا، سعة 256 جيجا، سعة 512 جيجا، طراز Pro',
      presetSizes: [
        'سعة 128 جيجا',
        'سعة 256 جيجا',
        'سعة 512 جيجا',
        'طراز Pro',
        'طراز Plus'
      ],
      addonsTitle: 'إضافة ملحقات وضمانات إضافية',
      addonsSub: 'ملحقات مرافقة مثل: كفر حماية، لاصقة نانو، كفالة ممتدة.',
      addonsNameLabel: 'اسم الملحق أو الضمان الإضافي',
      addonsNamePlaceholder: 'مثال: كفر حماية سيليكون، لاصقة شاشة ضد الكسر، شاحن أصلي',
      presetAddons: [
        'كفر حماية سيليكون أصلي',
        'لاصقة حماية شاشة ضد الصدمات',
        'شاحن جداري أصلي إضافي',
        'تمديد كفالة وضمان لسنة'
      ],
      badges: {
        popular: 'الأكثر طلباً ومبيعاً',
        new: 'أحدث إصدار رسمي',
        spicyOrFeatured: 'كفالة أصلية معتمدة',
        vegetarianOrPromo: 'شاحن أو ملحق مجاني'
      },
      buttonAddText: 'إضافة لسلة الشراء',
      buttonAddShort: 'إضافة للسلة',
      whatsappOrderLabel: 'إرسال طلب شراء الأجهزة والإلكترونيات عبر الواتساب',
      cartIconType: 'retail',
      optionsLabel: 'الألوان وخيارات الكفالة',
      optionsSub: 'تتيح للزبون تحديد لون الجهاز أو نوع الضمان.',
      optionsPlaceholder: 'مثال: لون تيتانيوم طبيعي، كفالة سنة كاملة'
    };
  }

  // =========================================================================
  // 4. PERSONAL CARE, BEAUTY & FITNESS SUB-CATEGORIES
  // =========================================================================

  // 4.1 Men's Barbershops
  if (
    text.includes('حلاقة') ||
    text.includes('صالون رجال') ||
    text.includes('حلاق') ||
    text.includes('تشذيب ذقن')
  ) {
    return {
      title: 'قائمة خدمات الحلاقة والعناية الرجالية والأسعار',
      subtitle: 'استعرض أحدث قصات الشعر، تشذيب اللحية، تنظيف البشرة وباقات العرسان.',
      addItemLabel: 'اسم خدمة الحلاقة أو العناية *',
      addItemPlaceholder: 'مثال: قص شعر استشوار، تحديد ذقن احترافي، تنظيف بشرة بالبخار، باقة عريس',
      categoryLabel: 'قسم خدمات الصالون *',
      categoryPlaceholder: 'مثال: قص شعر، تشذيب لحية، عناية بالبشرة، باقات عرسان',
      presetCategories: [
        'قص شعر وتصفيف احترافي',
        'تشذيب وتحديد لحية بالبخار',
        'تنظيف بشرة وماسكات معالجة',
        'صبغات وتمليس وفرد شعر',
        'باقات عرسان ومناسبات',
        'منتجات عناية باللحية والشعر'
      ],
      presetImages: [
        { name: 'قص وتصفيف شعر', url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80' },
        { name: 'تحديد وتشذيب ذقن', url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80' },
        { name: 'كرسي وأدوات حلاقة', url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80' },
        { name: 'تنظيف بشرة للرجال', url: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'تكلفة الخدمة أو الباقة (د.أ) *',
      pricePlaceholder: 'مثال: 5.00',
      prepTimeLabel: 'مدة الجلسة أو الحلاقة المتوقعة (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 30)',
      prepTimePlaceholder: 'مثال: 30',
      prepTimeHelper: 'توضح مدة الجلسة للزبون لتنسيق الموعد المفضل وتجنب الانتظار.',
      versionTypeSizesLabel: 'فئات الجلسة وباقات الحلاقة',
      versionTypeAddonsLabel: 'ماسكات وعلاجات إضافية',
      sizesTitle: 'إضافة فئات وباقات الحلاقة',
      sizesSub: 'تتيح للزبون اختيار باقة الحلاقة مثل: خدمة أساسية، باقة عريس ملكية.',
      sizesNameLabel: 'فئة الجلسة أو نوع الباقة',
      sizesNamePlaceholder: 'مثال: خدمة أساسية، باقة متكاملة شعر ولحية، باقة VIP، باقة عريس',
      presetSizes: [
        'خدمة أساسية',
        'باقة متكاملة (شعر ولحية)',
        'باقة VIP مع تنظيف بشرة',
        'باقة عريس ملكية متكاملة'
      ],
      addonsTitle: 'إضافة ماسكات وسيرومات إضافية',
      addonsSub: 'عناية إضافية مثل: ماسك طين البحر الميت، شمع إزالة شعر الأنف.',
      addonsNameLabel: 'اسم الإضافة أو الماسك المرفق',
      addonsNamePlaceholder: 'مثال: ماسك طين البحر الميت، سنفرة وتنظيف رءوس سوداء، شمع أنف',
      presetAddons: [
        'ماسك طين لتنقية البشرة',
        'سنفرة وتنظيف رءوس سوداء',
        'شمع إزالة شعر الأنف والأذنين',
        'سيروم كولاجين مغذي للشعر'
      ],
      badges: {
        popular: 'الخدمة الأكثر طلباً',
        new: 'أحدث قصات العصر',
        spicyOrFeatured: 'باقة عريس مميزة',
        vegetarianOrPromo: 'عناية وتنظيف متكامل'
      },
      buttonAddText: 'احجز موعد حلاقة',
      buttonAddShort: 'حجز موعد',
      whatsappOrderLabel: 'إرسال طلب حجز موعد حلاقة عبر الواتساب',
      cartIconType: 'retail',
      optionsLabel: 'خيارات التصفيف والمواد',
      optionsSub: 'توضح المواد أو السيرومات المستخدمة أثناء الخدمة.',
      optionsPlaceholder: 'مثال: شامبو إيطالي طبيعي، واكس غير لامع'
    };
  }

  // 4.2 Women's Beauty Salons & Spas
  if (
    text.includes('صالون سيدات') ||
    text.includes('مشغل') ||
    text.includes('صالون') ||
    text.includes('مكياج سهرة') ||
    text.includes('أظافر') ||
    (text.includes('سبا') && !text.includes('مناسب'))
  ) {
    return {
      title: 'قائمة جلسات الصالون وخدمات التجميل والأسعار',
      subtitle: 'استعرض خدمات تسريحات الشعر، الصبغات، المكياج، العناية بالأظافر والعرائس.',
      addItemLabel: 'اسم الخدمة أو الجلسة التجميلية *',
      addItemPlaceholder: 'مثال: سشوار وتسريحة سهرة، صبغة شعر وبروتين، مكياج مناسبات، مناكير وبدكير',
      categoryLabel: 'قسم خدمات الصالون والتجميل *',
      categoryPlaceholder: 'مثال: شعر وتصفيف، صبغات ومعالجات، مكياج وعرائس، أظافر وبدكير',
      presetCategories: [
        'تصفيف وسشوار شعر وتسريحات',
        'صبغات وميش ومعالجات بروتين',
        'مكياج سهرات ومناسبات',
        'عناية بالأظافر ومناكير وبدكير',
        'باقات عرائس وتجهيز متكامل',
        'جلسات عناية بالبشرة والسبا'
      ],
      presetImages: [
        { name: 'تصفيف وسشوار شعر', url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80' },
        { name: 'مكياج سهرة ومناسبات', url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=600&q=80' },
        { name: 'مناكير وعناية بالأظافر', url: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=600&q=80' },
        { name: 'صبغات ومعالجات شعر', url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'تكلفة الخدمة أو الباقة (د.أ) *',
      pricePlaceholder: 'مثال: 20.00',
      prepTimeLabel: 'مدة الجلسة أو الخدمة المتوقعة (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 45)',
      prepTimePlaceholder: 'مثال: 45',
      prepTimeHelper: 'توضح مدة الجلسة للمراجعة لتنسيق جدول المواعيد والحجز بدقة.',
      versionTypeSizesLabel: 'فئات الخدمة والباقات',
      versionTypeAddonsLabel: 'ماسكات ومواد إضافية',
      sizesTitle: 'إضافة باقات وفئات الخدمة',
      sizesSub: 'تتيح اختيار فئة الجلسة مثل: خدمة أساسية، باقة عرائس ملكية.',
      sizesNameLabel: 'فئة الجلسة أو نوع الباقة',
      sizesNamePlaceholder: 'مثال: خدمة أساسية، شعر طويل، باقة VIP، باقة عروس كاملة',
      presetSizes: [
        'خدمة أساسية (شعر قصير)',
        'خدمة متقدمة (شعر طويل)',
        'باقة VIP للمناسبات',
        'باقة عرائس ملكية متكاملة'
      ],
      addonsTitle: 'إضافة ماسكات ومواد معالجة',
      addonsSub: 'عناية إضافية للشعر والبشرة مثل: ماسك كولاجين، سيروم أرجان.',
      addonsNameLabel: 'اسم المادة أو الماسك الإضافي',
      addonsNamePlaceholder: 'مثال: ماسك ترطيب كولاجين، سيروم أرجان مغذي، رسمة أظافر مخصصة',
      presetAddons: [
        'ماسك ترطيب كولاجين عميق',
        'سيروم زيت أرجان مغذي',
        'رسمة أظافر مخصصة Nail Art',
        'تركيب رموش تدوم طويلاً'
      ],
      badges: {
        popular: 'الخدمة الأكثر رواجاً',
        new: 'أحدث صيحات الموضة',
        spicyOrFeatured: 'باقة عرائس ملكية',
        vegetarianOrPromo: 'مواد طبيعية للشعر'
      },
      buttonAddText: 'احجز موعد بالصالون',
      buttonAddShort: 'حجز جلسة',
      whatsappOrderLabel: 'إرسال طلب موعد جلسة عناية وتجميل عبر الواتساب',
      cartIconType: 'retail',
      optionsLabel: 'خيارات المواد والماركات',
      optionsSub: 'توضح الماركات المستخدمة مثل: لوريال، أولابلكس.',
      optionsPlaceholder: 'مثال: مواد إيطالية خالية من الأمونيا'
    };
  }

  // 4.3 Gyms, Fitness & Bodybuilding
  if (
    text.includes('جيم') ||
    text.includes('نادي رياضي') ||
    text.includes('لياقة') ||
    text.includes('فتنس') ||
    text.includes('حديد') ||
    text.includes('كمال أجسام')
  ) {
    return {
      title: 'قائمة اشتراكات الجيم والحصص التدريبية والأسعار',
      subtitle: 'استعرض باقات الاشتراك الشهري والسنوي، حصص التدريب الخاص والمرافق الرياضية.',
      addItemLabel: 'اسم الاشتراك أو الحصة أو البرنامج التدريبي *',
      addItemPlaceholder: 'مثال: اشتراك جيم شهري شامل، حصص تدريب شخصي (12 حصة)، اشتراك فتنس وكارديو',
      categoryLabel: 'قسم الاشتراكات والبرامج *',
      categoryPlaceholder: 'مثال: اشتراكات جيم، تدريب شخصي، حصص فتنس وكارديو، باقات سنوية',
      presetCategories: [
        'اشتراكات شهرية وسنوية عامة',
        'تدريب شخصي خاص (PT)',
        'حصص لياقة وكارديو وكروسفت',
        'مرافق الساونا والجاكوزي والمسبح',
        'مكملات غذائية وبروتينات',
        'برامج تغذية وتخسيس'
      ],
      presetImages: [
        { name: 'أجهزة وتمارين لياقة', url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&q=80' },
        { name: 'أوزان ودامبلز', url: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=600&q=80' },
        { name: 'تمارين كارديو وجري', url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80' },
        { name: 'مكملات وشيكر رياضي', url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'رسوم الاشتراك أو الحصة (د.أ) *',
      pricePlaceholder: 'مثال: 30.00',
      prepTimeLabel: 'مدة الحصة التدريبية أو التقييم (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 60)',
      prepTimePlaceholder: 'مثال: 60',
      prepTimeHelper: 'توضح للمشترك مدة الحصة الرياضية أو جلسة التقييم البدني.',
      versionTypeSizesLabel: 'مدة وفترة الاشتراك',
      versionTypeAddonsLabel: 'خدمات ومرافق مرافقة',
      sizesTitle: 'إضافة فترات ومدة الاشتراك',
      sizesSub: 'تتيح للمشترك اختيار فترة الاشتراك مثل: شهر، 3 أشهر، سنة.',
      sizesNameLabel: 'مدة الاشتراك أو عدد الحصص',
      sizesNamePlaceholder: 'مثال: شهر واحد، 3 أشهر، 6 أشهر، سنة كاملة، باقة 12 حصة',
      presetSizes: [
        'شهر واحد',
        '3 أشهر (فصلي)',
        '6 أشهر (نصف سنوي)',
        'سنة كاملة (سنوي)',
        'باقة 12 حصة تدريب شخصي'
      ],
      addonsTitle: 'إضافة خدمات ومرافق مرافقة',
      addonsSub: 'ميزات إضافية تضاف مع الاشتراك مثل: خزانة خاصة، فحص إنبادي.',
      addonsNameLabel: 'اسم المرفق أو الخدمة المرفقة',
      addonsNamePlaceholder: 'مثال: خزانة خاصة شهرية، فحص إنبادي دهون، جدول تغذية مخصص',
      presetAddons: [
        'خزانة خاصة شهرية Locker',
        'جلسة فحص دهون إنبادي InBody',
        'جدول تغذية مخصص',
        'استخدام مرافق الساونا والجاكوزي'
      ],
      badges: {
        popular: 'الاشتراك الأكثر طلباً',
        new: 'برنامج تدريب جديد',
        spicyOrFeatured: 'شامل الساونا والمسبح',
        vegetarianOrPromo: 'خصم اشتراك مبكر'
      },
      buttonAddText: 'الاشتراك في النادي',
      buttonAddShort: 'اشتراك الآن',
      whatsappOrderLabel: 'إرسال طلب تسجيل واستفسار عن اشتراك الجيم عبر الواتساب',
      cartIconType: 'retail',
      optionsLabel: 'خيارات الفترات والمرافق',
      optionsSub: 'توضح أوقات الدوام وفترات الرجال والسيدات.',
      optionsPlaceholder: 'مثال: شامل فترات صباحية ومسائية، مسبح مدفأ'
    };
  }

  // =========================================================================
  // 5. AUTOMOTIVE & MAINTENANCE SUB-CATEGORIES
  // =========================================================================

  // 5.1 Car Maintenance, Mechanics & Industrial
  if (
    text.includes('ميكانيك') ||
    text.includes('صيانة سيارات') ||
    text.includes('كراج') ||
    text.includes('بناشر') ||
    text.includes('قطع غيار') ||
    text.includes('دوزان') ||
    text.includes('كهرباء سيارات')
  ) {
    return {
      title: 'قائمة خدمات صيانة وفحص وميكانيك السيارات',
      subtitle: 'استعرض خدمات الميكانيك، فحص الكمبيوتر، صيانة الفرامل والدوزان مع الضمان.',
      addItemLabel: 'اسم خدمة الصيانة أو الفحص أو الإصلاح *',
      addItemPlaceholder: 'مثال: تبديل صواني وفحمات فرامل، غيار زيت محرك وفلتر أصلي، فحص كمبيوتر شامل',
      categoryLabel: 'قسم صيانة السيارات *',
      categoryPlaceholder: 'مثال: ميكانيك عام، كهرباء وبطاريات، فحص كمبيوتر، صيانة فرامل ودوزان',
      presetCategories: [
        'صيانة ميكانيك محركات وجير',
        'فحص كمبيوتر وتشخيص أعطال',
        'صيانة فرامل ودوزان ومساعدات',
        'كهرباء سيارات وبطاريات وإنارة',
        'غيار زيوت وفلاتر وسوائل',
        'قطع غيار سيارات وكالة'
      ],
      presetImages: [
        { name: 'ميكانيك وصيانة محرك', url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80' },
        { name: 'صيانة فرامل ودوزان', url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80' },
        { name: 'غيار زيوت وفلاتر', url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=600&q=80' },
        { name: 'فحص كمبيوتر سيارات', url: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'تكلفة الفحص أو الخدمة التقريبية (د.أ) *',
      pricePlaceholder: 'مثال: 20.00',
      prepTimeLabel: 'مدة الفحص أو إنجاز الصيانة المتوقعة (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 60)',
      prepTimePlaceholder: 'مثال: 60',
      prepTimeHelper: 'تساعد العميل على معرفة الوقت المقدر لإنجاز أعمال الصيانة واستلام المركبة.',
      versionTypeSizesLabel: 'نوع القطع والضمان',
      versionTypeAddonsLabel: 'فحوصات مرافقة',
      sizesTitle: 'إضافة نوع القطع ومستوى الكفالة',
      sizesSub: 'تتيح للعميل الاختيار بين قطع وكالة أصلية أو تجارية نخب أول مع ضمان.',
      sizesNameLabel: 'نوع القطع أو مستوى الضمان',
      sizesNamePlaceholder: 'مثال: قطع وكالة أصلية، كفالة 6 أشهر، كفالة سنة كاملة',
      presetSizes: [
        'قطع تجارية نخب أول',
        'قطع أصلية وكالة',
        'ضمان 6 أشهر',
        'ضمان سنة كاملة'
      ],
      addonsTitle: 'إضافة فحوصات وخدمات مرافقة',
      addonsSub: 'فحوصات تضاف للخدمة مثل: فحص سوائل، تنظيف ثروتل.',
      addonsNameLabel: 'اسم الفحص أو الخدمة المضافة',
      addonsNamePlaceholder: 'مثال: فحص سوائل وزيوت شامل، تنظيف ثروتل، فحص بطارية',
      presetAddons: [
        'فحص سوائل وزيوت شامل',
        'تنظيف ثروتل وحساسات الهواء',
        'فحص بطارية ودينامو بالكمبيوتر',
        'غسيل محرك سريع'
      ],
      badges: {
        popular: 'الخدمة الأكثر طلباً',
        new: 'أجهزة فحص حديثة',
        spicyOrFeatured: 'قطع غيار مكفولة',
        vegetarianOrPromo: 'فحص مجاني شامل'
      },
      buttonAddText: 'طلب صيانة وفحص',
      buttonAddShort: 'طلب صيانة',
      whatsappOrderLabel: 'طلب صيانة وفحص فني للمركبة عبر الواتساب',
      cartIconType: 'car',
      optionsLabel: 'شروط وضمان الصيانة',
      optionsSub: 'توضح تفاصيل الكفالة وقطع الغيار المشمولة.',
      optionsPlaceholder: 'مثال: يشمل أجور اليد والقطع، كفالة 6 أشهر'
    };
  }

  // 5.2 Car Wash & Auto Detailing
  if (
    text.includes('غسيل سيارات') ||
    text.includes('بوليش') ||
    text.includes('تلميع سيارات') ||
    text.includes('دراي كلين سيارات') ||
    text.includes('نانو سيراميك')
  ) {
    return {
      title: 'قائمة باقات غسيل وتلميع وحماية السيارات',
      subtitle: 'استعرض باقات الغسيل الساطع، التنظيف الداخلي بالبخار وتلميع النانو سيراميك.',
      addItemLabel: 'اسم باقة الغسيل أو التلميع أو الحماية *',
      addItemPlaceholder: 'مثال: غسيل بخار داخلي وخارجي، بوليش وتلميع بودي نانو، تنظيف وتجفيف عميق',
      categoryLabel: 'قسم خدمات الغسيل والتلميع *',
      categoryPlaceholder: 'مثال: غسيل خارجي، تنظيف داخلي وتعقيم، بوليش وتلميع، نانو سيراميك',
      presetCategories: [
        'غسيل سيارات خارجي وداخلي',
        'غسيل ساطع بالبخار والتعقيم',
        'بوليش وتلميع بودي وإزالة خدوش',
        'حماية نانو سيراميك',
        'تنظيف فرش وكنب سيارة عميق',
        'عناية بالجنوط والإطارات'
      ],
      presetImages: [
        { name: 'غسيل رغوة وبخار', url: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=600&q=80' },
        { name: 'بوليش وتلميع بودي', url: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=600&q=80' },
        { name: 'تنظيف داخلي وتعقيم', url: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=600&q=80' },
        { name: 'تلميع إطارات وجنوط', url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر باقة الغسيل أو التلميع (د.أ) *',
      pricePlaceholder: 'مثال: 5.00',
      prepTimeLabel: 'مدة الغسيل أو التلميع المتوقعة (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 30)',
      prepTimePlaceholder: 'مثال: 30',
      prepTimeHelper: 'توضح للزبون مدة تجهيز وغسيل السيارة بالكامل.',
      versionTypeSizesLabel: 'حجم ونوع السيارة',
      versionTypeAddonsLabel: 'معطرات وتشميع إضافي',
      sizesTitle: 'إضافة أحجام وفئات السيارات',
      sizesSub: 'تتيح للزبون تحديد حجم مركبته مثل: سيدان صغيرة، جيب SUV عائلي.',
      sizesNameLabel: 'حجم السيارة أو فئة الباقة',
      sizesNamePlaceholder: 'مثال: سيارة صغيرة سيدان، سيارة جيب SUV، باقة غسيل عادي، باقة VIP',
      presetSizes: [
        'سيارة صغيرة (سيدان)',
        'سيارة عائلية جيب (SUV)',
        'باقة غسيل عادي',
        'باقة غسيل ساطع VIP'
      ],
      addonsTitle: 'إضافة معطرات وتشميع إضافي',
      addonsSub: 'عناية إضافية بالمركبة مثل: معطر فرنسي، تلميع كوشوك، تعقيم تكييف.',
      addonsNameLabel: 'اسم الإضافة أو المعطر المرفق',
      addonsNamePlaceholder: 'مثال: معطر جو فرنسي فواح، تلميع كوشوك بلاك، تعقيم مكيف',
      presetAddons: [
        'معطر جو فرنسي فواح',
        'تلميع كوشوك ممتد بلاك',
        'تعقيم مكيف الهواء بالبخار',
        'تشميع شمعي سريع للبدي'
      ],
      badges: {
        popular: 'الباقة الأكثر طلباً',
        new: 'تلميع نانو حديث',
        spicyOrFeatured: 'غسيل بخار عميق',
        vegetarianOrPromo: 'عرض باقة الغسيل'
      },
      buttonAddText: 'حجز موعد غسيل',
      buttonAddShort: 'حجز غسيل',
      whatsappOrderLabel: 'طلب موعد غسيل أو تلميع سيارة عبر الواتساب',
      cartIconType: 'car',
      optionsLabel: 'المواد والروائح المتوفرة',
      optionsSub: 'توضح الشامبوهات وروائح المعطرات المتاحة.',
      optionsPlaceholder: 'مثال: شامبو رغوي معالج، معطر توت بري'
    };
  }

  // 5.3 Home Maintenance (Plumbing, Electrical, AC, Carpentry)
  if (
    text.includes('صيانة') ||
    text.includes('سباك') ||
    text.includes('كهرب') ||
    text.includes('تكييف') ||
    text.includes('سبليت') ||
    text.includes('نجار') ||
    text.includes('ألمنيوم') ||
    text.includes('حداد')
  ) {
    return {
      title: 'قائمة خدمات الصيانة والتركيبات المنزلية والمهنية',
      subtitle: 'اطلب فني تكييف، سباكة، كهرباء أو نجارة مع الكفالة والمعاينة السريعة.',
      addItemLabel: 'اسم خدمة الصيانة أو التركيب أو الفحص *',
      addItemPlaceholder: 'مثال: صيانة مكيف سبليت وتنظيف فلاتر، تمديد خط كهرباء، صيانة مضخة مياه وفلاتر',
      categoryLabel: 'قسم خدمات الصيانة المنزلية *',
      categoryPlaceholder: 'مثال: تكييف وتبريد، كهرباء منزلية، سباكة وتمديدات، نجارة وأقفال',
      presetCategories: [
        'صيانة وتركيب مكيفات وتبريد',
        'تمديدات وأعمال كهرباء منزلية',
        'سباكة وتمديدات صحية وفلاتر',
        'نجارة وأقفال وصيانة أثاث',
        'صيانة غسالات وأجهزة كهربائية',
        'أعمال دهان وديكور منزلي'
      ],
      presetImages: [
        { name: 'صيانة مكيفات وتبريد', url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80' },
        { name: 'أعمال كهرباء وتمديدات', url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=600&q=80' },
        { name: 'سباكة وتمديدات صحية', url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80' },
        { name: 'أدوات صيانة وورشة', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر الفحص أو تكلفة الخدمة التقريبية (د.أ) *',
      pricePlaceholder: 'مثال: 15.00',
      prepTimeLabel: 'مدة الفحص أو إنجاز الخدمة المتوقعة (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 45)',
      prepTimePlaceholder: 'مثال: 45',
      prepTimeHelper: 'توضح للمستفيد وقت تنفيذ أعمال الصيانة المنزلية المقدر.',
      versionTypeSizesLabel: 'نطاق الخدمة وحجم الجهاز',
      versionTypeAddonsLabel: 'قطع غيار وضمان إضافي',
      sizesTitle: 'إضافة نطاق وحجم أعمال الصيانة',
      sizesSub: 'تتيح للعميل تحديد حجم العمل مثل: فحص أولي، صيانة شاملة مع قطع غيار.',
      sizesNameLabel: 'نطاق الصيانة أو حجم الجهاز',
      sizesNamePlaceholder: 'مثال: فحص ومعاينة أولية، مكيف 1.5 طن، صيانة شاملة مع قطع غيار',
      presetSizes: [
        'فحص ومعاينة أولية',
        'صيانة أساسية خفيفة',
        'صيانة شاملة مع قطع غيار',
        'خدمة طارئة سريعة'
      ],
      addonsTitle: 'إضافة قطع غيار وكفالات خطية',
      addonsSub: 'ملحقات مرافقة مثل: تعبئة غاز أصلي، قطع غيار إيطالية مكفولة.',
      addonsNameLabel: 'اسم الخدمة أو القطعة الإضافية',
      addonsNamePlaceholder: 'مثال: كفالة خطية 6 أشهر، تعبئة غاز تبريد أصلي، قطع إيطالية',
      presetAddons: [
        'كفالة خطية 6 أشهر',
        'تعبئة غاز تبريد أصلي',
        'قطع غيار إيطالية معتمدة',
        'تنظيف مكان العمل بالكامل'
      ],
      badges: {
        popular: 'الخدمة الأكثر طلباً',
        new: 'حلول صيانة حديثة',
        spicyOrFeatured: 'ضمان وكفالة خطية',
        vegetarianOrPromo: 'معاينة مجانية سريعة'
      },
      buttonAddText: 'طلب فني صيانة',
      buttonAddShort: 'طلب فني',
      whatsappOrderLabel: 'طلب فني صيانة ومعاينة منزلية عبر الواتساب',
      cartIconType: 'wrench',
      optionsLabel: 'شروط الزيارة والضمان',
      optionsSub: 'توضح رسوم الكشف وتفاصيل قطع الغيار.',
      optionsPlaceholder: 'مثال: كشف مجاني عند الاتفاق على الإصلاح'
    };
  }

  // 5.4 Cleaning & Dry Clean
  if (
    text.includes('تنظيف') ||
    text.includes('دراي كلين') ||
    text.includes('سجاد') ||
    text.includes('مفروشات') ||
    text.includes('غسيل كنب')
  ) {
    return {
      title: 'قائمة خدمات الدراي كلين وغسيل السجاد والكنب',
      subtitle: 'استعرض خدمات تنظيف وغسيل السجاد بالبخار، الكنب، الدراي كلين والتعقيم المنزلي.',
      addItemLabel: 'اسم خدمة التنظيف أو الدراي كلين *',
      addItemPlaceholder: 'مثال: دراي كلين سجاد صوف للمتر، غسيل كنب ومجالس بالبخار، تنظيف بطانيات ومفارش',
      categoryLabel: 'قسم خدمات التنظيف *',
      categoryPlaceholder: 'مثال: تنظيف سجاد وموكيت، تنظيف كنب ومفروشات، دراي كلين ملابس، شقق',
      presetCategories: [
        'تنظيف وغسيل سجاد وموكيت',
        'تنظيف كنب ومجالس بالبخار',
        'دراي كلين ملابس وبطانيات',
        'تنظيف شقق وفلل شامل',
        'جلي وتلميع بلاط وسيراميك',
        'تعقيم ومكافحة حشرات'
      ],
      presetImages: [
        { name: 'غسيل سجاد بالبخار', url: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=600&q=80' },
        { name: 'تنظيف كنب ومفروشات', url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80' },
        { name: 'دراي كلين وكوي ملابس', url: 'https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=600&q=80' },
        { name: 'تنظيف شقق ومنازل', url: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر الخدمة أو المتر التقريبي (د.أ) *',
      pricePlaceholder: 'مثال: 1.50',
      prepTimeLabel: 'الوقت المقدر لإنجاز التنظيف والتسليم (اختياري)',
      prepTimeUnit: 'بالساعات أو الأيام (مثال: 24)',
      prepTimePlaceholder: 'مثال: 24',
      prepTimeHelper: 'يوضح للزبون موعد استلام المفروشات أو الملابس بعد إتمام الغسيل والتجفيف.',
      versionTypeSizesLabel: 'المساحة وحجم الطقم',
      versionTypeAddonsLabel: 'تعطير ومعالجة بقع',
      sizesTitle: 'إضافة أحجام ومساحات التنظيف',
      sizesSub: 'تتيح للزبون اختيار الحجم مثل: للمتر المربع، طقم 7 مقاعد، شقة كاملة.',
      sizesNameLabel: 'المساحة أو حجم الصنف',
      sizesNamePlaceholder: 'مثال: للمتر المربع، طقم 5 مقاعد، طقم 7 مقاعد، مقاس كبير',
      presetSizes: [
        'للمتر المربع',
        'غرفة واحدة',
        'شقة صغيرة',
        'شقة كاملة',
        'طقم كنب 7 مقاعد'
      ],
      addonsTitle: 'إضافة تعطير ومعالجة بقع مستعصية',
      addonsSub: 'عناية إضافية بالمفروشات مثل: تعقيم بالبخار، تعطير باللافندر.',
      addonsNameLabel: 'اسم الإضافة أو التعطير المرفق',
      addonsNamePlaceholder: 'مثال: تعقيم بالبخار الحار، إزالة بقع مستعصية، تعطير لافندر',
      presetAddons: [
        'تعقيم بالبخار الحار المعقم',
        'معالجة وإزالة بقع مستعصية',
        'تعطير فواح ممتد باللافندر',
        'تغليف نايلون محكم للحفظ'
      ],
      badges: {
        popular: 'الخدمة الأكثر طلباً',
        new: 'تقنية تعقيم جديدة',
        spicyOrFeatured: 'مواد معقمة صديقة للبيئة',
        vegetarianOrPromo: 'خصم للمساحات الكبيرة'
      },
      buttonAddText: 'طلب خدمة تنظيف',
      buttonAddShort: 'طلب تنظيف',
      whatsappOrderLabel: 'طلب خدمة تنظيف ودراي كلين عبر الواتساب',
      cartIconType: 'wrench',
      optionsLabel: 'خيارات الاستلام والتسليم',
      optionsSub: 'توضح تفاصيل خدمة التوصيل والاستلام من المنزل.',
      optionsPlaceholder: 'مثال: استلام وتسليم مجاني من وإلى المنزل'
    };
  }

  // =========================================================================
  // 5.9 PROFESSIONAL SERVICES & CONSULTING (LEGAL, ENGINEERING, TRANSLATION, DESIGN, MARKETING)
  // =========================================================================

  // 5.9.1 Law Offices & Legal Consultations (مكاتب محاماة واستشارات قانونية)
  if (
    sub.includes('محاماة') ||
    sub.includes('استشارات قانونية') ||
    text.includes('مكاتب محاماة') ||
    text.includes('استشارات قانونية') ||
    name.includes('محامي') ||
    name.includes('محاماة')
  ) {
    return {
      title: 'دليل الخدمات والاستشارات القانونية والقضايا',
      subtitle: 'استعرض الاستشارات القانونية المعتمدة، صياغة وتوثيق العقود، والتوكيل ومتابعة القضايا.',
      addItemLabel: 'اسم الخدمة أو الاستشارة القانونية *',
      addItemPlaceholder: 'مثال: استشارة قانونية تجارية، صياغة وتدقيق العقود، تمثيل قضائي وتوكيل، تسجيل وتأسيس شركات',
      categoryLabel: 'مجال الاستشارة أو التخصص القانوني *',
      categoryPlaceholder: 'مثال: قضايا تجارية وشركات، قضايا عمالية، استشارات عقارية، عقود واتفاقيات',
      presetCategories: [
        'استشارات قانونية وتجارية',
        'صياغة وتدقيق العقود والاتفاقيات',
        'تأسيس وتسجيل الشركات والعلامات',
        'قضايا مدنية وعقارية وحقوقية',
        'استشارات عمالية ونزاعات عمل',
        'توكيل وتمثيل قضائي وترافع'
      ],
      presetImages: [
        { name: 'مكتب استشارات قانونية', url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80' },
        { name: 'دراسة ملفات وقضايا', url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80' },
        { name: 'صياغة وتوقيع عقود', url: 'https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?auto=format&fit=crop&w=600&q=80' },
        { name: 'ميزان العدالة واستشارات', url: 'https://images.unsplash.com/photo-1479142506502-19b3a3b7ff33?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'أتعاب الخدمة أو الاستشارة (د.أ) *',
      pricePlaceholder: 'مثال: 50.00',
      prepTimeLabel: 'مدة الجلسة أو إنجاز المعاملة (اختياري)',
      prepTimeUnit: 'بالدقائق أو الساعات',
      prepTimePlaceholder: 'مثال: 45',
      prepTimeHelper: 'توضح للموكل مدة جلسة الاستشارة أو الوقت المتوقع لدراسة الملف.',
      versionTypeSizesLabel: 'نوع الاستشارة والتمثيل',
      versionTypeAddonsLabel: 'خدمات مرافقة وتوثيق',
      sizesTitle: 'إضافة نوع ونمط الاستشارة',
      sizesSub: 'تتيح للموكل الاختيار بين استشارة مكتبية أو متابعة ملف وقضية.',
      sizesNameLabel: 'نوع الاستشارة أو نمط التوكيل',
      sizesNamePlaceholder: 'مثال: استشارة مكتبية، استشارة عن بعد، دراسة ملف وقضية، متابعة قضائية كاملة',
      presetSizes: [
        'استشارة قانونية مكتبية',
        'استشارة هاتفية أو مرئية عن بعد',
        'صياغة ومراجعة عقد متكامل',
        'توكيل ومتابعة قضائية كاملة'
      ],
      addonsTitle: 'إضافة خدمات ملحقة ومستندات',
      addonsSub: 'توضيح خدمات إضافية مثل التصديق والترجمة المعتمدة.',
      addonsNameLabel: 'اسم الخدمة الإضافية',
      addonsNamePlaceholder: 'مثال: تصديق عدلي رسمي، تدقيق اتفاقيات الشركاء',
      presetAddons: [
        'تصديق رسمي لدى كاتب العدل',
        'تدقيق ملاحق وشروط استثنائية',
        'تقرير رأي قانوني مكتوب ومفصل',
        'تمثيل وحضور مفاوضات رسمية'
      ],
      badges: {
        popular: 'الخدمة الأكثر طلباً',
        new: 'خدمة جديدة متاحة',
        spicyOrFeatured: 'استشارة فورية معتمدة',
        vegetarianOrPromo: 'عرض استشارة أولى'
      },
      buttonAddText: 'طلب استشارة قانونية',
      buttonAddShort: 'طلب استشارة',
      whatsappOrderLabel: 'إرسال طلب استشارة وتوكيل قانوني عبر الواتساب',
      cartIconType: 'wrench',
      optionsLabel: 'خيارات الجلسة والمواعيد',
      optionsSub: 'توضح إمكانية عقد الجلسة وجاهياً أو عن بعد.',
      optionsPlaceholder: 'مثال: جلسة وجاهية بالمكتب، جلسة أونلاين'
    };
  }

  // 5.9.2 Engineering Offices & Contracting (مكاتب هندسية ومقاولات)
  if (
    sub.includes('مكاتب هندسية') ||
    sub.includes('مقاولات') ||
    text.includes('مكاتب هندسية') ||
    (text.includes('هندسي') && text.includes('مقاولات')) ||
    name.includes('مكتب هندسي') ||
    name.includes('للهندسة والمقاولات')
  ) {
    return {
      title: 'دليل الخدمات الهندسية والمخططات والمقاولات',
      subtitle: 'استعرض خدمات التصميم المعماري، الإشراف الهندسي، حساب الكميات، وإدارة مشاريع المقاولات.',
      addItemLabel: 'اسم الخدمة الهندسية أو المشروع *',
      addItemPlaceholder: 'مثال: مخطط معماري فيلا، تصميم إنشائي معتمد، إشراف هندسي ميداني، حساب كميات ومقايسة',
      categoryLabel: 'التخصص الهندسي أو نوع المشروع *',
      categoryPlaceholder: 'مثال: تصميم معماري، تصميم إنشائي، إشراف وتنفيذ، مساحة وتراخيص',
      presetCategories: [
        'مخططات وتصميم معماري',
        'تصميم وحسابات إنشائية',
        'إشراف هندسي وإدارة مشاريع',
        'حساب كميات وجداول مقايسات',
        'أعمال مساحة وتراخيص أبنية',
        'مقاولات وبناء وتشطيب متكامل'
      ],
      presetImages: [
        { name: 'مخططات وتصميم هندسي', url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=600&q=80' },
        { name: 'إشراف وموقع بناء', url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156a?auto=format&fit=crop&w=600&q=80' },
        { name: 'أدوات هندسية ومسطرة', url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=600&q=80' },
        { name: 'عمارة وتصميم مودرن', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'تكلفة الخدمة أو المتر المربع (د.أ) *',
      pricePlaceholder: 'مثال: 150.00',
      prepTimeLabel: 'المدة التقديرية لإنجاز المخطط (اختياري)',
      prepTimeUnit: 'بالأيام أو الأسابيع',
      prepTimePlaceholder: 'مثال: 14',
      prepTimeHelper: 'توضح للمالك المدة الزمنية المطلوبة لإعداد المخططات أو دراسة المشروع.',
      versionTypeSizesLabel: 'نطاق العمل ومساحة المشروع',
      versionTypeAddonsLabel: 'خدمات وإشراف إضافي',
      sizesTitle: 'إضافة نطاق العمل أو حجم المساحة',
      sizesSub: 'تتيح للعميل اختيار نطاق الخدمة سواء مخطط أولي أو ترخيص كامل.',
      sizesNameLabel: 'نطاق الخدمة الهندسية',
      sizesNamePlaceholder: 'مثال: تصميم مبدئي، رخصة بناء كاملة مصدقة، إشراف دوري',
      presetSizes: [
        'تصميم مبدئي وفكرة معمارية',
        'مخططات تنفيذية وترخيص لنقابة المهندسين',
        'إشراف هندسي مرحلي ومتابعة صب',
        'إشراف كامل حتى تسليم المفتاح'
      ],
      addonsTitle: 'إضافة خدمات هندسية مرافقة',
      addonsSub: 'توضيح ميزات إضافية مثل التصاميم ثلاثية الأبعاد والرندرة.',
      addonsNameLabel: 'اسم الخدمة الهندسية المضافة',
      addonsNamePlaceholder: 'مثال: لقطات رندرة 3D واقعية، فحص تربة ومسح طوبوغرافي',
      presetAddons: [
        'لقطات رندرة ثلاثية الأبعاد واقعية 3D',
        'فحص تربة ومسح طوبوغرافي شامل',
        'تصميم حدائق ومناطق خارجية Landscape',
        'تعديلات إضافية على المساقط'
      ],
      badges: {
        popular: 'الخدمة الأكثر طلباً',
        new: 'تصميم حديث معتمد',
        spicyOrFeatured: 'معتمد نقابة المهندسين',
        vegetarianOrPromo: 'باقة هندسية متكاملة'
      },
      buttonAddText: 'طلب عرض سعر واستشارة',
      buttonAddShort: 'طلب الخدمة',
      whatsappOrderLabel: 'إرسال طلب دراسة مشروع أو مخطط هندسي عبر الواتساب',
      cartIconType: 'wrench',
      optionsLabel: 'خيارات التراخيص والاعتمادات',
      optionsSub: 'توضح جهات الاعتماد والتصديق الهندسي.',
      optionsPlaceholder: 'مثال: شامل تصديق نقابة المهندسين، فحص دفاع مدني'
    };
  }

  // 5.9.3 Certified Translation, Proofreading & Content (مكاتب ترجمة معتمدة وتدقيق / ترجمة وكتابة محتوى)
  if (
    sub.includes('مكاتب ترجمة') ||
    sub.includes('ترجمة معتمدة وتدقيق') ||
    sub.includes('ترجمة وكتابة محتوى') ||
    (sub.includes('ترجمة') && (sub.includes('تدقيق') || sub.includes('محتوى') || sub.includes('معتمد'))) ||
    text.includes('مكاتب ترجمة') ||
    text.includes('ترجمة معتمدة') ||
    text.includes('تدقيق لغوي') ||
    name.includes('ترجمة')
  ) {
    return {
      title: 'دليل خدمات الترجمة المعتمدة والتدقيق اللغوي وكتابة المحتوى',
      subtitle: 'استعرض خدمات الترجمة المعتمدة للوثائق الرسمية، التدقيق اللغوي الأكاديمي، وصناعة المحتوى.',
      addItemLabel: 'اسم خدمة الترجمة أو التدقيق أو المحتوى *',
      addItemPlaceholder: 'مثال: ترجمة شهادات ووثائق معتمدة، تدقيق لغوي لرسائل الماجستير، ترجمة قانونية وتقنية، كتابة محتوى مواقع',
      categoryLabel: 'نوع الوثيقة أو مجال الترجمة *',
      categoryPlaceholder: 'مثال: ترجمة معتمدة رسمية، أبحاث ورسائل علمية، ترجمة فورية، كتابة محتوى',
      presetCategories: [
        'ترجمة وثائق وشهادات معتمدة',
        'ترجمة قانونية وعقود محلفة',
        'تدقيق لغوي ونحوي للأبحاث والرسائل',
        'ترجمة طبية وتقارير مستشفيات',
        'كتابة محتوى تسويقي ومقالات SEO',
        'ترجمة تقنية ومواقع وتطبيقات'
      ],
      presetImages: [
        { name: 'ترجمة ووثائق معتمدة', url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80' },
        { name: 'تدقيق لغوي وأبحاث', url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80' },
        { name: 'كتابة محتوى على لابتوب', url: 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?auto=format&fit=crop&w=600&q=80' },
        { name: 'كتب ومعاجم لغوية', url: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر الصفحة أو الخدمة (د.أ) *',
      pricePlaceholder: 'مثال: 5.00',
      prepTimeLabel: 'مدة الإنجاز والتسليم (اختياري)',
      prepTimeUnit: 'بالساعات أو الأيام',
      prepTimePlaceholder: 'مثال: 24',
      prepTimeHelper: 'توضح للعميل الفترة الزمنية المتوقعة لإنهاء الترجمة والتدقيق وتسليم الوثائق.',
      versionTypeSizesLabel: 'نوع الاعتماد ومستوى التدقيق',
      versionTypeAddonsLabel: 'خيارات التسليم والتصديق',
      sizesTitle: 'إضافة مستوى ونوع الاعتماد',
      sizesSub: 'تتيح للعميل الاختيار بين ترجمة عادية أو معتمدة بختم رسمي ومترجم محلف.',
      sizesNameLabel: 'مستوى ونوع الاعتماد',
      sizesNamePlaceholder: 'مثال: ترجمة قياسية، ترجمة معتمدة بختم رسمي، تسليم مستعجل نفس اليوم',
      presetSizes: [
        'ترجمة قياسية وتدقيق لغوي',
        'ترجمة معتمدة رسمياً بختم مترجم محلف',
        'تسليم مستعجل فوري خلال نفس اليوم',
        'تدقيق وتنسيق أكاديمي شامل'
      ],
      addonsTitle: 'إضافة خدمات مرافقة وتصديق',
      addonsSub: 'توضيح ميزات إضافية مثل التصديق الرسمي أو التنسيق المكتبي.',
      addonsNameLabel: 'اسم الخدمة الإضافية',
      addonsNamePlaceholder: 'مثال: نسخ ورقية إضافية مختومة، تصديق جهات رسمية',
      presetAddons: [
        'نسخ ورقية إضافية مختومة وموقعة',
        'تصديق من الجهات المختصة',
        'تنسيق ملفات وتصميم مطابق للأصل DTP',
        'تسليم نسخة رقمية قابلة للتعديل Word و PDF'
      ],
      badges: {
        popular: 'الخدمة الأكثر طلباً',
        new: 'خدمة تدقيق سريعة',
        spicyOrFeatured: 'ختم ترجمة معتمد رسمياً',
        vegetarianOrPromo: 'سعر خاص للوثائق المتعددة'
      },
      buttonAddText: 'طلب ترجمة وثائق',
      buttonAddShort: 'طلب ترجمة',
      whatsappOrderLabel: 'إرسال طلب ترجمة وثيقة أو تدقيق لغوي عبر الواتساب',
      cartIconType: 'edu',
      optionsLabel: 'خيارات التنسيق والتسليم',
      optionsSub: 'توضح صيغ الملفات والتسليم الورقي والإلكتروني.',
      optionsPlaceholder: 'مثال: تسليم ورقي مختوم، إرسال فوري بصيغة PDF'
    };
  }

  // 5.9.4 Interior Design & Decor Engineers (مهندسو ديكور وتصاميم هندسية)
  if (
    sub.includes('مهندسو ديكور وتصاميم هندسية') ||
    sub.includes('مهندسو ديكور') ||
    (sub.includes('ديكور') && sub.includes('تصاميم')) ||
    text.includes('مهندسو ديكور') ||
    text.includes('تصميم داخلي وديكور') ||
    (cat.includes('صناعة') && text.includes('ديكور')) ||
    name.includes('تصميم داخلي') ||
    name.includes('مهندس ديكور')
  ) {
    return {
      title: 'معرض خدمات التصميم الداخلي والديكور والمخططات',
      subtitle: 'استعرض خدمات تصميم الديكور الداخلي، لقطات 3D الواقعية، المخططات التنفيذية وتنسيق الفراغات.',
      addItemLabel: 'اسم خدمة التصميم الداخلي أو الديكور *',
      addItemPlaceholder: 'مثال: تصميم ديكور صالون ومجلس، تصميم مودرن لغرفة نوم ماستر، لقطات رندرة 3D واقعية، تصميم داخلي شقة كاملة',
      categoryLabel: 'نوع الفراغ أو نمط الديكور *',
      categoryPlaceholder: 'مثال: تصميم سكني وفلل، تصميم محلات تجارية ومكاتب، تصميم مطابخ، لقطات 3D',
      presetCategories: [
        'تصميم داخلي سكني (شقق وفلل)',
        'تصميم محلات تجارية ومكاتب',
        'تصميم وتوزيع مطابخ عصرية',
        'لقطات رندرة ثلاثية الأبعاد 3D',
        'مخططات تنفيذية وجداول تشطيب',
        'إشراف على تنفيذ أعمال الديكور'
      ],
      presetImages: [
        { name: 'تصميم داخلي مودرن', url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80' },
        { name: 'صالون ومعيشة فخمة', url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80' },
        { name: 'مطبخ عصري وتوزيع فراغات', url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80' },
        { name: 'غرفة نوم ماستر مريحة', url: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر الخدمة أو المتر المربع (د.أ) *',
      pricePlaceholder: 'مثال: 8.00',
      prepTimeLabel: 'المدة التقديرية لتسليم التصميم (اختياري)',
      prepTimeUnit: 'بالأيام أو الأسابيع',
      prepTimePlaceholder: 'مثال: 7',
      prepTimeHelper: 'توضح للعميل المدة الزمنية المطلوبة لتجهيز المقترح والتصميم ثلاثي الأبعاد.',
      versionTypeSizesLabel: 'مستوى التصميم والمخرجات',
      versionTypeAddonsLabel: 'مخططات وإشراف إضافي',
      sizesTitle: 'إضافة باقات ونطاق التصميم',
      sizesSub: 'تتيح للعميل الاختيار بين لقطات ثلاثية الأبعاد أو باقة تنفيذية متكاملة.',
      sizesNameLabel: 'باقة ومستوى التصميم',
      sizesNamePlaceholder: 'مثال: صور 3D فقط، باقة كاملة مع مخططات تنفيذية، إشراف على الموقع',
      presetSizes: [
        'تصميم ثلاثي الأبعاد 3D مع لقطات واقعية',
        'باقة كاملة: صور 3D مع مخططات كهرباء وإنارة وتوزيع',
        'جدول مواصفات المواد والأثاث والدهانات والأكواد',
        'إشراف ميداني على مراحل تنفيذ الديكور'
      ],
      addonsTitle: 'إضافة خدمات مرافقة',
      addonsSub: 'توضيح ميزات مثل الجولات الافتراضية 360 أو عينات المواد.',
      addonsNameLabel: 'اسم الخدمة المضافة',
      addonsNamePlaceholder: 'مثال: جولة بانورامية 360 درجة، زيارة ميدانية لرفع المقاسات',
      presetAddons: [
        'جولة افتراضية بانورامية 360 درجة',
        'زيارة ميدانية لرفع المقاسات بدقة',
        'تعديلات إضافية على التصميم المعتمد',
        'قائمة أماكن شراء الأثاث والمواد بأفضل الأسعار'
      ],
      badges: {
        popular: 'التصميم الأكثر طلباً',
        new: 'نمط ديكور عصري جديد',
        spicyOrFeatured: 'رندرة واقعية فائقة الدقة',
        vegetarianOrPromo: 'باقة متكاملة للمنازل'
      },
      buttonAddText: 'طلب تصميم واستشارة ديكور',
      buttonAddShort: 'طلب تصميم',
      whatsappOrderLabel: 'إرسال طلب استشارة أو تصميم ديكور عبر الواتساب',
      cartIconType: 'home',
      optionsLabel: 'أنماط الديكور والمواد المعتمدة',
      optionsSub: 'توضح النمط المفضل كالمودرن، الكلاسيك، أو النيو كلاسيك.',
      optionsPlaceholder: 'مثال: مودرن حديث، نيو كلاسيك، بوهيمي'
    };
  }

  // 5.9.5 Printing, Copying & Design Services (خدمات طباعة وتصوير وتصميم)
  if (
    sub.includes('طباعة وتصوير وتصميم') ||
    sub.includes('خدمات طباعة') ||
    (sub.includes('طباعة') && sub.includes('تصوير')) ||
    text.includes('خدمات طباعة وتصوير وتصميم') ||
    (text.includes('خدمات طباعة') && text.includes('تصميم'))
  ) {
    return {
      title: 'دليل خدمات الطباعة والتصوير والتصميم الدعائي',
      subtitle: 'استعرض خدمات الطباعة الرقمية والتجارية، تصوير المستندات، طباعة الفلكس والبنرات، وتصميم المطبوعات.',
      addItemLabel: 'اسم خدمة الطباعة أو المطبوعات *',
      addItemPlaceholder: 'مثال: طباعة بزنس كارد فاخر، بنر وفلكس إعلاني، طباعة بروشورات وكتالوجات، رول أب استاند',
      categoryLabel: 'نوع المطبوعات أو الخدمة *',
      categoryPlaceholder: 'مثال: كروت ومطبوعات مكتبية، بنرات ولوحات، طباعة وتغليف، تصوير وثائق',
      presetCategories: [
        'كروت شخصية ومطبوعات شركات',
        'بنرات وفلكس ورول أب إعلاني',
        'بروشورات وفلايرات ومنشورات',
        'أختام وتصوير وتجليد وثائق',
        'طباعة ستيكرات ولاصق للمنتجات',
        'طباعة هدايا ودروع ومجات وتيشرتات'
      ],
      presetImages: [
        { name: 'مطبعة رقمية وماكينات طباعة', url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80' },
        { name: 'كروت شخصية فاخرة', url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80' },
        { name: 'رول أب وبنرات إعلانية', url: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=600&q=80' },
        { name: 'مطبوعات وبروشورات ألوان', url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر الخدمة أو الكمية (د.أ) *',
      pricePlaceholder: 'مثال: 10.00',
      prepTimeLabel: 'مدة التجهيز والطباعة (اختياري)',
      prepTimeUnit: 'بالساعات أو الأيام',
      prepTimePlaceholder: 'مثال: 24',
      prepTimeHelper: 'توضح للعميل وقت تجهيز وطباعة الطلب قبل الاستلام أو التوصيل.',
      versionTypeSizesLabel: 'الكميات والأحجام',
      versionTypeAddonsLabel: 'خيارات الورق والتشطيب',
      sizesTitle: 'إضافة خيارات الكميات والمقاسات',
      sizesSub: 'تتيح للزبون اختيار كمية النسخ أو قياس اللوحة والمطبوعة.',
      sizesNameLabel: 'الكمية أو المقاس',
      sizesNamePlaceholder: 'مثال: 100 كرت، 500 كرت، 1000 نسخة، مقاس A4، مقاس 2×1 متر',
      presetSizes: [
        'كمية تجريبية 100 قطعة',
        'عرض 500 قطعة اقتصادي',
        'عرض 1000 قطعة بسعر الجملة',
        'مقاس مخصص حسب الطلب'
      ],
      addonsTitle: 'إضافة خيارات الورق والتشطيب',
      addonsSub: 'توضيح أنواع السلوفان، البصمة الحرارية والقص الليزري.',
      addonsNameLabel: 'نوع التشطيب أو الورق',
      addonsNamePlaceholder: 'مثال: سلوفان حراري مطفي، بصمة ذهبية بارزة، قص ليزري دائري',
      presetAddons: [
        'سلوفان حراري مطفي أو لامع فاخر',
        'بصمة ذهبية أو فضية بارزة Foil',
        'قص ليزري مخصص بأشكال فريدة Die Cut',
        'خدمة التوصيل السريع إلى باب المنشأة'
      ],
      badges: {
        popular: 'الأكثر طلباً',
        new: 'خامات ومطبوعات حديثة',
        spicyOrFeatured: 'طباعة ليزرية عالية الدقة',
        vegetarianOrPromo: 'عرض كميات خاص'
      },
      buttonAddText: 'طلب طباعة وتجهيز',
      buttonAddShort: 'طلب طباعة',
      whatsappOrderLabel: 'إرسال طلب طباعة أو استفسار عبر الواتساب',
      cartIconType: 'wrench',
      optionsLabel: 'خيارات الورق والتسليم',
      optionsSub: 'توضح سماكة الورق والوزن بالجرام.',
      optionsPlaceholder: 'مثال: ورق كوشيه 350 جرام، ورق مقوى، فلكس كوري'
    };
  }

  // 5.9.6 Graphic Design, Social Media, Marketing Agency, Web Dev (تسويق رقمي، جرافيك، هويات، ويب)
  if (
    sub.includes('تصميم جرافيك وتسويق') ||
    sub.includes('تصميم جرافيك') ||
    sub.includes('تسويق وإدارة صفحات') ||
    sub.includes('وكالات التسويق الرقمي') ||
    sub.includes('تصميم الهويات وتطوير الويب') ||
    sub.includes('تطوير الويب') ||
    text.includes('تصميم جرافيك وتسويق') ||
    text.includes('وكالات التسويق الرقمي') ||
    (text.includes('تسويق') && text.includes('إدارة صفحات')) ||
    (text.includes('تصميم الهويات') && text.includes('الويب'))
  ) {
    return {
      title: 'دليل باقات التسويق الرقمي وتصميم الهويات وتطوير الويب',
      subtitle: 'استعرض باقات إدارة منصات التواصل، تصميم الهويات البصرية، إعلانات السوشيال ميديا وتطوير المواقع والمتاجر.',
      addItemLabel: 'اسم الباقة أو الخدمة التسويقية والتصميمية *',
      addItemPlaceholder: 'مثال: باقة إدارة صفحات شهرية متكاملة، تصميم هوية بصرية كاملة، حملة إعلانية ممولة، تطوير موقع تعريفي ومتجر إلكتروني',
      categoryLabel: 'نوع الباقة أو الخدمة *',
      categoryPlaceholder: 'مثال: إدارة منصات وسوشيال ميديا، تصميم جرافيك وهوية، حملات إعلانية ممولة، مواقع ومتاجر ويب',
      presetCategories: [
        'إدارة وتنشيط صفحات السوشيال ميديا',
        'تصميم الهوية البصرية والشعارات Branding',
        'إدارة الحملات الإعلانية الممولة Ads',
        'تطوير وتصميم المواقع والمتاجر الإلكترونية',
        'كتابة محتوى وسيناريوهات إعلانية',
        'تصاميم سوشيال ميديا وموشن جرافيك'
      ],
      presetImages: [
        { name: 'تسويق رقمي وإحصائيات', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80' },
        { name: 'تصميم هوية وشعارات', url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80' },
        { name: 'برمجة وتطوير ويب', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=600&q=80' },
        { name: 'فريق عمل وكالة تسويق', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر الباقة أو الخدمة (د.أ) *',
      pricePlaceholder: 'مثال: 90.00',
      prepTimeLabel: 'فترة إنجاز وتسليم الباقة (اختياري)',
      prepTimeUnit: 'بالأيام أو شهري',
      prepTimePlaceholder: 'مثال: 30',
      prepTimeHelper: 'توضح للعميل مدة الاشتراك الشهري أو وقت تسليم مخرجات الهوية والموقع.',
      versionTypeSizesLabel: 'نطاق الباقة والمخرجات',
      versionTypeAddonsLabel: 'خدمات إضافية وترقية',
      sizesTitle: 'إضافة مستويات وباقات الخدمة',
      sizesSub: 'تتيح للعميل الاختيار بين باقة أساسية، متقدمة، أو احترافية VIP.',
      sizesNameLabel: 'مستوى الباقة',
      sizesNamePlaceholder: 'مثال: باقة أساسية 12 منشور، باقة نمو متقدمة 20 منشور، باقة VIP متكاملة',
      presetSizes: [
        'باقة انطلاق أساسية تشمل إدارة وحملة إعلانية',
        'باقة نمو متقدمة مع تصاميم موشن وفيديوهات ريلز',
        'باقة احترافية VIP شاملة التصوير والمونتاج وإدارة الإعلانات',
        'تصميم هوية بصرية متكاملة تشمل الشعار وكافة التطبيقات'
      ],
      addonsTitle: 'إضافة خدمات وترقيات إضافية',
      addonsSub: 'توضيح ميزات إضافية مثل تصوير المنتجات أو ربط بوابات الدفع.',
      addonsNameLabel: 'اسم الخدمة الترويجية المضافة',
      addonsNamePlaceholder: 'مثال: يوم تصوير فوتوغرافي ميداني، ربط دومين وايميل رسمي',
      presetAddons: [
        'جلسة تصوير ميدانية احترافية للمنتجات والمقر',
        'إعداد وضبط إعلانات تيك توك وإنستغرام وفيسبوك الممولة',
        'تقرير أداء وإحصائيات شهرية مفصلة',
        'دعم فني وتعديلات تصميم سريعة طوال الشهر'
      ],
      badges: {
        popular: 'الباقة الأكثر طلباً',
        new: 'عرض باقة تسويقية جديدة',
        spicyOrFeatured: 'شاملة إدارة الإعلانات الممولة',
        vegetarianOrPromo: 'خصم اشتراك ربع سنوي'
      },
      buttonAddText: 'طلب اشتراك أو باقة',
      buttonAddShort: 'طلب الباقة',
      whatsappOrderLabel: 'إرسال طلب اشتراك في الباقة التسويقية أو تصميم الهوية عبر الواتساب',
      cartIconType: 'wrench',
      optionsLabel: 'المنصات والخدمات المشمولة',
      optionsSub: 'توضح منصات النشر كإنستغرام، فيسبوك، وتيك توك.',
      optionsPlaceholder: 'مثال: إدارة إنستغرام وفيسبوك، متجر ووكومرس، شوبيفاي'
    };
  }

  // 5.9.7 Travel, Tourism, Hajj & Umrah (مكاتب سياحة وسفر وحج وعمرة)
  if (
    sub.includes('سياحة وسفر') ||
    sub.includes('حج وعمرة') ||
    (sub.includes('سياحة') && sub.includes('سفر')) ||
    text.includes('سياحة وسفر') ||
    text.includes('حج وعمرة') ||
    name.includes('سياحة وسفر') ||
    name.includes('للسياحة') ||
    name.includes('للحج والعمرة')
  ) {
    return {
      title: 'دليل برامج السياحة والسفر ورحلات الحج والعمرة',
      subtitle: 'استعرض باقات السفر السياحية، رحلات العمرة والحج، تذاكر الطيران، وحجوزات الفنادق والتأشيرات.',
      addItemLabel: 'اسم البرنامج السياحي أو رحلة العمرة أو الخدمة *',
      addItemPlaceholder: 'مثال: رحلة عمرة براً VIP، باقة سياحية إلى تركيا 8 أيام، تذكرة طيران وحجز فندقي، إصدار تأشيرة سياحية',
      categoryLabel: 'نوع الرحلة أو الوجهة السياحية *',
      categoryPlaceholder: 'مثال: رحلات عمرة وزيارة، رحلات سياحية خارجية، حجوزات طيران وفنادق، تأشيرات سياحية',
      presetCategories: [
        'رحلات العمرة والزيارة (براً وجواً)',
        'رحلات سياحية خارجية متكاملة',
        'عروض الطيران وحجوزات الفنادق',
        'برامج السياحة الداخلية والرحلات اليومية',
        'إصدار التأشيرات والفيز السياحية',
        'تأمين السفر والخدمات اللوجستية'
      ],
      presetImages: [
        { name: 'رحلات عمرة وحرم مكي', url: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=600&q=80' },
        { name: 'سفر وسياحة وطيران', url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=600&q=80' },
        { name: 'وجهات ومدن سياحية', url: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80' },
        { name: 'حقائب وجواز سفر', url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر الرحلة أو البرنامج للشخص (د.أ) *',
      pricePlaceholder: 'مثال: 120.00',
      prepTimeLabel: 'مدة الرحلة أو البرنامج (اختياري)',
      prepTimeUnit: 'بالأيام (مثال: 7)',
      prepTimePlaceholder: 'مثال: 7',
      prepTimeHelper: 'توضح للمسافر إجمالي عدد أيام وليالي البرنامج السياحي أو رحلة العمرة.',
      versionTypeSizesLabel: 'مستوى الإقامة وفئة الفندق',
      versionTypeAddonsLabel: 'خدمات وجولات إضافية',
      sizesTitle: 'إضافة فئات الإقامة ونوع الغرف',
      sizesSub: 'تتيح للمسافر اختيار فئة الفندق ونوع الغرفة مثل: غرفة ثنائية، ثلاثية، أو رباعية.',
      sizesNameLabel: 'فئة الإقامة أو نوع الغرفة',
      sizesNamePlaceholder: 'مثال: غرفة ثنائية، غرفة ثلاثية، فنادق 4 نجوم، فنادق 5 نجوم مطلة',
      presetSizes: [
        'غرفة ثنائية (شخصين)',
        'غرفة ثلاثية',
        'غرفة رباعية عائلية',
        'فنادق 5 نجوم VIP قريبة من الحرم'
      ],
      addonsTitle: 'إضافة خدمات سياحية مرافقة',
      addonsSub: 'توضيح ميزات إضافية مثل الوجبات، الجولات الإرشادية، والمواصلات الخاصة.',
      addonsNameLabel: 'اسم الخدمة المضافة',
      addonsNamePlaceholder: 'مثال: شامل وجبتي إفطار وعشاء، جولات سياحية مع مرشد، استقبال خاص من المطار',
      presetAddons: [
        'شامل وجبات الإفطار والعشاء بوفيه مفتوح',
        'جولات سياحية يومية مع مرشد سياحي مرخص',
        'استقبال وتوديع خاص بسيارة VIP من وإلى المطار',
        'تأمين صحي شامل للسفر'
      ],
      badges: {
        popular: 'الرحلة الأكثر طلباً',
        new: 'برنامج رحلة جديد',
        spicyOrFeatured: 'شامل كافة التأشيرات والإقامة',
        vegetarianOrPromo: 'عرض حجز مبكر'
      },
      buttonAddText: 'طلب حجز واستفسار عن الرحلة',
      buttonAddShort: 'حجز الرحلة',
      whatsappOrderLabel: 'إرسال طلب حجز واستفسار عن البرنامج السياحي أو رحلة العمرة عبر الواتساب',
      cartIconType: 'edu',
      optionsLabel: 'مواعيد الانطلاق ونوع النقل',
      optionsSub: 'توضح تواريخ الرحلات ونوع الحافلات أو خطوط الطيران.',
      optionsPlaceholder: 'مثال: انطلاق أسبوعي كل أربعاء، طيران مباشر، حافلات حديثة VIP'
    };
  }

  // 5.9.8 Car Rental Offices (مكاتب تأجير سيارات)
  if (
    sub.includes('تأجير سيارات') ||
    (sub.includes('تأجير') && sub.includes('سيار')) ||
    text.includes('مكاتب تأجير سيارات') ||
    text.includes('تأجير سيارات سياحية') ||
    name.includes('تأجير سيارات') ||
    name.includes('لتأجير السيارات')
  ) {
    return {
      title: 'أسطول ودليل السيارات السياحية المتاحة للإيجار',
      subtitle: 'استعرض السيارات السياحية المتوفرة، الفئات الاقتصادية والعائلية والفخمة، واحجز سيارتك بسهولة.',
      addItemLabel: 'اسم أو موديل وفئة السيارة المعروضة للإيجار *',
      addItemPlaceholder: 'مثال: هيونداي النترا 2024 هايبرد، تويوتا كامري 2024 فل كامل، كيا سبورتاج جيب عائلي',
      categoryLabel: 'فئة ونوع السيارة السياحية *',
      categoryPlaceholder: 'مثال: سيارات اقتصادية، سيارات هايبرد وكهرباء، سيارات دفع رباعي SUV، سيارات فخمة VIP',
      presetCategories: [
        'سيارات اقتصادية ومدمجة',
        'سيارات عائلية وسيدان هايبرد',
        'سيارات دفع رباعي وجيبات SUV',
        'سيارات فخمة وفارهة VIP',
        'فانات وباصات سياحية لنقل المجموعات',
        'عروض الإيجار الأسبوعي والشهري'
      ],
      presetImages: [
        { name: 'سيارة سيدان حديثة', url: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=600&q=80' },
        { name: 'سيارة دفع رباعي فخمة', url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80' },
        { name: 'أسطول سيارات مصطفة', url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80' },
        { name: 'مفتاح سيارة واستلام', url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'أجرة الإيجار اليومي للسيارة (د.أ) *',
      pricePlaceholder: 'مثال: 20.00',
      prepTimeLabel: 'وقت تجهيز وتسليم السيارة (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 20)',
      prepTimePlaceholder: 'مثال: 20',
      prepTimeHelper: 'توضح للعميل سرعة تجهيز وفحص وغسيل السيارة قبل موعد التسليم.',
      versionTypeSizesLabel: 'فترات الإيجار وعداد الكيلومترات',
      versionTypeAddonsLabel: 'تأمين وإضافات السفر',
      sizesTitle: 'إضافة باقات وفترات الإيجار',
      sizesSub: 'تتيح للمستأجر اختيار مدة الإيجار مثل: يومي، أسبوعي، شهري مع خصم خاص.',
      sizesNameLabel: 'فترة الإيجار أو الباقة',
      sizesNamePlaceholder: 'مثال: إيجار يومي، إيجار أسبوعي مع خصم، إيجار شهري، كيلو متر مفتوح',
      presetSizes: [
        'إيجار يومي (24 ساعة)',
        'إيجار أسبوعي مع خصم خاص',
        'إيجار شهري للشركات والأفراد',
        'باقة عداد كيلومترات مفتوح'
      ],
      addonsTitle: 'إضافة خيارات التأمين والمرافق',
      addonsSub: 'توضيح ميزات إضافية مثل التأمين الشامل، مقعد أطفال، وسائق خاص.',
      addonsNameLabel: 'اسم الخدمة المضافة',
      addonsNamePlaceholder: 'مثال: تأمين شامل صفر إعفاء، مقعد أطفال معقم، تسليم واستلام من المطار',
      presetAddons: [
        'تأمين شامل بدون نسبة إعفاء',
        'تسليم واستلام مباشر من مطار الملكة علياء',
        'مقعد أطفال معقم ومثبت',
        'توفير سائق سياحي محترف'
      ],
      badges: {
        popular: 'السيارة الأكثر طلباً',
        new: 'موديل السنة حديث',
        spicyOrFeatured: 'شامل التأمين وكيلومتر مجاني',
        vegetarianOrPromo: 'عرض إيجار أسبوعي'
      },
      buttonAddText: 'طلب حجز السيارة',
      buttonAddShort: 'حجز سيارة',
      whatsappOrderLabel: 'إرسال طلب حجز وتأجير سيارة عبر الواتساب',
      cartIconType: 'car',
      optionsLabel: 'شروط الاستئجار والوقود',
      optionsSub: 'توضح سياسة الوقود والعمر والتأمين المعتمد.',
      optionsPlaceholder: 'مثال: استلام وتسليم نفس مستوى الوقود، رخصة قيادة أردنية أو دولية'
    };
  }

  // 5.9.9 Taxi, Passenger Transport & Shipping (مكاتب تكسي ونقل وشحن)
  if (
    sub.includes('تكسي ونقل وشحن') ||
    (sub.includes('تكسي') && sub.includes('نقل')) ||
    sub.includes('مكاتب تكسي') ||
    text.includes('مكاتب تكسي') ||
    text.includes('نقل وشحن') ||
    name.includes('تكسي') ||
    name.includes('سفريات')
  ) {
    return {
      title: 'دليل خدمات التكسي والسفريات والنقل والشحن',
      subtitle: 'استعرض خدمات التوصيل، طلبات التكسي، رحلات السفريات الخارجية، وخدمات النقل والشحن السريع.',
      addItemLabel: 'اسم مسار التوصيل أو خدمة النقل أو الشحن *',
      addItemPlaceholder: 'مثال: طلب تكسي داخلي إربد، مشوار مطار الملكة علياء VIP، توصيل عمان إربد سفريات، شحن طرود ونقل بضائع',
      categoryLabel: 'نوع خدمة النقل أو المسار *',
      categoryPlaceholder: 'مثال: تكسي وطلبات داخلية، سفريات ومطار، نقل ركاب محافظات، شحن طرود وبضائع',
      presetCategories: [
        'تكسي وطلبات مشاوير داخل قصبة إربد',
        'توصيل واستقبال مطار الملكة علياء الدولي',
        'رحلات سفريات عمان - إربد والمحافظات',
        'شحن ونقل طرود سريعة من الباب للباب',
        'خدمات نقل وشحن بضائع وأثاث خفيف',
        'اشتراكات توصيل موظفين وطلاب شهرية'
      ],
      presetImages: [
        { name: 'سيارة تكسي وسفريات', url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80' },
        { name: 'طريق وسفر خارجي', url: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=600&q=80' },
        { name: 'شحن ونقل طرود', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80' },
        { name: 'سائق وتوصيل سريع', url: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'أجرة المشوار أو سعر الشحن (د.أ) *',
      pricePlaceholder: 'مثال: 15.00',
      prepTimeLabel: 'وقت الوصول المتوقع للسيارة (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 10)',
      prepTimePlaceholder: 'مثال: 10',
      prepTimeHelper: 'توضح للزبون الوقت التقديري لوصول السائق أو سيارة النقل إلى موقعه.',
      versionTypeSizesLabel: 'نوع المركبة وفئة الخدمة',
      versionTypeAddonsLabel: 'خدمات انتظار وتوصيل إضافية',
      sizesTitle: 'إضافة فئات المركبات ونوع الخدمة',
      sizesSub: 'تتيح للراكب الاختيار بين سيارة عادية، سيارة عائلية كبيرة، أو تكسي VIP.',
      sizesNameLabel: 'فئة المركبة أو المسار',
      sizesNamePlaceholder: 'مثال: سيارة سيدان عادية، سيارة عائلية 7 ركاب، سيارة VIP، ونش نقل',
      presetSizes: [
        'سيارة سيدان اقتصادية',
        'سيارة عائلية واسعة (7 ركاب)',
        'خدمة نقل وتوصيل VIP',
        'مركبة نقل وشحن طرود مغلقة'
      ],
      addonsTitle: 'إضافة خدمات مرافقة للمشوار',
      addonsSub: 'توضيح ميزات إضافية مثل ساعة انتظار، مسارات متعددة، ونقل حقائب إضافية.',
      addonsNameLabel: 'اسم الخدمة المضافة',
      addonsNamePlaceholder: 'مثال: ساعة انتظار، نقطة توقف إضافية، تحميل وتنزيل الطرود',
      presetAddons: [
        'ساعة انتظار إضافية مع السائق',
        'التوقف في نقطة ثانية على الطريق',
        'خدمة التحميل والتنزيل للطرود',
        'توفير فاتورة شحن ونقل ضريبية'
      ],
      badges: {
        popular: 'المسار الأكثر طلباً',
        new: 'مسار جديد متاح',
        spicyOrFeatured: 'خدمة فورية على مدار 24 ساعة',
        vegetarianOrPromo: 'سعر مشوار خاص ذهاب وإياب'
      },
      buttonAddText: 'طلب تكسي أو نقل مشوار',
      buttonAddShort: 'طلب مشوار',
      whatsappOrderLabel: 'إرسال طلب تكسي أو توصيل أو شحن طرد عبر الواتساب',
      cartIconType: 'car',
      optionsLabel: 'مواعيد الخدمة والتغطية الجغرافية',
      optionsSub: 'توضح مناطق التغطية وتوفر الخدمة على مدار الساعة.',
      optionsPlaceholder: 'مثال: متاح 24 ساعة، تغطية شاملة لكافة ألوية إربد'
    };
  }

  // 5.9.10 Hotels, Furnished Hotel Apartments, Private Farms & Chalets (فنادق وشقق فندقية ومزارع وشاليهات خاصة)
  if (
    sub.includes('فنادق وشقق فندقية') ||
    sub.includes('مزارع وشاليهات خاصة') ||
    (sub.includes('فنادق') && sub.includes('شقق')) ||
    (sub.includes('مزارع') && sub.includes('شاليهات')) ||
    text.includes('فنادق وشقق فندقية') ||
    text.includes('مزارع وشاليهات') ||
    text.includes('شاليهات خاصة') ||
    name.includes('فندق') ||
    name.includes('شاليه') ||
    name.includes('مزرعة')
  ) {
    return {
      title: 'دليل الغرف والأجنحة الفندقية والمزارع والشاليهات المتاحة للحجز',
      subtitle: 'استعرض الأجنحة والغرف الفندقية الفاخرة، والشاليهات والمزارع الخاصة مع المسابح والمرافق الترفيهية.',
      addItemLabel: 'اسم الجناح أو الغرفة الفندقية أو الشاليه المعروض للحجز *',
      addItemPlaceholder: 'مثال: جناح فندقي عائلي ديلوكس، غرفة فندقية كينغ مطلة، شاليه خاص مع مسبح مدفأ، مزرعة خاصة للعائلات والمناسبات',
      categoryLabel: 'نوع الإقامة أو المرفق الترفيهي *',
      categoryPlaceholder: 'مثال: أجنحة فندقية، غرف ديلوكس، شاليهات مع مسبح، مزارع خاصة، شقق فندقية',
      presetCategories: [
        'أجنحة فندقية فاخرة VIP',
        'غرف فندقية مفردة ومزدوجة ديلوكس',
        'شقق فندقية عائلية مجهزة بالكامل',
        'شاليهات خاصة مع مسبح مستقل',
        'مزارع خاصة للعائلات والجمعات',
        'باقات الحجز اليومي وعطلة نهاية الأسبوع'
      ],
      presetImages: [
        { name: 'جناح فندقي فاخر', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80' },
        { name: 'غرفة نوم فندقية كينغ', url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80' },
        { name: 'شاليه خاص ومسبح', url: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=600&q=80' },
        { name: 'مزرعة وجلسة عائلية خارجية', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'أجرة الليلة أو الحجز اليومي (د.أ) *',
      pricePlaceholder: 'مثال: 70.00',
      prepTimeLabel: 'ساعات تسجيل الدخول والخروج (اختياري)',
      prepTimeUnit: 'ساعة (مثال: 14)',
      prepTimePlaceholder: 'مثال: 14',
      prepTimeHelper: 'توضح للنزيل موعد تسجيل الدخول Check-in (مثال: الساعة 2:00 ظهراً) ووقت المغادرة.',
      versionTypeSizesLabel: 'فترات الإقامة وأيام الحجز',
      versionTypeAddonsLabel: 'خدمات ومرافق الضيافة',
      sizesTitle: 'إضافة باقات الإقامة وفترات الحجز',
      sizesSub: 'تتيح للنزيل الاختيار بين حجز منتصف الأسبوع، عطلة نهاية الأسبوع، أو باقة مبيت كامل.',
      sizesNameLabel: 'فترة الحجز أو نوع الباقة',
      sizesNamePlaceholder: 'مثال: مبيت ليلة واحدة، حجز نهاري للشاليه، باقة الويكند عطلة نهاية الأسبوع',
      presetSizes: [
        'مبيت ليلة واحدة (دخول 2 ظهراً وخروج 12 ظهراً)',
        'حجز نهاري للشاليه أو المزرعة (صباحي ومسائي)',
        'باقة عطلة نهاية الأسبوع (خميس وجمعة)',
        'إقامة أسبوعية بأسعار مخفضة'
      ],
      addonsTitle: 'إضافة مرافق وخدمات ضيافة مرافقة',
      addonsSub: 'توضيح ميزات إضافية مثل تدفئة المسبح، بوفيه الإفطار، ومعدات الشواء.',
      addonsNameLabel: 'اسم الخدمة أو المرفق المضاف',
      addonsNamePlaceholder: 'مثال: تدفئة مسبح الشاليه، فطور فندقي بوفيه، جلسة شواء خارجية مع حطب',
      presetAddons: [
        'تدفئة مياه المسبح (للشاليهات والمزارع)',
        'بوفيه إفطار فندقي مفتوح لشخصين',
        'تجهيز جلسة شواء خارجية متكاملة مع الحطب',
        'سرير إضافي مجهز للغرفة أو الجناح'
      ],
      badges: {
        popular: 'الوحدة الأكثر طلباً وحجزاً',
        new: 'متاح للحجز حديثاً',
        spicyOrFeatured: 'شامل المسبح والجاكوزي والمرافق',
        vegetarianOrPromo: 'عرض حجز أيام الأسبوع'
      },
      buttonAddText: 'طلب حجز وتأكيد الإقامة',
      buttonAddShort: 'طلب حجز',
      whatsappOrderLabel: 'إرسال طلب حجز فندقي أو شاليه أو مزرعة عبر الواتساب',
      cartIconType: 'home',
      optionsLabel: 'مرافق المكان والسياسات العامة',
      optionsSub: 'توضح توفر الإنترنت ومواقف السيارات وسياسة العائلات.',
      optionsPlaceholder: 'مثال: للعائلات فقط، مسبح معقم بالكامل، كراج خاص مظلل، إنترنت فايبر'
    };
  }

  // 5.9.11 Government Document Clearing Services (تخليص معاملات وخدمات حكومية)
  if (
    sub.includes('تخليص معاملات') ||
    sub.includes('خدمات حكومية') ||
    text.includes('تخليص معاملات') ||
    text.includes('معاملات حكومية') ||
    name.includes('تخليص معاملات')
  ) {
    return {
      title: 'دليل خدمات تخليص المعاملات والاستشارات الحكومية',
      subtitle: 'استعرض خدمات متابعة وإنجاز المعاملات، التراخيص الحكومية، وتوثيق المستندات الرسمية.',
      addItemLabel: 'اسم المعاملة أو الخدمة الحكومية *',
      addItemPlaceholder: 'مثال: تجديد رخص المهن، معاملات الأراضي والمساحة، تصديق وثائق وشهادات، معاملات الضمان والضرائب',
      categoryLabel: 'الدائرة الحكومية أو نوع المعاملة *',
      categoryPlaceholder: 'مثال: رخص مهن وبلديات، أراضي ومالية، ضمان وضرائب، تصديقات رسمية',
      presetCategories: [
        'رخص المهن والبلديات والسجلات التجارية',
        'معاملات الأراضي والمساحة ونقل الملكية',
        'خدمات الضمان الاجتماعي وضريبة الدخل',
        'تصديق وتوثيق المستندات والوكالات',
        'معاملات الإقامة وتصاريح العمل والوافدين',
        'استشارات ومتابعة الدوائر الحكومية'
      ],
      presetImages: [
        { name: 'معاملات وأوراق رسمية', url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80' },
        { name: 'مكتب خدمات ومعاملات', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80' },
        { name: 'أختام وتوثيق رسمي', url: 'https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?auto=format&fit=crop&w=600&q=80' },
        { name: 'ملفات وتراخيص مهن', url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'أتعاب إنجاز المعاملة (د.أ) *',
      pricePlaceholder: 'مثال: 25.00',
      prepTimeLabel: 'المدة التقديرية لإنجاز المعاملة (اختياري)',
      prepTimeUnit: 'بالأيام أو الساعات',
      prepTimePlaceholder: 'مثال: 3',
      prepTimeHelper: 'توضح للعميل الفترة الزمنية المتوقعة لإنهاء المعاملة لدى الجهات المختصة.',
      versionTypeSizesLabel: 'نوع ومستوى الخدمة',
      versionTypeAddonsLabel: 'خدمات مرافقة ورسوم',
      sizesTitle: 'إضافة مستويات وسرعة الخدمة',
      sizesSub: 'تتيح للعميل الاختيار بين إنجاز عادي أو تسليم مستعجل.',
      sizesNameLabel: 'مستوى الخدمة أو سرعة الإنجاز',
      sizesNamePlaceholder: 'مثال: إنجاز قياسي، إنجاز مستعجل فوري، استلام وتسليم المعاملة من المنزل',
      presetSizes: [
        'إنجاز قياسي خلال المدة المحددة',
        'إنجاز مستعجل فوري',
        'متابعة ملف المعاملة بالكامل حتى الصدور',
        'استلام وتسليم الوثائق من مقر العميل'
      ],
      addonsTitle: 'إضافة خدمات مرافقة',
      addonsSub: 'توضيح ميزات إضافية مثل دفع الرسوم الحكومية أو التصديق الإضافي.',
      addonsNameLabel: 'اسم الخدمة المضافة',
      addonsNamePlaceholder: 'مثال: دفع الرسوم نيابة عن العميل، استخراج صور طبق الأصل',
      presetAddons: [
        'تسديد الرسوم الحكومية والوصولات نيابة عن العميل',
        'استخراج نسخ طبق الأصل مصدقة',
        'توصيل المعاملة الجاهزة إلى باب المنزل',
        'إشعار ومتابعة رسائل SMS بمراحل المعاملة'
      ],
      badges: {
        popular: 'الخدمة الأكثر طلباً',
        new: 'خدمة حكومية إلكترونية جديدة',
        spicyOrFeatured: 'إنجاز سريع ومضمون',
        vegetarianOrPromo: 'أتعاب مخفضة للمعاملات المتعددة'
      },
      buttonAddText: 'طلب تخليص معاملة',
      buttonAddShort: 'طلب إنجاز',
      whatsappOrderLabel: 'إرسال طلب تخليص أو متابعة معاملة عبر الواتساب',
      cartIconType: 'wrench',
      optionsLabel: 'الجهات والدوائر المشمولة',
      optionsSub: 'توضح الدوائر الحكومية المعنية كوزارة الصناعة، دائرة الأراضي، وأمانة أو بلديات.',
      optionsPlaceholder: 'مثال: بلدية إربد الكبرى، دائرة الأراضي والمساحة، وزارة التجارة والصناعة'
    };
  }

  // 5.9.12 Recruitment & HR Consulting (مكاتب توظيف وتدريب)
  if (
    sub.includes('مكاتب توظيف') ||
    sub.includes('توظيف وتدريب') ||
    (sub.includes('توظيف') && sub.includes('تدريب')) ||
    text.includes('مكاتب توظيف') ||
    text.includes('توظيف وتدريب') ||
    text.includes('استشارات موارد بشرية') ||
    name.includes('توظيف') ||
    name.includes('استقطاب')
  ) {
    return {
      title: 'دليل خدمات التوظيف والاستشارات المهنية والموارد البشرية',
      subtitle: 'استعرض خدمات استقطاب وتوظيف الكفاءات، مراجعة وتجهيز السير الذاتية، وبرامج التأهيل المهني.',
      addItemLabel: 'اسم الخدمة المهنية أو الباقة الوظيفية *',
      addItemPlaceholder: 'مثال: توظيف واستقطاب كوادر للشركات، صياغة سيرة ذاتية احترافية ATS، تجهيز لمقابلات العمل، تدريب وظيفي وتأهيل',
      categoryLabel: 'مجال الخدمة أو الاستشارة *',
      categoryPlaceholder: 'مثال: خدمات توظيف الشركات، تطوير السير الذاتية، استشارات مهنية، تدريب وتأهيل كوادر',
      presetCategories: [
        'خدمات استقطاب وتوظيف الكوادر للشركات',
        'كتابة وتصميم السيرة الذاتية الاحترافية ATS',
        'جلسات المحاكاة والاستعداد لمقابلات العمل',
        'استشارات التطوير المهني والمسار الوظيفي',
        'تأهيل وتدريب الموظفين والفرق',
        'إعداد الملفات الشخصية على LinkedIn'
      ],
      presetImages: [
        { name: 'مقابلة توظيف وعمل', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80' },
        { name: 'فريق عمل وموارد بشرية', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80' },
        { name: 'سيرة ذاتية وتطوير مهني', url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80' },
        { name: 'جلسة تدريب وتأهيل', url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'رسوم أو تكلفة الخدمة (د.أ) *',
      pricePlaceholder: 'مثال: 15.00',
      prepTimeLabel: 'مدة الجلسة أو إنجاز الخدمة (اختياري)',
      prepTimeUnit: 'بالساعات أو الأيام',
      prepTimePlaceholder: 'مثال: 48',
      prepTimeHelper: 'توضح للعميل وقت إنهاء مراجعة السيرة الذاتية أو موعد جلسة التدريب والاستشارة.',
      versionTypeSizesLabel: 'فئة الباقة ونطاق الخدمة',
      versionTypeAddonsLabel: 'خدمات إضافية ومتابعة',
      sizesTitle: 'إضافة باقات وفئات الخدمة',
      sizesSub: 'تتيح للباحث عن عمل أو الشركة اختيار نطاق الخدمة المناسب.',
      sizesNameLabel: 'فئة الباقة أو نوع التدريب',
      sizesNamePlaceholder: 'مثال: باقة فردية أساسية، باقة خريج جديد، باقة شركات للتوظيف',
      presetSizes: [
        'باقة فردية أساسية',
        'باقة متقدمة مع تدريب على المقابلات',
        'باقة احترافية شاملة تحسين ملف LinkedIn',
        'باقة استقطاب وتوظيف كوادر للشركات'
      ],
      addonsTitle: 'إضافة خدمات مرافقة',
      addonsSub: 'توضيح ميزات إضافية مثل خطابات التوصية، نماذج الإيميل، والمتابعة.',
      addonsNameLabel: 'اسم الخدمة المضافة',
      addonsNamePlaceholder: 'مثال: خطاب تقديم احترافي Cover Letter، مراجعة مجانية ثانية',
      presetAddons: [
        'كتابة خطاب تقديم احترافي Cover Letter',
        'مراجعة وتحديث مجاني خلال أسبوعين',
        'توفير نماذج إيميلات رسمية للتقديم والمتابعة',
        'جلسة تقييم مهارات وظيفية تفصيلية'
      ],
      badges: {
        popular: 'الخدمة الأكثر طلباً',
        new: 'برنامج مهني جديد',
        spicyOrFeatured: 'معايير توظيف واحترافية عالية',
        vegetarianOrPromo: 'عرض باقة الخريجين الجدد'
      },
      buttonAddText: 'طلب استشارة أو باقة مهنية',
      buttonAddShort: 'طلب الخدمة',
      whatsappOrderLabel: 'إرسال طلب توظيف أو استشارة مهنية عبر الواتساب',
      cartIconType: 'edu',
      optionsLabel: 'طريقة التقديم والتواصل',
      optionsSub: 'توضح إمكانية عقد الجلسات وجاهياً أو عن بعد عبر الفيديو.',
      optionsPlaceholder: 'مثال: جلسات أونلاين عبر Zoom، جلسات وجاهية بمقر المركز'
    };
  }

  // 5.9.13 Photography, Videography & Content Creation (تصوير ومونتاج وإنشاء محتوى من المنزل / استوديوهات تصوير)
  if (
    sub.includes('تصوير ومونتاج') ||
    sub.includes('إنشاء محتوى') ||
    (sub.includes('تصوير') && (sub.includes('مونتاج') || sub.includes('محتوى') || sub.includes('منزل'))) ||
    text.includes('تصوير ومونتاج') ||
    text.includes('إنشاء محتوى') ||
    text.includes('صناعة محتوى') ||
    sub.includes('استوديوهات تصوير') ||
    text.includes('استوديوهات تصوير')
  ) {
    return {
      title: 'دليل باقات التصوير والمونتاج وصناعة المحتوى المرئي',
      subtitle: 'استعرض باقات الجلسات التصويرية، تصوير المنتجات، خدمات المونتاج الاحترافي، وصناعة الفيديوهات القصيرة.',
      addItemLabel: 'اسم جلسة التصوير أو خدمة المونتاج والمحتوى *',
      addItemPlaceholder: 'مثال: جلسة تصوير شخصية فوتوسيشن، تصوير منتجات للمتاجر، مونتاج فيديو ريلز وتيك توك، تغطية فعاليات',
      categoryLabel: 'نوع جلسة التصوير أو الإنتاج *',
      categoryPlaceholder: 'مثال: تصوير شخصي وفوتوسيشن، تصوير منتجات وإعلانات، مونتاج ريلز وفيديو، تغطية مناسبات',
      presetCategories: [
        'جلسات تصوير شخصية وبورتريه (فوتوسيشن)',
        'تصوير منتجات احترافي للمتاجر والمطاعم',
        'مونتاج فيديو وتعديل ألوان ومؤثرات',
        'صناعة فيديوهات ريلز وتيك توك إعلانية',
        'تغطية فعاليات ومؤتمرات وحفلات تخرج',
        'تعديل الصور الرقمية ومعالجة الريتاتش'
      ],
      presetImages: [
        { name: 'كاميرا احترافية وعدسة', url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80' },
        { name: 'جلسة تصوير فوتوسيشن', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80' },
        { name: 'مونتاج فيديو على شاشة', url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80' },
        { name: 'إضاءة واستوديو تصوير', url: 'https://images.unsplash.com/photo-1520390138845-fd2d229dd553?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'تكلفة الجلسة أو الفيديو (د.أ) *',
      pricePlaceholder: 'مثال: 30.00',
      prepTimeLabel: 'مدة الجلسة أو التسليم النهائي (اختياري)',
      prepTimeUnit: 'بالساعات أو الأيام',
      prepTimePlaceholder: 'مثال: 3',
      prepTimeHelper: 'توضح للعميل مدة جلسة التصوير أو وقت تسليم الصور والفيديوهات النهائية بعد المونتاج.',
      versionTypeSizesLabel: 'فئة الجلسة وعدد الصور أو الفيديوهات',
      versionTypeAddonsLabel: 'تعديلات ومخرجات إضافية',
      sizesTitle: 'إضافة باقات وفئات التصوير',
      sizesSub: 'تتيح للعميل اختيار باقة التصوير حسب عدد الصور المخرجة وساعات التصوير.',
      sizesNameLabel: 'فئة الباقة أو عدد الصور',
      sizesNamePlaceholder: 'مثال: باقة مصغرة (10 صور معالجة)، باقة كاملة (25 صورة)، فيديو ريلز 30 ثانية',
      presetSizes: [
        'باقة مصغرة (10 صور معالجة باحترافية)',
        'باقة متكاملة (25 صورة معالجة مع فيديو قصير)',
        'فيديو ريلز أو تيك توك إعلاني مونتاج كامل',
        'تغطية مناسبة أو فعالية نصف يوم'
      ],
      addonsTitle: 'إضافة خدمات ومخرجات مرافقة',
      addonsSub: 'توضيح ميزات إضافية مثل تسليم الصور الخام، طباعة ألبوم، أو تعديل إضافي.',
      addonsNameLabel: 'اسم الخدمة المضافة',
      addonsNamePlaceholder: 'مثال: تسليم كافة الصور الخام RAW، طباعة ألبوم حراري، مونتاج فيديو إضافي',
      presetAddons: [
        'تسليم كافة الصور الأصلية واللقطات الخام RAW',
        'طباعة ألبوم صور ميني عالي الجودة',
        'مونتاج فيديو إضافي قصير للمنصات',
        'تسليم مستعجل خلال 24 ساعة'
      ],
      badges: {
        popular: 'الباقة الأكثر طلباً',
        new: 'نمط تصوير حديث',
        spicyOrFeatured: 'معالجة ريتاتش احترافية فائقة',
        vegetarianOrPromo: 'عرض تصوير المنتجات'
      },
      buttonAddText: 'طلب حجز جلسة تصوير أو مونتاج',
      buttonAddShort: 'حجز جلسة',
      whatsappOrderLabel: 'إرسال طلب حجز جلسة تصوير أو خدمة مونتاج عبر الواتساب',
      cartIconType: 'wrench',
      optionsLabel: 'موقع التصوير ومعدات الإضاءة',
      optionsSub: 'توضح موقع الجلسة داخل الاستوديو أو خارجي أو في موقع العميل.',
      optionsPlaceholder: 'مثال: تصوير خارجي في الطبيعة، تصوير في مقر المتجر، استوديو مجهز'
    };
  }

  // =========================================================================
  // 6. EDUCATION & TUTORING SUB-CATEGORIES
  // =========================================================================

  // 6.1 Training Centers, Languages & Computer Courses
  if (
    text.includes('تدريب') ||
    text.includes('دورات') ||
    text.includes('معهد') ||
    text.includes('لغات') ||
    text.includes('برمجة') ||
    text.includes('أكاديمية') ||
    text.includes('كورس')
  ) {
    return {
      title: 'دليل الدورات والبرامج التدريبية ورسوم التسجيل',
      subtitle: 'استعرض دورات اللغات، البرمجة، إدارة الأعمال والدبلومات المهنية المعتمدة.',
      addItemLabel: 'اسم الدورة التدريبية أو البرنامج *',
      addItemPlaceholder: 'مثال: دورة محادثة إنجليزية مكثفة، دبلوم برمجة وتطوير ويب، دورة ذكاء اصطناعي',
      categoryLabel: 'مجال الدورة التدريبية *',
      categoryPlaceholder: 'مثال: دورات لغات وتوفل، برمجة وحاسوب، إدارة وأعمال، تصميم ومونتاج',
      presetCategories: [
        'دورات لغات ومحادثة وتوفل',
        'برمجة وتكنولوجيا المعلومات',
        'إدارة أعمال وتسويق ومحاسبة',
        'تصميم جرافيك ومونتاج',
        'دبلومات مهنية وتقنية',
        'ورش عمل ومحاضرات مكثفة'
      ],
      presetImages: [
        { name: 'قاعة تدريب ومحاضرات', url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=600&q=80' },
        { name: 'برمجة وتكنولوجيا', url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80' },
        { name: 'كورسات لغات ودراسة', url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80' },
        { name: 'شهادة تدريب معتمدة', url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'رسوم الدورة أو البرنامج (د.أ) *',
      pricePlaceholder: 'مثال: 50.00',
      prepTimeLabel: 'مدة المحاضرة أو الدورة (اختياري)',
      prepTimeUnit: 'بالساعات (مثال: 40)',
      prepTimePlaceholder: 'مثال: 40',
      prepTimeHelper: 'توضح للمتدرب إجمالي ساعات الدورة أو مدة كل جلسة تدريبية.',
      versionTypeSizesLabel: 'نوع الحضور والمسار',
      versionTypeAddonsLabel: 'شهادات ومواد إضافية',
      sizesTitle: 'إضافة مسارات وطرق الحضور',
      sizesSub: 'تتيح للمتدرب الاختيار بين حضور وجاهي أو تدريب تفاعلي أونلاين.',
      sizesNameLabel: 'نوع الحضور أو المسار',
      sizesNamePlaceholder: 'مثال: حضور وجاهي بالمركز، تدريب أونلاين، مسار مكثف شهر، دبلوم 6 أشهر',
      presetSizes: [
        'حضور وجاهي بالمركز',
        'تدريب تفاعلي أونلاين',
        'مسار مكثف شهر',
        'دبلوم مهني شامل 6 أشهر'
      ],
      addonsTitle: 'إضافة شهادات وحقائب تدريبية',
      addonsSub: 'ميزات مرافقة للدورة مثل: شهادة دولية مصدقة، تسجيلات الحصص.',
      addonsNameLabel: 'اسم الملحق أو الشهادة الإضافية',
      addonsNamePlaceholder: 'مثال: شهادة معتمدة مصدقة، حقيبة تدريبية مطبوعة، تسجيلات الحصص',
      presetAddons: [
        'شهادة معتمدة ومصدقة رسمياً',
        'حقيبة تدريبية مطبوعة',
        'تسجيلات الحصص مدى الحياة',
        'جلسة استشارية فردية مع المدرب'
      ],
      badges: {
        popular: 'الدورة الأكثر تسجيلاً',
        new: 'برنامج تدريبي حديث',
        spicyOrFeatured: 'شهادة معتمدة رسمياً',
        vegetarianOrPromo: 'خصم تسجيل مبكر'
      },
      buttonAddText: 'التسجيل في الدورة',
      buttonAddShort: 'تسجيل سريع',
      whatsappOrderLabel: 'إرسال طلب تسجيل واستفسار عن الدورة عبر الواتساب',
      cartIconType: 'edu',
      optionsLabel: 'المواعيد والشروط المتاحة',
      optionsSub: 'توضح فترات الدورات الصباحية والمسائية.',
      optionsPlaceholder: 'مثال: فترات مسائية، تقسيط ميسر للرسوم'
    };
  }

  // 6.2 Tutoring & Private Lessons
  if (
    text.includes('دروس خصوصية') ||
    text.includes('معلم') ||
    text.includes('معلمة') ||
    text.includes('توجيهي') ||
    text.includes('تأسيس') ||
    text.includes('تقوية')
  ) {
    return {
      title: 'دليل الدروس الخصوصية ومواد التقوية والتوجيهي',
      subtitle: 'استعرض حصص التدريس الخصوصي، متابعة التوجيهي وتأسيس المراحل الأساسية.',
      addItemLabel: 'اسم المادة أو حصة التدريس الخصوصي *',
      addItemPlaceholder: 'مثال: حصة رياضيات توجيهي علمي، كورس لغة إنجليزية شامل، تأسيس لغة عربية',
      categoryLabel: 'المرحلة الدراسية أو التخصص *',
      categoryPlaceholder: 'مثال: توجيهي علمي، توجيهي أدبي، تأسيس أساسي، لغات أجنبية',
      presetCategories: [
        'توجيهي مواد علمية (رياضيات وفيزياء)',
        'توجيهي مواد أدبية ولغات',
        'تأسيس قراءة وكتابة وحساب',
        'تقوية ومتابعة مدرسية مستمرة',
        'لغة إنجليزية ومحادثة',
        'تدريس جامعي ومواد تخصصية'
      ],
      presetImages: [
        { name: 'حصة تدريس ومتابعة', url: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=600&q=80' },
        { name: 'كتب دراسية ومذكرات', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80' },
        { name: 'تدريس رياضيات وعلمي', url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80' },
        { name: 'تأسيس قراءة وكتابة', url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'أجرة الحصة أو الاشتراك الشهري (د.أ) *',
      pricePlaceholder: 'مثال: 15.00',
      prepTimeLabel: 'مدة الحصة الدراسية (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 60)',
      prepTimePlaceholder: 'مثال: 60',
      prepTimeHelper: 'توضح للطالب وولي الأمر مدة كل حصة تدريسية.',
      versionTypeSizesLabel: 'نظام وباقات الحصص',
      versionTypeAddonsLabel: 'دوسيات وملازم مطبوعة',
      sizesTitle: 'إضافة باقات الحصص والمتابعة',
      sizesSub: 'تتيح اختيار نظام الحصص مثل: حصة منفردة، باقة 4 حصص، متابعة فصلية.',
      sizesNameLabel: 'نظام الحصص أو الباقة',
      sizesNamePlaceholder: 'مثال: حصة واحدة منفردة، باقة 4 حصص، باقة 8 حصص، متابعة فصلية',
      presetSizes: [
        'حصة واحدة منفردة',
        'باقة 4 حصص شهرية',
        'باقة 8 حصص مكثفة',
        'متابعة فصلية كاملة'
      ],
      addonsTitle: 'إضافة دوسيات وملازم تدريسية',
      addonsSub: 'ملخصات مساعدة مثل: دوسية أسئلة شاملة، امتحانات تجريبية دورية.',
      addonsNameLabel: 'اسم الملخص أو الملحق التعليمي',
      addonsNamePlaceholder: 'مثال: دوسية وملازم مطبوعة، بنك أسئلة سنوات سابقة، امتحانات دورية',
      presetAddons: [
        'دوسية وملازم مطبوعة شاملة',
        'بنك أسئلة سنوات سابقة مع الحلول',
        'امتحانات تقييمية تجريبية دورية',
        'تقرير متابعة دوري لولي الأمر'
      ],
      badges: {
        popular: 'المادة الأكثر طلباً',
        new: 'منهاج حديث وشامل',
        spicyOrFeatured: 'خبرة تدريسية وتفوق',
        vegetarianOrPromo: 'حصة تجريبية تقييمية'
      },
      buttonAddText: 'حجز حصة دراسية',
      buttonAddShort: 'حجز حصة',
      whatsappOrderLabel: 'إرسال طلب حجز حصة تدريس خصوصي عبر الواتساب',
      cartIconType: 'edu',
      optionsLabel: 'مكان وطريقة التدريس',
      optionsSub: 'توضح إمكانية التدريس بالمنزل أو أونلاين.',
      optionsPlaceholder: 'مثال: إمكانية الحضور لمنزل الطالب، أو أونلاين'
    };
  }

  // =========================================================================
  // 7. EVENTS, FLOWERS & WEDDINGS SUB-CATEGORIES
  // =========================================================================

  // 7.1 Flowers & Gifts
  if (
    text.includes('ورد') ||
    text.includes('زهور') ||
    text.includes('مشاتل') ||
    text.includes('نباتات زينة') ||
    text.includes('بوكيه') ||
    text.includes('هدايا ومناسبات')
  ) {
    return {
      title: 'كتالوج بوكيهات الورد الطبيعي وتنسيق الهدايا',
      subtitle: 'استعرض أروع بوكيهات الجوري، فازات الورد الهولندي وتنسيقات المناسبات الفخمة.',
      addItemLabel: 'اسم باقة الورد أو التنسيق أو الهدية *',
      addItemPlaceholder: 'مثال: بوكيه جوري أحمر طبيعي مع تغليف فاخر، فازة ورد هولندي، ستاند تخرج ورد',
      categoryLabel: 'قسم الورد والهدايا *',
      categoryPlaceholder: 'مثال: بوكيهات طبيعية، فازات طاولات، هدايا وشوكولاتة، تزيين سيارات',
      presetCategories: [
        'بوكيهات ورد طبيعي منوعة',
        'فازات وتنسيقات طاولات فاخرة',
        'بوكسات هدايا مع شوكولاتة وورد',
        'تزيين سيارات زفاف ومناسبات',
        'ستاندات ورود تخرج وأفراح',
        'نباتات ظل وزينة منزلية'
      ],
      presetImages: [
        { name: 'بوكيه ورد جوري أحمر', url: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=600&q=80' },
        { name: 'فازة ورد هولندي', url: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=600&q=80' },
        { name: 'بوكس هدايا وورد', url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80' },
        { name: 'تنسيق ورود أفراح', url: 'https://images.unsplash.com/photo-1535498730771-e735b998cd64?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر البوكيه أو التنسيق (د.أ) *',
      pricePlaceholder: 'مثال: 20.00',
      prepTimeLabel: 'وقت تجهيز وتنسيق الباقة (اختياري)',
      prepTimeUnit: 'بالدقائق (مثال: 20)',
      prepTimePlaceholder: 'مثال: 20',
      prepTimeHelper: 'يوضح للزبون الوقت المطلوب لتنسيق الورد الطازج وتجهيز التغليف قبل التسليم.',
      versionTypeSizesLabel: 'حجم البوكيه وعدد الورد',
      versionTypeAddonsLabel: 'شوكولاتة وكروت إهداء',
      sizesTitle: 'إضافة حجم البوكيه وعدد الوردات',
      sizesSub: 'تتيح للزبون اختيار حجم البوكيه مثل: صغير 10 وردات، كبير 50 وردة.',
      sizesNameLabel: 'حجم البوكيه أو عدد الوردات',
      sizesNamePlaceholder: 'مثال: بوكيه صغير 10 وردات، وسط 25 وردة، كبير فخم 50 وردة',
      presetSizes: [
        'بوكيه صغير (10 وردات)',
        'بوكيه وسط (25 وردة)',
        'بوكيه كبير فخم (50 وردة)',
        'ستاند فاخر متكامل'
      ],
      addonsTitle: 'إضافة شوكولاتة وكروت إهداء فخمة',
      addonsSub: 'إضافات ترفيهية مع الورد مثل: كرت إهداء، شوكولاتة باتشي، بالون هيليوم.',
      addonsNameLabel: 'اسم الإضافة أو التزيين',
      addonsNamePlaceholder: 'مثال: كرت إهداء بعبارة مخصصة، شوكولاتة فاخرة، بالون هيليوم',
      presetAddons: [
        'كرت إهداء بعبارة مخصصة',
        'شوكولاتة فاخرة مع البوكيه',
        'بالون هيليوم للمناسبة',
        'فازة زجاجية أنيقة لحفظ الورد'
      ],
      badges: {
        popular: 'البوكيه الأكثر طلباً',
        new: 'تنسيق ورد جديد',
        spicyOrFeatured: 'ورد طبيعي هولندي',
        vegetarianOrPromo: 'شامل كرت الإهداء'
      },
      buttonAddText: 'طلب البوكيه والهدايا',
      buttonAddShort: 'طلب ورد',
      whatsappOrderLabel: 'إرسال طلب تنسيق وتوصيل بوكيه ورد عبر الواتساب',
      cartIconType: 'party',
      optionsLabel: 'خيارات ألوان الورد والتغليف',
      optionsSub: 'تتيح للزبون اختيار لون الورد المفضل ولون الورق.',
      optionsPlaceholder: 'مثال: ورد أحمر، تغليف أسود ملكي'
    };
  }

  // 7.2 Weddings, Halls & Photography Studios
  if (
    text.includes('أفراح') ||
    text.includes('صالات') ||
    text.includes('قاعة') ||
    text.includes('مناسبات') ||
    text.includes('تصوير') ||
    text.includes('استوديو تصوير')
  ) {
    return {
      title: 'كتالوج حجز الصالات وباقات التصوير والأفراح',
      subtitle: 'استعرض باقات حجز قاعات الزفاف، استوديوهات التصوير الفوتوغرافي وتجهيز العرسان.',
      addItemLabel: 'اسم باقة الحجز أو جلسة التصوير أو الخدمة *',
      addItemPlaceholder: 'مثال: حجز قاعة أفراح ملكية لـ 200 شخص، باقة تصوير عرسان فيديو وفوتو، ألبوم حراري',
      categoryLabel: 'قسم الحفلات أو استوديو التصوير *',
      categoryPlaceholder: 'مثال: باقات قاعات، تصوير عرسان، خدمات ضيافة، كوشات وإضاءة',
      presetCategories: [
        'باقات حجز قاعات وصالات',
        'باقات تصوير عرسان فوتو وفيديو',
        'جلسات تصوير خارجية وتخرج',
        'ضيافة وبوفيهات وحلويات أفراح',
        'تصميم كوشات وإضاءة وليزر',
        'فساتين زفاف وبدل رجالية'
      ],
      presetImages: [
        { name: 'قاعة أفراح ملكية', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80' },
        { name: 'كوشة وضيافة عرسان', url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=600&q=80' },
        { name: 'تصوير عرسان فوتو', url: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=600&q=80' },
        { name: 'كاميرا ومعدات استوديو', url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'سعر الحجز أو الباقة (د.أ) *',
      pricePlaceholder: 'مثال: 350.00',
      prepTimeLabel: 'مدة التغطية أو الحفل المتوقعة (اختياري)',
      prepTimeUnit: 'بالساعات (مثال: 4)',
      prepTimePlaceholder: 'مثال: 4',
      prepTimeHelper: 'توضح للعميل المدة الزمنية المخصصة لتغطية الجلسة أو الحفل.',
      versionTypeSizesLabel: 'فئات الباقة وعدد الضيوف',
      versionTypeAddonsLabel: 'خدمات تصوير وضيافة إضافية',
      sizesTitle: 'إضافة فئات الباقات وعدد الضيوف',
      sizesSub: 'تتيح اختيار مستوى الباقة مثل: باقة فضية، باقة ذهبية VIP ملكية.',
      sizesNameLabel: 'فئة الباقة أو عدد الضيوف',
      sizesNamePlaceholder: 'مثال: باقة أساسية، باقة فضية شاملة، باقة ذهبية VIP، باقة ملكية',
      presetSizes: [
        'باقة أساسية (قاعة فقط)',
        'باقة فضية شاملة الضيافة',
        'باقة ذهبية VIP متكاملة',
        'باقة ملكية مع تصوير وكوشة'
      ],
      addonsTitle: 'إضافة خدمات تصوير وضيافة مرافقة',
      addonsSub: 'ميزات مرافقة مثل: تصوير طائرة درون، ألبوم حراري ميني، شاشات LED.',
      addonsNameLabel: 'اسم الخدمة أو الملحق الإضافي',
      addonsNamePlaceholder: 'مثال: تصوير طائرة درون، ألبوم حراري إيطالي، شاشات LED، مدخل ورد',
      presetAddons: [
        'تصوير طائرة درون جوي',
        'ألبوم حراري إيطالي إضافي',
        'شاشات عرض LED داخل القاعة',
        'مدخل ورد طبيعي مخصص'
      ],
      badges: {
        popular: 'الباقة الأكثر فخامة',
        new: 'ديكور وتصميم حديث',
        spicyOrFeatured: 'شامل الضيافة الكاملة',
        vegetarianOrPromo: 'عرض حجز مبكر'
      },
      buttonAddText: 'حجز الباقة / استفسار',
      buttonAddShort: 'احجز الآن',
      whatsappOrderLabel: 'إرسال طلب استفسار وتأكيد حجز المناسبة عبر الواتساب',
      cartIconType: 'party',
      optionsLabel: 'الخدمات المشمولة في الباقة',
      optionsSub: 'توضح البوفيه المفتوح وعدد الكوادر المتوفرة.',
      optionsPlaceholder: 'مثال: شامل طاقم الضيافة، مشرفين، إضاءة وليزر'
    };
  }

  // =========================================================================
  // 8. REAL ESTATE & STUDENT HOUSING SUB-CATEGORIES
  // =========================================================================

  if (
    text.includes('سكن') ||
    text.includes('شقق') ||
    text.includes('عقار') ||
    text.includes('إيجار') ||
    text.includes('استوديو مفروش') ||
    text.includes('غرف مفردة')
  ) {
    return {
      title: 'دليل الغرف والوحدات السكنية والشقق المتاحة',
      subtitle: 'استكشف الغرف، الأجنحة والشقق المتوفرة للإيجار وتواصل لحجز موعد معاينة.',
      addItemLabel: 'عنوان الغرفة أو الشقة أو الجناح المعروض *',
      addItemPlaceholder: 'مثال: استوديو مفروش ديلوكس، غرفة سنغل ماستر هادئة، شقة مفروشة غرفتين وصالة',
      categoryLabel: 'نوع الوحدة السكنية *',
      categoryPlaceholder: 'مثال: غرف مفردة سنغل، غرف مشتركة دبل، استوديوهات مفروشة، شقق',
      presetCategories: [
        'غرف مفردة (Single)',
        'غرف مشتركة (Double)',
        'استوديوهات مفروشة مستقلة',
        'شقق سكنية مفروشة للإيجار',
        'أجنحة ماستر خاصة',
        'شقق فارغة للإيجار'
      ],
      presetImages: [
        { name: 'شقة استوديو مفروشة', url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80' },
        { name: 'غرفة سنغل مجهزة', url: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=600&q=80' },
        { name: 'صالة ومعيشة فخمة', url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80' },
        { name: 'غرفة نوم مع مكتب دراسة', url: 'https://images.unsplash.com/photo-1540518614846-7ede433c4ef0?auto=format&fit=crop&w=600&q=80' }
      ],
      priceLabel: 'الأجرة الشهرية أو الفصلية (د.أ) *',
      pricePlaceholder: 'مثال: 120.00',
      prepTimeLabel: 'مدة المعاينة أو وقت تجهيز الشقة (اختياري)',
      prepTimeUnit: 'بالدقائق أو الأيام (مثال: 30)',
      prepTimePlaceholder: 'مثال: 30',
      prepTimeHelper: 'توضح للطالب أو المستأجر الوقت المخصص لجولة المعاينة أو موعد جاهزية السكن.',
      versionTypeSizesLabel: 'نوع الإشغال وفترة الدفع',
      versionTypeAddonsLabel: 'خدمات وفواتير مشمولة',
      sizesTitle: 'إضافة نوع الإشغال وفترات الدفع',
      sizesSub: 'تتيح للطلاب الاختيار بين غرفة مفردة أو مشتركة، دفع شهري أو فصلي.',
      sizesNameLabel: 'نوع الإشغال أو فترة الدفع',
      sizesNamePlaceholder: 'مثال: غرفة مفردة سنغل خاصة، غرفة دبل مشتركة، دفع شهري، دفع فصلي',
      presetSizes: [
        'غرفة مفردة سنغل (خاصة)',
        'غرفة مزدوجة دبل (مشتركة)',
        'دفع شهري',
        'دفع فصلي شامل'
      ],
      addonsTitle: 'إضافة خدمات وفواتير مشمولة',
      addonsSub: 'تفاصيل إضافية مثل: شامل فواتير، إنترنت فايبر سريع، كراج خاص.',
      addonsNameLabel: 'اسم الخدمة أو المرفق المشمول',
      addonsNamePlaceholder: 'مثال: شامل فواتير الكهرباء والماء، إنترنت فايبر سريع، كراج مظلل',
      presetAddons: [
        'شامل إنترنت فايبر عالي السرعة',
        'شامل فواتير الكهرباء والماء',
        'موقف سيارة خاص مظلل',
        'خدمة تنظيف أسبوعية'
      ],
      badges: {
        popular: 'الوحدة الأكثر طلباً',
        new: 'متاح للإيجار حديثاً',
        spicyOrFeatured: 'شامل كافة الفواتير',
        vegetarianOrPromo: 'قريب من بوابات الجامعة'
      },
      buttonAddText: 'طلب حجز ومعاينة',
      buttonAddShort: 'احجز الآن',
      whatsappOrderLabel: 'إرسال طلب حجز ومعاينة الغرفة أو الشقة عبر الواتساب',
      cartIconType: 'home',
      optionsLabel: 'الميزات والخدمات المشمولة في السكن',
      optionsSub: 'توضح ما إذا كان السكن شامل أثاث كامل وأجهزة.',
      optionsPlaceholder: 'مثال: مفروش بالكامل، تدفئة مركزية، غسالة أوتوماتيك'
    };
  }

  // =========================================================================
  // 9. DEFAULT / GENERAL RETAIL & SHOPS
  // =========================================================================

  return {
    title: 'كتالوج المنتجات والسلع الفاخرة المتاحة',
    subtitle: 'استكشف تشكيلاتنا المتميزة، أضف السلع إلى سلة التسوق الخاصة بك واطلبها فوراً.',
    addItemLabel: 'اسم المنتج أو السلعة المعروضة *',
    addItemPlaceholder: 'مثال: عطر فرنسي فخم، قطعة أزياء تركية، إكسسوار فاخر، حقيبة جلد طبيعي',
    categoryLabel: 'التصنيف أو القسم داخل الكتالوج *',
    categoryPlaceholder: 'مثال: أصناف رئيسية، تشكيلة حديثة، عروض خاصة، هدايا',
    presetCategories: [
      'منتجات وأصناف رئيسية',
      'تشكيلة الموسم الجديدة',
      'عروض وتخفيضات خاصة',
      'أجهزة ومستلزمات منزلية',
      'إكسسوارات وهدايا مميزة',
      'أصناف محدودة الإصدار'
    ],
    presetImages: [
      { name: 'منتجات وسلع فاخرة', url: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=600&q=80' },
      { name: 'عرض منتجات مميزة', url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80' },
      { name: 'تغليف وبوكسات هدايا', url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80' },
      { name: 'معروضات المتجر', url: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80' }
    ],
    priceLabel: 'سعر بيع المنتج الحالي (د.أ) *',
    pricePlaceholder: 'مثال: 12.00',
    prepTimeLabel: 'وقت تجهيز وتغليف الطلب (اختياري)',
    prepTimeUnit: 'بالدقائق (مثال: 15)',
    prepTimePlaceholder: 'مثال: 15',
    prepTimeHelper: 'يوضح للزبون الوقت المطلوب لتجهيز المنتج وتغليفه قبل الشحن أو الاستلام.',
    versionTypeSizesLabel: 'الأحجام والمقاسات',
    versionTypeAddonsLabel: 'خيارات وتغليف إضافي',
    sizesTitle: 'إضافة أحجام ومقاسات المنتج',
    sizesSub: 'تتيح للزبون تحديد المقاس أو الحجم المناسب للسلعة.',
    sizesNameLabel: 'اسم الحجم أو المقاس',
    sizesNamePlaceholder: 'مثال: حجم صغير، حجم وسط، حجم كبير، مقاس قياسي',
    presetSizes: [
      'حجم صغير',
      'حجم وسط',
      'حجم كبير',
      'فئة أساسية',
      'فئة بريميوم فاخرة'
    ],
    addonsTitle: 'إضافة خيارات وتغليف هدايا',
    addonsSub: 'ميزات مرافقة مثل: تغليف هدايا ملكي، كفالة إضافية.',
    addonsNameLabel: 'اسم الإضافة أو الخيار المرفق',
    addonsNamePlaceholder: 'مثال: تغليف هدايا فاخر، كفالة إضافية، خدمة سريعة',
    presetAddons: [
      'تغليف هدايا ملكي',
      'كفالة وضمان إضافي',
      'خدمة سريعة مستعجلة',
      'كرت إهداء مخصص'
    ],
    badges: {
      popular: 'الأكثر طلباً',
      new: 'جديد ومميز',
      spicyOrFeatured: 'أصلي ومكفول',
      vegetarianOrPromo: 'شحن مجاني'
    },
    buttonAddText: 'إضافة لسلة الشراء',
    buttonAddShort: 'إضافة للسلة',
    whatsappOrderLabel: 'إرسال طلب شراء السلع والمنتجات عبر الواتساب',
    cartIconType: 'retail',
    optionsLabel: 'الألوان والمقاسات والخيارات المتوفرة',
    optionsSub: 'تتيح للزبون اختيار المقاس، اللون أو التغليف.',
    optionsPlaceholder: 'مثال: متوفر بعدة ألوان، كفالة سنة'
  };
}
