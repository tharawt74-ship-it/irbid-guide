import { useConfirm } from '../../contexts/ConfirmContext';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Plus, Trash2, Edit2, UtensilsCrossed, CheckCircle,
  Sparkles, Check, Image as ImageIcon, Flame, DollarSign,
  Tag, Info, HelpCircle, AlertCircle, ArrowUp, ArrowDown, Play,
  Home, Building, Activity, ShieldCheck, GraduationCap, Wrench, Gift, ShoppingBag,
  Layers, PlusCircle, Eye, SlidersHorizontal, ArrowRight, CheckCircle2, ChevronDown,
  Percent, Sparkle, RefreshCw, Search, Package, Clock, Shirt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Business,
  MenuItem,
  MenuItemVersion,
  FashionMatrixVariant,
  FashionSizeGuide,
  FashionFabricCare,
  FashionReturnPolicy
} from '../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { getBusinessVipStatus } from '../../lib/vipHelper';
import { sanitizeFirestorePayload, compressAndSanitizeFirestorePayload } from '../../lib/firestoreHelper';
import { updateBusinessMenuItemsInCache } from '../../lib/dataCache';
import { VipUpgradeRequestModal } from './VipUpgradeRequestModal';
import { useAuth } from '../../contexts/AuthContext';
import { ImageUploader } from '../ui/ImageUploader';
import { calculateItemPriceWithVersion, getMenuItemDisplayPrice } from '../../contexts/CartContext';
import { FashionItemFields } from './fashion/FashionItemFields';
import { isMedicalBusiness } from '../../lib/medicalHelper';

interface DigitalMenuManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business;
  onMenuUpdated: (updatedItems: MenuItem[], updatedTitle?: string, updatedDescription?: string) => void;
}

export type { CategoryTheme, PresetImage } from '../../lib/digitalMenuThemes';
export { getCategoryTheme, PRESET_IMAGES } from '../../lib/digitalMenuThemes';
import { getCategoryTheme, PRESET_IMAGES } from '../../lib/digitalMenuThemes';


