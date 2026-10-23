import { LucideIcon } from 'lucide-react';
import { 
  UtensilsCrossed, 
  ShoppingBag, 
  Activity, 
  GraduationCap, 
  Sparkles, 
  Wrench, 
  Car, 
  Gift, 
  Building2, 
  Briefcase, 
  Package,
  Stethoscope,
  Scissors,
  Dumbbell,
  BookOpen,
  Key,
  Hotel,
  Palmtree,
  Compass,
  Gamepad2,
  Ticket,
  Plane,
  Building,
  Home,
  Pill,
  Microscope,
  Eye,
  Flame,
  Coffee,
  Utensils,
  ShoppingCart,
  Store,
  Droplet,
  Truck,
  Heart,
  Camera,
  Landmark,
  Scale,
  Shield,
  FileText,
  Languages,
  Factory,
  Code,
  Headphones,
  Cpu,
  Monitor
} from 'lucide-react';

export interface ServiceChannelOption {
  id: string;
  label: string;
  color: string;
  imageSrc?: string;
}

export interface CategoryOfferConfig {
  titlePlaceholder: string;
  descriptionPlaceholder: string;
  quickPresets: string[];
  termsPresets: string[];
  serviceChannels: ServiceChannelOption[];
  catalogTabTitle: string;
  catalogIcon: LucideIcon;
  aboutTabTitle?: string;
}

export interface EntityTerminology {
  entityType: 'food' | 'retail' | 'medical' | 'education' | 'beauty' | 'services' | 'cars' | 'events' | 'finance' | 'housing' | 'general';
  entityLabel: string;
  editDataTitle: string;
  nameFieldLabel: string;
  nameFieldPlaceholder: string;
  statusLabel: string;
  statusButtonLabel: string;
  statusOpenText: string;
  statusClosedText: string;
  deliveryToggleLabel: string;
  deliverySecondaryLabel?: string;
  deliveryAreasLabel: string;
  catalogActionLabel: string;
  bookingActionLabel: string;
}

// High-resolution category-relevant Unsplash images (strictly professional, authentic photography)
export const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  food: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=900', // Restaurant dining
  retail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=900', // Retail clothing store
  medical: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=900', // Clean medical clinic
  education: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=900', // Class / Training center
  beauty: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=900', // Beauty salon & spa
  services: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=900', // Maintenance / Workshop
  cars: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=900', // Auto service
  events: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=900', // Weddings / Events
  finance: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=900', // Office & Business
  housing: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=900', // Modern apartment
  general: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&q=80&w=900'  // General commercial storefront
};

export function detectEntityType(category?: string, subCategory?: string, isMedical?: boolean): EntityTerminology['entityType'] {
  if (isMedical) return 'medical';

  const cat = (category || '').toLowerCase();
  const sub = (subCategory || '').toLowerCase();
  const text = `${cat} ${sub}`.toLowerCase();

  // 1. Explicit Home & Online businesses must NEVER be detected as medical
  const isHome = 
    cat.includes('مشاريع منزلية') || cat.includes('أونلاين') || 
    sub.includes('طبيعية بيتية') || sub.includes('شمع وصابون') || sub.includes('أشغال يدوية');
  if (isHome) {
    if (sub.includes('أكل بيت') || sub.includes('تواصي') || sub.includes('حلويات') || sub.includes('كيك') || sub.includes('معجنات')) {
      return 'food';
    }
    return 'general';
  }

  // 2. Explicit Tech & Innovation businesses must NEVER be detected as medical
  const isTech = 
    cat.includes('تقنية') || cat.includes('برمجيات') || cat.includes('ابتكار') || 
    sub.includes('طباعة ثلاثية الأبعاد') || sub.includes('3d printing') || sub.includes('نمذجة');
  if (isTech) {
    return 'services';
  }

  // 3. Genuine Medical & Healthcare detection
  const isExplicitNonMedical = 
    cat.includes('تسوق') || cat.includes('تجزئة') || cat.includes('صناعة') || cat.includes('مصانع') || cat.includes('حرف') || 
    cat.includes('خدمات') || cat.includes('مركبات') || cat.includes('مال') || cat.includes('مناسبات') || cat.includes('معلمات') ||
    cat.includes('تعليم') || cat.includes('تدريب') || cat.includes('تدريس') || cat.includes('مدرس') ||
    sub.includes('تدريس') || sub.includes('مدرس') ||
    text.includes('تدريس جامعي') || text.includes('مواد طبية وهندسية') || text.includes('مدرسو ومدرسات') ||
    text.includes('مصانع أدوية') || text.includes('مستلزمات طبية وتجميلية') ||
    text.includes('عطور ومستحضرات تجميل') || text.includes('عطور') ||
    sub.includes('طبيعية') || sub.includes('طباعة') || sub.includes('مواد طبية') || sub.includes('مستلزمات طبية') || sub.includes('عطور ومستحضرات تجميل') || sub.includes('مراكز تجميل');

  if (
    !isExplicitNonMedical &&
    (
      cat.includes('صحة وطب') || 
      text.includes('عياد') || 
      text.includes('مستشف') || 
      text.includes('صيدل') || 
      (text.includes('مختبر') && !text.includes('طباعة') && !text.includes('3d')) || 
      text.includes('أسنان') || 
      text.includes('علاج طبيعي') ||
      (text.includes('طبي') && !text.includes('طبيعية') && !text.includes('طباعة') && !text.includes('مواد طبية') && !text.includes('مستلزمات طبية') && !text.includes('تدريس') && !text.includes('مدرس'))
    )
  ) {
    return 'medical';
  }

  if (
    text.includes('تعليم') || 
    text.includes('تدريب') || 
    text.includes('معلم') || 
    text.includes('معلمات') || 
    text.includes('مدارس') || 
    text.includes('مدرس') || 
    text.includes('تدريس') || 
    text.includes('جامع') || 
    text.includes('لغات') || 
    text.includes('أكاديم') || 
    text.includes('خصوصي') || 
    text.includes('ثقافي') || 
    text.includes('تأسيس') || 
    text.includes('قراءة وكتابة') || 
    text.includes('حساب') || 
    text.includes('صعوبات تعلم') || 
    text.includes('تربية خاصة') || 
    text.includes('تحفيظ قرآن') || 
    text.includes('تجويد') || 
    text.includes('رياضيات') || 
    text.includes('فيزياء') || 
    text.includes('كيمياء')
  ) {
    return 'education';
  }

  if (
    (text.includes('تجميل') && !text.includes('عطور') && !text.includes('مستحضرات')) || 
    text.includes('صالون') || 
    text.includes('حلاق') || 
    text.includes('بشرة') || 
    text.includes('ليزر') || 
    text.includes('عناية') || 
    text.includes('جيم') || 
    text.includes('رياض') || 
    text.includes('مساج') || 
    (text.includes('سبا') && !text.includes('مناسب'))
  ) {
    return 'beauty';
  }

  if (
    text.includes('مطاعم') || 
    text.includes('مأكولات') || 
    text.includes('وجبات') || 
    text.includes('شاورما') || 
    text.includes('برجر') || 
    text.includes('بيتزا') || 
    text.includes('كافيه') || 
    text.includes('مقهى') || 
    text.includes('حلويات') || 
    text.includes('مخابز') || 
    text.includes('عصائر') || 
    text.includes('مشاوي') || 
    text.includes('أكل بيت') || 
    text.includes('تواصي') || 
    text.includes('مناسف') || 
    text.includes('ولائم') || 
    (text.includes('مطابخ') && !text.includes('نجارة') && !text.includes('منجرة') && !text.includes('ألمنيوم') && !text.includes('خشب'))
  ) {
    return 'food';
  }

  if (
    text.includes('مركبات') || 
    text.includes('سيار') || 
    text.includes('ميكانيك') || 
    text.includes('بناشر') || 
    text.includes('غسيل سيارات') || 
    text.includes('قطع غيار')
  ) {
    return 'cars';
  }

  if (
    text.includes('صيانة') || 
    text.includes('حرف') || 
    text.includes('صناع') || 
    text.includes('نجار') || 
    text.includes('حداد') || 
    text.includes('ألمنيوم') || 
    text.includes('سباك') || 
    text.includes('كهرباء منزلية') || 
    text.includes('تنظيف ودراي كلين') || 
    text.includes('مواد بناء') || 
    text.includes('معدات')
  ) {
    return 'services';
  }

  if (
    text.includes('أفراح') || 
    text.includes('مناسبات') || 
    ((text.includes('صالات') || text.includes('صالة')) && !text.includes('اتصالات') && (text.includes('أفراح') || text.includes('مناسبات') || text.includes('قاعة'))) || 
    text.includes('صالات أفراح') || 
    text.includes('صالة أفراح') || 
    text.includes('زفاف') || 
    text.includes('فساتين') || 
    text.includes('زهور') || 
    text.includes('ورود') || 
    text.includes('استوديوهات تصوير') || 
    text.includes('استوديو تصوير') || 
    (text.includes('تصوير') && (text.includes('استوديو') || text.includes('فوتوغرافي')))
  ) {
    return 'events';
  }

  if (
    text.includes('مال') || 
    text.includes('أعمال') || 
    text.includes('بنوك') || 
    text.includes('محاماة') || 
    text.includes('استشارات') || 
    text.includes('تأمين') || 
    text.includes('ترجمة') || 
    text.includes('صرافة')
  ) {
    return 'finance';
  }

  if (
    !text.includes('تصوير') && (
      text.includes('سكن') || 
      text.includes('شقق') || 
      text.includes('عقار') || 
      text.includes('إسكان') || 
      text.includes('استوديو مفروش')
    )
  ) {
    return 'housing';
  }

  if (
    text.includes('تسوق') || 
    text.includes('تجزئة') || 
    text.includes('ملابس') || 
    text.includes('أحذية') || 
    text.includes('إلكترون') || 
    text.includes('هواتف') || 
    text.includes('موبايل') || 
    text.includes('خلوي') || 
    text.includes('إكسسواراتها') || 
    text.includes('اتصالات') || 
    text.includes('عطور') || 
    text.includes('سوبرماركت') || 
    text.includes('مكتبات') || 
    text.includes('ذهب') || 
    text.includes('فضة') || 
    text.includes('فضيات') || 
    text.includes('ساعات') || 
    text.includes('شالات') || 
    text.includes('مطاحن') || 
    text.includes('أدوات منزلية')
  ) {
    return 'retail';
  }

  return 'general';
}

export function getCategoryFallbackImage(category?: string, subCategory?: string, isMedical?: boolean): string {
  const cat = (category || '').toLowerCase();
  const sub = (subCategory || '').toLowerCase();
  const text = `${cat} ${sub}`.toLowerCase();

  // 1. Nurseries & Plants
  if (text.includes('مشاتل') || text.includes('نبات') || text.includes('أشجار') || text.includes('زهور طبيعية') || text.includes('حدائق')) {
    return 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=900';
  }

  // 2. Home Businesses & Online Projects
  if (cat.includes('مشاريع منزلية') || cat.includes('أونلاين') || sub.includes('طبيعية بيتية') || sub.includes('شمع وصابون') || sub.includes('أشغال يدوية')) {
    if (sub.includes('أكل بيت') || sub.includes('حلويات') || sub.includes('كيك') || sub.includes('معجنات')) {
      return CATEGORY_FALLBACK_IMAGES.food;
    }
    return CATEGORY_FALLBACK_IMAGES.general;
  }

  // 3. Tech & Innovation
  if (cat.includes('تقنية') || cat.includes('برمجيات') || cat.includes('ابتكار') || sub.includes('طباعة ثلاثية الأبعاد') || sub.includes('3d')) {
    return CATEGORY_FALLBACK_IMAGES.services;
  }

  // 4. Medical & Health Facilities (Strict)
  const isMed = isMedical || (
    cat.includes('صحة وطب') || 
    (
      !sub.includes('طبيعية') && !sub.includes('طباعة') && !cat.includes('تسوق') && !cat.includes('صناعة') &&
      !text.includes('تدريس') && !text.includes('مدرس') && !text.includes('مواد طبية وهندسية') &&
      !text.includes('مصانع أدوية') && !text.includes('مستلزمات طبية وتجميلية') &&
      !text.includes('عطور ومستحضرات تجميل') && !text.includes('عطور') &&
      (text.includes('عياد') || text.includes('مستشف') || text.includes('صيدل') || (text.includes('طبي') && !text.includes('طبيعية') && !text.includes('طباعة') && !text.includes('مواد طبية') && !text.includes('مستلزمات طبية') && !text.includes('تدريس') && !text.includes('مدرس')))
    )
  );

  if (isMed) {
    if (text.includes('أسنان') || text.includes('اسنان')) {
      return 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&q=80&w=900';
    }
    if (text.includes('صيدل') || text.includes('دواء')) {
      return 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&q=80&w=900';
    }
    if ((text.includes('مختبر') && !text.includes('طباعة')) || text.includes('تحاليل') || text.includes('أشعة')) {
      return 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&q=80&w=900';
    }
    if (text.includes('بصريات') || text.includes('نظارات') || text.includes('عيون')) {
      return 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&q=80&w=900';
    }
    return CATEGORY_FALLBACK_IMAGES.medical;
  }

  // 3. Education & Tutoring
  if (text.includes('تعليم') || text.includes('تدريب') || text.includes('معلم') || text.includes('أكاديم') || text.includes('مدارس') || text.includes('جامع') || text.includes('مدرس') || text.includes('تدريس')) {
    return CATEGORY_FALLBACK_IMAGES.education;
  }

  // Factories & Industrial Manufacturing
  if (text.includes('مصانع') || text.includes('مصنع') || text.includes('إنتاج صناعي') || text.includes('معامل') || text.includes('مستلزمات طبية وتجميلية')) {
    return 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=900';
  }

  // 4. Beauty, Salons & Gyms
  if ((text.includes('تجميل') && !text.includes('عطور') && !text.includes('مستحضرات')) || text.includes('صالون') || text.includes('حلاق') || text.includes('بشرة') || text.includes('ليزر') || text.includes('عناية') || text.includes('جيم') || text.includes('رياض')) {
    if (text.includes('حلاق') || text.includes('شعر')) {
      return 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=900';
    }
    if (text.includes('جيم') || text.includes('رياض') || text.includes('لياقة')) {
      return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=900';
    }
    return CATEGORY_FALLBACK_IMAGES.beauty;
  }

  // 5. Contracting, Maintenance & Crafts
  if (text.includes('مقاولات') || text.includes('مواد بناء') || text.includes('بناء') || text.includes('تشطيب') || text.includes('دهانات')) {
    return 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=900';
  }
  if (text.includes('صيانة') || text.includes('حرف') || text.includes('نجار') || text.includes('حداد') || text.includes('ألمنيوم') || text.includes('سباك') || text.includes('كهرباء منزلية')) {
    return CATEGORY_FALLBACK_IMAGES.services;
  }

  // 6. Automotive & Mechanics
  if (text.includes('مركبات') || text.includes('سيار') || text.includes('ميكانيك') || text.includes('كراج') || text.includes('بناشر')) {
    return CATEGORY_FALLBACK_IMAGES.cars;
  }

  // 7. Events, Flowers & Photography
  if (text.includes('أفراح') || text.includes('مناسبات') || ((text.includes('صالات') || text.includes('صالة')) && !text.includes('اتصالات') && (text.includes('أفراح') || text.includes('مناسبات'))) || text.includes('زفاف') || text.includes('زهور') || text.includes('ورود') || text.includes('تصوير')) {
    return CATEGORY_FALLBACK_IMAGES.events;
  }

  // 8. Finance, Law & Business
  if (text.includes('مال') || text.includes('أعمال') || text.includes('بنوك') || text.includes('محاماة') || text.includes('استشارات')) {
    return CATEGORY_FALLBACK_IMAGES.finance;
  }

  // 9. Real Estate & Student Housing
  if (text.includes('سكن') || text.includes('شقق') || text.includes('عقار') || text.includes('إسكان')) {
    return CATEGORY_FALLBACK_IMAGES.housing;
  }

  // 10. Retail, Electronics, Libraries & Shopping
  if (text.includes('مكتب') || text.includes('قرطاسية') || text.includes('كتب')) {
    return 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=900';
  }
  if (text.includes('هواتف') || text.includes('إلكترون') || text.includes('كمبيوتر') || text.includes('أجهزة') || text.includes('إكسسواراتها') || text.includes('اتصالات')) {
    return 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=900';
  }
  if (text.includes('عطور') || text.includes('مكياج') || text.includes('مستحضرات')) {
    return 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=900';
  }
  if (text.includes('ذهب') || text.includes('مجوهرات') || text.includes('ساعات')) {
    return 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=900';
  }
  if (text.includes('تسوق') || text.includes('تجزئة') || text.includes('ملابس') || text.includes('أحذية')) {
    return CATEGORY_FALLBACK_IMAGES.retail;
  }

  // 11. Food, Restaurants, Cafes & Bakeries ONLY when text explicitly matches
  if (text.includes('مطاعم') || text.includes('مأكولات') || text.includes('وجبات') || text.includes('كافيه') || text.includes('مقهى') || text.includes('حلويات') || text.includes('مخابز') || text.includes('شاورما') || text.includes('برجر') || text.includes('مشاوي')) {
    if (text.includes('كافيه') || text.includes('قهوة') || text.includes('مقهى')) {
      return 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=900';
    }
    if (text.includes('حلويات') || text.includes('كيك') || text.includes('سويت')) {
      return 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&q=80&w=900';
    }
    if (text.includes('مخبز') || text.includes('معجنات') || text.includes('خبز')) {
      return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=900';
    }
    if (text.includes('برجر') || text.includes('سريع') || text.includes('سناك')) {
      return 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&q=80&w=900';
    }
    return CATEGORY_FALLBACK_IMAGES.food;
  }

  const type = detectEntityType(category, subCategory, isMedical);
  return CATEGORY_FALLBACK_IMAGES[type] || CATEGORY_FALLBACK_IMAGES.general;
}

