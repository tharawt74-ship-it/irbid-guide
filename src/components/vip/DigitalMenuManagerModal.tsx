import { useConfirm } from '../../contexts/ConfirmContext';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Plus, Trash2, Edit2, UtensilsCrossed, CheckCircle,
  Sparkles, Check, Image as ImageIcon, Flame, DollarSign,
  Tag, Info, HelpCircle, AlertCircle, ArrowUp, ArrowDown, Play,
  Home, Building, Activity, ShieldCheck, GraduationCap, Wrench, Gift, ShoppingBag,
  Layers, PlusCircle, Eye, SlidersHorizontal, ArrowRight, CheckCircle2, ChevronDown,
  Percent, Sparkle, RefreshCw, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Business, MenuItem, MenuItemVersion } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getBusinessVipStatus } from '../../lib/vipHelper';
import { sanitizeFirestorePayload, compressAndSanitizeFirestorePayload } from '../../lib/firestoreHelper';
import { VipUpgradeRequestModal } from './VipUpgradeRequestModal';
import { useAuth } from '../../contexts/AuthContext';
import { ImageUploader } from '../ui/ImageUploader';
import { calculateItemPriceWithVersion, getMenuItemDisplayPrice } from '../../contexts/CartContext';

interface DigitalMenuManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business;
  onMenuUpdated: (updatedItems: MenuItem[], updatedTitle?: string, updatedDescription?: string) => void;
}

export interface CategoryTheme {
  title: string;
  subtitle: string;
  addItemLabel: string;
  addItemPlaceholder: string;
  priceLabel: string;
  pricePlaceholder: string;
  optionsLabel: string;
  optionsSub: string;
  optionsPlaceholder: string;
  buttonAddText: string;
  buttonAddShort: string;
  whatsappOrderLabel: string;
  cartIconType: 'food' | 'home' | 'medical' | 'retail' | 'edu' | 'wrench' | 'party' | 'car';
  badges: {
    popular: string;
    new: string;
    spicyOrFeatured: string;
    vegetarianOrPromo: string;
  };
  presetCategories: string[];
}

