import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Plus, Trash2, Edit2, UtensilsCrossed, CheckCircle,
  Sparkles, Check, Image as ImageIcon, Flame, DollarSign,
  Tag, Info, HelpCircle, AlertCircle, ArrowUp, ArrowDown, Play,
  Home, Building, Activity, ShieldCheck, GraduationCap, Wrench, Gift, ShoppingBag
} from 'lucide-react';
import { Business, MenuItem } from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getBusinessVipStatus } from '../../lib/vipHelper';
import { sanitizeFirestorePayload, compressAndSanitizeFirestorePayload } from '../../lib/firestoreHelper';
import { VipUpgradeRequestModal } from './VipUpgradeRequestModal';
import { useAuth } from '../../contexts/AuthContext';
import { ImageUploader } from '../ui/ImageUploader';

interface DigitalMenuManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business;
  onMenuUpdated: (updatedItems: MenuItem[]) => void;
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
      title: 'دليل الخدمات الطبية والعلاجية والأسعار',
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

export function DigitalMenuManagerModal({
  isOpen,
  onClose,
  business,
  onMenuUpdated
}: DigitalMenuManagerModalProps) {
  const { currentUser, isAdmin } = useAuth();
  const [items, setItems] = useState<MenuItem[]>(business.menuItems || []);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // Resolve Theme based on Business Category
  const theme = getCategoryTheme(business.category || '');

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
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const vipInfo = getBusinessVipStatus(business);

  useEffect(() => {
    if (business.menuItems) {
      setItems(business.menuItems);
    }
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

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price.trim()) return;

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
    };

    if (editingItem) {
      setItems(items.map(it => it.id === editingItem.id ? parsedItem : it));
    } else {
      setItems([...items, parsedItem]);
    }

    handleCancelEdit();
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('هل أنت متأكد من رغبتك في حذف هذا الصنف نهائياً؟')) {
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
      const payload = await compressAndSanitizeFirestorePayload({ menuItems: sanitizedItems }, true);
      const docRef = doc(db, 'businesses', business.id);
      await updateDoc(docRef, payload);
      onMenuUpdated(items);
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
      <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
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
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-fade-in" dir="rtl">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[94vh] overflow-y-auto p-4 sm:p-6 md:p-8 shadow-2xl border border-stone-200 space-y-6 relative my-auto text-right">
        
        {/* Top Sticky Bar */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              {renderHeaderIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-stone-900">{theme.title} ({business.name})</h2>
                <span className="text-[10px] bg-[#1a4d2e] text-white px-2 py-0.5 rounded-md font-bold">باقة VIP 👑</span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">{theme.subtitle}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 rounded-full transition-all cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Form Builder (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <form onSubmit={handleSaveItem} className="bg-amber-50/20 p-4 sm:p-5 rounded-2xl border border-amber-200/60 space-y-4">
              <div className="flex items-center justify-between border-b border-amber-200/40 pb-2">
                <h3 className="text-sm font-black text-[#2d2a26] flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-700" />
                  <span>{editingItem ? 'تعديل الصنف الحالي' : 'إنشاء وإضافة صنف جديد لكتالوجك'}</span>
                </h3>
                {editingItem && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                  >
                    إلغاء التعديل والبدء بجديد
                  </button>
                )}
              </div>

              {/* Basic Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">{theme.addItemLabel}</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={theme.addItemPlaceholder}
                    className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
                  />
                </div>

                {/* Advanced Pricing Engine */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">{theme.priceLabel}</label>
                    <input
                      type="text"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder={theme.pricePlaceholder}
                      className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-stone-700">السعر الأصلي قبل الخصم (اختياري)</label>
                      <span className="text-[10px] text-rose-600 font-bold">توليد شارة خصم تلقائياً! 🏷️</span>
                    </div>
                    <input
                      type="text"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(e.target.value)}
                      placeholder={theme.pricePlaceholder}
                      className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
                    />
                  </div>
                </div>

                {/* Categories Engine */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">التصنيف أو المجلد الفرعي</label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder={typingPlaceholder}
                    className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 placeholder-stone-400 transition-all font-medium"
                  />
                </div>

                {/* Image Picker & Upload */}
                <div className="space-y-2">
                  <ImageUploader
                    label="صورة المنتج أو الصنف (رفع ملف من الجهاز)"
                    folder="menus"
                    value={imageUrl}
                    onChange={(url) => setImageUrl(url)}
                    aspectRatio="square"
                    placeholder="اختر ملف صورة الصنف من جهازك"
                  />
                  
                  {/* Preset Quick Images Selector */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-stone-500 font-bold">اضغط على صورة مناسبة لتطبيقها فوراً 🖼️:</span>
                    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-hide">
                      {PRESET_IMAGES.map((img, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setImageUrl(img.url)}
                          className={`relative shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${imageUrl === img.url ? 'border-emerald-600 scale-105' : 'border-transparent'}`}
                          title={img.name}
                        >
                          <img src={img.url} className="w-full h-full object-cover" alt="" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[8px] text-white font-bold leading-none text-center">
                            {img.name.split(' ')[0]}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">الوصف والمكونات أو الميزات بالتفصيل</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="أدخل ميزات الصنف ومواصفاته الكاملة لكي يفهمها العميل..."
                    className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 resize-none"
                  ></textarea>
                </div>

                {/* Global World-Class Tag Badges Selection */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">شارة تمييز الصنف وحالته (Premium Badge Tag)</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'none', label: 'بدون شارة', color: 'bg-stone-100 text-stone-600 border-stone-200' },
                      { id: 'popular', label: theme.badges.popular, color: 'bg-amber-100 text-amber-800 border-amber-200' },
                      { id: 'new', label: theme.badges.new, color: 'bg-sky-100 text-sky-800 border-sky-200' },
                      { id: 'spicy', label: theme.badges.spicyOrFeatured, color: 'bg-red-100 text-red-800 border-red-200' },
                      { id: 'vegetarian', label: theme.badges.vegetarianOrPromo, color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                    ].map((itemTag) => (
                      <button
                        key={itemTag.id}
                        type="button"
                        onClick={() => setBadge(itemTag.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${badge === itemTag.id ? 'ring-2 ring-amber-500 scale-105 ' + itemTag.color : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}
                      >
                        {itemTag.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Interactive Modifiers / Options List Builder */}
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-stone-800">{theme.optionsLabel}</h4>
                      <p className="text-[10px] text-stone-500">{theme.optionsSub}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOptionInput}
                      onChange={(e) => setNewOptionInput(e.target.value)}
                      placeholder={theme.optionsPlaceholder}
                      className="flex-1 p-2 bg-white border border-stone-200 rounded-xl text-xs focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="px-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                    >
                      إضافة خيار
                    </button>
                  </div>

                  {options.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {options.map((opt, idx) => (
                        <div key={idx} className="bg-white border border-stone-200 text-stone-700 rounded-lg px-2.5 py-1 text-[11px] font-bold flex items-center gap-1.5">
                          <span>{opt}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(idx)}
                            className="text-stone-400 hover:text-rose-600 font-black cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Instant Availability Toggler */}
                <div className="flex items-center justify-between p-3 bg-emerald-50/30 border border-emerald-100 rounded-2xl">
                  <div>
                    <h4 className="text-xs font-black text-stone-800">حالة التوفر والاتصال المباشر</h4>
                    <p className="text-[10px] text-stone-500">قم بتعطيل توفر هذا الصنف للزبائن مؤقتاً دون مسحه.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAvailable}
                      onChange={(e) => setIsAvailable(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    <span className="ms-3 text-xs font-black text-stone-800">{isAvailable ? 'متاح للطلب ✅' : 'غير متوفر مؤقتاً ❌'}</span>
                  </label>
                </div>

              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end pt-2 border-t border-stone-200/50">
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl font-black text-xs transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
                >
                  {editingItem ? <CheckCircle className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  <span>{editingItem ? 'تحديث وتأكيد الصنف' : 'حفظ وإضافة الصنف للكتالوج'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Menu Reordering & Manager (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <div>
                  <h3 className="text-sm font-black text-stone-900">هيكلة وترتيب الكتالوج ({items.length})</h3>
                  <p className="text-[10px] text-stone-500">تحكم بترتيب عرض الأصناف للزبائن في دليل إربد.</p>
                </div>
                <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md font-bold">جر للترتيب</span>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-16 text-stone-400 text-xs">
                  لا توجد منتجات مضافة في الكتالوج حتى الآن.
                </div>
              ) : (
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {items.map((item, idx) => {
                    return (
                      <div
                        key={item.id}
                        className={`p-3 bg-white border rounded-xl flex items-center justify-between gap-2 shadow-3xs hover:border-amber-400 transition-all ${editingItem?.id === item.id ? 'border-amber-500 bg-amber-50/10' : 'border-stone-200'}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Image preview */}
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-stone-100" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center shrink-0 text-stone-400">
                              <Sparkles className="h-4.5 w-4.5" />
                            </div>
                          )}

                          <div className="min-w-0 text-right">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-xs text-stone-800 truncate block">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-stone-500 mt-0.5">
                              <span className="font-black text-[#1a4d2e]">{item.price} د.أ</span>
                              {item.originalPrice && <span className="line-through text-rose-500">{item.originalPrice} د.أ</span>}
                              <span>•</span>
                              <span className="truncate max-w-[80px]">{item.category}</span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Priority & Control handles */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Move Up */}
                          <button
                            type="button"
                            onClick={() => handleMoveUp(idx)}
                            disabled={idx === 0}
                            className="p-1 text-stone-400 hover:text-[#1a4d2e] hover:bg-stone-100 rounded disabled:opacity-30 cursor-pointer"
                            title="رفع للأعلى"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>

                          {/* Move Down */}
                          <button
                            type="button"
                            onClick={() => handleMoveDown(idx)}
                            disabled={idx === items.length - 1}
                            className="p-1 text-stone-400 hover:text-[#1a4d2e] hover:bg-stone-100 rounded disabled:opacity-30 cursor-pointer"
                            title="تنزيل للأسفل"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>

                          {/* Edit / Delete */}
                          <button
                            type="button"
                            onClick={() => handleEditClick(item)}
                            className="p-1 text-stone-500 hover:text-amber-700 hover:bg-amber-50 rounded cursor-pointer"
                            title="تعديل سريع"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            title="مسح الصنف"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between pt-5 border-t border-stone-200">
          <span className="text-xs text-stone-500 font-bold">
            {saveSuccess ? (
              <span className="text-emerald-600 font-black flex items-center gap-1.5 animate-pulse">
                <Check className="h-5 w-5 bg-emerald-100 text-emerald-800 rounded-full p-0.5" />
                تم نشر وتحديث الكتالوج الرقمي لجمهور إربد بنجاح!
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-700">
                <Info className="h-4 w-4 shrink-0" />
                تأكد من حفظ التعديلات لنشر الكتالوج وتحديثه لجمهور زبائن الـ VIP فوراً.
              </span>
            )}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              إلغاء التعديلات المعلقة
            </button>
            <button
              type="button"
              onClick={handleSaveToFirestore}
              disabled={isSaving}
              className="px-7 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="h-4.5 w-4.5" />
              <span>{isSaving ? 'جاري التحديث والنشر...' : 'حفظ ونشر المنيو للزبائن'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