export function getEntityTerminology(category?: string, subCategory?: string, isMedical?: boolean, _businessName?: string): EntityTerminology {
  const type = detectEntityType(category, subCategory, isMedical);
  const text = `${category || ''} ${subCategory || ''}`.toLowerCase();

  switch (type) {
    case 'medical':
      return {
        entityType: 'medical',
        entityLabel: 'المنشأة الطبية',
        editDataTitle: 'تعديل بيانات المنشأة الطبية والعيادة',
        nameFieldLabel: 'اسم المنشأة أو العيادة *',
        nameFieldPlaceholder: 'اسم العيادة أو المركز الطبي',
        statusLabel: 'حالة استقبال المراجعين',
        statusButtonLabel: 'تبديل حالة استقبال المراجعين',
        statusOpenText: 'استقبال المراجعين متاح الآن',
        statusClosedText: 'استقبال المراجعين مغلق مؤقتاً',
        deliveryToggleLabel: 'توفير الزيارات الطبية والتمريض المنزلي',
        deliverySecondaryLabel: 'فحوصات وسحب عينات منزلية',
        deliveryAreasLabel: 'مناطق الزيارات المنزلية المشمولة في إربد',
        catalogActionLabel: 'تعديل الخدمات الطبية والأسعار',
        bookingActionLabel: 'حجز موعد كشفية واستشارة'
      };

    case 'education': {
      const isTeacher = text.includes('معلم') || text.includes('معلمات') || text.includes('مدرس') || text.includes('دروس خصوصية') || text.includes('تأسيس') || text.includes('صعوبات تعلم') || text.includes('تحفيظ قرآن');
      const label = isTeacher ? 'المعلم والخدمات التعليمية' : 'المنشأة التعليمية';
      return {
        entityType: 'education',
        entityLabel: label,
        editDataTitle: `تعديل بيانات ${label}`,
        nameFieldLabel: `اسم ${label} *`,
        nameFieldPlaceholder: 'اسم المركز التعليمي، الأكاديمية، أو المعلم',
        statusLabel: 'حالة التسجيل واستقبال الطلبة',
        statusButtonLabel: 'تبديل حالة استقبال الطلبة والتسجيل',
        statusOpenText: 'التسجيل واستقبال الطلبة متاح حالياً',
        statusClosedText: 'التسجيل متوقف مؤقتاً',
        deliveryToggleLabel: 'توفير الدروس والتدريب عن بعد والزيارات التعليمية',
        deliverySecondaryLabel: 'دورات وجاهية في قاعات المركز',
        deliveryAreasLabel: 'نطاق تقديم الدروس والزيارات التعليمية في إربد',
        catalogActionLabel: 'تعديل الدورات والبرامج التعليمية',
        bookingActionLabel: 'التسجيل وحجز مقعد في الدورة'
      };
    }

    case 'beauty':
      return {
        entityType: 'beauty',
        entityLabel: 'المركز التجميلي / الصالون',
        editDataTitle: 'تعديل بيانات الصالون أو المركز التجميلي',
        nameFieldLabel: 'اسم الصالون أو المركز التجميلي *',
        nameFieldPlaceholder: 'اسم الصالون، مركز التجميل أو النادي الرياضي',
        statusLabel: 'حالة استقبال الحجوزات والمواعيد',
        statusButtonLabel: 'تبديل حالة استقبال الحجوزات',
        statusOpenText: 'استقبال الحجوزات متاح حالياً',
        statusClosedText: 'الحجوزات متوقفة مؤقتاً',
        deliveryToggleLabel: 'توفير خدمات العناية والتجميل المنزلية (حسب الطلب)',
        deliverySecondaryLabel: 'جلسات داخل الصالون والمركز',
        deliveryAreasLabel: 'مناطق تقديم الخدمة المنزلية المشمولة في إربد',
        catalogActionLabel: 'قائمة الجلسات وباقات العناية',
        bookingActionLabel: 'حجز موعد جلسة عناية'
      };

    case 'services':
      return {
        entityType: 'services',
        entityLabel: 'المنشأة المهنية / الورشة',
        editDataTitle: 'تعديل بيانات الورشة أو المنشأة الخدمية',
        nameFieldLabel: 'اسم الورشة أو المنشأة الخدمية *',
        nameFieldPlaceholder: 'اسم الورشة، مركز الصيانة أو الشركة',
        statusLabel: 'حالة استقبال طلبات الصيانة',
        statusButtonLabel: 'تبديل حالة استقبال طلبات الصيانة',
        statusOpenText: 'استقبال طلبات الصيانة متاح حالياً',
        statusClosedText: 'استقبال الطلبات متوقف مؤقتاً',
        deliveryToggleLabel: 'تقديم خدمة ميدانية وصيانة في موقع العميل',
        deliverySecondaryLabel: 'ورشة صيانة واستلام وتسليم في مقر المنشأة',
        deliveryAreasLabel: 'مناطق تقديم الخدمة الميدانية في إربد',
        catalogActionLabel: 'تعديل الخدمات وأجور الصيانة',
        bookingActionLabel: 'طلب زيارة صيانة وفحص ميداني'
      };

    case 'cars':
      return {
        entityType: 'cars',
        entityLabel: 'مركز خدمة المركبات',
        editDataTitle: 'تعديل بيانات الكراج ومركز صيانة السيارات',
        nameFieldLabel: 'اسم الكراج أو مركز صيانة السيارات *',
        nameFieldPlaceholder: 'اسم الكراج أو مركز خدمة المركبات',
        statusLabel: 'حالة استقبال المركبات',
        statusButtonLabel: 'تبديل حالة استقبال المركبات',
        statusOpenText: 'استقبال المركبات متاح حالياً',
        statusClosedText: 'استقبال المركبات مكتمل مؤقتاً',
        deliveryToggleLabel: 'توفير كراج متنقل وخدمة المساعدة على الطريق',
        deliverySecondaryLabel: 'صيانة وفحص في مقر الكراج',
        deliveryAreasLabel: 'مناطق تغطية الخدمة المتنقلة والونش في إربد',
        catalogActionLabel: 'تعديل قائمة قطع الغيار والخدمات',
        bookingActionLabel: 'حجز موعد فحص وصيانة'
      };

    case 'events':
      return {
        entityType: 'events',
        entityLabel: 'منشأة المناسبات والأفراح',
        editDataTitle: 'تعديل بيانات القاعة واستوديو المناسبات',
        nameFieldLabel: 'اسم القاعة أو استوديو المناسبات *',
        nameFieldPlaceholder: 'اسم صالة الأفراح، المحل أو الاستوديو',
        statusLabel: 'حالة استقبال الحجوزات',
        statusButtonLabel: 'تبديل حالة استقبال الحجوزات',
        statusOpenText: 'استقبال حجوزات المناسبات متاح',
        statusClosedText: 'الحجوزات مكتملة مؤقتاً',
        deliveryToggleLabel: 'توفير التوصيل والتجهيز في موقع الحفل',
        deliverySecondaryLabel: 'حجز وتجهيز داخل القاعة',
        deliveryAreasLabel: 'مناطق التجهيز والتوصيل المشمولة في إربد',
        catalogActionLabel: 'تعديل باقات الحفلات والخدمات',
        bookingActionLabel: 'معاينة وحجز موعد مناسبة'
      };

    case 'finance':
      return {
        entityType: 'finance',
        entityLabel: 'المكتب المهني / الشركة',
        editDataTitle: 'تعديل بيانات المكتب أو الشركة المهنية',
        nameFieldLabel: 'اسم المكتب أو الشركة الاستشارية *',
        nameFieldPlaceholder: 'اسم مكتب المحاماة، المحاسبة أو الشركة',
        statusLabel: 'حالة استقبال العملاء',
        statusButtonLabel: 'تبديل حالة استقبال العملاء',
        statusOpenText: 'استقبال العملاء والاستشارات متاح',
        statusClosedText: 'المواعيد مكتملة مؤقتاً',
        deliveryToggleLabel: 'تقديم الاستشارات والخدمات أونلاين عن بعد',
        deliverySecondaryLabel: 'استقبال في مقر المكتب',
        deliveryAreasLabel: 'نطاق الزيارات الميدانية للشركات في إربد',
        catalogActionLabel: 'تعديل قائمة الخدمات والاستشارات',
        bookingActionLabel: 'حجز جلسة استشارة مهنية'
      };

    case 'housing':
      return {
        entityType: 'housing',
        entityLabel: 'المنشأة السكنية',
        editDataTitle: 'تعديل بيانات السكن أو المجمع العقاري',
        nameFieldLabel: 'اسم السكن أو المجمع العقاري *',
        nameFieldPlaceholder: 'اسم السكن الجامعي أو العمارة',
        statusLabel: 'حالة توفر الشواغر والغرف',
        statusButtonLabel: 'تبديل حالة توفر الغرف والشقق',
        statusOpenText: 'تتوفر شواغر وغرف متاحة للحجز',
        statusClosedText: 'السكن مكتمل ولا تتوفر شواغر حالياً',
        deliveryToggleLabel: 'توفير المعاينة الافتراضية وحجز المواعيد أونلاين',
        deliverySecondaryLabel: 'معاينة وجاهية في موقع السكن',
        deliveryAreasLabel: 'المناطق القريبة من الجامعات والمشمولة',
        catalogActionLabel: 'تعديل دليل الغرف والوحدات',
        bookingActionLabel: 'حجز موعد معاينة سكن'
      };

    case 'retail':
      return {
        entityType: 'retail',
        entityLabel: 'المتجر / المحل',
        editDataTitle: 'تعديل بيانات المتجر والمحل التجاري',
        nameFieldLabel: 'اسم المحل التجاري *',
        nameFieldPlaceholder: 'اسم المتجر أو المحل',
        statusLabel: 'حالة المحل الحالية',
        statusButtonLabel: 'تبديل حالة المحل الفورية',
        statusOpenText: 'المحل مفتوح ويستقبل الزبائن',
        statusClosedText: 'المحل مغلق مؤقتاً',
        deliveryToggleLabel: 'تفعيل خدمة التوصيل والشحن للمنازل',
        deliverySecondaryLabel: 'شراء واستلام مباشر من المحل',
        deliveryAreasLabel: 'مناطق التوصيل والشحن المشمولة في إربد',
        catalogActionLabel: 'تعديل كتالوج المنتجات والمعروضات',
        bookingActionLabel: 'طلب وشراء فوري'
      };

    case 'food': {
      const isCafe = text.includes('كافيه') || text.includes('مقهى') || text.includes('قهوة');
      const isBakery = text.includes('مخبز') || text.includes('مخابز') || text.includes('معجنات');
      const isSweets = text.includes('حلويات') || text.includes('كيك');
      const isButcher = text.includes('ملحمة') || text.includes('ملاحم') || text.includes('لحوم') || text.includes('قصاب');
      const label = isCafe ? 'المقهى' : isBakery ? 'المخبز' : isSweets ? 'محل الحلويات' : isButcher ? 'الملحمة' : 'المطعم';
      return {
        entityType: 'food',
        entityLabel: label,
        editDataTitle: `تعديل بيانات ${label}`,
        nameFieldLabel: `اسم ${label} *`,
        nameFieldPlaceholder: `اسم ${label}`,
        statusLabel: `حالة ${label} الحالية`,
        statusButtonLabel: `تبديل حالة ${label} الفورية`,
        statusOpenText: 'مفتوح ويستقبل الطلبات',
        statusClosedText: 'مغلق مؤقتاً',
        deliveryToggleLabel: 'تفعيل خدمة التوصيل للمنازل',
        deliverySecondaryLabel: 'طلب واستلام سفري أو صالة',
        deliveryAreasLabel: 'مناطق التوصيل المشمولة في إربد',
        catalogActionLabel: 'تعديل قائمة المنيو',
        bookingActionLabel: 'طلب فوري من المنيو'
      };
    }

    case 'general':
    default:
      return {
        entityType: 'general',
        entityLabel: 'المنشأة',
        editDataTitle: 'تعديل بيانات المنشأة والنشاط التجاري',
        nameFieldLabel: 'اسم المنشأة أو النشاط *',
        nameFieldPlaceholder: 'اسم المنشأة أو المحل',
        statusLabel: 'حالة المنشأة الحالية',
        statusButtonLabel: 'تبديل حالة المنشأة الفورية',
        statusOpenText: 'مفتوح ويستقبل الزبائن',
        statusClosedText: 'مغلق مؤقتاً',
        deliveryToggleLabel: 'تفعيل خدمة التوصيل والشحن',
        deliverySecondaryLabel: 'استقبال مباشر في المقر',
        deliveryAreasLabel: 'مناطق التغطية والتوصيل المشمولة في إربد',
        catalogActionLabel: 'تعديل قائمة الخدمات والمنتجات',
        bookingActionLabel: 'طلب واستفسار فوري'
      };
  }
}

/**
 * Resolves distinct catalog tab title, icon, and about tab title for each subcategory across all sectors
 */