export function getCategoryTheme(businessCategory: string, businessSubcategory?: string): CategoryTheme {
  const text = ((businessCategory || '') + ' ' + (businessSubcategory || '')).toLowerCase();

  // FOOD
  if (text.includes('مطاعم') || text.includes('مأكولات') || text.includes('حلويات') || text.includes('شاورما') || text.includes('برجر') || text.includes('بيتزا') || text.includes('قهوة') || text.includes('عصائر') || text.includes('كافيه') || text.includes('مخابز') || text.includes('مشروبات')) {
    return {
      title: 'منيو الطعام والشراب الرقمي',
      subtitle: 'تصفح الأصناف اللذيذة والوجبات، قم بتجهيز طلبيتك وأرسلها مباشرة للتحضير.',
      addItemLabel: 'اسم الوجبة أو الطبق أو المشروب *',
      addItemPlaceholder: 'مثال: وجبة شاورما عربي دبل، برجر لحم فخم، عصير فريش...',
      priceLabel: 'سعر الوجبة الحالية (د.أ) *',
      pricePlaceholder: 'مثال: 3.50',
      optionsLabel: 'خيارات وتخصيصات الوجبة (مثل الأحجام والإضافات)',
      optionsSub: 'تتيح للزبون تحديد رغبته مثل: زيادة ثوم، حجم كبير، بدون بصل.',
      optionsPlaceholder: 'مثال: زيادة جبنة (+0.50)، حجم لارج (+1.00)، بدون بصل...',
      buttonAddText: 'إضافة للطلب 🛒',
      buttonAddShort: 'إضافة للسلة',
      whatsappOrderLabel: 'إرسال طلب الطعام الفوري عبر الواتساب',
      cartIconType: 'food',
      badges: {
        popular: 'الأكثر طلباً ⭐',
        new: 'جديد ومميز ✨',
        spicyOrFeatured: 'حار سبايسي 🌶️',
        vegetarianOrPromo: 'نباتي / صحي 🌱'
      },
      presetCategories: [
        'وجبات رئيسية',
        'برجر وسندويشات',
        'شاورما عربي',
        'بيتزا ومعجنات',
        'مشروبات ساخنة',
        'مشروبات باردة',
        'حلويات وكريب',
        'أطباق جانبية',
        'عروض توفير وعائلية'
      ]
    };
  }

  // HOUSING & ACCOMMODATIONS
  if (text.includes('سكن') || text.includes('شقق') || text.includes('عقار') || text.includes('إيجار') || text.includes('مكاتب عقارية')) {
    return {
      title: 'دليل الغرف والوحدات السكنية المتاحة',
      subtitle: 'استكشف الغرف، الأجنحة، والشقق المتوفرة للإيجار وتواصل لحجز موعد معاينة فوراً.',
      addItemLabel: 'عنوان الغرفة أو الشقة أو الجناح *',
      addItemPlaceholder: 'مثال: غرفة سنغل ممتازة هادئة، جناح دبل ماستر مفروش، شقة استوديو...',
      priceLabel: 'الأجرة الشهرية / السنوية (د.أ) *',
      pricePlaceholder: 'مثال: 120.00',
      optionsLabel: 'الميزات والخدمات المشمولة (مثل الفواتير أو الأثاث)',
      optionsSub: 'تتيح للطلاب/الطالبات معرفة التفاصيل مثل: شامل كهرباء، شامل إنترنت سريع.',
      optionsPlaceholder: 'مثال: شامل كهرباء وماء، سرير إضافي (+15)، دفعة فصلية...',
      buttonAddText: 'طلب حجز ومعاينة 🏠',
      buttonAddShort: 'احجز الآن',
      whatsappOrderLabel: 'إرسال طلب حجز ومعاينة الغرفة عبر الواتساب',
      cartIconType: 'home',
      badges: {
        popular: 'الأعلى تقييماً ⭐',
        new: 'متاح حديثاً ✨',
        spicyOrFeatured: 'شامل الفواتير 🔥',
        vegetarianOrPromo: 'قريب من الجامعة 🎓'
      },
      presetCategories: [
        'غرف مفردة (Single)',
        'غرف مزدوجة (Double)',
        'أجنحة ماستر فخمة',
        'شقق استوديو مفروشة',
        'شقق فارغة للإيجار',
        'شقق معروضة للبيع'
      ]
    };
  }

  // MEDICAL & CLINICS
  if (text.includes('طب') || text.includes('مستشفيات') || text.includes('عيادات') || text.includes('أسنان') || text.includes('صيدل') || text.includes('مختبر') || text.includes('علاج') || text.includes('صحة')) {
    return {
      title: 'الخدمات والأسعار',
      subtitle: 'استعرض قائمة المعاينات، الكشوفات الطبية، جلسات العلاج، والخدمات الصحية المتاحة.',
      addItemLabel: 'اسم الخدمة الطبية أو الكشفية أو الفحص *',
      addItemPlaceholder: 'مثال: كشفية طبيب اختصاص، فحص مخبري شامل، زراعة أسنان، تنظيف أسنان...',
      priceLabel: 'تكلفة الخدمة / الكشفية (د.أ) *',
      pricePlaceholder: 'مثال: 15.00',
      optionsLabel: 'تفاصيل ومرفقات الخدمة الطبية',
      optionsSub: 'تساعد المراجع على فهم ما تشمله الخدمة مثل: مع صورة أشعة، كفالة سنة.',
      optionsPlaceholder: 'مثال: يشمل فحص المتابعة مجاناً، مع صورة أشعة مجانية...',
      buttonAddText: 'احجز موعد كشفية 🏥',
      buttonAddShort: 'حجز كشفية',
      whatsappOrderLabel: 'إرسال طلب استفسار وحجز موعد طبي عبر الواتساب',
      cartIconType: 'medical',
      badges: {
        popular: 'الأكثر طلباً ⭐',
        new: 'تقنيات حديثة 🔬',
        spicyOrFeatured: 'يشمل التأمين 🛡️',
        vegetarianOrPromo: 'فحص وقائي 🌱'
      },
      presetCategories: [
        'كشفية ومعاينة',
        'جلسات علاجية ومتابعة',
        'فحوصات طبية ومخبرية',
        'تنظيف وتجميل الأسنان',
        'بصريات ونظارات طبية',
        'منتجات صيدلانية معتمدة'
      ]
    };
  }

  // BEAUTY & PERSONAL CARE
  if (text.includes('تجميل') || text.includes('صالون') || text.includes('بشرة') || text.includes('حلاقة') || text.includes('جيم') || text.includes('عناية')) {
    return {
      title: 'قائمة الجلسات والخدمات التجميلية والأسعار',
      subtitle: 'احجز جلستك القادمة، واطلع على أسعار خدمات العناية بالبشرة، الحلاقة، والليزر بدقة.',
      addItemLabel: 'اسم الخدمة أو الجلسة التجميلية *',
      addItemPlaceholder: 'مثال: تنظيف بشرة هيدرافيشيل، قص سشوار وصبغة، اشتراك جيم شهري...',
      priceLabel: 'تكلفة الخدمة / الاشتراك (د.أ) *',
      pricePlaceholder: 'مثال: 25.00',
      optionsLabel: 'الخيارات أو المواد المستخدمة في الجلسة',
      optionsSub: 'تتيح للزبون تحديد المواد أو الفئة مثل: مواد فرنسية، مع خبير مخصص.',
      optionsPlaceholder: 'مثال: مع ماسك كولاجين (+5)، مواد إيطالية طبيعية، جلسة مسائية...',
      buttonAddText: 'احجز جلستك الآن 💅',
      buttonAddShort: 'احجز جلسة',
      whatsappOrderLabel: 'طلب موعد جلسة عناية وتجميل عبر الواتساب',
      cartIconType: 'retail',
      badges: {
        popular: 'الأكثر رواجاً ⭐',
        new: 'عرض محدود 🏷️',
        spicyOrFeatured: 'أحدث الأجهزة ✨',
        vegetarianOrPromo: 'مواد طبيعية 100% 🌱'
      },
      presetCategories: [
        'خدمات الشعر والتصفيف',
        'جلسات العناية بالبشرة',
        'جلسات ليزر وإزالة شعر',
        'مكياج ومناسبات',
        'اشتراكات وتدريب جيم',
        'باقات تجميل متكاملة'
      ]
    };
  }

  // EDUCATION & COURSES
  if (text.includes('تعليم') || text.includes('مدارس') || text.includes('تدريب') || text.includes('جامع') || text.includes('لغات') || text.includes('ثقافي') || text.includes('أكاديمي')) {
    return {
      title: 'دليل الدورات، البرامج التدريبية والرسوم',
      subtitle: 'استعرض البرامج الدراسية والتعليمية والدورات التدريبية المتاحة للتسجيل الفوري.',
      addItemLabel: 'اسم الكورس أو البرنامج التدريبي أو القسط *',
      addItemPlaceholder: 'مثال: كورس لغة إنجليزية شامل، ورشة عمل الذكاء الاصطناعي، قسط روضة شهري...',
      priceLabel: 'رسوم الكورس / القسط (د.أ) *',
      pricePlaceholder: 'مثال: 50.00',
      optionsLabel: 'ميزات وشهادات التدريب المتاحة',
      optionsSub: 'توضح للمتدرب نوع الحضور أو الشهادة مثل: حضور وجاهي، شهادة مصدقة.',
      optionsPlaceholder: 'مثال: حضور وجاهي، شامل شهادة معتمدة (+15)، تقسيط ميسر...',
      buttonAddText: 'سجل في الكورس 🎓',
      buttonAddShort: 'تسجيل سريع',
      whatsappOrderLabel: 'إرسال طلب تسجيل واستفسار عن الكورس عبر الواتساب',
      cartIconType: 'edu',
      badges: {
        popular: 'الأكثر طلباً ⭐',
        new: 'بدء التسجيل 📝',
        spicyOrFeatured: 'شهادة معتمدة 📜',
        vegetarianOrPromo: 'خصم للمجموعات 🏷️'
      },
      presetCategories: [
        'دورات تدريبية مكثفة',
        'كورسات لغات وتوفل',
        'برامج تقنية وبرمجة',
        'دروس تقوية ومتابعة',
        'أقساط ورسوم دراسية',
        'ورش عمل مخصصة'
      ]
    };
  }

  // SERVICES & REPAIRS / CRAFTS
  if (text.includes('صيانة') || text.includes('تنظيف') || text.includes('دراي') || text.includes('سباك') || text.includes('نجار') || text.includes('كهرب') || text.includes('صناعي') || text.includes('خدمات')) {
    return {
      title: 'قائمة خدمات الصيانة والحلول المنزلية والمهنية',
      subtitle: 'اطلب فني صيانة، أو استعرض قائمة خدمات التنظيف والصيانة السريعة مع الضمان.',
      addItemLabel: 'اسم الخدمة أو الفحص *',
      addItemPlaceholder: 'مثال: صيانة مكيفات سبليت، دراي كلين سجاد للمتر، فك وتركيب غسالة...',
      priceLabel: 'سعر الفحص / تكلفة الخدمة التقريبية (د.أ) *',
      pricePlaceholder: 'مثال: 10.00',
      optionsLabel: 'خيارات أو شروط كفالة الخدمة',
      optionsSub: 'توضح للعميل تفاصيل قطع الغيار أو الضمان مثل: كفالة 6 أشهر، قطع غيار أصلية.',
      optionsPlaceholder: 'مثال: مع كفالة 6 أشهر (+5)، قطع غيار أصلية، خدمة فورية مستعجلة...',
      buttonAddText: 'طلب فني / خدمة 🛠️',
      buttonAddShort: 'طلب الخدمة',
      whatsappOrderLabel: 'طلب صيانة وفحص فني فوري عبر الواتساب',
      cartIconType: 'wrench',
      badges: {
        popular: 'الخدمة الأسرع ⚡',
        new: 'عروض الموسم ❄️',
        spicyOrFeatured: 'ضمان ذهبي 🛡️',
        vegetarianOrPromo: 'أجهزة أصلية ✅'
      },
      presetCategories: [
        'خدمات صيانة مكيفات والتبريد',
        'صيانة أجهزة منزلية وغسالات',
        'تنظيف ودراي كلين معقم',
        'خدمات سباكة وتمديدات صحية',
        'صيانة وميكانيك سيارات',
        'أعمال نجارة وكهرباء منزلية'
      ]
    };
  }

  // EVENTS & WEDDINGS
  if (text.includes('مناسبات') || text.includes('أفراح') || text.includes('صالات') || text.includes('فساتين') || text.includes('ورود') || text.includes('تصوير')) {
    return {
      title: 'كتالوج تجهيز الحفلات والمناسبات والأفراح',
      subtitle: 'استعرض باقات حجز الصالات، فساتين الزفاف، استوديوهات التصوير وتزيين الورود الفخم.',
      addItemLabel: 'اسم الخدمة أو الباقة أو الصنف *',
      addItemPlaceholder: 'مثال: حجز صالة أفراح ملكية، فستان زفاف ملكي تركي، باقة تصوير عرسان...',
      priceLabel: 'سعر الحجز / تكلفة الخدمة (د.أ) *',
      pricePlaceholder: 'مثال: 350.00',
      optionsLabel: 'الميزات الإضافية والخدمات المشمولة في الحفلة',
      optionsSub: 'تفاصيل تضاف مع الباقة مثل: شامل البوفيه المفتوح، تصوير فيديو طائرة.',
      optionsPlaceholder: 'مثال: شامل بوفيه مفتوح، زينة ورد طبيعي (+100)، تصوير طائرة درون...',
      buttonAddText: 'حجز الباقة / استفسار 🎉',
      buttonAddShort: 'احجز الآن',
      whatsappOrderLabel: 'إرسال طلب استفسار وتأكيد حجز المناسبة عبر الواتساب',
      cartIconType: 'party',
      badges: {
        popular: 'الأكثر فخامة 👑',
        new: 'تصاميم حديثة ✨',
        spicyOrFeatured: 'شامل الضيافة ☕',
        vegetarianOrPromo: 'خصم حجز مبكر 🏷️'
      },
      presetCategories: [
        'باقات حجز صالات وقاعات',
        'فساتين زفاف وبدل رجالية',
        'باقات تصوير وفيديو فخمة',
        'تنسيق ورود وتزيين سيارات',
        'ضيافة وحلويات المناسبات'
      ]
    };
  }

  // SHOPPING & RETAIL (DEFAULT)
  return {
    title: 'كتالوج المنتجات والسلع الفاخرة المتاحة',
    subtitle: 'استكشف تشكيلاتنا المتميزة، أضف السلع إلى سلة التسوق الخاصة بك، واطلبها فوراً عبر الواتساب.',
    addItemLabel: 'اسم المنتج أو السلعة المعروضة *',
    addItemPlaceholder: 'مثال: بلوزة تركي قطن 100%، عطر فرنسي فخم، موبايل آيفون 16...',
    priceLabel: 'سعر بيع المنتج الحالي (د.أ) *',
    pricePlaceholder: 'مثال: 12.00',
    optionsLabel: 'الألوان والمقاسات والخيارات المتوفرة',
    optionsSub: 'تتيح للزبون اختيار المقاس، اللون، أو تغليف الهدايا المميز.',
    optionsPlaceholder: 'مثال: مقاس XL، لون أسود، تغليف هدايا ملكي (+2.00)، كفالة سنتين...',
    buttonAddText: 'إضافة لسلة الشراء 🛍️',
    buttonAddShort: 'إضافة للسلة',
    whatsappOrderLabel: 'إرسال طلب شراء السلع والمنتجات عبر الواتساب',
    cartIconType: 'retail',
    badges: {
      popular: 'الأكثر مبيعاً ⭐',
      new: 'وصل حديثاً ✨',
      spicyOrFeatured: 'أصلي ومكفول 💯',
      vegetarianOrPromo: 'شحن مجاني 🚚'
    },
    presetCategories: [
      'ملابس وأزياء أحدث صيحة',
      'أحذية وحقائب يد فخمة',
      'عطور وأدوات تجميل أصلية',
      'سوبرماركت ومواد غذائية',
      'أجهزة كهربائية وإلكترونيات',
      'قرطاسية ومستلزمات مكتبية',
      'ساعات وإكسسوارات ذهبية'
    ]
  };
}