export const getDynamicCatalogLabels = (biz: Business) => {
  const cat = (biz.category || '').toLowerCase();
  const name = (biz.name || '').toLowerCase();
  const sub = (biz.subCategory || (biz as any).subcategory || '').toLowerCase();
  const text = `${cat} ${sub} ${name}`;

  // 0.1 Tutoring, Teachers & University Teaching (مدرسو ومدرسات تدريس جامعي ومواد طبية وهندسية)
  if (
    sub.includes('تدريس') ||
    sub.includes('مدرس') ||
    sub.includes('تدريس جامعي') ||
    sub.includes('مواد طبية وهندسية') ||
    sub.includes('مدرسو ومدرسات') ||
    sub.includes('معلمات ومعلمون') ||
    sub.includes('معلمو ومعلمات') ||
    sub.includes('دروس خصوصية') ||
    cat.includes('تدريس') ||
    cat.includes('مدرس') ||
    cat.includes('معلمات ومعلمون') ||
    cat.includes('دروس خصوصية') ||
    text.includes('تدريس جامعي') ||
    text.includes('مواد طبية وهندسية') ||
    text.includes('مدرسو ومدرسات')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة مادة تدريسية أو مساق جامعي أو حصة جديدة؟',
      bannerDesc: 'استخدم استوديو الحصص والمساقات التعليمية لإضافة أسعار الحصص، تفاصيل المادة، باقات المتابعة والملخصات الدراسية بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة حصة/مساق',
      listTitle: 'المساقات والحصص التعليمية المضافة في الكتالوج'
    };
  }

  // 0.2 Medicine & Cosmetic Factories & Supplies (مصانع أدوية ومستلزمات طبية وتجميلية)
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
      bannerTitle: 'هل ترغب في إضافة منتج مصنعي أو مستحضر جديد؟',
      bannerDesc: 'استخدم استوديو المنتجات والمستحضرات لإضافة المواصفات الإنتاجية، أحجام العبوات والأسعار بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة منتج مصنعي',
      listTitle: 'المنتجات والمستحضرات المضافة في الكتالوج'
    };
  }

  // 0.3 Perfumes & Cosmetics (عطور ومستحضرات تجميل)
  if (
    sub.includes('عطور ومستحضرات تجميل') ||
    cat.includes('عطور ومستحضرات تجميل') ||
    text.includes('عطور ومستحضرات تجميل') ||
    (sub.includes('عطور') && !sub.includes('معطرات جو')) ||
    (cat.includes('عطور') && !cat.includes('سيارات'))
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة عطر أو مستحضر تجميل جديد؟',
      bannerDesc: 'استخدم استوديو العطور ومستحضرات التجميل لإضافة الصور، الأسعار، الحجم والسعة والشارات الترويجية بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة عطر/مستحضر',
      listTitle: 'العطور ومستحضرات التجميل المضافة في الكتالوج'
    };
  }

  // 1. Law Offices & Legal Consultations
  if (
    sub.includes('محاماة') ||
    sub.includes('استشارات قانونية') ||
    text.includes('مكاتب محاماة') ||
    text.includes('استشارات قانونية') ||
    name.includes('محامي') ||
    name.includes('محاماة')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة استشارة قانونية أو خدمة توكيل وصياغة جديدة؟',
      bannerDesc: 'استخدم استوديو الخدمات القانونية لإضافة تفاصيل الاستشارة، الأتعاب، مدة الجلسة، والخدمات الملحقة بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة خدمة قانونية',
      listTitle: 'الاستشارات والخدمات القانونية المضافة في الكتالوج'
    };
  }

  // 2. Engineering Offices & Contracting
  if (
    sub.includes('مكاتب هندسية') ||
    sub.includes('مقاولات') ||
    text.includes('مكاتب هندسية') ||
    (text.includes('هندسي') && text.includes('مقاولات')) ||
    name.includes('مكتب هندسي') ||
    name.includes('للهندسة والمقاولات')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة خدمة هندسية أو مخطط معماري أو باقة إشراف جديدة؟',
      bannerDesc: 'استخدم استوديو الخدمات الهندسية لإضافة تفاصيل المخطط، نطاق العمل، مدة الإنجاز، والتصاميم المرافقة بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة خدمة هندسية',
      listTitle: 'الخدمات الهندسية والمخططات المضافة في الكتالوج'
    };
  }

  // 3. Interior Design & Decor Engineers
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
      bannerTitle: 'هل ترغب في إضافة خدمة تصميم داخلي أو باقة ديكور جديدة؟',
      bannerDesc: 'استخدم استوديو التصميم والديكور لإضافة لقطات 3D، المخططات التنفيذية، باقات المساحة والأسعار بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة خدمة تصميم ديكور',
      listTitle: 'خدمات وباقات التصميم والديكور المضافة في الكتالوج'
    };
  }

  // 4. Certified Translation, Proofreading & Content
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
      bannerTitle: 'هل ترغب في إضافة خدمة ترجمة معتمدة أو تدقيق لغوي جديد؟',
      bannerDesc: 'استخدم استوديو الترجمة والتدقيق لإضافة تفاصيل الاعتماد، سعر الصفحة أو الوثيقة، وفترات التسليم بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة خدمة ترجمة',
      listTitle: 'خدمات الترجمة والتدقيق المضافة في الكتالوج'
    };
  }

  // 5. Printing, Copying & Design Services
  if (
    sub.includes('طباعة وتصوير وتصميم') ||
    sub.includes('خدمات طباعة') ||
    (sub.includes('طباعة') && sub.includes('تصوير')) ||
    text.includes('خدمات طباعة وتصوير وتصميم') ||
    (text.includes('خدمات طباعة') && text.includes('تصميم'))
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة خدمة طباعة أو مطبوعات دعائية جديدة؟',
      bannerDesc: 'استخدم استوديو خدمات الطباعة لإضافة مواصفات الورق، الكميات، المقاسات، والأسعار بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة خدمة طباعة',
      listTitle: 'خدمات المطبوعات والتصميم المضافة في الكتالوج'
    };
  }

  // 6. Graphic Design, Social Media, Digital Marketing Agency, Web Development
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
      bannerTitle: 'هل ترغب في إضافة باقة تسويقية أو خدمة تصميم وهوية بصرية جديدة؟',
      bannerDesc: 'استخدم استوديو باقات التسويق والتصميم لإضافة تفاصيل الحملات، المنشورات، تطوير المواقع والأسعار بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة باقة تسويق/تصميم',
      listTitle: 'باقات التسويق والتصميم والويب المضافة في الكتالوج'
    };
  }

  // 7. Travel, Tourism, Hajj & Umrah
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
      bannerTitle: 'هل ترغب في إضافة برنامج سياحي أو رحلة عمرة أو تذكرة جديدة؟',
      bannerDesc: 'استخدم استوديو برامج السياحة والسفر لإضافة تفاصيل الرحلة، الأسعار، فئات الفنادق، والخدمات المشمولة بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة رحلة سياحية',
      listTitle: 'الرحلات والبرامج السياحية المضافة في الكتالوج'
    };
  }

  // 8. Car Rental Offices
  if (
    sub.includes('تأجير سيارات') ||
    (sub.includes('تأجير') && sub.includes('سيار')) ||
    text.includes('مكاتب تأجير سيارات') ||
    text.includes('تأجير سيارات سياحية') ||
    name.includes('تأجير سيارات') ||
    name.includes('لتأجير السيارات')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة سيارة سياحية جديدة لأسطول التأجير؟',
      bannerDesc: 'استخدم استوديو أسطول السيارات لإضافة موديل وفئة السيارة، الأجرة اليومية، فترات الإيجار، وشروط التأمين بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة سيارة سياحية',
      listTitle: 'السيارات المتاحة للإيجار في الكتالوج'
    };
  }

  // 9. Taxi, Passenger Transport & Shipping
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
      bannerTitle: 'هل ترغب في إضافة مسار تكسي أو خدمة نقل وشحن جديدة؟',
      bannerDesc: 'استخدم استوديو خدمات النقل والتكسي لإضافة مسارات التوصيل، أجرة المشوار، فئات المركبات، وخدمات الشحن بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة خدمة نقل/تكسي',
      listTitle: 'خدمات التوصيل والنقل والشحن المضافة في الكتالوج'
    };
  }

  // 10. Hotels, Furnished Hotel Apartments, Private Farms & Chalets
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
      bannerTitle: 'هل ترغب في إضافة غرفة أو جناح فندقي أو شاليه أو مزرعة جديدة؟',
      bannerDesc: 'استخدم استوديو الإقامة والضيافة لإضافة صور المرافق، أسعار الحجز اليومي، مواعيد الدخول والخروج، والخدمات المشمولة بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة وحدة إقامة/شاليه',
      listTitle: 'الغرف والأجنحة والشاليهات المضافة في الكتالوج'
    };
  }

  // 11. Government Document Clearing Services (تخليص معاملات وخدمات حكومية)
  if (
    sub.includes('تخليص معاملات') ||
    sub.includes('خدمات حكومية') ||
    text.includes('تخليص معاملات') ||
    text.includes('معاملات حكومية') ||
    name.includes('تخليص معاملات')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة معاملة أو خدمة حكومية وتراخيص جديدة؟',
      bannerDesc: 'استخدم استوديو المعاملات الحكومية لإضافة تفاصيل المعاملة، الرسوم التقديرية، الدوائر المختصة، والمدة المتوقعة بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة معاملة حكومية',
      listTitle: 'المعاملات والخدمات الحكومية المضافة في الكتالوج'
    };
  }

  // 12. Recruitment & HR Consulting (مكاتب توظيف وتدريب)
  if (
    sub.includes('مكاتب توظيف') ||
    sub.includes('توظيف وتدريب') ||
    (sub.includes('توظيف') && (sub.includes('تدريب') || sub.includes('موارد'))) ||
    text.includes('مكاتب توظيف') ||
    text.includes('توظيف وتدريب') ||
    text.includes('استشارات موارد بشرية') ||
    name.includes('توظيف') ||
    name.includes('استقطاب')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة خدمة توظيف أو استشارة مهنية أو برنامج تدريبي جديد؟',
      bannerDesc: 'استخدم استوديو التوظيف والموارد البشرية لإضافة تفاصيل الخدمة، الرسوم، باقات الكوادر، والبرامج التأهيلية بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة خدمة توظيف/تدريب',
      listTitle: 'خدمات التوظيف والبرامج المهنية المضافة في الكتالوج'
    };
  }

  // 13. Photography, Videography & Content Creation (تصوير ومونتاج وإنشاء محتوى من المنزل / استوديوهات تصوير)
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
      bannerTitle: 'هل ترغب في إضافة جلسة تصوير أو خدمة مونتاج أو باقة محتوى جديدة؟',
      bannerDesc: 'استخدم استوديو باقات التصوير والمونتاج لإضافة تفاصيل الجلسة، عدد الصور المعالجة، مدة الفيديو، ومواقع التصوير بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة جلسة تصوير/مونتاج',
      listTitle: 'باقات التصوير وجلسات المونتاج المضافة في الكتالوج'
    };
  }

  // 14. Banking & Financial Institutions (بنوك ومصارف)
  if (
    sub.includes('بنوك') ||
    sub.includes('مصارف') ||
    text.includes('بنوك ومصارف') ||
    name.includes('بنك') ||
    name.includes('مصرف')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة خدمة مصرفية أو باقة تمويلية جديدة؟',
      bannerDesc: 'استخدم استوديو الخدمات المصرفية لإضافة تفاصيل الحساب، شروط التمويل، الرسوم ونسب الفائدة المعتمدة بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة خدمة مصرفية',
      listTitle: 'الخدمات المصرفية وباقات التمويل المضافة في الكتالوج'
    };
  }

  // 15. Currency Exchange & Money Transfers (محلات صرافة وحوالات مالية)
  if (
    sub.includes('صرافة') ||
    sub.includes('حوالات مالية') ||
    text.includes('صرافة وحوالات') ||
    name.includes('صرافة') ||
    name.includes('للصرافة')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة خدمة صرافة أو مسار تحويل مالي جديد؟',
      bannerDesc: 'استخدم استوديو الصرافة والتحويلات لإضافة عمولات التحويل، الدول والوجهات المتاحة، والخدمات النقدية بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة خدمة صرافة/تحويل',
      listTitle: 'خدمات الصرافة والحوالات المضافة في الكتالوج'
    };
  }

  // 16. Insurance Companies & Policies (شركات تأمين)
  if (
    sub.includes('تأمين') ||
    text.includes('شركات تأمين') ||
    name.includes('تأمين') ||
    name.includes('للتأمين')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة برنامج تأميني أو وثيقة تغطية جديدة؟',
      bannerDesc: 'استخدم استوديو التأمين والحلول التكافلية لإضافة تفاصيل التغطية، نسب التحمل، الأقساط والمزايا الإضافية بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة برنامج تأمين',
      listTitle: 'برامج ووثائق التأمين المضافة في الكتالوج'
    };
  }

  // 17. Software, Apps & Systems Development (شركات تطوير البرمجيات والتطبيقات والأنظمة)
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
      bannerTitle: 'هل ترغب في إضافة حل برمجي أو باقة تطوير أنظمة جديدة؟',
      bannerDesc: 'استخدم استوديو البرمجيات والأنظمة لإضافة تفاصيل النظام، اللغات والتقنيات المدعومة، مدة التطوير ونطاق العمل بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة حل برمجي',
      listTitle: 'الحلول البرمجية والأنظمة المضافة في الكتالوج'
    };
  }

  // 18. AI, IT & Cybersecurity (شركات حلول الذكاء الاصطناعي وتكنولوجيا المعلومات والأمن السيبراني)
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
      bannerTitle: 'هل ترغب في إضافة حل ذكاء اصطناعي أو خدمة أمن سيبراني وبنية تحتية جديدة؟',
      bannerDesc: 'استخدم استوديو حلول الذكاء الاصطناعي والتقنية لإضافة مواصفات الخدمة، مستويات الحماية، والتقارير الفنية المشمولة بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة حل تقني/أمني',
      listTitle: 'حلول الذكاء الاصطناعي والخدمات الأمنية المضافة في الكتالوج'
    };
  }

  // 19. Co-working Spaces & Tech Hubs (مساحات العمل المشتركة وحاضنات الأعمال التقنية)
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
      bannerTitle: 'هل ترغب في إضافة مكتب خاص أو باقة مساحة مشتركة أو قاعة جديدة؟',
      bannerDesc: 'استخدم استوديو مساحات العمل لحجز المكاتب، مواصفات القاعات، سرعات الإنترنت، والخدمات المشمولة بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة مساحة عمل/مكتب',
      listTitle: 'مساحات العمل والمكاتب والقاعات المضافة في الكتالوج'
    };
  }

  // 20. Customer Service & Call Centers & BPO (شركات ومراكز خدمة العملاء والتعهيد)
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
      bannerTitle: 'هل ترغب في إضافة خدمة تعهيد أو باقة مركز اتصال جديدة؟',
      bannerDesc: 'استخدم استوديو مراكز الاتصال لإضافة عدد الممثلين، ساعات التغطية، اللغات المدعومة والأنظمة المربوطة بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة باقة كول سنتر',
      listTitle: 'خدمات مراكز الاتصال والتعهيد المضافة في الكتالوج'
    };
  }

  // 21. Furniture Moving & Packaging (شركات نقل أثاث وتغليف)
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
      bannerTitle: 'هل ترغب في إضافة خدمة نقل أثاث أو باقة فك وتركيب وتغليف جديدة؟',
      bannerDesc: 'استخدم استوديو نقل الأثاث لإضافة أحجام الشاحنات، أدوار الونش، خيارات الفك والتركيب والتغليف بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة خدمة نقل أثاث',
      listTitle: 'خدمات وباقات نقل الأثاث المضافة في الكتالوج'
    };
  }

  // 22. Cleaning, Dry Clean & Carpet Wash (تنظيف ودراي كلين وسجاد)
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
      bannerTitle: 'هل ترغب في إضافة خدمة تنظيف أو غسيل سجاد أو دراي كلين جديدة؟',
      bannerDesc: 'استخدم استوديو خدمات التنظيف لإضافة المساحات، طرق الغسيل بالبخار، مواعيد الزيارة وخيارات التوصيل بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة خدمة تنظيف',
      listTitle: 'خدمات التنظيف والدراي كلين المضافة في الكتالوج'
    };
  }

  // 23. Home Services: Electrical, Plumbing, Carpentry (خدمات منزلية - كهرباء، سباكة، نجار)
  if (
    sub.includes('خدمات منزلية') ||
    (sub.includes('كهرباء') && (sub.includes('سباكة') || sub.includes('نجار'))) ||
    (sub.includes('سباكة') && sub.includes('نجار')) ||
    text.includes('خدمات منزلية (كهرباء') ||
    text.includes('كهرباء وسباكة')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة خدمة كهرباء أو سباكة أو نجارة وصيانة منزلية جديدة؟',
      bannerDesc: 'استخدم استوديو الخدمات المنزلية لإضافة تخصص الفني، رسوم الكشف، قطع الغيار المشمولة وضمان الخدمة بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة خدمة صيانة منزلية',
      listTitle: 'خدمات الصيانة المنزلية والمهنية المضافة في الكتالوج'
    };
  }

  // 24. Pest Control & Sterilization (مكافحة حشرات وتعقيم)
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
      bannerTitle: 'هل ترغب في إضافة خدمة رش مبيدات أو باقة مكافحة وتعقيم جديدة؟',
      bannerDesc: 'استخدم استوديو مكافحة الحشرات لإضافة مساحة العقار، نوع المبيدات والمواد المستخدمة، وفترة الكفالة الخطية بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة خدمة مكافحة/تعقيم',
      listTitle: 'خدمات مكافحة الحشرات والتعقيم المضافة في الكتالوج'
    };
  }

  // 25. Satellite, Security Cameras & Surveillance Systems (ستالايت وكاميرات مراقبة وأنظمة حماية)
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
      bannerTitle: 'هل ترغب في إضافة باقة كاميرات مراقبة أو خدمة أمان وستالايت جديدة؟',
      bannerDesc: 'استخدم استوديو الأنظمة الأمنية لإضافة عدد الكاميرات، سعة التخزين، دقة التصوير ومواصفات التركيب والضمان بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة نظام أمني/ستالايت',
      listTitle: 'الأنظمة الأمنية وكاميرات المراقبة المضافة في الكتالوج'
    };
  }

  // 26. Wedding Halls & Event Venues (صالات أفراح ومناسبات)
  if (
    sub.includes('صالات أفراح') ||
    (sub.includes('صالات') && sub.includes('أفراح')) ||
    text.includes('صالات أفراح ومناسبات') ||
    name.includes('قاعة أفراح') ||
    name.includes('صالة أفراح')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة قاعة أفراح أو باقة حجز مناسبات جديدة؟',
      bannerDesc: 'استخدم استوديو قاعات الأفراح لإضافة صور الصالة، سعة الضيوف، خدمات الضيافة والكوشة، وأسعار الحجز بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة حجز قاعة',
      listTitle: 'قاعات الأفراح وباقات الحجز المضافة في الكتالوج'
    };
  }

  // 27. Event & Hospitality Equipment Rental (تأجير مستلزمات مناسبات وضيافة)
  if (
    sub.includes('تأجير مستلزمات مناسبات') ||
    sub.includes('مستلزمات مناسبات وضيافة') ||
    (sub.includes('تأجير مستلزمات') && sub.includes('ضيافة')) ||
    text.includes('تأجير مستلزمات مناسبات')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة مستلزمات مناسبات أو باقة ضيافة وتأجير جديدة؟',
      bannerDesc: 'استخدم استوديو مستلزمات الأفراح لإضافة الكراسي والطاولات، بوفيهات الضيافة، معدات الإضاءة والصوتيات بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة مستلزمات مناسبات',
      listTitle: 'مستلزمات وتجهيزات المناسبات المضافة في الكتالوج'
    };
  }

  // 28. Pharmacy
  if (cat.includes('صيدل') || name.includes('صيدلية')) {
    return {
      bannerTitle: 'هل ترغب في إضافة دواء أو مستحضر تجميل أو منتج طبي جديد؟',
      bannerDesc: 'استخدم استوديو الأدوية والمنتجات الجديد كلياً لإضافة الصور، الأسعار، البدائل الطبية، الأحجام المتعددة والشارات الترويجية بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة دواء/منتج',
      listTitle: 'الأدوية والمستلزمات المضافة في الكتالوج'
    };
  }

  // 29. Tutoring, Teachers & University Teaching (معلمات ومعلمون ودروس خصوصية وتدريس جامعي)
  if (
    sub.includes('تدريس جامعي') ||
    sub.includes('مواد طبية وهندسية') ||
    sub.includes('مدرسو ومدرسات') ||
    sub.includes('معلمات ومعلمون') ||
    sub.includes('معلمو ومعلمات') ||
    sub.includes('دروس خصوصية') ||
    text.includes('تدريس جامعي') ||
    text.includes('مواد طبية وهندسية') ||
    text.includes('مدرسو ومدرسات') ||
    text.includes('معلمات ومعلمون ودروس خصوصية')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة مادة تدريسية أو مساق جامعي أو حصة جديدة؟',
      bannerDesc: 'استخدم استوديو الحصص والمساقات التعليمية لإضافة أسعار الحصص، تفاصيل المادة، باقات المتابعة والملخصات الدراسية بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة حصة/مساق',
      listTitle: 'المساقات والحصص التعليمية المضافة في الكتالوج'
    };
  }

  // 30. Medicine & Cosmetic Factories & Supplies (مصانع أدوية ومستلزمات طبية وتجميلية)
  if (
    sub.includes('مصانع أدوية') ||
    sub.includes('مستلزمات طبية وتجميلية') ||
    text.includes('مصانع أدوية')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة منتج مصنعي أو مستحضر جديد؟',
      bannerDesc: 'استخدم استوديو المنتجات والمستحضرات لإضافة المواصفات الإنتاجية، أحجام العبوات والأسعار بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة منتج مصنعي',
      listTitle: 'المنتجات والمستحضرات المضافة في الكتالوج'
    };
  }

  // 31. Perfumes & Cosmetics (عطور ومستحضرات تجميل)
  if (
    sub.includes('عطور ومستحضرات تجميل') ||
    text.includes('عطور ومستحضرات تجميل')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة عطر أو مستحضر تجميل جديد؟',
      bannerDesc: 'استخدم استوديو العطور ومستحضرات التجميل لإضافة الصور، الأسعار، الحجم والسعة والشارات الترويجية بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة عطر/مستحضر',
      listTitle: 'العطور ومستحضرات التجميل المضافة في الكتالوج'
    };
  }

  // 32. Beauty Centers & Salons (مراكز تجميل وصالونات)
  if (
    sub.includes('مراكز تجميل وصالونات') ||
    sub.includes('تجميل وصالونات') ||
    text.includes('مراكز تجميل وصالونات')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة خدمة تجميل أو باقة صالون جديدة؟',
      bannerDesc: 'استخدم استوديو خدمات التجميل والصالونات لإضافة أسعار الجلسات، الباقات، والمدة المتوقعة بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة خدمة تجميل',
      listTitle: 'خدمات التجميل والصالون المضافة في الكتالوج'
    };
  }

  // 33. 3D Printing Labs & Modeling (مختبرات وخدمات الطباعة ثلاثية الأبعاد)
  if (
    sub.includes('طباعة ثلاثية الأبعاد') ||
    sub.includes('3d printing') ||
    text.includes('طباعة ثلاثية الأبعاد')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة خدمة طباعة 3D أو نمذجة هندسية جديدة؟',
      bannerDesc: 'استخدم استوديو الطباعة والنمذجة لإضافة نماذج الأعمال، المواد المستخدمة، والأسعار بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة خدمة طباعة 3D',
      listTitle: 'خدمات الطباعة ثلاثية الأبعاد المضافة في الكتالوج'
    };
  }

  // 34. Natural Home Cosmetics & Soaps (شمع وصابون ومستحضرات تجميل طبيعية بيتية)
  if (
    sub.includes('شمع وصابون') ||
    sub.includes('طبيعية بيتية') ||
    text.includes('شمع وصابون')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة صابون طبيعي أو شمع أو مستحضر بيتي جديد؟',
      bannerDesc: 'استخدم استوديو المنتجات الطبيعية لإضافة الصور، الأسعار، المكونات، والخيارات المتوفرة بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة منتج طبيعي',
      listTitle: 'المنتجات الطبيعية والشموع المضافة في الكتالوج'
    };
  }

  // 8. Medical / Doctors / Clinics
  const isExplicitNonMedCatalog =
    sub.includes('تدريس جامعي') ||
    sub.includes('مواد طبية وهندسية') ||
    sub.includes('مدرس') ||
    sub.includes('معلم') ||
    sub.includes('دروس خصوصية') ||
    sub.includes('طباعة ثلاثية الأبعاد') ||
    sub.includes('3d') ||
    sub.includes('شمع وصابون') ||
    sub.includes('طبيعية بيتية') ||
    sub.includes('مراكز تجميل') ||
    sub.includes('تجميل وصالونات') ||
    sub.includes('صالون') ||
    sub.includes('حلاقة') ||
    sub.includes('مصانع أدوية') ||
    sub.includes('مستلزمات طبية وتجميلية') ||
    sub.includes('عطور ومستحضرات تجميل') ||
    cat.includes('معلمات ومعلمون') ||
    cat.includes('مشاريع منزلية') ||
    cat.includes('عناية شخصية وتجميل') ||
    cat.includes('تسوق وتجزئة') ||
    cat.includes('صناعة وإنتاج');

  if (
    !isExplicitNonMedCatalog &&
    isMedicalBusiness(biz)
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة خدمة طبية أو فحص أو إجراء علاجي جديد؟',
      bannerDesc: 'استخدم استوديو الخدمات الطبية الجديد كلياً لإضافة الصور، أسعار الكشوفات، العروض العلاجية، والخيارات المتعددة بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة خدمة طبية',
      listTitle: 'الخدمات الطبية المضافة في الكتالوج'
    };
  }

  // 9. Restaurants / Food / Cafes
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

  // 10. Services / Education / Maintenance / Beauty / Finance
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
    cat.includes('عناية') ||
    cat.includes('مال') ||
    cat.includes('أعمال') ||
    cat.includes('تقنية') ||
    cat.includes('برمجيات') ||
    cat.includes('سياح') ||
    cat.includes('مركب')
  ) {
    return {
      bannerTitle: 'هل ترغب في إضافة خدمة أو باقة أو استشارة جديدة؟',
      bannerDesc: 'استخدم استوديو الخدمات الجديد كلياً لإضافة الصور، أسعار الخدمات، الباقات المتعددة والخصومات والمميزات بسهولة وسلاسة.',
      bannerBtn: 'فتح استوديو إضافة خدمة',
      listTitle: 'الخدمات المضافة في الكتالوج'
    };
  }

  // 11. Default / Retail / Shops
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
  
  // Resolve Theme based on Business Category, Subcategory, Name and Medical profile
  const effectiveSubCategory = business.subCategory || (business as any).subcategory || (business.category?.includes('مدرسو') || business.category?.includes('مصانع أدوية') || business.category?.includes('عطور') ? business.category : undefined);
  const theme = getCategoryTheme(
    business.category || '',
    effectiveSubCategory,
    business.name,
    business.medicalProfile?.doctorProfile?.subspecialty || (business.medicalProfile?.doctorProfile as any)?.specialty || business.facilityType
  );
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
  const [trackStock, setTrackStock] = useState(false);
  const [stockCount, setStockCount] = useState<number | ''>('');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number | ''>('');
  
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
  
  // Fashion & Apparel (ملابس وأزياء) State Hooks
  // Strictly tailored for subcategory: ملابس وأزياء (رجالي، ستاتي، أطفال)
  const isClothingFashionSubCategory = Boolean(
    business.subCategory && (
      business.subCategory.trim() === 'ملابس وأزياء (رجالي، ستاتي، أطفال)' ||
      business.subCategory.trim() === 'ملابس وأزرياء (رجالي، ستاتي، أطفال)' ||
      business.subCategory.includes('ملابس وأزياء (رجالي، ستاتي، أطفال)') ||
      business.subCategory.includes('ملابس وأزرياء (رجالي، ستاتي، أطفال)')
    )
  );
  const isFashionBusiness = isClothingFashionSubCategory;

  const [fashionMatrix, setFashionMatrix] = useState<FashionMatrixVariant[]>([]);
  const [sizeGuide, setSizeGuide] = useState<FashionSizeGuide | undefined>(undefined);
  const [fabricDetails, setFabricDetails] = useState<FashionFabricCare | undefined>(undefined);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [returnPolicy, setReturnPolicy] = useState<FashionReturnPolicy | undefined>(undefined);
  const [outfitSuggestions, setOutfitSuggestions] = useState<string[]>([]);

  // New UI Form Architecture State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<'basics' | 'pricing' | 'versions' | 'extras' | 'fashion'>('basics');
  const [showLivePreviewMobile, setShowLivePreviewMobile] = useState(false);
  const [showTrialLimitPopup, setShowTrialLimitPopup] = useState(false);



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

  // Typewriter effect state for the subcategory/category field - tailored to subcategory
  const typingPhrases = theme.presetCategories && theme.presetCategories.length > 0
    ? theme.presetCategories
    : [
        'وجبات رئيسية وجانبية',
        'برجر وسندويشات فخمة',
        'غرف مفردة ومزدوجة سنغل',
        'شقق مفروشة للإيجار',
        'جلسات ليزر وتجميل',
        'تنظيف بشرة وعناية'
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
    setTrackStock(!!item.trackStock);
    setStockCount(item.stockCount !== undefined ? item.stockCount : '');
    setPrepTimeMinutes(item.prepTimeMinutes !== undefined ? item.prepTimeMinutes : '');
    setOptions(item.options || []);
    setNewOptionInput('');
    setVersions(item.versions || []);
    setVersionType(item.versionType || 'sizes');
    setVersionName('');
    setVersionPrice('');
    setVersionPriceType('fixed');
    setEditingVersionId(null);
    // Fashion state initialization
    setFashionMatrix(item.fashionMatrix || []);
    setSizeGuide(item.sizeGuide);
    setFabricDetails(item.fabricDetails);
    setGalleryImages(item.galleryImages || []);
    setReturnPolicy(item.returnPolicy);
    setOutfitSuggestions(item.outfitSuggestions || []);

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
    setTrackStock(false);
    setStockCount('');
    setPrepTimeMinutes('');
    setOptions([]);
    setNewOptionInput('');
    setVersions([]);
    setVersionType('sizes');
    setVersionName('');
    setVersionPrice('');
    setVersionPriceType('fixed');
    setEditingVersionId(null);
    // Clear fashion state
    setFashionMatrix([]);
    setSizeGuide(undefined);
    setFabricDetails(undefined);
    setGalleryImages([]);
    setReturnPolicy(undefined);
    setOutfitSuggestions([]);
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

    const parsedStock = trackStock && stockCount !== '' ? parseInt(String(stockCount), 10) : undefined;

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
      versionType: isClothingFashionSubCategory ? 'addons' : (versions.length > 0 ? versionType : undefined),
      createdAt: editingItem ? (editingItem.createdAt || Date.now()) : Date.now(),
      trackStock: isClothingFashionSubCategory
        ? (fashionMatrix.length > 0 ? true : undefined)
        : (trackStock || undefined),
      stockCount: isClothingFashionSubCategory
        ? (fashionMatrix.length > 0 ? fashionMatrix.reduce((sum, v) => sum + (v.stockCount ?? 0), 0) : undefined)
        : (trackStock ? (isNaN(Number(parsedStock)) ? 0 : Number(parsedStock)) : undefined),
      prepTimeMinutes: prepTimeMinutes !== '' ? Number(prepTimeMinutes) : undefined,
      // Fashion properties
      fashionMatrix: fashionMatrix.length > 0 ? fashionMatrix : undefined,
      sizeGuide: sizeGuide && sizeGuide.rows.length > 0 ? sizeGuide : undefined,
      fabricDetails: fabricDetails && (fabricDetails.fabricType || (fabricDetails.careInstructions && fabricDetails.careInstructions.length > 0)) ? fabricDetails : undefined,
      galleryImages: galleryImages.length > 0 ? galleryImages : undefined,
      returnPolicy: returnPolicy && (returnPolicy.customNotice || returnPolicy.allowedType) ? returnPolicy : undefined,
      outfitSuggestions: outfitSuggestions.length > 0 ? outfitSuggestions : undefined,
    };

    if (editingItem) {
      setItems(items.map(it => it.id === editingItem.id ? parsedItem : it));
      handleCancelEdit();
    } else {
      if (vipInfo.isVip && vipInfo.isTrial && items.length >= 15) {
        setShowTrialLimitPopup(true);
      } else {
        setItems([...items, parsedItem]);
        handleCancelEdit();
      }
    }
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
    const isOwner = business.userId === currentUser.uid || 
      business.ownerId === currentUser.uid ||
      (currentUser.email && (
        business.ownerEmail?.trim().toLowerCase() === currentUser.email.trim().toLowerCase() ||
        business.userEmail?.trim().toLowerCase() === currentUser.email.trim().toLowerCase()
      ));

    if (!isOwner && !isAdmin) {
      alert("غير مصرح لك بتعديل قائمة هذا المحل.");
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

      try {
        await updateDoc(docRef, payload);
      } catch (clientErr) {
        console.warn("Client updateDoc notice, syncing via server fallback:", clientErr);
        const token = await auth.currentUser?.getIdToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        await fetch('/api/business/menu-stock', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            businessId: business.id,
            menuItems: sanitizedItems
          })
        }).catch(() => {});
      }

      // Guaranteed server sync
      auth.currentUser?.getIdToken().then(token => {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        fetch('/api/business/menu-stock', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            businessId: business.id,
            menuItems: sanitizedItems
          })
        }).catch(() => {});
      }).catch(() => {});

      updateBusinessMenuItemsInCache(business.id, sanitizedItems);
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
              ترقية المحل لـ VIP
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
    <div className="fixed inset-0 z-[100000] bg-stone-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden animate-fade-in" dir="rtl">
      
      {/* Main Manager Container */}
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-5xl w-full max-h-[88dvh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-stone-200 relative my-0 sm:my-auto text-right overflow-hidden">
        
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />
        
        {/* Top Sticky Bar */}
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-stone-100 border border-stone-200/80 text-stone-800 flex items-center justify-center shadow-2xs">
              {renderHeaderIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-stone-900">{theme.title}</h2>
                <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5 text-amber-600" /> VIP
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
                              {item.badge === 'popular' ? theme.badges.popular : item.badge === 'new' ? theme.badges.new : item.badge === 'spicy' ? theme.badges.spicyOrFeatured : theme.badges.vegetarianOrPromo}
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
                      {editingItem ? 'تعديل بيانات الصنف' : (theme.studioTitle || 'إضافة صنف جديد للكتالوج')}
                    </h3>
                    <p className="text-[10px] text-stone-500">{theme.studioSubtitle || 'قم بتعبئة التفاصيل والأسعار والصورة المخصصة'}</p>
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
                  {(isClothingFashionSubCategory ? [
                    { id: 'basics', label: 'الأساسيات', icon: Sparkle },
                    { id: 'pricing', label: 'التسعير', icon: Percent },
                    { id: 'fashion', label: 'المقاسات والخامات والأبعاد', icon: Shirt },
                    { id: 'extras', label: 'الشارات', icon: Tag },
                  ] : [
                    { id: 'basics', label: 'الأساسيات', icon: Sparkle },
                    { id: 'pricing', label: 'التسعير', icon: Percent },
                    { id: 'versions', label: `الأحجام (${versions.length})`, icon: Layers },
                    { id: 'extras', label: 'الشارات', icon: Tag },
                  ]).map((tab) => {
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
                          {theme.categoryLabel}
                        </label>
                        <input
                          type="text"
                          required
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          placeholder={typingPlaceholder || theme.categoryPlaceholder}
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
                          <span className="text-[10px] text-stone-500 font-bold">أو اختر صورة جاهزة ومقترحة تناسب تخصصك:</span>
                          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-hide">
                            {(theme.presetImages && theme.presetImages.length > 0 ? theme.presetImages : PRESET_IMAGES).map((img, index) => (
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
                                خصم {discountPercent}%
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

                      {/* Estimated Preparation / Service Time Input */}
                      <div className="p-3.5 bg-amber-50/50 border border-amber-200/80 rounded-2xl space-y-2">
                        <label className="block text-xs font-black text-stone-900 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-amber-950">
                            <Clock className="h-4 w-4 text-amber-600" />
                            <span>{theme.timeLabel}</span>
                          </span>
                          <span className="text-[10px] text-amber-800 font-bold">بالدقائق ({theme.timePlaceholder})</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max="300"
                            value={prepTimeMinutes}
                            onChange={(e) => setPrepTimeMinutes(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 0))}
                            placeholder={theme.timePlaceholder}
                            className="w-full p-2.5 pl-16 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-500 font-bold">دقيقة</span>
                        </div>

                        {/* Quick Presets for time */}
                        {theme.timePresets && theme.timePresets.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span className="text-[10px] text-stone-400 font-bold">أوقات مقترحة سريعة:</span>
                            {theme.timePresets.map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setPrepTimeMinutes(t)}
                                className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border transition-all cursor-pointer ${
                                  prepTimeMinutes === t
                                    ? 'bg-amber-600 text-white border-amber-600'
                                    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                                }`}
                              >
                                {t} دقيقة
                              </button>
                            ))}
                          </div>
                        )}

                        <p className="text-[10px] text-stone-500 font-medium leading-snug">
                          {theme.timeHelper}
                        </p>
                      </div>

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
                            {isAvailable ? 'متاح للطلب' : 'غير متوفر'}
                          </span>
                        </label>
                      </div>

                      {/* Stock / Quantity Tracking section */}
                      {isClothingFashionSubCategory ? (
                        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-[#1a4d2e]" />
                            <h4 className="text-xs font-black text-stone-900">إدارة المخزون مؤتمتة بحسب المقاسات والألوان</h4>
                          </div>
                          <p className="text-[10px] text-stone-600 leading-relaxed">
                            لقطاع الملابس، يتم احتساب وتتبع المخزون بدقة وتلقائياً لكل مقاس ولون من تبويب "المقاسات والخامات والأبعاد" دون الحاجة لإدخاله يدوياً هنا لتفادي أي تعارض.
                          </p>
                          {fashionMatrix.length > 0 && (
                            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between">
                              <span>إجمالي القطع المتوفرة حالياً في جدول المقاسات:</span>
                              <span className="font-mono font-black">{fashionMatrix.reduce((sum, v) => sum + (v.stockCount ?? 0), 0)} قطعة</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4.5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                                <Package className="h-4 w-4 text-[#1a4d2e]" />
                                <span>تتبع حالة المخزون والكمية المتوفرة</span>
                              </h4>
                              <p className="text-[10px] text-stone-500 mt-0.5">تفعيل هذا الخيار سيقوم بمراقبة الكمية المتبقية لضمان عدم حجز صنف غير متوفر.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={trackStock}
                                onChange={(e) => {
                                  setTrackStock(e.target.checked);
                                  if (e.target.checked && stockCount === '') {
                                    setStockCount(10); // default starting stock count
                                  }
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                          </div>

                          {trackStock && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-stone-200/60 animate-in slide-in-from-top-2 duration-200">
                              <div>
                                <label className="block text-xs font-black text-stone-800 mb-1">
                                  الكمية المتوفرة في المخزن
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    required={trackStock}
                                    value={stockCount}
                                    onChange={(e) => {
                                      const v = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value, 10));
                                      setStockCount(v);
                                    }}
                                    placeholder="مثال: 15"
                                    className="w-full p-3 pl-12 bg-white border border-stone-200 rounded-xl text-base font-black text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/30"
                                  />
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-bold">وحدة</span>
                                </div>
                              </div>

                              <div className="flex items-center">
                                <div className={`p-3 rounded-xl text-xs w-full font-bold flex items-center gap-2 ${
                                  typeof stockCount === 'number' && stockCount === 0
                                    ? 'bg-rose-50 text-rose-800 border border-rose-100'
                                    : typeof stockCount === 'number' && stockCount <= 5
                                    ? 'bg-amber-50 text-amber-800 border border-amber-100'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                                }`}>
                                  <div className={`w-2.5 h-2.5 rounded-full ${
                                    typeof stockCount === 'number' && stockCount === 0
                                      ? 'bg-rose-600 animate-pulse'
                                      : typeof stockCount === 'number' && stockCount <= 5
                                      ? 'bg-amber-500 animate-pulse'
                                      : 'bg-emerald-500'
                                  }`} />
                                  <span>
                                    {typeof stockCount === 'number' && stockCount === 0
                                      ? 'نفدت الكمية تماماً (سيظهر للزبائن غير متوفر)'
                                      : typeof stockCount === 'number' && stockCount <= 5
                                      ? `كمية منخفضة ومحدودة! متبقي فقط ${stockCount}`
                                      : `الكمية ممتازة ومتوفرة للطلب (متبقي ${stockCount || 0})`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  )}

                  {/* TAB 3: VERSIONS, SIZES & ADD-ONS STUDIO */}
                  {activeFormTab === 'versions' && !isClothingFashionSubCategory && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      
                      {/* Version Type Switcher: Sizes vs Add-ons */}
                      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                            <SlidersHorizontal className="h-4 w-4 text-[#1a4d2e]" />
                            <span>نوع التخصيص للصنف:</span>
                          </label>
                          <span className="text-[10px] font-bold text-stone-500">
                            {versionType === 'sizes' ? 'نظام الأحجام والمقاسات' : 'نظام الإضافات والخيارات'}
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
                                <span>أحجام ومقاسات</span>
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
                                <span>إضافات وخيارات</span>
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
                              {versionType === 'sizes' ? theme.sizesSectionTitle : theme.addonsSectionTitle}
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
                            {(versionType === 'sizes' ? (theme.sizePresets || []) : (theme.addonPresets || [])).map((preset) => (
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
                                {versionType === 'sizes' ? theme.sizeNameLabel : theme.addonNameLabel}
                              </label>
                              <input
                                type="text"
                                value={versionName}
                                onChange={(e) => setVersionName(e.target.value)}
                                placeholder={versionType === 'sizes' ? theme.sizeNamePlaceholder : theme.addonNamePlaceholder}
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
                                  مجاناً
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
                                هذا الخيار مجاني بالكامل للزبون.
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

                  {/* UNIFIED FASHION TAB: SIZES, MATRIX, GUIDE, FABRIC, VERSIONS, GALLERY, POLICY, OUTFIT */}
                  {activeFormTab === 'fashion' && isClothingFashionSubCategory && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <FashionItemFields
                        fashionMatrix={fashionMatrix}
                        setFashionMatrix={setFashionMatrix}
                        sizeGuide={sizeGuide}
                        setSizeGuide={setSizeGuide}
                        fabricDetails={fabricDetails}
                        setFabricDetails={setFabricDetails}
                        galleryImages={galleryImages}
                        setGalleryImages={setGalleryImages}
                        isOfficialVip={vipInfo.isVip && !vipInfo.isTrial}
                        returnPolicy={returnPolicy}
                        setReturnPolicy={setReturnPolicy}
                        outfitSuggestions={outfitSuggestions}
                        setOutfitSuggestions={setOutfitSuggestions}
                        availableItems={items}
                        currentItemId={editingItem?.id}
                        versions={versions}
                        setVersions={setVersions}
                        versionType={versionType}
                        setVersionType={setVersionType}
                        versionName={versionName}
                        setVersionName={setVersionName}
                        versionPriceType={versionPriceType}
                        setVersionPriceType={setVersionPriceType}
                        versionPrice={versionPrice}
                        setVersionPrice={setVersionPrice}
                        editingVersionId={editingVersionId}
                        setEditingVersionId={setEditingVersionId}
                        handleAddOrUpdateVersion={handleAddOrUpdateVersion}
                        handleRemoveVersion={handleRemoveVersion}
                        handleStartEditVersion={handleStartEditVersion}
                        handleCancelEditVersion={handleCancelEditVersion}
                        basePrice={price}
                      />
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
                      معاينة فورية
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
                          {name || theme.addItemPlaceholder}
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
                            {versionType === 'sizes' ? 'اختر الحجم أو المقاس:' : 'خيارات وإضافات مقترحة:'}
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

                      {/* Live Fashion Matrix & Details on Preview Card */}
                      {isFashionBusiness && fashionMatrix.length > 0 && (
                        <div className="space-y-1.5 pt-1 border-t border-stone-100">
                          <div className="text-[10px] font-bold text-stone-500">
                            الألوان والمقاسات المتوفرة:
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {Array.from(new Set(fashionMatrix.map(v => v.colorName))).map((colName, cIdx) => {
                              const variant = fashionMatrix.find(v => v.colorName === colName);
                              return (
                                <span
                                  key={cIdx}
                                  className="text-[9px] px-2 py-0.5 rounded-md font-bold bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-1"
                                >
                                  {variant?.colorHex && (
                                    <span
                                      className="w-2 h-2 rounded-full border border-stone-300"
                                      style={{ backgroundColor: variant.colorHex }}
                                    />
                                  )}
                                  <span>{colName}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Fabric Type preview tag */}
                      {isFashionBusiness && fabricDetails?.fabricType && (
                        <div className="text-[10px] font-bold text-stone-600 bg-stone-50 px-2 py-1 rounded-lg border border-stone-200/60 flex items-center gap-1">
                          <Shirt className="h-3 w-3 text-amber-600" />
                          <span>الخامة: {fabricDetails.fabricType}</span>
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
                      if (isClothingFashionSubCategory) {
                        if (activeFormTab === 'basics') setActiveFormTab('pricing');
                        else if (activeFormTab === 'pricing') setActiveFormTab('fashion');
                        else if (activeFormTab === 'fashion') setActiveFormTab('extras');
                        else setActiveFormTab('basics');
                      } else {
                        if (activeFormTab === 'basics') setActiveFormTab('pricing');
                        else if (activeFormTab === 'pricing') setActiveFormTab('versions');
                        else if (activeFormTab === 'versions') setActiveFormTab('extras');
                        else setActiveFormTab('basics');
                      }
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
                    <span>{editingItem ? 'تحديث وتأكيد التعديلات' : theme.saveItemLabel}</span>
                  </button>
                </div>
              </div>

            </motion.div>

          </div>
        )}
      </AnimatePresence>

      {/* Trial Limit Alert Popup Modal */}
      {showTrialLimitPopup && (
        <div className="fixed inset-0 z-[110000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" dir="rtl">
          <div 
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-amber-200 text-center"
          >
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm animate-bounce">
              <Sparkles className="h-8 w-8" />
            </div>
            
            <h3 className="text-lg font-black text-stone-900 mb-2">حدود الباقة التجريبية المسموحة</h3>
            <p className="text-sm text-stone-600 leading-relaxed mb-6">
              نشكرك على استخدام الباقة الذهبية التجريبية (30 يوماً). 
              <br />
              الحد الأقصى المتاح لإضافة {business.category === 'عيادات ومراكز طبية' ? 'الخدمات والإجراءات' : 'الأصناف والمنتجات'} في هذه الباقة هو <span className="font-black text-amber-600">15 صنفاً فقط</span>.
              <br />
              <span className="mt-2 block font-medium text-stone-500">للحصول على إمكانيات غير محدودة وتوسيع آفاق عملك، يرجى الترقية للباقة الذهبية الدائمة.</span>
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowTrialLimitPopup(false);
                  setIsFormOpen(false); // Close the item creation form
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-amber-950 font-black rounded-xl text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                فهمت ذلك
              </button>
            </div>
          </div>
        </div>
      )}

    </div>,
    document.body
  );
}