export function getSubcategoryCatalogTabInfo(
  category?: string,
  subCategory?: string,
  isMedical?: boolean,
  _businessName?: string
): { catalogTabTitle: string; catalogIcon: LucideIcon; aboutTabTitle: string } {
  const cat = (category || '').toLowerCase();
  const sub = (subCategory || '').toLowerCase();
  // Tab titles MUST strictly depend on category and subcategory,
  // NEVER on business name, location, address, or descriptions
  const text = `${cat} ${sub}`.trim();

  // =========================================================================
  // MOBILE PHONES & ACCESSORIES (هواتف محمولة وإكسسواراتها)
  // Direct subcategory match to guarantee accurate tab titles for mobile & telecom shops
  // =========================================================================
  if (
    sub.includes('هواتف') || 
    cat.includes('هواتف') || 
    text.includes('هواتف محمولة') || 
    text.includes('إكسسواراتها') || 
    (text.includes('إكسسوارات') && (text.includes('هاتف') || text.includes('موبايل') || text.includes('خلوي'))) ||
    text.includes('موبايل') || 
    text.includes('خلوي') || 
    (text.includes('اتصالات') && !cat.includes('مناسبات') && !cat.includes('أفراح'))
  ) {
    return { catalogTabTitle: 'كتالوج الهواتف الذكية والإكسسوارات', catalogIcon: ShoppingBag, aboutTabTitle: 'عن المحل' };
  }

  // =========================================================================
  // PHOTOGRAPHY STUDIOS (استوديوهات تصوير)
  // Direct subcategory match to guarantee accurate tab titles for photography studios
  // =========================================================================
  if (
    sub.includes('استوديوهات تصوير') || 
    sub.includes('استوديو تصوير') || 
    cat.includes('استوديوهات تصوير') || 
    cat.includes('استوديو تصوير') || 
    (text.includes('تصوير') && (text.includes('استوديو') || text.includes('استوديوهات') || text.includes('فوتوغرافي') || cat.includes('مناسبات') || cat.includes('أفراح')))
  ) {
    return { catalogTabTitle: 'باقات التصوير الفوتوغرافي والفيديو', catalogIcon: Camera, aboutTabTitle: 'عن الاستوديو' };
  }

  // =========================================================================
  // CATERING & BANQUET KITCHENS (مطابخ تواصي ومناسبات)
  // Direct subcategory match to guarantee accurate food & catering tab titles
  // =========================================================================
  if (
    sub.includes('مطابخ تواصي') || 
    cat.includes('مطابخ تواصي') || 
    (text.includes('تواصي') && !cat.includes('مشاريع منزلية') && !cat.includes('أونلاين')) || 
    (text.includes('مطابخ') && (text.includes('تواصي') || text.includes('مناسبات') || text.includes('ولائم') || text.includes('مناسف') || cat.includes('مأكولات') || cat.includes('مطاعم')))
  ) {
    return { catalogTabTitle: 'قائمة التواصي والولائم والمناسف', catalogIcon: Utensils, aboutTabTitle: 'عن المطبخ' };
  }

  // =========================================================================
  // 1. TUTORING, TEACHERS & PRIVATE LESSONS (معلمات ومعلمون ودروس خصوصية)
  // [High priority direct subcategory matches - guarantees accurate titles]
  // =========================================================================
  if (text.includes('تأسيس أطفال') || text.includes('قراءة وكتابة') || (text.includes('تأسيس') && (text.includes('أطفال') || text.includes('اطفال') || text.includes('حساب')))) {
    return { catalogTabTitle: 'برامج التأسيس والحصص التعليمية', catalogIcon: GraduationCap, aboutTabTitle: 'من نحن' };
  }
  if (text.includes('صعوبات تعلم') || text.includes('تربية خاصة') || text.includes('نطق وتخاطب')) {
    return { catalogTabTitle: 'برامج صعوبات التعلم والتربية الخاصة', catalogIcon: GraduationCap, aboutTabTitle: 'من نحن' };
  }
  if (text.includes('تحفيظ قرآن') || text.includes('قرآن كريم') || text.includes('تجويد')) {
    return { catalogTabTitle: 'حلقات القرآن الكريم وأحكام التجويد', catalogIcon: BookOpen, aboutTabTitle: 'من نحن' };
  }
  if (text.includes('رياضيات') || text.includes('فيزياء')) {
    return { catalogTabTitle: 'حصص ودورات الرياضيات والفيزياء', catalogIcon: GraduationCap, aboutTabTitle: 'من نحن' };
  }
  if (text.includes('كيمياء') || text.includes('أحياء') || text.includes('احياء') || text.includes('علوم')) {
    return { catalogTabTitle: 'حصص ودورات الكيمياء والعلوم', catalogIcon: GraduationCap, aboutTabTitle: 'من نحن' };
  }
  if (text.includes('إنجليزية') || text.includes('انجليزية') || text.includes('لغات أجنبية') || text.includes('توفل') || text.includes('آيلتس') || text.includes('ielts') || text.includes('toefl')) {
    return { catalogTabTitle: 'حصص ودورات اللغة الإنجليزية واللغات', catalogIcon: GraduationCap, aboutTabTitle: 'من نحن' };
  }
  if (text.includes('عربية') || text.includes('لغة عربية') || text.includes('إسلامية') || text.includes('تربية إسلامية')) {
    return { catalogTabTitle: 'حصص ودورات اللغة العربية والتربية الإسلامية', catalogIcon: GraduationCap, aboutTabTitle: 'من نحن' };
  }
  if (text.includes('تدريس جامعي') || text.includes('مواد طبية وهندسية') || text.includes('مساقات جامعية')) {
    return { catalogTabTitle: 'المواد والمساقات الجامعية والتدريس', catalogIcon: GraduationCap, aboutTabTitle: 'من نحن' };
  }
  if ((text.includes('حاسوب') || text.includes('برمجة') || text.includes('ذكاء اصطناعي')) && (text.includes('معلم') || text.includes('تدريب') || text.includes('دورات') || text.includes('تعليم'))) {
    return { catalogTabTitle: 'دورات البرمجة والذكاء الاصطناعي والحاسوب', catalogIcon: Code, aboutTabTitle: 'من نحن' };
  }
  if (text.includes('موسيقى') || (text.includes('رسم') && (text.includes('معلم') || text.includes('فنون') || text.includes('تدريب')))) {
    return { catalogTabTitle: 'دورات وورش الرسم والموسيقى والفنون', catalogIcon: Sparkles, aboutTabTitle: 'من نحن' };
  }
  if (text.includes('دروس خصوصية') || text.includes('مجموعات تعليمية') || text.includes('معلمو') || text.includes('معلمات') || text.includes('معلمون') || text.includes('مدرسو') || text.includes('مدرسات')) {
    return { catalogTabTitle: 'الدروس الخصوصية والبرامج التعليمية', catalogIcon: GraduationCap, aboutTabTitle: 'من نحن' };
  }

  // =========================================================================
  // 2. EDUCATION & TRAINING INSTITUTIONS (تعليم وتدريب)
  // =========================================================================
  if (text.includes('جامعات') || text.includes('جامعة')) {
    return { catalogTabTitle: 'البرامج والتخصصات والدرجات العلمية', catalogIcon: GraduationCap, aboutTabTitle: 'عن الجامعة' };
  }
  if (text.includes('كليات') || text.includes('كلية')) {
    return { catalogTabTitle: 'البرامج والتخصصات والدرجات العلمية', catalogIcon: GraduationCap, aboutTabTitle: 'عن الكلية' };
  }
  if (text.includes('مدارس خاصة') || text.includes('مدارس') || text.includes('مدرسة')) {
    return { catalogTabTitle: 'الصفوف والبرامج التعليمية ورسوم التسجيل', catalogIcon: GraduationCap, aboutTabTitle: 'عن المدرسة' };
  }
  if (text.includes('رياض أطفال') || text.includes('روضة') || text.includes('حضانة')) {
    return { catalogTabTitle: 'البرامج والصفوف التعليمية ورسوم التسجيل', catalogIcon: GraduationCap, aboutTabTitle: 'عن الروضة' };
  }
  if (text.includes('مراكز تدريب') || text.includes('معاهد لغات')) {
    return { catalogTabTitle: 'الدورات التدريبية ودورات اللغات', catalogIcon: GraduationCap, aboutTabTitle: 'من نحن' };
  }
  if (text.includes('معاهد مهنية') || text.includes('دبلوم مهني') || text.includes('تدريب مهني')) {
    return { catalogTabTitle: 'الدبلومات والبرامج المهنية والتقنية', catalogIcon: GraduationCap, aboutTabTitle: 'عن المعهد' };
  }
  if (text.includes('أكاديميات رياضية للأطفال') || text.includes('تدريب أطفال رياض')) {
    return { catalogTabTitle: 'البرامج والاشتراكات الرياضية للأطفال', catalogIcon: Dumbbell, aboutTabTitle: 'عن الأكاديمية' };
  }
  if (text.includes('مراكز ثقافية') || text.includes('ثقافية وتعليمية')) {
    return { catalogTabTitle: 'البرامج والأنشطة الثقافية والتعليمية', catalogIcon: BookOpen, aboutTabTitle: 'من نحن' };
  }
  if (text.includes('تعليم') || text.includes('تدريب') || text.includes('أكاديم')) {
    return { catalogTabTitle: 'الدورات والبرامج التعليمية', catalogIcon: GraduationCap, aboutTabTitle: 'من نحن' };
  }

  // =========================================================================
  // 3. VEHICLES & TRANSPORT (مركبات ونقل)
  // =========================================================================
  if (text.includes('تأجير سيارات') || text.includes('تاجير سيارات') || text.includes('تأجير مركبات') || text.includes('rent a car')) {
    return { catalogTabTitle: 'أسطول سيارات التأجير', catalogIcon: Key, aboutTabTitle: 'عن مكتب التأجير' };
  }
  if (text.includes('معارض سيارات') || text.includes('معرض سيارات') || text.includes('تجارة سيارات') || text.includes('بيع سيارات') || text.includes('سيارات للبيع')) {
    return { catalogTabTitle: 'السيارات المعروضة للبيع', catalogIcon: Car, aboutTabTitle: 'عن المعرض' };
  }
  if (text.includes('قطع غيار') || text.includes('زينة سيارات') || text.includes('إكسسوارات سيارات')) {
    return { catalogTabTitle: 'قطع الغيار والإكسسوارات', catalogIcon: Wrench, aboutTabTitle: 'عن المحل' };
  }
  if (text.includes('غسيل سيارات') || text.includes('بناشر') || text.includes('بنشر') || text.includes('دراي كلين سيارات') || text.includes('تلميع سيارات')) {
    return { catalogTabTitle: 'خدمات الغسيل والبناشر', catalogIcon: Sparkles, aboutTabTitle: 'عن المحل' };
  }
  if (text.includes('صيانة سيارات') || text.includes('ميكانيك') || text.includes('كراج') || text.includes('كهرباء سيارات') || text.includes('تجليس ودهان') || text.includes('ميزان سيارات')) {
    return { catalogTabTitle: 'خدمات الصيانة والإصلاح الميكانيكي', catalogIcon: Wrench, aboutTabTitle: 'عن الكراج' };
  }
  if (text.includes('تكسي') || text.includes('تاكسي') || text.includes('نقل وشحن') || text.includes('شحن ونقل') || text.includes('نقل بضائع') || text.includes('سفريات')) {
    return { catalogTabTitle: 'خدمات النقل والتوصيل والشحن', catalogIcon: Truck, aboutTabTitle: 'عن المكتب' };
  }
  if (text.includes('دراجات نارية') || text.includes('دراجات هوائية') || text.includes('سكوتر') || text.includes('سياكل') || text.includes('موتورات')) {
    return { catalogTabTitle: 'الدراجات والمستلزمات المعروضة', catalogIcon: Package, aboutTabTitle: 'عن المعرض' };
  }

  // =========================================================================
  // 4. TOURISM & LEISURE (سياحة وترفيه)
  // =========================================================================
  if (text.includes('فنادق') || text.includes('فندق') || text.includes('شقق فندقية') || text.includes('hotel') || text.includes('أجنحة فندقية')) {
    return { catalogTabTitle: 'الغرف والأجنحة الفندقية', catalogIcon: Hotel, aboutTabTitle: 'عن الفندق' };
  }
  if (text.includes('مزارع وشاليهات') || text.includes('مزرعة') || text.includes('مزارع') || text.includes('شاليه') || text.includes('شاليهات') || text.includes('منتجع خاص')) {
    return { catalogTabTitle: 'المزارع والشاليهات المتاحة', catalogIcon: Palmtree, aboutTabTitle: 'عن المزرعة أو الشاليه' };
  }
  if (text.includes('أماكن سياحية') || text.includes('معالم أثرية') || text.includes('آثار') || text.includes('متحف')) {
    return { catalogTabTitle: 'الجولات والمعالم السياحية', catalogIcon: Compass, aboutTabTitle: 'عن المعلم السياحي' };
  }
  if (text.includes('حدائق') || text.includes('متنزهات') || text.includes('منتزه')) {
    return { catalogTabTitle: 'المرافق والأنشطة العائلية', catalogIcon: Palmtree, aboutTabTitle: 'عن المتنزه' };
  }
  if (text.includes('صالات ألعاب') || text.includes('بلياردو') || text.includes('بولينج') || text.includes('playstation') || text.includes('بلايستيشن') || text.includes('ألعاب إلكترونية')) {
    return { catalogTabTitle: 'قائمة الألعاب والاشتراكات', catalogIcon: Gamepad2, aboutTabTitle: 'عن الصالة' };
  }
  if (text.includes('مدن ملاهي') || text.includes('ملاهي') || text.includes('مدينة ألعاب') || text.includes('ترفيه عائلي')) {
    return { catalogTabTitle: 'الألعاب وباقات الترفيه', catalogIcon: Ticket, aboutTabTitle: 'عن المدينة الترفيهية' };
  }
  if (text.includes('سياحة وسفر') || text.includes('حج وعمرة') || text.includes('تذاكر طيران') || text.includes('رحلات سياحية')) {
    return { catalogTabTitle: 'برامج الرحلات وتأشيرات السفر', catalogIcon: Plane, aboutTabTitle: 'عن مكتب السياحة والسفر' };
  }

  // =========================================================================
  // 5. HOUSING & REAL ESTATE (سكنات وعقارات)
  // =========================================================================
  if (text.includes('سكن طلاب') || text.includes('سكنات طلاب') || text.includes('سكن شباب') || text.includes('سكنات شباب')) {
    return { catalogTabTitle: 'الغرف والشقق السكنية للطلاب', catalogIcon: Building2, aboutTabTitle: 'عن السكن' };
  }
  if (text.includes('سكن طالبات') || text.includes('سكنات طالبات') || text.includes('سكن بنات') || text.includes('سكنات بنات')) {
    return { catalogTabTitle: 'الغرف والأجنحة السكنية للطالبات', catalogIcon: Building2, aboutTabTitle: 'عن السكن' };
  }
  if (!text.includes('تصوير') && !cat.includes('مناسبات') && !cat.includes('أفراح') && (text.includes('شقق مفروشة') || text.includes('شقة مفروشة') || text.includes('استوديو مفروش') || (text.includes('استوديوهات') && !text.includes('تصوير')))) {
    return { catalogTabTitle: 'الشقق المفروشة والاستوديوهات', catalogIcon: Home, aboutTabTitle: 'عن الشقق المفروشة' };
  }
  if (text.includes('شقق فارغة') || text.includes('شقق للإيجار') || text.includes('شقة للإيجار') || text.includes('منازل للإيجار')) {
    return { catalogTabTitle: 'الشقق السكنية المعروضة للإيجار', catalogIcon: Home, aboutTabTitle: 'عن العقار' };
  }
  if (text.includes('عقارات') || text.includes('أراضي') || text.includes('اراضي') || text.includes('مكاتب عقارية') || text.includes('شقق للبيع') || text.includes('عقار')) {
    return { catalogTabTitle: 'العقارات والأراضي المعروضة للبيع', catalogIcon: Building, aboutTabTitle: 'عن المكتب العقاري' };
  }

  // =========================================================================
  // 6. HOME BUSINESSES & ONLINE (مشاريع منزلية وأونلاين)
  // [High priority direct matches to protect home crafts/cosmetics/baking]
  // =========================================================================
  if (cat.includes('مشاريع منزلية') || cat.includes('أونلاين') || text.includes('أكل بيت') || text.includes('طبيعية بيتية') || text.includes('شمع وصابون') || text.includes('هاند ميد')) {
    if (text.includes('أكل بيت') || text.includes('طعام منزلي') || text.includes('تواصي') || text.includes('مناسف')) {
      return { catalogTabTitle: 'منيو أكل البيت والتواصي والمناسف', catalogIcon: UtensilsCrossed, aboutTabTitle: 'عن المطبخ المنزلي' };
    }
    if (text.includes('كيك') || text.includes('حلويات منزلية') || text.includes('معجنات مناسبات')) {
      return { catalogTabTitle: 'قائمة الكيك والحلويات والمعجنات المنزلية', catalogIcon: Gift, aboutTabTitle: 'من نحن' };
    }
    if (text.includes('شمع') || text.includes('صابون') || (text.includes('تجميل') && (text.includes('طبيعية') || text.includes('بيتية')))) {
      return { catalogTabTitle: 'منتجات الصابون والشموع ومستحضرات التجميل الطبيعية', catalogIcon: Sparkles, aboutTabTitle: 'من نحن' };
    }
    if (text.includes('خياطة') || text.includes('تطريز') || text.includes('أشغال يدوية') || text.includes('هاند ميد')) {
      return { catalogTabTitle: 'معروضات الهاند ميد والخياطة والتطريز', catalogIcon: Scissors, aboutTabTitle: 'من نحن' };
    }
    if (text.includes('متاجر أونلاين') || (text.includes('أونلاين') && (text.includes('ملابس') || text.includes('إكسسوارات')))) {
      return { catalogTabTitle: 'معروضات الملابس والإكسسوارات والهدايا', catalogIcon: ShoppingBag, aboutTabTitle: 'من نحن' };
    }
    if (text.includes('توزيعات') || text.includes('طباعة مخصصة') || text.includes('سوفينيرات')) {
      return { catalogTabTitle: 'قائمة التوزيعات والطباعة المخصصة والهدايا', catalogIcon: Gift, aboutTabTitle: 'من نحن' };
    }
    if (text.includes('تصميم جرافيك') || text.includes('إدارة صفحات') || (text.includes('تسويق') && text.includes('أونلاين'))) {
      return { catalogTabTitle: 'باقات التصميم والتسويق الرقمي وإدارة الصفحات', catalogIcon: Monitor, aboutTabTitle: 'من نحن' };
    }
    if (text.includes('ترجمة') || text.includes('كتابة محتوى') || text.includes('freelanc')) {
      return { catalogTabTitle: 'خدمات كتابة المحتوى والترجمة والتدقيق', catalogIcon: FileText, aboutTabTitle: 'من نحن' };
    }
    if (text.includes('تصوير') || text.includes('مونتاج') || text.includes('إنشاء محتوى')) {
      return { catalogTabTitle: 'خدمات المونتاج والتصوير وصناعة المحتوى', catalogIcon: Camera, aboutTabTitle: 'من نحن' };
    }
    if (text.includes('زراعة منزلية') || (text.includes('نباتات') && text.includes('بيتية'))) {
      return { catalogTabTitle: 'منتجات الزراعة المنزلية والنباتات البيتية', catalogIcon: Palmtree, aboutTabTitle: 'من نحن' };
    }
    return { catalogTabTitle: 'كتالوج المنتجات والأشغال المنزلية', catalogIcon: ShoppingBag, aboutTabTitle: 'من نحن' };
  }

  // =========================================================================
  // 7. TECH & INNOVATION (تقنية وبرمجيات وابتكار)
  // [High priority direct matches to protect 3D printing & software labs]
  // =========================================================================
  if (cat.includes('تقنية') || cat.includes('برمجيات') || cat.includes('ابتكار') || text.includes('طباعة ثلاثية الأبعاد') || text.includes('3d printing') || text.includes('أنظمة برمجية')) {
    if (text.includes('طباعة ثلاثية الأبعاد') || text.includes('3d printing') || text.includes('النمذجة')) {
      return { catalogTabTitle: 'خدمات الطباعة ثلاثية الأبعاد والنمذجة الهندسية', catalogIcon: Package, aboutTabTitle: 'من نحن' };
    }
    if (text.includes('تطوير البرمجيات') || text.includes('تطبيقات') || text.includes('أنظمة')) {
      return { catalogTabTitle: 'الأنظمة والحلول البرمجية وتطوير التطبيقات', catalogIcon: Code, aboutTabTitle: 'من نحن' };
    }
    if (text.includes('خدمة العملاء') || text.includes('call center') || text.includes('تعهيد') || text.includes('bpo')) {
      return { catalogTabTitle: 'خدمات مراكز الاتصال والتعهيد وإدارة العملاء', catalogIcon: Headphones, aboutTabTitle: 'من نحن' };
    }
    if (text.includes('ذكاء اصطناعي') || text.includes('أمن سيبراني') || text.includes('تكنولوجيا المعلومات')) {
      return { catalogTabTitle: 'حلول تكنولوجيا المعلومات والذكاء الاصطناعي', catalogIcon: Cpu, aboutTabTitle: 'من نحن' };
    }
    if (text.includes('مساحات العمل المشتركة') || text.includes('حاضنات الأعمال') || text.includes('co-working')) {
      return { catalogTabTitle: 'باقات المكاتب ومساحات العمل المشتركة', catalogIcon: Building2, aboutTabTitle: 'عن مساحة العمل' };
    }
    if (text.includes('تسويق رقمي') || text.includes('تصميم الهويات') || text.includes('تطوير الويب')) {
      return { catalogTabTitle: 'باقات التسويق الرقمي وتطوير المواقع وتصميم الهويات', catalogIcon: Monitor, aboutTabTitle: 'من نحن' };
    }
    return { catalogTabTitle: 'الحلول والخدمات التقنية والبرمجية', catalogIcon: Code, aboutTabTitle: 'من نحن' };
  }

  // =========================================================================
  // 8. MEDICAL & HEALTHCARE (صحة وطب)
  // =========================================================================
  const isExplicitFashion = text.includes('ملابس') || text.includes('أزياء') || text.includes('ازياء') || text.includes('بوتيك') || text.includes('أواعي');
  const isExplicitNonMedicalSector = 
    cat.includes('تسوق') || cat.includes('تجزئة') || 
    cat.includes('صناعة') || cat.includes('حرف') || 
    cat.includes('مشاريع منزلية') || cat.includes('أونلاين') || 
    cat.includes('تقنية') || cat.includes('برمجيات') || cat.includes('ابتكار') || 
    cat.includes('مأكولات') || cat.includes('مطاعم') || 
    cat.includes('مركبات') || cat.includes('سيارات') || 
    cat.includes('خدمات') || cat.includes('صيانة') || 
    cat.includes('تعليم') || cat.includes('تدريب') || cat.includes('معلمات') ||
    cat.includes('تدريس') || cat.includes('مدرس') ||
    cat.includes('مصانع') || cat.includes('عطور') ||
    text.includes('تدريس') || text.includes('مدرس') ||
    text.includes('مواد طبية وهندسية') ||
    text.includes('مصانع أدوية') || text.includes('مستلزمات طبية وتجميلية') ||
    text.includes('عطور ومستحضرات تجميل') || text.includes('عطور') ||
    sub.includes('طبيعية') || sub.includes('طباعة');

  const isMedicalMatch = !isExplicitFashion && !isExplicitNonMedicalSector && (
    isMedical || 
    cat.includes('صحة وطب') || 
    (
      !sub.includes('طبيعية') && !sub.includes('طباعة') &&
      (
        text.includes('عياد') || 
        text.includes('مستشفى') || 
        text.includes('صيدل') || 
        (text.includes('مختبر') && !text.includes('طباعة') && !text.includes('3d')) || 
        (text.includes('طبي') && !text.includes('طبيعية') && !text.includes('طباعة') && !text.includes('مواد طبية') && !text.includes('مستلزمات طبية') && !text.includes('تدريس') && !text.includes('مدرس'))
      )
    )
  );

  if (isMedicalMatch) {
    if (text.includes('أسنان') || text.includes('اسنان') || text.includes('dental') || text.includes('تقويم أسنان') || text.includes('زراعة أسنان')) {
      return { catalogTabTitle: 'خدمات وإجراءات طب الأسنان', catalogIcon: Stethoscope, aboutTabTitle: 'الملف الطبي' };
    }
    if (text.includes('صيدل') || text.includes('دواء') || text.includes('صيدلية')) {
      return { catalogTabTitle: 'الأدوية والمستلزمات الطبية', catalogIcon: Pill, aboutTabTitle: 'الملف الصيدلاني' };
    }
    if ((text.includes('مختبر') && !text.includes('طباعة') && !text.includes('3d')) || text.includes('تحاليل') || text.includes('فحوصات دم')) {
      return { catalogTabTitle: 'الفحوصات والتحاليل المخبرية', catalogIcon: Microscope, aboutTabTitle: 'عن المختبر' };
    }
    if (text.includes('أشعة') || text.includes('اشعة') || text.includes('رنين') || text.includes('سونار') || text.includes('تصوير إشعاعي')) {
      return { catalogTabTitle: 'خدمات التصوير الإشعاعي والتلفزيوني', catalogIcon: Activity, aboutTabTitle: 'عن مركز الأشعة' };
    }
    if (text.includes('بصريات') || text.includes('نظارات') || text.includes('عدسات') || text.includes('فحص نظر')) {
      return { catalogTabTitle: 'كتالوج النظارات والعدسات وفحص النظر', catalogIcon: Eye, aboutTabTitle: 'عن مركز البصريات' };
    }
    if (text.includes('علاج طبيعي') || text.includes('تأهيل') || text.includes('فيزيائي') || text.includes('كايروبراكتيك')) {
      return { catalogTabTitle: 'جلسات العلاج الطبيعي والتأهيل', catalogIcon: Activity, aboutTabTitle: 'الملف الطبي' };
    }
    if (text.includes('بيطري') || text.includes('حيوانات')) {
      return { catalogTabTitle: 'الخدمات البيطرية ورعاية الحيوانات', catalogIcon: Stethoscope, aboutTabTitle: 'عن العيادة البيطرية' };
    }
    if (text.includes('مستشفى') || text.includes('مستشفيات') || text.includes('مركز طبي')) {
      return { catalogTabTitle: 'الأقسام والخدمات الطبية', catalogIcon: Building2, aboutTabTitle: 'الملف الطبي' };
    }
    if (text.includes('جلدية') || (text.includes('تجميل طبي') && !text.includes('طبيعية')) || text.includes('ليزر طبي')) {
      return { catalogTabTitle: 'جلسات الجلدية والتجميل والليزر', catalogIcon: Sparkles, aboutTabTitle: 'عن المركز' };
    }
    if (text.includes('عيون') || text.includes('جراحة عيون') || text.includes('ليزك')) {
      return { catalogTabTitle: 'فحوصات وعمليات وجراحة العيون', catalogIcon: Eye, aboutTabTitle: 'الملف الطبي' };
    }
    if ((text.includes('أطفال') || text.includes('اطفال')) && (text.includes('طب') || text.includes('طبيب') || text.includes('عياد') || text.includes('مطاعيم') || text.includes('حديثي ولادة') || text.includes('خدج'))) {
      return { catalogTabTitle: 'كشوفات ومطاعيم ورعاية الأطفال', catalogIcon: Stethoscope, aboutTabTitle: 'الملف الطبي' };
    }
    if ((text.includes('نسائية') || text.includes('توليد') || text.includes('حمل')) && (text.includes('طب') || text.includes('طبيب') || text.includes('عياد') || text.includes('عقم') || text.includes('توليد'))) {
      return { catalogTabTitle: 'متابعة الحمل والرعاية النسائية', catalogIcon: Stethoscope, aboutTabTitle: 'الملف الطبي' };
    }
    return { catalogTabTitle: 'الخدمات والاستشارات الطبية', catalogIcon: Stethoscope, aboutTabTitle: 'الملف الطبي' };
  }

  // =========================================================================
  // RESTAURANT, CAFE & SWEETS EQUIPMENT (محلات بيع معدات وأدوات المطاعم والمقاهي والحلويات)
  // High-priority direct match to prevent false matching with food/beverage dining
  // =========================================================================
  if (
    sub.includes('معدات وأدوات المطاعم') || 
    sub.includes('معدات المطاعم') || 
    (text.includes('معدات') && (text.includes('مطاعم') || text.includes('مقاهي') || text.includes('حلويات')))
  ) {
    return { catalogTabTitle: 'كتالوج معدات المطاعم والمقاهي والحلويات', catalogIcon: Package, aboutTabTitle: 'عن المعرض' };
  }

  // =========================================================================
  // 7. FOOD & BEVERAGES (مأكولات ومشروبات)
  // =========================================================================
  if (text.includes('مأكولات') || text.includes('مطاعم') || text.includes('وجبات') || text.includes('كافيه') || text.includes('مقهى') || text.includes('حلويات') || text.includes('مخابز') || text.includes('شاورما') || text.includes('برجر') || text.includes('مشاوي') || text.includes('بيتزا') || text.includes('لحوم') || text.includes('قصاب')) {
    if (text.includes('شاورما')) {
      return { catalogTabTitle: 'منيو الشاورما والوجبات السريعة', catalogIcon: UtensilsCrossed, aboutTabTitle: 'عن المطعم' };
    }
    if (text.includes('برجر') || text.includes('سناكات')) {
      return { catalogTabTitle: 'منيو البرجر والوجبات السريعة', catalogIcon: UtensilsCrossed, aboutTabTitle: 'عن المطعم' };
    }
    if (text.includes('حلويات') || text.includes('كيك') || text.includes('حلو') || text.includes('كنافة')) {
      return { catalogTabTitle: 'منيو الحلويات الشرقية والغربية', catalogIcon: Gift, aboutTabTitle: 'عن محل الحلويات' };
    }
    if (text.includes('مشاوي') || text.includes('مشويات') || text.includes('كباب') || text.includes('مأكولات شرقية') || (text.includes('شرقية') && !text.includes('حلويات'))) {
      return { catalogTabTitle: 'منيو المشاوي والمأكولات الشرقية', catalogIcon: Flame, aboutTabTitle: 'عن المطعم' };
    }
    if (text.includes('بحرية') || text.includes('أسماك') || text.includes('اسماك') || text.includes('سمك')) {
      return { catalogTabTitle: 'منيو المأكولات البحرية والأسماك', catalogIcon: UtensilsCrossed, aboutTabTitle: 'عن المطعم' };
    }
    if (text.includes('بيتزا') || text.includes('معجنات') || text.includes('فطائر')) {
      return { catalogTabTitle: 'منيو البيتزا والمعجنات الإيطالية', catalogIcon: UtensilsCrossed, aboutTabTitle: 'عن المطعم' };
    }
    if (text.includes('شعبية') || text.includes('حمص') || text.includes('فلافل')) {
      return { catalogTabTitle: 'منيو المأكولات الشعبية والفطور', catalogIcon: UtensilsCrossed, aboutTabTitle: 'عن المطعم' };
    }
    if (text.includes('ملاحم') || text.includes('لحوم') || text.includes('قصاب') || text.includes('ذبائح')) {
      return { catalogTabTitle: 'قائمة اللحوم والذبائح الطازجة', catalogIcon: ShoppingBag, aboutTabTitle: 'عن الملحمة' };
    }
    if (text.includes('دواجن') || text.includes('نتفات') || text.includes('دجاج')) {
      return { catalogTabTitle: 'قائمة الدواجن والطيور الطازجة', catalogIcon: ShoppingBag, aboutTabTitle: 'عن المحل' };
    }
    if (text.includes('كافيه') || text.includes('مقهى') || text.includes('قهوة مختصة')) {
      return { catalogTabTitle: 'منيو المشروبات والقهوة والحلويات', catalogIcon: Coffee, aboutTabTitle: 'عن الكافيه' };
    }
    if (text.includes('أكشاك') || text.includes('كشك')) {
      return { catalogTabTitle: 'منيو المشروبات الساخنة والقهوة', catalogIcon: Coffee, aboutTabTitle: 'عن الكشك' };
    }
    if (text.includes('محامص') || text.includes('مكسرات') || text.includes('محمصة') || text.includes('بن')) {
      return { catalogTabTitle: 'قائمة المكسرات والبن والقهوة', catalogIcon: Package, aboutTabTitle: 'عن المحمصة' };
    }
    if (text.includes('مخابز') || text.includes('مخبز') || text.includes('خبز')) {
      return { catalogTabTitle: 'قائمة المخبوزات والمعجنات الطازجة', catalogIcon: Utensils, aboutTabTitle: 'عن المخبز' };
    }
    if (text.includes('بوظة') || text.includes('آيس كريم') || text.includes('ايس كريم') || text.includes('عصائر')) {
      return { catalogTabTitle: 'منيو البوظة والآيس كريم والعصائر', catalogIcon: Coffee, aboutTabTitle: 'عن المحل' };
    }
    if (text.includes('تواصي') || text.includes('مناسف') || text.includes('ولائم') || text.includes('أكل بيت')) {
      return { catalogTabTitle: 'قائمة التواصي والولائم والمناسف', catalogIcon: Utensils, aboutTabTitle: 'عن المطبخ' };
    }
    return { catalogTabTitle: 'منيو المأكولات والمشروبات', catalogIcon: UtensilsCrossed, aboutTabTitle: 'عن المطعم' };
  }

  // =========================================================================
  // 8. BEAUTY & PERSONAL CARE (عناية شخصية وتجميل)
  // =========================================================================
  if (((text.includes('تجميل') && !text.includes('عطور') && !text.includes('مستحضرات')) || text.includes('صالون') || text.includes('حلاق') || text.includes('بشرة') || text.includes('جيم') || text.includes('لياقة') || text.includes('مساج') || (text.includes('سبا') && !text.includes('مناسب')))) {
    if (text.includes('حلاقة (رجال)') || text.includes('حلاقة رجالي') || text.includes('صالون رجال') || text.includes('صالون شباب') || text.includes('حلاق')) {
      return { catalogTabTitle: 'قائمة خدمات الحلاقة والعناية للرجال', catalogIcon: Scissors, aboutTabTitle: 'عن الصالون' };
    }
    if (text.includes('تجميل وصالونات (سيدات)') || text.includes('صالون ستاتي') || text.includes('صالون نسائي') || text.includes('كوافير')) {
      return { catalogTabTitle: 'خدمات التجميل والعناية بالشعر والبشرة', catalogIcon: Sparkles, aboutTabTitle: 'عن الصالون' };
    }
    if (text.includes('بشرة') || text.includes('ليزر')) {
      return { catalogTabTitle: 'جلسات الليزر والعناية بالبشرة', catalogIcon: Sparkles, aboutTabTitle: 'عن المركز' };
    }
    if (text.includes('جيم') || text.includes('رياض') || text.includes('لياقة') || text.includes('fitness')) {
      return { catalogTabTitle: 'باقات الاشتراكات والتدريب الرياضي', catalogIcon: Dumbbell, aboutTabTitle: 'عن النادي الرياضي' };
    }
    if (text.includes('مساج') || text.includes('تدليك') || (text.includes('سبا') && !text.includes('مناسب'))) {
      return { catalogTabTitle: 'جلسات المساج والسبا والاسترخاء', catalogIcon: Heart, aboutTabTitle: 'عن مركز السبا' };
    }
    return { catalogTabTitle: 'قائمة باقات وخدمات العناية', catalogIcon: Sparkles, aboutTabTitle: 'عن المركز' };
  }

  // =========================================================================
  // 9. CRAFTS, INDUSTRY & CONSTRUCTION (صناعة وحرف وإنشاءات)
  // =========================================================================
  if (text.includes('نجارة') || text.includes('منجرة') || (text.includes('مطابخ') && (text.includes('نجارة') || text.includes('منجرة') || text.includes('تفصيل') || text.includes('خشب') || text.includes('أبواب') || cat.includes('صناعة') || cat.includes('حرف') || cat.includes('إنشاءات')) && !text.includes('تواصي') && !text.includes('مناسف') && !text.includes('ولائم') && !cat.includes('مأكولات'))) {
    return { catalogTabTitle: 'أعمال النجارة وتفصيل المطابخ والأبواب', catalogIcon: Wrench, aboutTabTitle: 'عن المنجرة' };
  }
  if (text.includes('حدادة') || text.includes('محددة') || text.includes('تشكيل معادن')) {
    return { catalogTabTitle: 'أعمال الحدادة والحماية وتشكيل المعادن', catalogIcon: Wrench, aboutTabTitle: 'عن المحددة' };
  }
  if (text.includes('ألمنيوم') || text.includes('المنيوم') || (text.includes('زجاج') && !text.includes('زجاجيات') && !text.includes('أدوات منزلية') && !cat.includes('تسوق'))) {
    return { catalogTabTitle: 'أعمال الألمنيوم والزجاج والواجهات', catalogIcon: Wrench, aboutTabTitle: 'عن المحل' };
  }
  if (text.includes('حجر') || text.includes('رخام') || text.includes('سيراميك') || text.includes('محاجر')) {
    return { catalogTabTitle: 'معرض الحجر والرخام والسيراميك', catalogIcon: Package, aboutTabTitle: 'عن المعرض' };
  }
  if (text.includes('طوب') || text.includes('بلاط') || text.includes('خرسانة')) {
    return { catalogTabTitle: 'منتجات الطوب والبلاط والخرسانة', catalogIcon: Package, aboutTabTitle: 'عن المعمل' };
  }
  if (text.includes('مواد بناء') || text.includes('دهانات') || text.includes('دهان')) {
    return { catalogTabTitle: 'قائمة مواد البناء والدهانات والديكور', catalogIcon: Wrench, aboutTabTitle: 'عن المحل' };
  }
  if (text.includes('تمديدات صحية') || text.includes('كهربائية') || text.includes('مواد صحية')) {
    return { catalogTabTitle: 'مستلزمات التمديدات الصحية والكهربائية', catalogIcon: Wrench, aboutTabTitle: 'عن المحل' };
  }
  if (text.includes('ديكور') || text.includes('تصاميم هندسية') || text.includes('تصميم داخلي')) {
    return { catalogTabTitle: 'خدمات التصميم الداخلي والديكور والمخططات', catalogIcon: Briefcase, aboutTabTitle: 'من نحن' };
  }
  if (text.includes('تفصيل الملابس') || text.includes('خياطة وتفصيل') || (text.includes('خياطة') && (text.includes('ملابس') || cat.includes('صناعة') || cat.includes('حرف') || cat.includes('إنشاءات')) && !text.includes('تنجيد') && !text.includes('مفروشات'))) {
    return { catalogTabTitle: 'خدمات الخياطة وتفصيل الملابس والأزياء', catalogIcon: Scissors, aboutTabTitle: 'عن المشغل' };
  }
  if (text.includes('خياطة وتنجيد') || text.includes('تنجيد') || text.includes('مفروشات') || text.includes('ستائر')) {
    return { catalogTabTitle: 'خدمات الخياطة وتنجيد المفروشات والستائر', catalogIcon: Scissors, aboutTabTitle: 'عن المشغل' };
  }
  if (text.includes('العدد الصناعية') || text.includes('المعدات والعدد') || (text.includes('معدات') && text.includes('صناعية'))) {
    return { catalogTabTitle: 'كتالوج المعدات والعدد الصناعية والمهنية', catalogIcon: Wrench, aboutTabTitle: 'عن المحل' };
  }
  if (text.includes('معدات وأدوات المطاعم') || text.includes('معدات المطاعم') || (text.includes('معدات') && (text.includes('مطاعم') || text.includes('مقاهي') || text.includes('حلويات')))) {
    return { catalogTabTitle: 'كتالوج معدات المطاعم والمقاهي والحلويات', catalogIcon: Package, aboutTabTitle: 'عن المعرض' };
  }

  // =========================================================================
  // 10. SERVICES & MAINTENANCE (خدمات وصيانة)
  // =========================================================================
  if (text.includes('أجهزة منزلية') || text.includes('غسالات') || text.includes('ثلاجات') || text.includes('مكيفات')) {
    return { catalogTabTitle: 'خدمات صيانة الأجهزة المنزلية والإلكترونيات', catalogIcon: Wrench, aboutTabTitle: 'عن مركز الصيانة' };
  }
  if (text.includes('تنظيف ودراي كلين') || text.includes('مغسلة سجاد') || text.includes('تنظيف سجاد') || text.includes('دراي كلين')) {
    return { catalogTabTitle: 'خدمات التنظيف والدراي كلين وغسيل السجاد', catalogIcon: Sparkles, aboutTabTitle: 'عن المغسلة' };
  }
  if (text.includes('خدمات منزلية') || text.includes('كهرباء منزلية') || text.includes('سباكة منزلية')) {
    return { catalogTabTitle: 'خدمات الصيانة والتشطيبات المنزلية', catalogIcon: Wrench, aboutTabTitle: 'من نحن' };
  }
  if (text.includes('نقل أثاث') || text.includes('نقل عفش') || text.includes('تغليف أثاث')) {
    return { catalogTabTitle: 'خدمات فك ونقل وتغليف الأثاث', catalogIcon: Truck, aboutTabTitle: 'عن الشركة' };
  }
  if (text.includes('خدمات طباعة') || text.includes('تصوير وتصميم') || text.includes('دعاية وإعلان')) {
    return { catalogTabTitle: 'خدمات الطباعة والتصوير والتصميم الإعلاني', catalogIcon: Briefcase, aboutTabTitle: 'عن المطبعة' };
  }
  if (text.includes('كاميرات مراقبة') || text.includes('ستالايت') || text.includes('أنظمة حماية')) {
    return { catalogTabTitle: 'أنظمة كاميرات المراقبة والحماية والستالايت', catalogIcon: Shield, aboutTabTitle: 'عن المؤسسة' };
  }
  if (text.includes('مكافحة حشرات') || text.includes('تعقيم') || text.includes('رش مبيدات')) {
    return { catalogTabTitle: 'خدمات مكافحة الحشرات والتعقيم والرش', catalogIcon: Shield, aboutTabTitle: 'عن الشركة' };
  }
  if (text.includes('تنقية مياه') || text.includes('فلاتر مياه')) {
    return { catalogTabTitle: 'فلاتر ومحطات تنقية المياه والصيانة', catalogIcon: Droplet, aboutTabTitle: 'عن المحطة' };
  }

  // =========================================================================
  // 11. WEDDINGS & EVENTS (مناسبات وأفراح)
  // =========================================================================
  if (text.includes('أفراح') || text.includes('مناسبات') || text.includes('زفاف') || ((text.includes('صالات') || text.includes('صالة')) && !text.includes('اتصالات') && (text.includes('أفراح') || text.includes('مناسبات') || text.includes('قاعة') || text.includes('حفل')))) {
    if (text.includes('صالات أفراح') || text.includes('صالة أفراح') || text.includes('قاعة')) {
      return { catalogTabTitle: 'باقات حجز الصالات وتنظيم المناسبات', catalogIcon: Building2, aboutTabTitle: 'عن الصالة' };
    }
    if (text.includes('فساتين') || text.includes('بدل')) {
      return { catalogTabTitle: 'تشكيلة فساتين الزفاف وبدل السهرة', catalogIcon: Sparkles, aboutTabTitle: 'عن الأتيليه' };
    }
    if (text.includes('ورود') || text.includes('ورد') || text.includes('زهور')) {
      return { catalogTabTitle: 'باقات الورد وتنسيق الهدايا والمناسبات', catalogIcon: Gift, aboutTabTitle: 'عن المحل' };
    }
    if (text.includes('تصوير') || text.includes('استوديو تصوير') || text.includes('فوتوغرافي')) {
      return { catalogTabTitle: 'باقات التصوير الفوتوغرافي والفيديو', catalogIcon: Camera, aboutTabTitle: 'عن الاستوديو' };
    }
    if (text.includes('تأجير مستلزمات') || text.includes('ضيافة')) {
      return { catalogTabTitle: 'مستلزمات الحفلات وأدوات الضيافة والمقاعد', catalogIcon: Gift, aboutTabTitle: 'من نحن' };
    }
    return { catalogTabTitle: 'باقات الحفلات والخدمات', catalogIcon: Gift, aboutTabTitle: 'من نحن' };
  }

  // =========================================================================
  // 12. FINANCE & LEGAL & BUSINESS (مال وأعمال)
  // =========================================================================
  if (text.includes('مال وأعمال') || text.includes('بنوك') || text.includes('محاماة') || text.includes('صرافة') || text.includes('تأمين')) {
    if (text.includes('بنوك') || text.includes('مصارف') || text.includes('بنك')) {
      return { catalogTabTitle: 'الخدمات والمنتجات المصرفية والتمويلية', catalogIcon: Landmark, aboutTabTitle: 'عن البنك' };
    }
    if (text.includes('صرافة') || text.includes('حوالات')) {
      return { catalogTabTitle: 'خدمات الصرافة والحوالات والعملات', catalogIcon: Landmark, aboutTabTitle: 'عن شركة الصرافة' };
    }
    if (text.includes('محاماة') || text.includes('استشارات قانونية') || text.includes('محامي')) {
      return { catalogTabTitle: 'الاستشارات القانونية والقضايا والتوكيل', catalogIcon: Scale, aboutTabTitle: 'عن مكتب المحاماة' };
    }
    if (text.includes('مكاتب هندسية') || text.includes('مقاولات')) {
      return { catalogTabTitle: 'الخدمات الهندسية والاستشارات والمقاولات', catalogIcon: Building, aboutTabTitle: 'عن المكتب الهندسي' };
    }
    if (text.includes('تأمين')) {
      return { catalogTabTitle: 'برامج وثائق وتأمين المركبات والأفراد', catalogIcon: Shield, aboutTabTitle: 'عن شركة التأمين' };
    }
    if (text.includes('تخليص معاملات')) {
      return { catalogTabTitle: 'خدمات تخليص المعاملات والاستشارات الحكومية', catalogIcon: FileText, aboutTabTitle: 'عن المكتب' };
    }
    if (text.includes('ترجمة')) {
      return { catalogTabTitle: 'خدمات الترجمة المعتمدة والتدقيق اللغوي', catalogIcon: Languages, aboutTabTitle: 'عن مكتب الترجمة' };
    }
    if (text.includes('توظيف')) {
      return { catalogTabTitle: 'خدمات التوظيف واستشارات الموارد البشرية', catalogIcon: Briefcase, aboutTabTitle: 'عن مكتب التوظيف' };
    }
    return { catalogTabTitle: 'قائمة الخدمات والاستشارات', catalogIcon: Briefcase, aboutTabTitle: 'من نحن' };
  }


  // =========================================================================
  // 14. AGRICULTURE & PETS (زراعة وحدائق ومستلزمات)
  // =========================================================================
  if (text.includes('مشاتل') || text.includes('مشتل') || text.includes('نباتات زينة')) {
    return { catalogTabTitle: 'معرض النباتات والأشجار والشتلات الزراعية', catalogIcon: Palmtree, aboutTabTitle: 'عن المشتل' };
  }
  if (text.includes('مستلزمات زراعية') || text.includes('أسمدة') || text.includes('بذور')) {
    return { catalogTabTitle: 'مستلزمات الزراعة والأسمدة والمبيدات', catalogIcon: Package, aboutTabTitle: 'عن المحل' };
  }
  if (text.includes('حيوانات أليفة') || text.includes('قطط') || text.includes('طيور')) {
    return { catalogTabTitle: 'أطعمة ومستلزمات الحيوانات الأليفة', catalogIcon: Heart, aboutTabTitle: 'عن المحل' };
  }
  if (text.includes('زيت زيتون') || text.includes('مكبس زيت') || text.includes('معصرة')) {
    return { catalogTabTitle: 'منتجات زيت الزيتون والزيتون البلدي', catalogIcon: Droplet, aboutTabTitle: 'عن المعصرة' };
  }

  // =========================================================================
  // 15. FACTORIES & INDUSTRIAL (مصانع وإنتاج وشركات صناعية)
  // =========================================================================
  if (text.includes('مصانع') || text.includes('مصنع') || text.includes('إنتاج صناعي') || text.includes('معامل')) {
    if (text.includes('غذائية') || text.includes('ألبان') || text.includes('بهارات') || text.includes('قهوة')) {
      return { catalogTabTitle: 'المنتجات الغذائية وخطوط الإنتاج والتعبئة', catalogIcon: Factory, aboutTabTitle: 'عن المصنع' };
    }
    if (text.includes('ألبسة') || text.includes('غزل') || text.includes('نسيج')) {
      return { catalogTabTitle: 'المنتجات النسيجية والألبسة وخطوط التصدير', catalogIcon: Factory, aboutTabTitle: 'عن المصنع' };
    }
    if (text.includes('منظفات') || text.includes('بلاستيك') || text.includes('كيماويات')) {
      return { catalogTabTitle: 'منتجات المنظفات والمواد البلاستيكية والكيماوية', catalogIcon: Factory, aboutTabTitle: 'عن المصنع' };
    }
    if (text.includes('أدوية') || text.includes('مستلزمات طبية')) {
      return { catalogTabTitle: 'المنتجات الدوائية والمستلزمات الطبية المعتمدة', catalogIcon: Pill, aboutTabTitle: 'عن المصنع' };
    }
    if (text.includes('أثاث') || text.includes('مفروشات')) {
      return { catalogTabTitle: 'خطوط إنتاج الأثاث والمفروشات والتجهيزات', catalogIcon: Package, aboutTabTitle: 'عن المصنع' };
    }
    if (text.includes('كرتون') || text.includes('تغليف')) {
      return { catalogTabTitle: 'منتجات الكرتون ومواد التغليف والطباعة', catalogIcon: Package, aboutTabTitle: 'عن المصنع' };
    }
    if (text.includes('استيراد وتصدير') || text.includes('تجارة جملة')) {
      return { catalogTabTitle: 'قائمة بضائع الاستيراد والتصدير وتجارة الجملة', catalogIcon: Truck, aboutTabTitle: 'عن الشركة' };
    }
    return { catalogTabTitle: 'المنتجات وخطوط الإنتاج والتصنيع', catalogIcon: Factory, aboutTabTitle: 'عن المصنع' };
  }


  // =========================================================================
  // 17. SHOPPING & RETAIL SUB-CATEGORIES (تسوق وتجزئة)
  // =========================================================================
  if (text.includes('أقمشة') || text.includes('اقمشة') || text.includes('صوف') || text.includes('نسيج') || text.includes('خيوط')) {
    return { catalogTabTitle: 'تشكيلة الأقمشة ومستلزمات الصوف والنسيج', catalogIcon: ShoppingBag, aboutTabTitle: 'عن المحل' };
  }
  if (text.includes('سجاد') || text.includes('موكيت')) {
    return { catalogTabTitle: 'معرض السجاد والموكيت والمفروشات الأرضية', catalogIcon: Package, aboutTabTitle: 'عن المعرض' };
  }
  if (text.includes('ملابس') || text.includes('أزياء') || text.includes('ازياء') || text.includes('بوتيك') || text.includes('أواعي')) {
    return { catalogTabTitle: 'تشكيلة الملابس والأزياء', catalogIcon: ShoppingBag, aboutTabTitle: 'عن المتجر' };
  }
  if (text.includes('أحذية') || text.includes('احذية') || text.includes('حقائب') || text.includes('شنط')) {
    return { catalogTabTitle: 'تشكيلة الأحذية والحقائب', catalogIcon: ShoppingBag, aboutTabTitle: 'عن المتجر' };
  }
  if (text.includes('فضة') && !text.includes('ذهب')) {
    return { catalogTabTitle: 'معرض الفضيات والمشغولات والإكسسوارات', catalogIcon: Sparkles, aboutTabTitle: 'عن المعرض' };
  }
  if (text.includes('ذهب') || text.includes('مجوهرات') || text.includes('فضيات') || text.includes('صاغة')) {
    return { catalogTabTitle: 'معرض الذهب والمجوهرات والفضيات', catalogIcon: Sparkles, aboutTabTitle: 'عن المعرض' };
  }
  if (text.includes('ساعات') || text.includes('ساعة')) {
    return { catalogTabTitle: 'معرض الساعات وخدمات الصيانة', catalogIcon: ShoppingBag, aboutTabTitle: 'عن المحل' };
  }
  if (text.includes('شالات') || text.includes('حجاب') || text.includes('أوشحة') || text.includes('ايشارب')) {
    return { catalogTabTitle: 'تشكيلة الشالات والحجاب والأوشحة', catalogIcon: ShoppingBag, aboutTabTitle: 'عن المحل' };
  }
  if (text.includes('مطاحن') || text.includes('مطحنة') || (text.includes('قهوة') && (cat.includes('تسوق') || cat.includes('تجزئة')))) {
    return { catalogTabTitle: 'قائمة أصناف القهوة والبن والمطاحن', catalogIcon: Coffee, aboutTabTitle: 'عن المحل' };
  }
  if (text.includes('هواتف') || text.includes('موبايل') || text.includes('خلوي') || text.includes('إكسسوارات هواتف')) {
    return { catalogTabTitle: 'كتالوج الهواتف الذكية والإكسسوارات', catalogIcon: ShoppingBag, aboutTabTitle: 'عن المحل' };
  }
  if (text.includes('أجهزة كهربائية') || text.includes('الكترونيات') || text.includes('شاشات') || text.includes('غسالات') || text.includes('ثلاجات')) {
    return { catalogTabTitle: 'معرض الأجهزة الكهربائية والإلكترونيات', catalogIcon: ShoppingBag, aboutTabTitle: 'عن المعرض' };
  }
  if (text.includes('كمبيوتر') || text.includes('لابتوب') || text.includes('حاسوب')) {
    return { catalogTabTitle: 'أجهزة اللابتوب والكمبيوتر والملحقات', catalogIcon: ShoppingBag, aboutTabTitle: 'عن المحل' };
  }
  if (text.includes('قرطاسية') || text.includes('مكتبات') || text.includes('أدوات مدرسية') || text.includes('كتب')) {
    return { catalogTabTitle: 'الكتب والقرطاسية والمستلزمات المدرسية', catalogIcon: BookOpen, aboutTabTitle: 'عن المكتبة' };
  }
  if (text.includes('عطور') || text.includes('مكياج') || text.includes('مستحضرات تجميل') || text.includes('برفان')) {
    return { catalogTabTitle: 'كتالوج العطور ومستحضرات التجميل', catalogIcon: Sparkles, aboutTabTitle: 'عن المتجر' };
  }
  if (text.includes('هدايا') || text.includes('ألعاب') || text.includes('تحف') || text.includes('خردوات')) {
    return { catalogTabTitle: 'معرض الهدايا والألعاب والتحف', catalogIcon: Gift, aboutTabTitle: 'عن المحل' };
  }
  if (text.includes('إنارة') || text.includes('إضاءة') || text.includes('ثريات')) {
    return { catalogTabTitle: 'معرض الثريات ووحدات الإنارة', catalogIcon: Sparkles, aboutTabTitle: 'عن المعرض' };
  }
  if (text.includes('أدوات منزلية') || text.includes('زجاجيات') || text.includes('أواني')) {
    return { catalogTabTitle: 'معرض الأدوات المنزلية والزجاجيات', catalogIcon: ShoppingBag, aboutTabTitle: 'عن المحل' };
  }
  if (text.includes('سوبرماركت') || text.includes('هايبرماركت')) {
    return { catalogTabTitle: 'كتالوج السلع والمواد التموينية', catalogIcon: ShoppingCart, aboutTabTitle: 'عن السوبرماركت' };
  }
  if (text.includes('بقالة') || text.includes('دكان') || text.includes('دكاكين')) {
    return { catalogTabTitle: 'قائمة السلع والطلبات اليومية', catalogIcon: ShoppingBag, aboutTabTitle: 'عن البقالة' };
  }
  if (text.includes('خضار') || text.includes('فواكه')) {
    return { catalogTabTitle: 'قائمة الخضار والفواكه الطازجة', catalogIcon: ShoppingBag, aboutTabTitle: 'عن المحل' };
  }
  if (text.includes('مولات') || text.includes('مول') || text.includes('مراكز تجارية')) {
    return { catalogTabTitle: 'دليل المحلات والمنتجات والعروض', catalogIcon: Store, aboutTabTitle: 'عن المركز التجاري' };
  }
  if (text.includes('منظفات') || text.includes('مطهرات')) {
    return { catalogTabTitle: 'قائمة المنظفات والمطهرات المنزلية', catalogIcon: Sparkles, aboutTabTitle: 'عن المحل' };
  }
  if (text.includes('مياه الشرب') || text.includes('تنقية مياه')) {
    return { catalogTabTitle: 'قائمة عبوات وفلاتر مياه الشرب', catalogIcon: Droplet, aboutTabTitle: 'عن المحطة' };
  }
  if (text.includes('فحم') || text.includes('حطب') || text.includes('غاز')) {
    return { catalogTabTitle: 'قائمة الفحم والحطب واسطوانات الغاز', catalogIcon: Flame, aboutTabTitle: 'عن المحل' };
  }

  // Category-level fallback matches for general subcategories across all sectors
  if (cat.includes('تسوق') || cat.includes('تجزئة')) {
    return { catalogTabTitle: 'كتالوج المنتجات والمعروضات', catalogIcon: ShoppingBag, aboutTabTitle: 'عن المتجر' };
  }
  if (cat.includes('صناعة') || cat.includes('حرف') || cat.includes('إنشاءات')) {
    return { catalogTabTitle: 'قائمة المنتجات والأعمال الحرفية', catalogIcon: Wrench, aboutTabTitle: 'عن الورشة' };
  }
  if (cat.includes('عناية شخصية') || cat.includes('تجميل')) {
    return { catalogTabTitle: 'قائمة باقات وخدمات العناية', catalogIcon: Sparkles, aboutTabTitle: 'عن المركز' };
  }
  if (cat.includes('تعليم') || cat.includes('تدريب') || cat.includes('معلم')) {
    return { catalogTabTitle: 'الدورات والبرامج التعليمية', catalogIcon: GraduationCap, aboutTabTitle: 'من نحن' };
  }
  if (cat.includes('مشاريع منزلية') || cat.includes('أونلاين')) {
    return { catalogTabTitle: 'كتالوج المنتجات والأشغال المنزلية', catalogIcon: ShoppingBag, aboutTabTitle: 'من نحن' };
  }
  if (cat.includes('مركبات') || cat.includes('نقل')) {
    return { catalogTabTitle: 'خدمات المركبات والنقل', catalogIcon: Car, aboutTabTitle: 'عن المنشأة' };
  }
  if (cat.includes('خدمات') || cat.includes('صيانة')) {
    return { catalogTabTitle: 'قائمة الخدمات والصيانة المتوفرة', catalogIcon: Wrench, aboutTabTitle: 'عن المنشأة' };
  }
  if (cat.includes('مال') || cat.includes('أعمال')) {
    return { catalogTabTitle: 'قائمة الخدمات والاستشارات', catalogIcon: Briefcase, aboutTabTitle: 'من نحن' };
  }
  if ((cat.includes('مناسبات') || cat.includes('أفراح')) && !cat.includes('اتصالات')) {
    return { catalogTabTitle: 'باقات الحفلات والخدمات', catalogIcon: Gift, aboutTabTitle: 'من نحن' };
  }
  if (cat.includes('سياحة') || cat.includes('ترفيه')) {
    return { catalogTabTitle: 'الأنشطة والخدمات الترفيهية والسياحية', catalogIcon: Compass, aboutTabTitle: 'من نحن' };
  }
  if (cat.includes('زراعة') || cat.includes('حدائق')) {
    return { catalogTabTitle: 'المنتجات والمستلزمات الزراعية', catalogIcon: Package, aboutTabTitle: 'عن المحل' };
  }
  if (cat.includes('مصانع') || cat.includes('إنتاج') || cat.includes('صناعية')) {
    return { catalogTabTitle: 'المنتجات وخطوط الإنتاج والتصنيع', catalogIcon: Factory, aboutTabTitle: 'عن المصنع' };
  }
  if (cat.includes('تقنية') || cat.includes('برمجيات') || cat.includes('ابتكار')) {
    return { catalogTabTitle: 'الحلول والخدمات التقنية والبرمجية', catalogIcon: Code, aboutTabTitle: 'من نحن' };
  }

  // Default fallback for retail/general
  if (text.includes('محل') || text.includes('متجر') || text.includes('دكان')) {
    return { catalogTabTitle: 'كتالوج المنتجات والمعروضات', catalogIcon: ShoppingBag, aboutTabTitle: 'عن المتجر' };
  }
  if (text.includes('مطعم') || text.includes('كافيه') || text.includes('مقهى') || text.includes('وجبات')) {
    return { catalogTabTitle: 'منيو المأكولات والمشروبات', catalogIcon: UtensilsCrossed, aboutTabTitle: 'عن المطعم' };
  }
  return { catalogTabTitle: 'كتالوج المنتجات والخدمات', catalogIcon: Package, aboutTabTitle: 'من نحن' };
}