// Preset library of ultra-high-quality Unsplash covers for owners
const PRESET_IMAGES = [
  { name: 'شاورما عربية', url: 'https://images.unsplash.com/photo-1644704170910-a0cdf183649b?auto=format&fit=crop&w=600&q=80' },
  { name: 'برجر كلاسيك', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80' },
  { name: 'بيتزا إيطالية', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80' },
  { name: 'قهوة اسبريسو', url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80' },
  { name: 'شقة سكنية فخمة', url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80' },
  { name: 'جلسة صالون تجميل', url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80' },
  { name: 'عيادة مجهزة', url: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=600&q=80' },
  { name: 'منتجات موضة وملابس', url: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=600&q=80' },
];

export const getDynamicCatalogLabels = (biz: Business) => {
  const cat = (biz.category || '').toLowerCase();
  const name = (biz.name || '').toLowerCase();

  // 1. Pharmacy
  if (cat.includes('صيدل') || name.includes('صيدلية')) {
    return {
      bannerTitle: 'هل ترغب في إضافة دواء أو مستحضر تجميل أو منتج طبي جديد؟',
      bannerDesc: 'استخدم استوديو الأدوية والمنتجات الجديد كلياً لإضافة الصور، الأسعار، البدائل الطبية، الأحجام المتعددة والشارات الترويجية بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة دواء/منتج',
      listTitle: 'الأدوية والمستلزمات المضافة في الكتالوج'
    };
  }

  // 2. Medical / Doctors / Clinics
  if (
    biz.medicalProfile ||
    cat.includes('طب') ||
    cat.includes('صحة') ||
    cat.includes('عياد') ||
    cat.includes('مستشف') ||
    cat.includes('مختبر') ||
    cat.includes('علاج') ||
    name.includes('دكتور') ||
    name.includes('عيادة') ||
    name.includes('مركز طبي')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة خدمة طبية أو فحص أو إجراء علاجي جديد؟',
      bannerDesc: 'استخدم استوديو الخدمات الطبية الجديد كلياً لإضافة الصور، أسعار الكشوفات، العروض العلاجية، والخيارات المتعددة بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة خدمة طبية',
      listTitle: 'الخدمات الطبية المضافة في الكتالوج'
    };
  }

  // 3. Restaurants / Food / Cafes
  if (
    cat.includes('مطعم') ||
    cat.includes('أكل') ||
    cat.includes('وجب') ||
    cat.includes('حلويات') ||
    cat.includes('مقهى') ||
    cat.includes('كافيه') ||
    cat.includes('عصائر') ||
    cat.includes('غذاء')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة وجبة أو صنف أو مشروب جديد؟',
      bannerDesc: 'استخدم استوديو الأصناف الجديد كلياً لإضافة الصور، الأسعار، العروض، الأحجام المتعددة (Versions) والشارات الترويجية بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة وجبة/صنف',
      listTitle: 'الوجبات والأصناف المضافة في الكتالوج'
    };
  }

  // 4. Services / Education / Maintenance / Beauty
  if (
    cat.includes('خدم') ||
    cat.includes('صيان') ||
    cat.includes('تعليم') ||
    cat.includes('توصيل') ||
    cat.includes('استشار') ||
    cat.includes('تنظيف') ||
    cat.includes('تجميل') ||
    cat.includes('صالون') ||
    cat.includes('حلاقة') ||
    cat.includes('بشرة') ||
    cat.includes('عناية')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة خدمة أو باقة أو استشارة جديدة؟',
      bannerDesc: 'استخدم استوديو الخدمات الجديد كلياً لإضافة الصور، أسعار الخدمات، الباقات المتعددة والخصومات والمميزات بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة خدمة',
      listTitle: 'الخدمات المضافة في الكتالوج'
    };
  }

  // 5. Default / Retail / Shops
  return {
    bannerTitle: 'هل ترغب في إضافة منتج أو صنف أو معروض جديد؟',
    bannerDesc: 'استخدم استوديو المنتجات الجديد كلياً لإضافة الصور، الأسعار، مواصفات المنتج، الألوان والمقاسات والشارات الترويجية بسهولة وسلاسة.',
    bannerBtn: 'فتح استوديو إضافة منتج',
    listTitle: 'المنتجات والأصناف المضافة في الكتالوج'
  };
};

export function DigitalMenuManagerModal({
  isOpen,
  onClose,
  business,
  onMenuUpdated
}: DigitalMenuManagerModalProps) {
  const { confirm } = useConfirm();
  const { currentUser, isAdmin } = useAuth();
  const [items, setItems] = useState<MenuItem[]>(business.menuItems || []);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // Resolve Theme based on Business Category
  const theme = getCategoryTheme(business.category || '');
  const labels = getDynamicCatalogLabels(business);

  // Form fields
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [badge, setBadge] = useState<'popular' | 'new' | 'spicy' | 'vegetarian' | 'none'>('none');
  
  // Custom Options/Modifiers state
  const [options, setOptions] = useState<string[]>([]);
  const [newOptionInput, setNewOptionInput] = useState('');

  // Item Versions / Sizes / Add-ons state
  const [versions, setVersions] = useState<MenuItemVersion[]>([]);
  const [versionType, setVersionType] = useState<'sizes' | 'addons'>('sizes');
  const [versionName, setVersionName] = useState('');
  const [versionPriceType, setVersionPriceType] = useState<'fixed' | 'additional' | 'free'>('fixed');
  const [versionPrice, setVersionPrice] = useState('');
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  
  // New UI Form Architecture State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<'basics' | 'pricing' | 'versions' | 'extras'>('basics');
  const [showLivePreviewMobile, setShowLivePreviewMobile] = useState(false);



  const [customMenuTitle, setCustomMenuTitle] = useState(business.menuTitle || '');
  const [customMenuDescription, setCustomMenuDescription] = useState(business.menuDescription || '');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // State for preview version selection inside the live preview card
  const [previewSelectedVer, setPreviewSelectedVer] = useState<MenuItemVersion | undefined>(undefined);
  useEffect(() => {
    if (versions.length > 0) {
      setPreviewSelectedVer(versions[0]);
    } else {
      setPreviewSelectedVer(undefined);
    }
  }, [versions]);

  const vipInfo = getBusinessVipStatus(business);

  useEffect(() => {
    if (business.menuItems) {
      setItems(business.menuItems);
    }
    setCustomMenuTitle(business.menuTitle || '');
    setCustomMenuDescription(business.menuDescription || '');
  }, [business]);

  // Typewriter effect state for the subcategory/category field
  const typingPhrases = [
    'وجبات رئيسية وجانبية',
    'برجر وسندويشات فخمة',
    'غرف مفردة ومزدوجة سنغل',
    'شقق مفروشة للإيجار',
    'جلسات ليزر وتجميل',
    'تنظيف بشرة وعناية',
    'كورسات لغات وتوفل',
    'صيانة مكيفات سبليت',
    'ملابس رجالية ونسائية',
    'عطور فرنسية وهدايا فخمة'
  ];
  const [typingPlaceholder, setTypingPlaceholder] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentPhrase = typingPhrases[phraseIdx];
    
    if (isDeleting) {
      timer = setTimeout(() => {
        setTypingPlaceholder(currentPhrase.substring(0, charIdx - 1));
        setCharIdx(prev => prev - 1);
      }, 30);
    } else {
      timer = setTimeout(() => {
        setTypingPlaceholder(currentPhrase.substring(0, charIdx + 1));
        setCharIdx(prev => prev + 1);
      }, 70);
    }

    if (!isDeleting && charIdx === currentPhrase.length) {
      timer = setTimeout(() => {
        setIsDeleting(true);
      }, 2000);
    } else if (isDeleting && charIdx === 0) {
      setIsDeleting(false);
      setPhraseIdx((prev) => (prev + 1) % typingPhrases.length);
    }

    return () => clearTimeout(timer);
  }, [charIdx, isDeleting, phraseIdx]);

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

  const handleEditClick = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setPrice(item.price);
    setOriginalPrice(item.originalPrice || '');
    setCategory(item.category || '');
    setDescription(item.description || '');
    setImageUrl(item.imageUrl || '');
    setIsAvailable(item.isAvailable !== false);
    setBadge(item.badge || (item.isPopular ? 'popular' : 'none'));
    setOptions(item.options || []);
    setNewOptionInput('');
    setVersions(item.versions || []);
    setVersionType(item.versionType || 'sizes');
    setVersionName('');
    setVersionPrice('');
    setVersionPriceType('fixed');
    setEditingVersionId(null);
    setActiveFormTab('basics');
    setIsFormOpen(true);
  };

  const handleOpenNewItem = () => {
    handleCancelEdit();
    setActiveFormTab('basics');
    setIsFormOpen(true);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setName('');
    setPrice('');
    setOriginalPrice('');
    setCategory('');
    setDescription('');
    setImageUrl('');
    setIsAvailable(true);
    setBadge('none');
    setOptions([]);
    setNewOptionInput('');
    setVersions([]);
    setVersionType('sizes');
    setVersionName('');
    setVersionPrice('');
    setVersionPriceType('fixed');
    setEditingVersionId(null);
    setIsFormOpen(false);
  };

  // Add customized option to current list
  const handleAddOption = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newOptionInput.trim()) return;
    setOptions([...options, newOptionInput.trim()]);
    setNewOptionInput('');
  };

  // Remove customization option
  const handleRemoveOption = (indexToRemove: number) => {
    setOptions(options.filter((_, idx) => idx !== indexToRemove));
  };

  // Add or update Version / Size / Add-on
  const handleAddOrUpdateVersion = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!versionName.trim()) return;

    const formattedPrice = versionPriceType === 'free' ? '0' : (versionPrice.trim() || '0');

    if (editingVersionId) {
      setVersions(prev => prev.map(v => v.id === editingVersionId ? {
        ...v,
        name: versionName.trim(),
        priceType: versionPriceType,
        price: formattedPrice
      } : v));
      setEditingVersionId(null);
    } else {
      const newV: MenuItemVersion = {
        id: 'ver_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: versionName.trim(),
        priceType: versionPriceType,
        price: formattedPrice
      };
      setVersions(prev => [...prev, newV]);
    }

    setVersionName('');
    setVersionPrice('');
    setVersionPriceType('fixed');
  };

  const handleStartEditVersion = (v: MenuItemVersion) => {
    setEditingVersionId(v.id);
    setVersionName(v.name);
    setVersionPriceType(v.priceType);
    setVersionPrice(v.price !== undefined ? String(v.price) : '');
  };

  const handleCancelEditVersion = () => {
    setEditingVersionId(null);
    setVersionName('');
    setVersionPrice('');
    setVersionPriceType('fixed');
  };

  const handleRemoveVersion = (idToRemove: string) => {
    setVersions(prev => prev.filter(v => v.id !== idToRemove));
    if (editingVersionId === idToRemove) {
      handleCancelEditVersion();
    }
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price.trim()) {
      alert('يرجى كتابة اسم الصنف والسعر على الأقل');
      return;
    }

    const parsedItem: MenuItem = {
      id: editingItem ? editingItem.id : 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: name.trim(),
      price: price.trim(),
      originalPrice: originalPrice.trim() || undefined,
      category: category.trim() || theme.presetCategories[0] || 'عام',
      description: description.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      isPopular: badge === 'popular',
      isAvailable,
      badge: badge !== 'none' ? badge : undefined,
      options: options.length > 0 ? options : undefined,
      versions: versions.length > 0 ? versions : undefined,
      versionType: versions.length > 0 ? versionType : undefined,
      createdAt: editingItem ? (editingItem.createdAt || Date.now()) : Date.now(),
    };

    if (editingItem) {
      setItems(items.map(it => it.id === editingItem.id ? parsedItem : it));
    } else {
      setItems([...items, parsedItem]);
    }

    handleCancelEdit();
  };

  const handleDeleteItem = async (id: string) => {
    if ((await confirm({ message: 'هل أنت متأكد من رغبتك في حذف هذا الصنف نهائياً؟' }))) {
      setItems(items.filter(it => it.id !== id));
      if (editingItem?.id === id) {
        handleCancelEdit();
      }
    }
  };

  // Move item up in priority
  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    const updated = [...items];
    const temp = updated[idx];
    updated[idx] = updated[idx - 1];
    updated[idx - 1] = temp;
    setItems(updated);
  };

  // Move item down in priority
  const handleMoveDown = (idx: number) => {
    if (idx === items.length - 1) return;
    const updated = [...items];
    const temp = updated[idx];
    updated[idx] = updated[idx + 1];
    updated[idx + 1] = temp;
    setItems(updated);
  };

  const handleSaveToFirestore = async () => {
    if (!db || !business.id || !currentUser) return;
    if (business.userId !== currentUser.uid && !isAdmin) {
      alert("غير مصرح لك بتعديل قائمة هذا المحل!");
      return;
    }
    setIsSaving(true);
    try {
      const sanitizedItems = JSON.parse(JSON.stringify(items));
      const payload = await compressAndSanitizeFirestorePayload({ 
        menuItems: sanitizedItems,
        menuTitle: customMenuTitle.trim(),
        menuDescription: customMenuDescription.trim()
      }, true);
      const docRef = doc(db, 'businesses', business.id);
      await updateDoc(docRef, payload);
      onMenuUpdated(items, customMenuTitle.trim(), customMenuDescription.trim());
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error saving menu to firestore:', err);
      alert('حدث خطأ أثناء حفظ وتعديل المنيو.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!vipInfo.isVip) {
    return createPortal(
      <div className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
        <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-amber-200 text-center space-y-5 my-auto animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <Sparkles className="h-8 w-8 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-amber-950">ميزة الكتالوج والمنيو الرقمي المتكامل</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              هذه الميزة متاحة حصرياً للمشتركين في <span className="font-bold text-stone-900">الباقة الذهبية (VIP)</span>. تتيح لك تخصيص وعرض الكتالوج الرقمي، الخدمات، العقارات، أو المنتجات مع فلاتر ذكية وسلة مشتريات تفاعلية.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
            <button
              onClick={() => {
                setShowUpgradeModal(true);
              }}
              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
            >
              ترقية المحل لـ VIP 👑
            </button>
          </div>
        </div>
        {showUpgradeModal && (
          <VipUpgradeRequestModal
            isOpen={showUpgradeModal}
            onClose={() => {
              setShowUpgradeModal(false);
              onClose();
            }}
            business={business}
          />
        )}
      </div>,
      document.body
    );
  }

  // Calculate savings and discount percentage for pricing tab & live preview
  const numPrice = parseFloat(price) || 0;
  const numOrigPrice = parseFloat(originalPrice) || 0;
  const hasDiscount = numOrigPrice > numPrice && numPrice > 0;
  const discountPercent = hasDiscount ? Math.round(((numOrigPrice - numPrice) / numOrigPrice) * 100) : 0;
  const savingsAmount = hasDiscount ? (numOrigPrice - numPrice).toFixed(2) : '0';

  const previewPriceInfo = getMenuItemDisplayPrice({
    price: price || '0',
    versions,
    versionType
  });

  const previewCalculatedPrice = previewSelectedVer
    ? calculateItemPriceWithVersion(price || '0', previewSelectedVer)
    : (versionType === 'sizes' && versions.length > 0 ? previewPriceInfo.minPrice : numPrice);

  // Pick Category Icon
  const renderHeaderIcon = () => {
    switch (theme.cartIconType) {
      case 'home':
        return <Home className="h-5 w-5" />;
      case 'medical':
        return <Activity className="h-5 w-5" />;
      case 'edu':
        return <GraduationCap className="h-5 w-5" />;
      case 'wrench':
        return <Wrench className="h-5 w-5" />;
      case 'party':
        return <Gift className="h-5 w-5" />;
      case 'retail':
        return <ShoppingBag className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-fade-in" dir="rtl">
      
      {/* Main Manager Container */}
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-stone-200 relative my-auto text-right overflow-hidden">
        
        {/* Top Sticky Bar */}
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 bg-gradient-to-r from-stone-50 via-white to-amber-50/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1a4d2e] to-[#2d6a4f] text-white flex items-center justify-center shadow-md shadow-[#1a4d2e]/20">
              {renderHeaderIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-stone-900">{theme.title}</h2>
                <span className="text-[10px] bg-amber-500 text-amber-950 px-2 py-0.5 rounded-full font-black flex items-center gap-1 shadow-3xs">
                  <Sparkles className="h-2.5 w-2.5" /> VIP 👑
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">{business.name} • {items.length} أصناف مضافة</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenNewItem}
              className="px-3.5 py-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-[#1a4d2e]/15 active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">إضافة صنف جديد</span>
              <span className="sm:hidden">صنف جديد</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 rounded-full transition-all cursor-pointer"
              title="إغلاق"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1">
          
          {/* Top Quick Settings: Custom Menu Title & Subtitle */}
          <div className="bg-stone-50/80 p-4 rounded-2xl border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200/60">
              <h3 className="text-xs font-black text-[#1a4d2e] tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="h-3.5 w-3.5 text-amber-600" />
                <span>تخصيص هوية وعنوان الكتالوج الرقمي لزبائنك</span>
              </h3>
              <span className="text-[10px] text-stone-400 font-bold">يظهر في رأس المنيو العام</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">اسم / عنوان الكتالوج</label>
                <input
                  type="text"
                  value={customMenuTitle}
                  onChange={(e) => setCustomMenuTitle(e.target.value)}
                  placeholder={theme.title}
                  className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">وصف الكتالوج الترحيبي</label>
                <input
                  type="text"
                  value={customMenuDescription}
                  onChange={(e) => setCustomMenuDescription(e.target.value)}
                  placeholder={theme.subtitle}
                  className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
                />
              </div>
            </div>
          </div>

          {/* Prominent Action Banner for Adding Items */}
          <div className="bg-gradient-to-r from-emerald-50 via-amber-50/40 to-stone-50 border-2 border-dashed border-emerald-300/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-stone-900 flex items-center justify-center sm:justify-start gap-2">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span>{labels.bannerTitle}</span>
              </h3>
              <p className="text-xs text-stone-600 max-w-xl leading-relaxed">
                {labels.bannerDesc}
              </p>
            </div>
            <button
              onClick={handleOpenNewItem}
              className="px-5 py-3 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2 shrink-0 active:scale-95 cursor-pointer"
            >
              <PlusCircle className="h-4.5 w-4.5" />
              <span>{labels.bannerBtn}</span>
            </button>
          </div>

          {/* Current Items List & Order */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-stone-900">{labels.listTitle} ({items.length})</h3>
                <span className="text-[10px] bg-stone-100 text-stone-600 font-bold px-2 py-0.5 rounded-full">
                  يمكنك إعادة الترتيب والتعديل
                </span>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-16 px-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto text-stone-400">
                  <UtensilsCrossed className="h-7 w-7" />
                </div>
                <h4 className="text-sm font-black text-stone-800">لم يتم إضافة أي عناصر لكتالوج الخدمات أو المنتجات حتى الآن</h4>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                  ابدأ الآن بإضافة أول عنصر لكتالوجك ليتمكن المراجعون أو الزوار من تصفحه وطلب الخدمات والمنتجات بسهولة وسلاسة.
                </p>
                <button
                  onClick={handleOpenNewItem}
                  className="mt-2 px-5 py-2.5 bg-[#1a4d2e] text-white rounded-xl text-xs font-black shadow-sm hover:bg-[#133b22] transition-all cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>إضافة أول عنصر الآن</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-white border border-stone-200 hover:border-amber-400/80 rounded-2xl flex items-center justify-between gap-3 shadow-3xs transition-all hover:shadow-xs group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Image Thumbnail */}
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0 border border-stone-100" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center shrink-0 text-stone-400">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}

                      <div className="min-w-0 text-right">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-xs text-stone-900 truncate block">{item.name}</span>
                          {item.badge && item.badge !== 'none' && (
                            <span className="text-[9px] bg-amber-100 text-amber-900 font-black px-1.5 py-0.2 rounded-md">
                              {item.badge === 'popular' ? '⭐ الأكثر طلباً' : item.badge === 'new' ? '✨ جديد' : item.badge === 'spicy' ? '🌶️ حار' : '🌱 نباتي'}
                            </span>
                          )}
                          {item.versions && item.versions.length > 0 && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-900 font-black px-1.5 py-0.2 rounded-md">
                              {item.versionType === 'addons' ? `${item.versions.length} إضافات` : `${item.versions.length} أحجام`}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-1">
                          {(() => {
                            const itemPriceInfo = getMenuItemDisplayPrice(item);
                            return (
                              <span className="font-black text-[#1a4d2e]">
                                {itemPriceInfo.isStartingPrice ? `يبدأ من ${itemPriceInfo.formattedPrice}` : item.price} د.أ
                              </span>
                            );
                          })()}
                          {item.originalPrice && (
                            <span className="line-through text-rose-500 text-[10px]">{item.originalPrice} د.أ</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions & Ordering */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="p-1.5 text-stone-400 hover:text-[#1a4d2e] hover:bg-stone-100 rounded-lg disabled:opacity-20 cursor-pointer"
                        title="رفع للأعلى"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === items.length - 1}
                        className="p-1.5 text-stone-400 hover:text-[#1a4d2e] hover:bg-stone-100 rounded-lg disabled:opacity-20 cursor-pointer"
                        title="تنزيل للأسفل"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditClick(item)}
                        className="p-1.5 text-stone-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="تعديل الصنف"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف الصنف"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-stone-200 bg-stone-50/50">
          <span className="text-xs text-stone-500 font-bold">
            {saveSuccess ? (
              <span className="text-emerald-700 font-black flex items-center gap-1.5 animate-pulse">
                <Check className="h-5 w-5 bg-emerald-100 text-emerald-800 rounded-full p-0.5" />
                تم حفظ ونشر وتحديث الكتالوج الرقمي بنجاح!
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-stone-600">
                <Info className="h-4 w-4 text-amber-600 shrink-0" />
                تأكد من الضغط على زر الحفظ لنشر الكتالوج للزبائن في دليل إربد.
              </span>
            )}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSaveToFirestore}
              disabled={isSaving}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>{isSaving ? 'جاري الحفظ والنشر...' : 'حفظ ونشر التعديلات'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 🚀 ULTRA-MODERN ITEM STUDIO: MOBILE BOTTOM SHEET & DESKTOP STUDIO DRAWER */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[100000] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden" dir="rtl">
            
            {/* Backdrop click close */}
            <div className="absolute inset-0" onClick={handleCancelEdit} />

            {/* Main Studio Container */}
            <motion.div
              initial={{ y: '100%', opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative z-10 bg-white w-full sm:max-w-4xl max-h-[88vh] sm:max-h-[88vh] rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border-t sm:border border-stone-200"
              onClick={(e) => e.stopPropagation()}
            >
              
              {/* Mobile Top Drag Indicator */}
              <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
                <div className="w-12 h-1.5 bg-stone-300 rounded-full" />
              </div>

              {/* Studio Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 bg-gradient-to-r from-stone-50 via-white to-amber-50/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                    {editingItem ? <Edit2 className="h-4 w-4" /> : <Sparkles className="h-4.5 w-4.5" />}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-stone-900">
                      {editingItem ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد للكتالوج'}
                    </h3>
                    <p className="text-[10px] text-stone-500">قم بتعبئة التفاصيل والأسعار والصورة المخصصة</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Mobile Live Preview Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowLivePreviewMobile(!showLivePreviewMobile)}
                    className="sm:hidden px-2.5 py-1.5 bg-amber-100 text-amber-900 font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>{showLivePreviewMobile ? 'إخفاء المعاينة' : 'معاينة الصنف'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-full transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Segmented Step Navigation Tabs */}
              <div className="px-4 sm:px-6 pt-3 pb-2 bg-stone-50 border-b border-stone-200">
                <div className="grid grid-cols-4 gap-1 sm:gap-2 bg-stone-200/70 p-1 rounded-2xl">
                  {[
                    { id: 'basics', label: 'الأساسيات', icon: Sparkle },
                    { id: 'pricing', label: 'التسعير', icon: Percent },
                    { id: 'versions', label: `الأحجام والإضافات (${versions.length})`, icon: Layers },
                    { id: 'extras', label: 'الشارات', icon: Tag },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeFormTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveFormTab(tab.id as any)}
                        className={`py-2 px-1 sm:px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isActive
                            ? 'bg-white text-[#1a4d2e] shadow-xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-[#1a4d2e]' : 'text-stone-400'}`} />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Studio Body: Split View on Desktop (Form on Right, Live Preview Card on Left) */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Form Studio Column (7 cols on lg) */}
                <form id="itemStudioForm" onSubmit={handleSaveItem} className="lg:col-span-7 space-y-4">
                  
                  {/* TAB 1: BASICS & CATEGORY & PHOTO */}
                  {activeFormTab === 'basics' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      {/* Name Input */}
                      <div>
                        <label className="block text-xs font-black text-stone-800 mb-1.5">
                          {theme.addItemLabel}
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={theme.addItemPlaceholder}
                          className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/30"
                        />
                      </div>

                      {/* Category Input & Preset suggestions */}
                      <div className="space-y-2">
                        <label className="block text-xs font-black text-stone-800">
                          التصنيف أو القسم داخل الكتالوج *
                        </label>
                        <input
                          type="text"
                          required
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          placeholder={typingPlaceholder}
                          className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/30 placeholder-stone-400"
                        />

                        {/* Preset Category Chips */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[10px] text-stone-400 font-bold">أقسام مقترحة:</span>
                          {theme.presetCategories.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setCategory(preset)}
                              className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                                category === preset
                                  ? 'bg-[#1a4d2e] text-white border-[#1a4d2e]'
                                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Image Uploading & Preset Library */}
                      <div className="space-y-2 pt-2 border-t border-stone-100">
                        <ImageUploader
                          label="صورة الصنف (رفع ملف من جهازك)"
                          folder="menus"
                          value={imageUrl}
                          onChange={(url) => setImageUrl(url)}
                          aspectRatio="square"
                          placeholder="اختر صورة عالية الجودة للصنف"
                        />

                        {/* Quick Preset Images Selector */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] text-stone-500 font-bold">أو اختر صورة جاهزة فوراً 🖼️:</span>
                          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-hide">
                            {PRESET_IMAGES.map((img, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => setImageUrl(img.url)}
                                className={`relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                                  imageUrl === img.url ? 'border-[#1a4d2e] ring-2 ring-[#1a4d2e]/30 scale-105' : 'border-stone-200'
                                }`}
                                title={img.name}
                              >
                                <img src={img.url} className="w-full h-full object-cover" alt="" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[9px] text-white font-black leading-none text-center p-0.5">
                                  {img.name.split(' ')[0]}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Full Description, Ingredients & Notes */}
                      <div className="space-y-1.5 pt-2 border-t border-stone-100">
                        <label className="block text-xs font-black text-stone-800">
                          الوصف والمكونات أو الملاحظات التفصيلية
                        </label>
                        <p className="text-[10px] text-stone-500">اكتب نبذة ومكونات الصنف والمميزات ليتمكن العميل من قراءتها</p>
                        <textarea
                          rows={3}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="أدخل تفاصيل ومكونات ومواصفات الصنف بدقة..."
                          className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1a4d2e] resize-none"
                        ></textarea>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: PRICING & DEALS & AVAILABILITY */}
                  {activeFormTab === 'pricing' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Selling Price */}
                        <div>
                          <label className="block text-xs font-black text-stone-800 mb-1">
                            {theme.priceLabel}
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.05"
                              min="0"
                              required
                              value={price}
                              onChange={(e) => setPrice(e.target.value)}
                              placeholder={theme.pricePlaceholder}
                              className="w-full p-3 pl-12 bg-stone-50 border border-stone-200 rounded-xl text-base font-black text-[#1a4d2e] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/30"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-black">د.أ</span>
                          </div>
                        </div>

                        {/* Original Price (Before discount) */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-black text-stone-800">
                              السعر قبل الخصم (اختياري)
                            </label>
                            {hasDiscount && (
                              <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.2 rounded-full font-black">
                                خصم {discountPercent}% 🔥
                              </span>
                            )}
                          </div>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.05"
                              min="0"
                              value={originalPrice}
                              onChange={(e) => setOriginalPrice(e.target.value)}
                              placeholder={theme.pricePlaceholder}
                              className="w-full p-3 pl-12 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/30"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-bold">د.أ</span>
                          </div>
                        </div>
                      </div>

                      {/* Smart Discount Feedback Banner */}
                      {hasDiscount && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4 text-rose-600" />
                            <span className="font-bold text-rose-900">
                              سيتم إبراز الصنف كعرض خاص وتوفير <span className="font-black text-rose-700">{savingsAmount} د.أ</span> للزبون.
                            </span>
                          </div>
                          <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                            -{discountPercent}%
                          </span>
                        </div>
                      )}

                      {/* Instant Availability Toggler */}
                      <div className="flex items-center justify-between p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
                        <div>
                          <h4 className="text-xs font-black text-stone-900">حالة توفر الصنف للطلب</h4>
                          <p className="text-[10px] text-stone-500">يمكنك تعطيل الصنف مؤقتاً دون حذفه عند نفاد الكمية.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isAvailable}
                            onChange={(e) => setIsAvailable(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                          <span className="ms-2.5 text-xs font-black text-stone-800">
                            {isAvailable ? 'متاح للطلب ✅' : 'غير متوفر ❌'}
                          </span>
                        </label>
                      </div>

                    </div>
                  )}

                  {/* TAB 3: VERSIONS, SIZES & ADD-ONS STUDIO */}
                  {activeFormTab === 'versions' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      
                      {/* Version Type Switcher: Sizes vs Add-ons */}
                      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                            <SlidersHorizontal className="h-4 w-4 text-[#1a4d2e]" />
                            <span>نوع التخصيص للصنف:</span>
                          </label>
                          <span className="text-[10px] font-bold text-stone-500">
                            {versionType === 'sizes' ? '⚡ نظام الأحجام والمقاسات' : '✨ نظام الإضافات والخيارات'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setVersionType('sizes')}
                            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                              versionType === 'sizes'
                                ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                                : 'bg-white border-stone-200 hover:bg-stone-50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                                <span>📏 أحجام ومقاسات</span>
                              </span>
                              {versionType === 'sizes' && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                              )}
                            </div>
                            <p className="text-[10px] text-stone-500 leading-relaxed">
                              يظهر للزبون السعر <span className="font-bold text-emerald-700">"يبدأ من [أقل سعر]"</span> ويتم تجاهل سعر الصنف الأصلي بقائمة الاختيارات.
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => setVersionType('addons')}
                            className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                              versionType === 'addons'
                                ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                                : 'bg-white border-stone-200 hover:bg-stone-50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                                <span>➕ إضافات وخيارات</span>
                              </span>
                              {versionType === 'addons' && (
                                <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
                              )}
                            </div>
                            <p className="text-[10px] text-stone-500 leading-relaxed">
                              يظهر للزبون <span className="font-bold text-amber-700">السعر الأصلي المحدد</span> بدون عبارة "يبدأ من"، مع إمكانية طلب إضافات برسوم إضافية.
                            </p>
                          </button>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-amber-50/50 via-stone-50 to-emerald-50/30 border border-amber-200/80 rounded-2xl p-4 space-y-3.5">
                        <div className="flex items-center justify-between border-b border-amber-200/40 pb-2">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-amber-700" />
                            <h4 className="text-xs font-black text-stone-900">
                              {versionType === 'sizes' ? 'إضافة أحجام الصنف (Sizes & Portions)' : 'إضافة خيارات ومكملات الصنف (Add-ons)'}
                            </h4>
                          </div>
                          {versions.length > 0 && (
                            <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                              {versions.length} {versionType === 'sizes' ? 'أحجام مضافة' : 'إضافات مضافة'}
                            </span>
                          )}
                        </div>

                        {/* Quick Preset Buttons tailored to active versionType */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-stone-500">
                            {versionType === 'sizes' ? 'أحجام ومقاسات مقترحة سريعة:' : 'إضافات ومكملات مقترحة سريعة:'}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(versionType === 'sizes' ? [
                              'حجم صغير',
                              'حجم وسط',
                              'حجم كبير',
                              'حجم عائلي',
                              'سنجل (Single)',
                              'دبل (Double)',
                              'نصف كيلو',
                              'كيلو كامل'
                            ] : [
                              'إضافة جبنة',
                              'إضافة صوص',
                              'بطاطا إضافية',
                              'مشروب غازي',
                              'تغليف هدايا فاخر',
                              'صوص حار إضافي',
                              'قطعة لحم إضافية'
                            ]).map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setVersionName(preset)}
                                className="text-[10px] bg-white border border-stone-200 text-stone-700 hover:border-amber-500 hover:bg-amber-50 px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer"
                              >
                                + {preset}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Version Inputs */}
                        <div className="space-y-2.5 bg-white p-3 rounded-xl border border-stone-200 shadow-3xs">
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            <div className="sm:col-span-6">
                              <label className="block text-[10px] font-bold text-stone-600 mb-1">
                                {versionType === 'sizes' ? 'اسم الحجم أو المقاس' : 'اسم الإضافة أو الخيار'}
                              </label>
                              <input
                                type="text"
                                value={versionName}
                                onChange={(e) => setVersionName(e.target.value)}
                                placeholder={versionType === 'sizes' ? 'مثال: حجم كبير، حجم وسط...' : 'مثال: إضافة جبنة شيدر، صوص ثوم...'}
                                className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                              />
                            </div>

                            <div className="sm:col-span-6">
                              <label className="block text-[10px] font-bold text-stone-600 mb-1">طريقة التسعير</label>
                              <div className="grid grid-cols-3 gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                                <button
                                  type="button"
                                  onClick={() => setVersionPriceType('fixed')}
                                  className={`py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                                    versionPriceType === 'fixed'
                                      ? 'bg-[#1a4d2e] text-white shadow-xs'
                                      : 'text-stone-600 hover:text-stone-900'
                                  }`}
                                >
                                  سعر ثابت
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setVersionPriceType('additional')}
                                  className={`py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                                    versionPriceType === 'additional'
                                      ? 'bg-amber-600 text-white shadow-xs'
                                      : 'text-stone-600 hover:text-stone-900'
                                  }`}
                                >
                                  + زيادة
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setVersionPriceType('free');
                                    setVersionPrice('0');
                                  }}
                                  className={`py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                                    versionPriceType === 'free'
                                      ? 'bg-sky-600 text-white shadow-xs'
                                      : 'text-stone-600 hover:text-stone-900'
                                  }`}
                                >
                                  🎁 مجاناً
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            {versionPriceType !== 'free' ? (
                              <div className="flex-1 flex items-center gap-1.5">
                                <label className="text-[10px] font-bold text-stone-600 shrink-0">
                                  {versionPriceType === 'fixed' ? 'السعر المحدد:' : 'قيمة الزيادة:'}
                                </label>
                                <div className="relative flex-1">
                                  <input
                                    type="number"
                                    step="0.05"
                                    min="0"
                                    value={versionPrice}
                                    onChange={(e) => setVersionPrice(e.target.value)}
                                    placeholder={versionPriceType === 'fixed' ? 'مثال: 4.50' : 'مثال: 0.75'}
                                    className="w-full p-1.5 pl-8 bg-stone-50 border border-stone-200 rounded-lg text-xs font-black text-[#1a4d2e] focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                                  />
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-stone-400 font-bold">د.أ</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 text-[11px] text-sky-700 bg-sky-50 px-2.5 py-1.5 rounded-lg border border-sky-200 font-bold">
                                ✨ هذا الخيار مجاني بالكامل للزبون.
                              </div>
                            )}

                            <div className="flex items-center gap-1">
                              {editingVersionId && (
                                <button
                                  type="button"
                                  onClick={handleCancelEditVersion}
                                  className="px-2.5 py-1.5 bg-stone-200 text-stone-700 rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  إلغاء
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={handleAddOrUpdateVersion}
                                disabled={!versionName.trim() || (versionPriceType !== 'free' && !versionPrice.trim())}
                                className="px-3.5 py-1.5 bg-[#1a4d2e] hover:bg-[#133b22] disabled:opacity-40 text-white rounded-lg text-xs font-black transition-colors cursor-pointer flex items-center gap-1"
                              >
                                {editingVersionId ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                                <span>{editingVersionId ? 'تعديل' : 'إضافة'}</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* List of Added Versions */}
                        {versions.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <div className="text-[10px] font-bold text-stone-500">
                              {versionType === 'sizes' ? 'الأحجام المسجلة لهذا الصنف:' : 'الإضافات المسجلة لهذا الصنف:'}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {versions.map((v) => {
                                const baseP = parseFloat(price) || 0;
                                const verP = parseFloat(String(v.price)) || 0;
                                const finalEstimated = v.priceType === 'fixed' ? verP : v.priceType === 'additional' ? baseP + verP : baseP;

                                return (
                                  <div
                                    key={v.id}
                                    className={`p-2 bg-white rounded-xl border flex items-center justify-between gap-2 text-xs transition-all ${
                                      editingVersionId === v.id ? 'border-amber-500 ring-1 ring-amber-400' : 'border-stone-200'
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className="font-black text-stone-900 text-xs truncate">{v.name}</div>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        {v.priceType === 'fixed' && (
                                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.2 rounded">
                                            سعر ثابت: {v.price} د.أ
                                          </span>
                                        )}
                                        {v.priceType === 'additional' && (
                                          <span className="text-[10px] bg-amber-100 text-amber-900 font-black px-1.5 py-0.2 rounded">
                                            +{v.price} د.أ ({finalEstimated > 0 ? `الإجمالي: ${finalEstimated.toFixed(2)} د.أ` : ''})
                                          </span>
                                        )}
                                        {v.priceType === 'free' && (
                                          <span className="text-[10px] bg-sky-100 text-sky-800 font-black px-1.5 py-0.2 rounded">
                                            مجاناً (0 د.أ)
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleStartEditVersion(v)}
                                        className="p-1 text-stone-500 hover:text-amber-700 hover:bg-amber-50 rounded cursor-pointer"
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveVersion(v.id)}
                                        className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                      </div>

                    </div>
                  )}

                  {/* TAB 4: BADGES */}
                  {activeFormTab === 'extras' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      
                      {/* Badge Tags */}
                      <div>
                        <label className="block text-xs font-black text-stone-800 mb-1.5">
                          شارة التميز الترويجية (Badge Tag)
                        </label>
                        <p className="text-[10px] text-stone-500 mb-2">اختر شارة بارزة لجذب انتباه الزبائن للصنف داخل القائمة</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { id: 'none', label: 'بدون شارة', color: 'bg-stone-100 text-stone-600 border-stone-200' },
                            { id: 'popular', label: theme.badges.popular, color: 'bg-amber-100 text-amber-900 border-amber-300' },
                            { id: 'new', label: theme.badges.new, color: 'bg-sky-100 text-sky-900 border-sky-300' },
                            { id: 'spicy', label: theme.badges.spicyOrFeatured, color: 'bg-red-100 text-red-900 border-red-300' },
                            { id: 'vegetarian', label: theme.badges.vegetarianOrPromo, color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
                          ].map((itemTag) => (
                            <button
                              key={itemTag.id}
                              type="button"
                              onClick={() => setBadge(itemTag.id as any)}
                              className={`p-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer text-center ${
                                badge === itemTag.id
                                  ? 'ring-2 ring-[#1a4d2e] scale-102 ' + itemTag.color
                                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                              }`}
                            >
                              {itemTag.label}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}

                </form>

                {/* Left Column: Live Realtime Customer Preview Mockup (5 cols on lg, or toggleable modal on mobile) */}
                <div className={`lg:col-span-5 ${showLivePreviewMobile ? 'block' : 'hidden lg:block'} space-y-3`}>
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-1.5 text-xs font-black text-stone-800">
                      <Eye className="h-4 w-4 text-emerald-600" />
                      <span>معاينة حية فورية (كما سيراها الزبون)</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                      Live Preview ⚡
                    </span>
                  </div>

                  {/* Real Customer Card Simulation */}
                  <div className="bg-white rounded-2xl border border-stone-200 shadow-md overflow-hidden text-right transition-all">
                    {/* Image Area */}
                    <div className="relative aspect-4/3 w-full bg-stone-100 overflow-hidden">
                      {imageUrl ? (
                        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 gap-1 p-4 text-center">
                          <ImageIcon className="h-8 w-8 text-stone-300" />
                          <span className="text-[11px] font-bold">معاينة صورة الصنف</span>
                        </div>
                      )}

                      {/* Live Badge */}
                      {badge && badge !== 'none' && (
                        <span className="absolute top-2.5 right-2.5 z-10 px-2.5 py-1 rounded-full text-[10px] font-black shadow-xs bg-amber-500 text-white">
                          {badge === 'popular' ? theme.badges.popular : badge === 'new' ? theme.badges.new : badge === 'spicy' ? theme.badges.spicyOrFeatured : theme.badges.vegetarianOrPromo}
                        </span>
                      )}

                      {/* Live Discount Pill */}
                      {hasDiscount && (
                        <span className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-xs">
                          -{discountPercent}%
                        </span>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-black text-sm text-stone-900 leading-tight">
                          {name || (labels.listTitle.includes('الخدمات') ? 'اسم الخدمة الطبية/الإجراء' : labels.listTitle.includes('الأدوية') ? 'اسم الدواء/المنتج' : labels.listTitle.includes('الوجبات') ? 'اسم الوجبة أو الطبق' : 'اسم المنتج أو الصنف')}
                        </h4>
                        <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md font-bold shrink-0">
                          {category || 'عام'}
                        </span>
                      </div>

                      {description && (
                        <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                          {description}
                        </p>
                      )}

                      {/* Live Versions / Addons Chips on Preview Card */}
                      {versions.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <div className="text-[10px] font-bold text-stone-500">
                            {versionType === 'sizes' ? 'اختر الحجم / المقاس:' : 'خيارات وإضافات مقترحة:'}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {versions.map((ver) => (
                              <button
                                key={ver.id}
                                type="button"
                                onClick={() => setPreviewSelectedVer(previewSelectedVer?.id === ver.id ? undefined : ver)}
                                className={`text-[10px] px-2 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                                  previewSelectedVer?.id === ver.id
                                    ? (versionType === 'sizes' ? 'bg-[#1a4d2e] text-white border-[#1a4d2e]' : 'bg-amber-600 text-white border-amber-600')
                                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                                }`}
                              >
                                {ver.name} {ver.priceType === 'additional' && `(+${ver.price})`} {ver.priceType === 'fixed' && `(${ver.price} د.أ)`}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Live Options Chips */}
                      {options.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          {options.map((opt, i) => (
                            <span key={i} className="text-[9px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md font-bold">
                              {opt}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Price & Action Button */}
                      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-black text-[#1a4d2e]">
                              {versionType === 'sizes' && versions.length > 0 && !previewSelectedVer
                                ? `يبدأ من ${previewPriceInfo.formattedPrice}`
                                : `${previewCalculatedPrice}`} د.أ
                            </span>
                            {hasDiscount && (
                              <span className="text-xs text-rose-500 line-through font-bold">
                                {numOrigPrice.toFixed(2)} د.أ
                              </span>
                            )}
                          </div>
                          {previewSelectedVer && (
                            <span className="text-[9px] text-stone-500 font-bold block">
                              {versionType === 'sizes' ? `حسب الحجم (${previewSelectedVer.name})` : `مع إضافة (${previewSelectedVer.name})`}
                            </span>
                          )}
                          {versionType === 'sizes' && versions.length > 0 && !previewSelectedVer && (
                            <span className="text-[9px] text-emerald-700 font-bold block">
                              (يتوفر {versions.length} أحجام مختلفة)
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          className="px-3.5 py-1.5 bg-[#1a4d2e] text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1 cursor-default opacity-90"
                        >
                          <span>{theme.buttonAddShort}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Studio Bottom Sticky Toolbar */}
              <div className="px-5 py-3.5 border-t border-stone-200 bg-stone-50 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2.5 bg-stone-200/80 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء التعديل
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeFormTab === 'basics') setActiveFormTab('pricing');
                      else if (activeFormTab === 'pricing') setActiveFormTab('versions');
                      else if (activeFormTab === 'versions') setActiveFormTab('extras');
                      else setActiveFormTab('basics');
                    }}
                    className="hidden sm:inline-flex px-3 py-2.5 bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    القسم التالي ←
                  </button>

                  <button
                    type="submit"
                    form="itemStudioForm"
                    className="px-6 py-2.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Check className="h-4 w-4" />
                    <span>{editingItem ? 'تحديث وتأكيد الصنف' : 'حفظ الصنف للكتالوج 🚀'}</span>
                  </button>
                </div>
              </div>

            </motion.div>

          </div>
        )}
      </AnimatePresence>

    </div>,
    document.body
  );
}