/**
 * Resolves the precise About tab title based on subcategory, category and business context
 */
export function getSubcategoryAboutTabTitle(
  category?: string,
  subCategory?: string,
  isMedical?: boolean,
  _businessName?: string
): string {
  return getSubcategoryCatalogTabInfo(category, subCategory, isMedical).aboutTabTitle;
}

export function getCategoryOfferConfig(
  category?: string,
  subCategory?: string,
  isMedical?: boolean,
  _businessName?: string
): CategoryOfferConfig {
  const type = detectEntityType(category, subCategory, isMedical);
  const sub = (subCategory || '').toLowerCase();
  const cat = (category || '').toLowerCase();
  const text = `${cat} ${sub}`.trim();
  const tabInfo = getSubcategoryCatalogTabInfo(category, subCategory, isMedical);
  const baseConfig: CategoryOfferConfig = (() => {
    switch (type) {
    case 'food':
      return {
        titlePlaceholder: 'مثال: خصم 20% على كامل الطلب أو وجبة عائلية',
        descriptionPlaceholder: 'اكتب لزبائنك تفاصيل الوجبة أو المشروبات وما يشمله العرض من إضافات وتوصيل',
        quickPresets: [
          'خصم 20% على كامل الطلب اليوم',
          'وجبة التوفير العائلية بسعر خاص',
          'اشتري 1 واحصل على الثاني بنصف السعر',
          'خصم خاص 25% لطلاب الجامعات',
          'وجبة اليوم الخاصة مع مشروب مجانا'
        ],
        termsPresets: [
          'العرض ساري حتى نفاد الكمية',
          'لا يدمج مع عروض أو خصومات أخرى',
          'الطلب متاح داخل الصالة أو سفري',
          'يشترط إبراز البطاقة الجامعية سارية المفعول',
          'يسري العرض خلال أوقات العمل الرسمية فقط'
        ],
        serviceChannels: [
          { id: 'dine_in', label: 'داخل الصالة', color: 'bg-emerald-50 text-emerald-800 border-emerald-200/60' },
          { id: 'takeaway', label: 'استلام سفري', color: 'bg-emerald-50 text-emerald-800 border-emerald-200/60' },
          { id: 'direct_delivery', label: 'توصيل المحل', color: 'bg-emerald-50 text-emerald-800 border-emerald-200/60' },
          { id: 'talabat', label: 'طلبات', imageSrc: '/assets/apps/talabat.png', color: 'bg-orange-50 text-orange-700 border-orange-300' },
          { id: 'ashyaee', label: 'أشيائي', imageSrc: '/assets/apps/ashyaee.png', color: 'bg-yellow-50 text-amber-800 border-yellow-300' },
          { id: 'maestro', label: 'مايسترو', imageSrc: '/assets/apps/maestro.png', color: 'bg-[#ca1b66]/10 text-[#ca1b66] border-[#ca1b66]/30' }
        ],
        catalogTabTitle: tabInfo.catalogTabTitle,
        catalogIcon: tabInfo.catalogIcon
      };

    case 'retail': {
      if (sub.includes('عطور') || sub.includes('مستحضرات تجميل') || text.includes('عطور ومستحضرات تجميل')) {
        return {
          titlePlaceholder: 'مثال: خصم 30% على تشكيلة العطور الفرنسية أو عطرين بسعر واحد',
          descriptionPlaceholder: 'اكتب للزبائن تفاصيل العطور ومستحضرات التجميل المشمولة بالخصم وسعة العبوات',
          quickPresets: [
            'خصم 30% على تشكيلة العطور الفرنسية',
            'اشتري عطر واحصل على معطر جسم مجانا',
            'تغليف هدايا ملكي مجاناً مع أي طلب',
            'باقة العطور الشرقية والبخور بسعر مخفض',
            'خصم 20% على مستحضرات التجميل والمكياج'
          ],
          termsPresets: [
            'العرض ساري حتى نفاد الكمية المتاحة',
            'لا يدمج مع عروض أو خصومات أخرى',
            'يسري على الأصناف والعطور المحددة بالعرض',
            'تتوفر خدمة التوصيل لكافة مناطق إربد'
          ],
          serviceChannels: [
            { id: 'in_store', label: 'شراء من المتجر', color: 'bg-emerald-50 text-emerald-800 border-emerald-200/60' },
            { id: 'delivery', label: 'توصيل منزلي سريع', color: 'bg-blue-50 text-blue-900 border-blue-200' }
          ],
          catalogTabTitle: tabInfo.catalogTabTitle,
          catalogIcon: tabInfo.catalogIcon
        };
      }

      if (sub.includes('مصانع أدوية') || text.includes('مصانع أدوية') || text.includes('مستلزمات طبية وتجميلية')) {
        return {
          titlePlaceholder: 'مثال: خصم خاص 15% على طلبيات التوريد بالجملة أو منتجات معقمة',
          descriptionPlaceholder: 'اكتب للعملاء والوكلاء تفاصيل المنتجات والمستحضرات الدوائية والطبية المصنعة وشروط التوريد',
          quickPresets: [
            'خصم 15% على كميات التوريد الكبرى',
            'توصيل وتوريد مجاني للطلبيات المعتمدة',
            'عينات تجريبية مجانية مع كل طلبية توريد',
            'أسعار تفضيلية للمستشفيات والمراكز الطبية',
            'خصم موسمي على خط إنتاج المعقمات'
          ],
          termsPresets: [
            'يشترط اعتماد أمر الشراء والتوريد المسبق',
            'الأسعار مخصصة لطلبات الجملة والتوريد',
            'تطبق مواصفات ومعايير الجودة المعتمدة',
            'يسري العرض وفق جدول التوريد المتفق عليه'
          ],
          serviceChannels: [
            { id: 'wholesale_delivery', label: 'توريد وشحن بالجملة', color: 'bg-indigo-50 text-indigo-900 border-indigo-200' },
            { id: 'factory_pickup', label: 'استلام مباشر من المستودعات', color: 'bg-stone-50 text-stone-900 border-stone-200' }
          ],
          catalogTabTitle: tabInfo.catalogTabTitle,
          catalogIcon: tabInfo.catalogIcon
        };
      }

      const isBooks = sub.includes('مكتب') || sub.includes('قرطاسية') || sub.includes('كتب');
      return {
        titlePlaceholder: isBooks
          ? 'مثال: خصم 20% على الكتب والقرطاسية أو حقائب مدرسية'
          : sub.includes('هواتف') || sub.includes('إلكترون') 
          ? 'مثال: خصم 20% على إكسسوارات الهواتف وحماية شاشة مجانية' 
          : 'مثال: خصم 30% على التشكيلة الجديدة أو قطعتين بسعر واحدة',
        descriptionPlaceholder: isBooks
          ? 'اكتب للزبائن تفاصيل الكتب والمستلزمات المدرسية والمكتبية المشمولة بالعرض'
          : 'اكتب للزبائن تفاصيل السلع والمنتجات المشمولة بالخصم والمقاسات والألوان المتوفرة',
        quickPresets: isBooks ? [
          'خصم 20% على جميع القرطاسية والمستلزمات',
          'باقة العودة إلى المدرسة بسعر مخفض',
          'خصم 15% على الروايات والكتب العلمية',
          'حقيبة مدرسية مجاناً مع المشتريات المحددة'
        ] : sub.includes('هواتف') || sub.includes('إلكترون') ? [
          'خصم 20% على إكسسوارات الهواتف والسماعات',
          'كفر وحماية شاشة مجانا مع كل صيانة',
          'عروض الشواحن الأصلية وبنوك الطاقة',
          'خصم 15% على صيانة وتبديل الشاشات'
        ] : [
          'خصم 30% على التشكيلة الجديدة',
          'اشتري قطعتين واحصل على الثالثة مجانا',
          'تخفيضات موسمية حصرية بنصف السعر',
          'خصم 20% لطلاب المدارس والجامعات',
          'هدية خاصة عند الشراء بقيمة محددة'
        ],
        termsPresets: [
          'العرض ساري حتى نفاد الكمية المعروضة',
          'لا يدمج مع عروض أو تخفيضات أخرى',
          'التبديل والاسترجاع وفق سياسة المحل المعلنة',
          'يسري الخصم على الأصناف المحددة داخل المتجر',
          'يسري العرض خلال أوقات الدوام الرسمي'
        ],
        serviceChannels: [
          { id: 'in_store', label: 'شراء من المحل', color: 'bg-purple-50 text-purple-900 border-purple-200' },
          { id: 'home_delivery', label: 'توصيل وشحن منزلي', color: 'bg-blue-50 text-blue-900 border-blue-200' },
          { id: 'click_collect', label: 'حجز واستلام من الفرع', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' }
        ],
        catalogTabTitle: tabInfo.catalogTabTitle,
        catalogIcon: tabInfo.catalogIcon
      };
    }

    case 'medical':
      if (sub.includes('أسنان') || sub.includes('اسنان')) {
        return {
          titlePlaceholder: 'مثال: خصم 30% على تنظيف وتبييض الأسنان أو باقة الابتسامة',
          descriptionPlaceholder: 'اكتب للمراجعين تفاصيل جلسة علاج وتجميل الأسنان والفحوصات المشمولة',
          quickPresets: [
            'خصم 30% على تنظيف وتبييض الأسنان',
            'كشفية واستشارة أولى مجانية للأسنان',
            'خصم 25% على زراعة وتركيبات الزيركون',
            'عرض تقويم الأسنان بأقساط ميسرة',
            'فحص وتلميع وقائي شامل للأسرة'
          ],
          termsPresets: [
            'العرض يتطلب حجز موعد مسبق',
            'لا يدمج مع تأمينات الأسنان المباشرة',
            'يشمل العرض الإجراءات المحددة فقط',
            'تطبق المعايير الطبية قبل البدء بالإجراء',
            'الاستشارة مجانية مع أي إجراء تجميلي'
          ],
          serviceChannels: [
            { id: 'clinic_visit', label: 'حضور في العيادة', color: 'bg-teal-50 text-teal-900 border-teal-200' },
            { id: 'phone_consult', label: 'استشارة ومتابعة هاتفية', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' }
          ],
          catalogTabTitle: tabInfo.catalogTabTitle,
          catalogIcon: tabInfo.catalogIcon
        };
      }
      if (sub.includes('صيدل') || sub.includes('دواء')) {
        return {
          titlePlaceholder: 'مثال: خصم 20% على منتجات العناية بالبشرة والمكملات الغذائية',
          descriptionPlaceholder: 'اكتب للعملاء تفاصيل المستحضرات والمكملات والفحوصات المشمولة',
          quickPresets: [
            'خصم 20% على مستحضرات التجميل والعناية',
            'فحص سكري وضغط دم مجاني في الصيدلية',
            'عروض مستلزمات وحليب الأطفال',
            'باقة الفيتامينات والمكملات بخصم خاص'
          ],
          termsPresets: [
            'الخصم يسري على الأصناف غير المسعرة جبريا',
            'العرض ساري حتى نفاد الكمية المتاحة',
            'يسري العرض خلال أوقات دوام الصيدلية'
          ],
          serviceChannels: [
            { id: 'in_pharmacy', label: 'شراء من الصيدلية', color: 'bg-teal-50 text-teal-900 border-teal-200' },
            { id: 'delivery', label: 'توصيل منزلي سريع', color: 'bg-blue-50 text-blue-900 border-blue-200' }
          ],
          catalogTabTitle: tabInfo.catalogTabTitle,
          catalogIcon: tabInfo.catalogIcon
        };
      }
      return {
        titlePlaceholder: 'مثال: خصم 25% على الكشفية أو باقة الفحوصات الشاملة',
        descriptionPlaceholder: 'اكتب للمراجعين تفاصيل الخدمة الطبية والفحوصات والاستشارات المشمولة بالعرض',
        quickPresets: [
          'خصم 25% على الكشفية والاستشارة الطبية',
          'فحص دوري وقائي شامل بسعر مخفض',
          'خصم 30% على خدمات تنظيف وتلميع الأسنان',
          'باقة الفحوصات المخبرية الشاملة للأسرة',
          'استشارة مجانية لحالات تقويم الأسنان'
        ],
        termsPresets: [
          'العرض يتطلب حجز موعد مسبق',
          'لا يدمج العرض مع تغطيات التأمين المباشر',
          'يسري العرض على الكشفية أو الإجراء المحدد فقط',
          'تطبق المعايير الطبية المعتمدة قبل الإجراء',
          'العرض متاح للمراجعين الجدد والحاليين'
        ],
        serviceChannels: [
          { id: 'clinic_visit', label: 'حضور في العيادة', color: 'bg-teal-50 text-teal-900 border-teal-200' },
          { id: 'home_visit', label: 'زيارة طبية منزلية', color: 'bg-blue-50 text-blue-900 border-blue-200' },
          { id: 'phone_consult', label: 'استشارة ومتابعة هاتفية', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' }
        ],
        catalogTabTitle: tabInfo.catalogTabTitle,
        catalogIcon: tabInfo.catalogIcon
      };

    case 'education':
      if (sub.includes('تدريس جامعي') || text.includes('تدريس جامعي') || text.includes('مواد طبية وهندسية') || text.includes('مدرسو ومدرسات')) {
        return {
          titlePlaceholder: 'مثال: خصم 20% على باقة الساعات الجامعية أو مراجعة مادة الفاينل',
          descriptionPlaceholder: 'اكتب للطلبة تفاصيل المادة التدريسية والمساق وساعات الشرح والمراجعات المشمولة بالعرض',
          quickPresets: [
            'خصم 20% على باقة الساعات التدريسية',
            'جلسة مراجعة مكثفة قبل امتحان الفاينل',
            'شرح وتلخيص مجاني للشابتر الأول',
            'خصم 25% للمجموعات الطلابية (3 طلاب فأكثر)',
            'باقة متابعة المادة كاملة بسعر مخفض'
          ],
          termsPresets: [
            'يشترط التنسيق وتحديد المواعيد مسبقاً',
            'متاح التدريس وجاهياً أو عبر منصات الأونلاين',
            'يسري العرض خلال فترة الامتحانات والفصل الحالي',
            'يشمل ملخصات وأسئلة سنوات سابقة للمساق'
          ],
          serviceChannels: [
            { id: 'in_person', label: 'حضور وجاهي', color: 'bg-indigo-50 text-indigo-900 border-indigo-200' },
            { id: 'online', label: 'تدريس أونلاين', color: 'bg-blue-50 text-blue-900 border-blue-200' },
            { id: 'home_tutoring', label: 'تدريس منزلي خاص', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' }
          ],
          catalogTabTitle: tabInfo.catalogTabTitle,
          catalogIcon: tabInfo.catalogIcon
        };
      }

      return {
        titlePlaceholder: 'مثال: خصم 25% على رسوم التسجيل المبكر في دورة اللغة الإنجليزية',
        descriptionPlaceholder: 'اكتب للطلبة محاور الدورة التدريبية وعدد الساعات والمستويات والشهادات المعتمدة',
        quickPresets: [
          'خصم 25% على رسوم التسجيل المبكر',
          'خصم خاص للمجموعات والأخوة 20%',
          'حصة تجريبية مجانية لتقييم المستوى',
          'منحة تفوق جزئية للطلبة المتميزين',
          'باقة دورات تقوية شاملة بسعر مخفض'
        ],
        termsPresets: [
          'يسري الخصم للطلبة المسجلين حديثا',
          'يشترط التسجيل قبل بدء الدورة أو الفصل الدراسي',
          'المقاعد محدودة لضمان جودة التعليم',
          'لا تسترد رسوم التسجيل بعد بدء الدورة',
          'يشمل العرض المادة التعليمية وشهادة الحضور'
        ],
        serviceChannels: [
          { id: 'in_person', label: 'حضور وجاهي في المركز', color: 'bg-indigo-50 text-indigo-900 border-indigo-200' },
          { id: 'online', label: 'تعليم وتدريب عن بعد', color: 'bg-blue-50 text-blue-900 border-blue-200' },
          { id: 'home_tutoring', label: 'تدريس منزلي خاص', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' }
        ],
        catalogTabTitle: tabInfo.catalogTabTitle,
        catalogIcon: tabInfo.catalogIcon
      };

    case 'beauty':
      if (sub.includes('جيم') || sub.includes('رياض') || sub.includes('لياقة')) {
        return {
          titlePlaceholder: 'مثال: خصم 40% على الاشتراك السنوي أو 3 أشهر بسعر شهرين',
          descriptionPlaceholder: 'اكتب للمشتركين تفاصيل الباقة الرياضية والمدربين والخدمات الإضافية المشمولة',
          quickPresets: [
            'اشتراك 3 أشهر في الجيم بسعر شهرين',
            'خصم 40% على الاشتراك السنوي الشامل',
            'أسبوع تدريب تجريبي مجاني للأعضاء الجدد',
            'باقة اشتراك مع مدرب شخصي بسعر مخفض',
            'خصم 25% للطلاب والجامعات'
          ],
          termsPresets: [
            'العرض مخصص للاشتراكات الجديدة والتجديد المبكر',
            'تفعيل الاشتراك خلال 30 يوما من تاريخ الحجز',
            'الاشتراك شخصي ولا يجوز التنازل عنه',
            'يشمل استخدام كافة أجهزة النادي والمرافق'
          ],
          serviceChannels: [
            { id: 'in_gym', label: 'حضور في النادي الرياضي', color: 'bg-amber-50 text-amber-900 border-amber-200' },
            { id: 'online_booking', label: 'حجز واشتراك أونلاين', color: 'bg-blue-50 text-blue-900 border-blue-200' }
          ],
          catalogTabTitle: tabInfo.catalogTabTitle,
          catalogIcon: tabInfo.catalogIcon
        };
      }
      return {
        titlePlaceholder: 'مثال: خصم 30% على باقة العناية بالبشرة أو الشعر للمناسبات',
        descriptionPlaceholder: 'اكتب للعملاء تفاصيل الجلسة التجميلية والمواد المستخدمة والمميزات المرفقة',
        quickPresets: [
          'خصم 35% على باقات العناية بالبشرة والليزر',
          'جلسة تنظيف بشرة مجانية مع كل باقة متكاملة',
          'خصم 25% على خدمات الشعر والمكياج للمناسبات',
          'باقة العناية الشاملة للعرائس بسعر مميز'
        ],
        termsPresets: [
          'العرض يتطلب الحجز المسبق للموعد',
          'لا يمكن استبدال الجلسة بنقد أو خدمات أخرى',
          'يسري الاشتراك لمدة محددة من تاريخ التفعيل',
          'لا يدمج العرض مع بطاقات الخصم الأخرى',
          'يلتزم المشترك بالحضور في الموعد المحدد'
        ],
        serviceChannels: [
          { id: 'in_salon', label: 'في الصالون أو المركز', color: 'bg-rose-50 text-rose-900 border-rose-200' },
          { id: 'home_service', label: 'خدمة تجميلية منزلية', color: 'bg-purple-50 text-purple-900 border-purple-200' }
        ],
        catalogTabTitle: tabInfo.catalogTabTitle,
        catalogIcon: tabInfo.catalogIcon
      };

    case 'services':
      if (sub.includes('نجار') || sub.includes('حداد') || sub.includes('ألمنيوم')) {
        return {
          titlePlaceholder: 'مثال: خصم 20% على تفصيل المطابخ وأبواب الألمنيوم والديكور',
          descriptionPlaceholder: 'اكتب للعملاء تفاصيل الأعمال والمواد والضمان وتاريخ التسليم',
          quickPresets: [
            'خصم 20% على أعمال التفصيل والتركيب',
            'معاينة ورفع مقاسات مجانية في موقع العميل',
            'ضمان شامل لمدة عام على كافة الأعمال والتركيبات',
            'تفصيل مطابخ عصرية بخصومات موسمية'
          ],
          termsPresets: [
            'تحدد التكلفة الدقيقة بعد المعاينة ورفع المقاسات',
            'الخصم يسري على أجور المصنعية والتركيب',
            'يشترط تثبيت الطلب بعربون تعاقدي',
            'يسري العرض داخل محافظة إربد وضواحيها'
          ],
          serviceChannels: [
            { id: 'on_site', label: 'خدمة وتركيب في موقع العميل', color: 'bg-amber-50 text-amber-900 border-amber-200' },
            { id: 'in_workshop', label: 'استلام ومتابعة في الورشة', color: 'bg-stone-50 text-stone-900 border-stone-200' }
          ],
          catalogTabTitle: tabInfo.catalogTabTitle,
          catalogIcon: tabInfo.catalogIcon
        };
      }
      return {
        titlePlaceholder: 'مثال: خصم 20% على أجور فحص وصيانة المكيفات أو الأجهزة',
        descriptionPlaceholder: 'اكتب للعملاء تفاصيل أعمال الصيانة والتمديدات وقطع الغيار المشمولة والضمان',
        quickPresets: [
          'فحص وتشخيص أعطال مجاني قبل الصيانة',
          'خصم 20% على أجور اليد والتركيب',
          'صيانة دورية للمكيفات مع غسيل وفحص الغاز بسعر مخفض',
          'ضمان مجاني ممتد 6 أشهر على أعمال الصيانة',
          'خصم خاص على تفصيل المطابخ وأعمال الديكور'
        ],
        termsPresets: [
          'الخصم يشمل أجور الصيانة والتركيب فقط دون قطع الغيار',
          'يسري الضمان وفق الشروط الفنية المتفق عليها',
          'تحدد التكلفة النهائية بعد المعاينة الميدانية',
          'يسري العرض داخل محافظة إربد وضواحيها',
          'يتطلب العرض التنسيق المسبق وتحديد الموعد'
        ],
        serviceChannels: [
          { id: 'on_site', label: 'خدمة وصيانة في موقع العميل', color: 'bg-amber-50 text-amber-900 border-amber-200' },
          { id: 'in_workshop', label: 'ورشة صيانة واستلام وتسليم', color: 'bg-stone-50 text-stone-900 border-stone-200' },
          { id: 'emergency', label: 'خدمة صيانة طارئة وسريعة', color: 'bg-red-50 text-red-900 border-red-200' }
        ],
        catalogTabTitle: tabInfo.catalogTabTitle,
        catalogIcon: tabInfo.catalogIcon
      };

    case 'cars':
      return {
        titlePlaceholder: 'مثال: فحص شامل للمركبة مع تبديل الزيت بسعر خاص',
        descriptionPlaceholder: 'اكتب للسائقين تفاصيل الفحص الفني وقطع الغيار الأصلية والمميزات المشمولة',
        quickPresets: [
          'فحص شامل للمركبة مع تغيير الزيت بسعر خاص',
          'خصم 20% على خدمات البودي والدهان والميزان',
          'غسيل سيارة داخلي وخارجي مجاني مع الصيانة الدورية',
          'خصم 15% على قطع الغيار الأصلية والإطارات',
          'فحص وبرمجة كمبيوتر السيارة بنصف السعر'
        ],
        termsPresets: [
          'يشمل العرض أجور الفحص والعمل المحدد',
          'لا يشمل العرض القطع التالفة خارج نطاق الصيانة',
          'يسري العرض خلال ساعات دوام الكراج الرسمية',
          'ينصح بحجز موعد مسبق لتجنب الانتظار',
          'تطبق الشروط الفنية لسلامة المركبة'
        ],
        serviceChannels: [
          { id: 'in_garage', label: 'في الكراج أو المحطة', color: 'bg-slate-50 text-slate-900 border-slate-200' },
          { id: 'mobile_service', label: 'خدمة كراج متنقلة', color: 'bg-blue-50 text-blue-900 border-blue-200' },
          { id: 'towing', label: 'خدمة ونش ونقل المركبة', color: 'bg-orange-50 text-orange-900 border-orange-200' }
        ],
        catalogTabTitle: tabInfo.catalogTabTitle,
        catalogIcon: tabInfo.catalogIcon
      };

    case 'events':
      return {
        titlePlaceholder: 'مثال: خصم 25% على باقة حجز القاعة وتصوير الحفلات',
        descriptionPlaceholder: 'اكتب للزبائن تفاصيل باقة المناسبة والخدمات المشمولة من تصوير وضيافة وديكور',
        quickPresets: [
          'خصم 25% على باقات حجز القاعات والتصوير',
          'تنسيق كوشة مجانا مع حجز باقة الفرح المتكاملة',
          'عرض خاص لفساتين وبدل الزفاف والمناسبات',
          'باقة تصوير فيديو وفوتوغرافي بخصم 30%',
          'تنسيق ورد وضيافة متكاملة بسعر مخفض'
        ],
        termsPresets: [
          'العرض ساري للحجوزات المؤكدة بعربون',
          'تحدد المواعيد حسب الأيام المتاحة في جدول الحجوزات',
          'لا يدمج مع عروض المواسم والأعياد',
          'تطبق الشروط التعاقدية المعتمدة للقاعات والخدمات',
          'يشترط تأكيد الحجز قبل أسبوعين على الأقل'
        ],
        serviceChannels: [
          { id: 'venue_booking', label: 'حجز في القاعة أو الاستوديو', color: 'bg-pink-50 text-pink-900 border-pink-200' },
          { id: 'delivery_setup', label: 'توصيل وتجهيز في الموقع', color: 'bg-purple-50 text-purple-900 border-purple-200' },
          { id: 'consultation', label: 'معاينة وتنسيق مسبق', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' }
        ],
        catalogTabTitle: tabInfo.catalogTabTitle,
        catalogIcon: tabInfo.catalogIcon
      };

    case 'finance':
      return {
        titlePlaceholder: 'مثال: استشارة أولى مجانية أو خصم 25% على تأسيس الشركات',
        descriptionPlaceholder: 'اكتب للعملاء مجال الاستشارة أو المعاملة والمستندات المطلوبة للاستفادة من العرض',
        quickPresets: [
          'استشارة قانونية أو مالية أولى مجانية',
          'خصم 20% على خدمات التدقيق وتأسيس الشركات',
          'باقة إقرارات ضريبية ومحاسبية بسعر خاص',
          'ترجمة معتمدة للمستندات بخصم 25%',
          'دراسة جدوى واستشارات أعمال مخفضة'
        ],
        termsPresets: [
          'تشمل الاستشارة الجلسة الأولى فقط لمدة محددة',
          'تطبق معايير السرية المهنية التامة',
          'يتطلب الموعد التنسيق المسبق وتجهيز الأوراق',
          'لا تشمل الرسوم الحكومية أو القضائية الرسمية',
          'يسري العرض للعملاء والشركات الناشئة'
        ],
        serviceChannels: [
          { id: 'in_office', label: 'في المكتب أو مقر الشركة', color: 'bg-blue-50 text-blue-900 border-blue-200' },
          { id: 'online_meeting', label: 'استشارة واجتماع عن بعد', color: 'bg-indigo-50 text-indigo-900 border-indigo-200' },
          { id: 'on_site_visit', label: 'زيارة لمقر منشأة العميل', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' }
        ],
        catalogTabTitle: tabInfo.catalogTabTitle,
        catalogIcon: tabInfo.catalogIcon
      };

    case 'housing':
      return {
        titlePlaceholder: 'مثال: خصم 15% على إيجار الفصل الدراسي الأول للطلاب',
        descriptionPlaceholder: 'اكتب للطلاب تفاصيل الغرفة أو الشقة المتاحة وما تشمله من أثاث وخدمات ومرافق',
        quickPresets: [
          'خصم 15% على إيجار الفصل الدراسي الأول',
          'شهر مجاني عند توقيع عقد إيجار سنوي',
          'شامل فواتير الكهرباء والإنترنت مجانا',
          'غرف سنغل ممتازة بسعر مخفض للطلاب',
          'عروض خاصة لحجوزات المجموعات والزملاء'
        ],
        termsPresets: [
          'العرض ساري للغرف والوحدات المتاحة حاليا',
          'يشترط توقيع عقد الإيجار ودفع التأمين المعتمد',
          'العرض مخصص للطلاب والطالبات المسجلين في الجامعات',
          'الالتزام بأنظمة ولوائح السكن الداخلية',
          'تطبق شروط السداد المالي المتفق عليها'
        ],
        serviceChannels: [
          { id: 'in_person_tour', label: 'معاينة وجاهية في السكن', color: 'bg-indigo-50 text-indigo-900 border-indigo-200' },
          { id: 'virtual_booking', label: 'حجز أونلاين عبر الواتساب', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' }
        ],
        catalogTabTitle: tabInfo.catalogTabTitle,
        catalogIcon: tabInfo.catalogIcon
      };

    case 'general':
    default:
      return {
        titlePlaceholder: 'مثال: خصم 20% على المشتريات أو الخدمات المحددة',
        descriptionPlaceholder: 'اكتب للزبائن تفاصيل العرض الترويجي ومزاياه وكيفية الاستفادة منه',
        quickPresets: [
          'خصم 20% لفترة محدودة',
          'عرض خاص ومميز لهذا الأسبوع',
          'اشتري واحصل على هدية أو خصم إضافي',
          'خصم خاص للطلاب والجامعات',
          'عروض وباقات خاصة للعملاء الجدد'
        ],
        termsPresets: [
          'العرض ساري حتى نفاد الكمية أو انتهاء المدة',
          'لا يدمج مع عروض أو خصومات أخرى',
          'يسري العرض خلال أوقات الدوام الرسمي',
          'تطبق الشروط والأحكام المعلنة داخل المنشأة'
        ],
        serviceChannels: [
          { id: 'in_store', label: 'زيارة المحل أو المنشأة', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
          { id: 'delivery', label: 'توصيل وطلب مباشر', color: 'bg-blue-50 text-blue-900 border-blue-200' }
        ],
        catalogTabTitle: tabInfo.catalogTabTitle,
        catalogIcon: tabInfo.catalogIcon
      };
    }
  })();

  return {
    ...baseConfig,
    catalogTabTitle: tabInfo.catalogTabTitle,
    catalogIcon: tabInfo.catalogIcon,
    aboutTabTitle: tabInfo.aboutTabTitle
  };
}

export const GLOBAL_SERVICE_CHANNELS_MAP: Record<string, ServiceChannelOption> = {
  // Food & Beverage / Restaurants & Cafes
  dine_in: { id: 'dine_in', label: 'داخل الصالة', color: 'bg-emerald-50 text-emerald-800 border-emerald-200/60' },
  takeaway: { id: 'takeaway', label: 'استلام سفري', color: 'bg-emerald-50 text-emerald-800 border-emerald-200/60' },
  direct_delivery: { id: 'direct_delivery', label: 'توصيل المحل', color: 'bg-emerald-50 text-emerald-800 border-emerald-200/60' },
  talabat: { id: 'talabat', label: 'طلبات', imageSrc: '/assets/apps/talabat.png', color: 'bg-orange-50 text-orange-700 border-orange-300' },
  ashyaee: { id: 'ashyaee', label: 'أشيائي', imageSrc: '/assets/apps/ashyaee.png', color: 'bg-yellow-50 text-amber-800 border-yellow-300' },
  maestro: { id: 'maestro', label: 'مايسترو', imageSrc: '/assets/apps/maestro.png', color: 'bg-[#ca1b66]/10 text-[#ca1b66] border-[#ca1b66]/30' },

  // Retail & Stores
  in_store: { id: 'in_store', label: 'شراء من المحل', color: 'bg-purple-50 text-purple-900 border-purple-200' },
  home_delivery: { id: 'home_delivery', label: 'توصيل وشحن منزلي', color: 'bg-blue-50 text-blue-900 border-blue-200' },
  delivery: { id: 'delivery', label: 'توصيل منزلي سريع', color: 'bg-blue-50 text-blue-900 border-blue-200' },
  click_collect: { id: 'click_collect', label: 'حجز واستلام من الفرع', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' },

  // Medical
  clinic_visit: { id: 'clinic_visit', label: 'حضور في العيادة', color: 'bg-teal-50 text-teal-900 border-teal-200' },
  home_visit: { id: 'home_visit', label: 'زيارة طبية منزلية', color: 'bg-blue-50 text-blue-900 border-blue-200' },
  phone_consult: { id: 'phone_consult', label: 'استشارة ومتابعة هاتفية', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
  in_pharmacy: { id: 'in_pharmacy', label: 'شراء من الصيدلية', color: 'bg-teal-50 text-teal-900 border-teal-200' },

  // Education
  in_person: { id: 'in_person', label: 'حضور وجاهي', color: 'bg-indigo-50 text-indigo-900 border-indigo-200' },
  online: { id: 'online', label: 'تعليم وتدريب عن بعد', color: 'bg-blue-50 text-blue-900 border-blue-200' },
  home_tutoring: { id: 'home_tutoring', label: 'تدريس منزلي خاص', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' },

  // Sports & Gyms
  in_gym: { id: 'in_gym', label: 'حضور في النادي الرياضي', color: 'bg-amber-50 text-amber-900 border-amber-200' },
  online_booking: { id: 'online_booking', label: 'حجز واشتراك أونلاين', color: 'bg-blue-50 text-blue-900 border-blue-200' },

  // Beauty & Salons
  in_salon: { id: 'in_salon', label: 'في الصالون أو المركز', color: 'bg-rose-50 text-rose-900 border-rose-200' },
  home_service: { id: 'home_service', label: 'خدمة تجميلية منزلية', color: 'bg-purple-50 text-purple-900 border-purple-200' },

  // Maintenance & Craft Services
  on_site: { id: 'on_site', label: 'خدمة في موقع العميل', color: 'bg-amber-50 text-amber-900 border-amber-200' },
  in_workshop: { id: 'in_workshop', label: 'استلام ومتابعة في الورشة', color: 'bg-stone-50 text-stone-900 border-stone-200' },
  emergency: { id: 'emergency', label: 'خدمة صيانة طارئة', color: 'bg-red-50 text-red-900 border-red-200' },

  // Cars & Automotive
  in_garage: { id: 'in_garage', label: 'في الكراج أو المحطة', color: 'bg-slate-50 text-slate-900 border-slate-200' },
  mobile_service: { id: 'mobile_service', label: 'خدمة كراج متنقلة', color: 'bg-blue-50 text-blue-900 border-blue-200' },
  towing: { id: 'towing', label: 'خدمة ونش ونقل المركبة', color: 'bg-orange-50 text-orange-900 border-orange-200' },

  // Events & Photography
  venue_booking: { id: 'venue_booking', label: 'حجز في القاعة أو الاستوديو', color: 'bg-pink-50 text-pink-900 border-pink-200' },
  delivery_setup: { id: 'delivery_setup', label: 'توصيل وتجهيز في الموقع', color: 'bg-purple-50 text-purple-900 border-purple-200' },
  consultation: { id: 'consultation', label: 'معاينة وتنسيق مسبق', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' },

  // Offices & Corporate
  in_office: { id: 'in_office', label: 'في المكتب أو مقر الشركة', color: 'bg-blue-50 text-blue-900 border-blue-200' },
  online_meeting: { id: 'online_meeting', label: 'استشارة واجتماع عن بعد', color: 'bg-indigo-50 text-indigo-900 border-indigo-200' },
  on_site_visit: { id: 'on_site_visit', label: 'زيارة لمقر منشأة العميل', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' },

  // Housing
  in_person_tour: { id: 'in_person_tour', label: 'معاينة وجاهية في السكن', color: 'bg-indigo-50 text-indigo-900 border-indigo-200' },
  virtual_booking: { id: 'virtual_booking', label: 'حجز أونلاين عبر الواتساب', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' }
};

export function getOfferValidServiceChannels(
  offerServiceChannels: string[] | undefined | null,
  category?: string,
  subCategory?: string,
  isMedical?: boolean,
  businessName?: string
): ServiceChannelOption[] {
  if (!Array.isArray(offerServiceChannels) || offerServiceChannels.length === 0) {
    return [];
  }
  const config = getCategoryOfferConfig(category, subCategory, isMedical, businessName);
  const entityType = detectEntityType(category, subCategory, isMedical);

  return offerServiceChannels
    .map(chId => {
      // 1. Check if it's explicitly one of the channels defined for this category
      const matched = config.serviceChannels.find(sc => sc.id === chId);
      if (matched) return matched;

      // 2. Strict Protection: If entityType is not food, disallow restaurant channels
      if (entityType !== 'food' && ['dine_in', 'takeaway', 'direct_delivery', 'talabat', 'ashyaee', 'maestro'].includes(chId)) {
        return null;
      }

      // 3. Fallback to global map
      return GLOBAL_SERVICE_CHANNELS_MAP[chId] || null;
    })
    .filter(Boolean) as ServiceChannelOption[];
}
