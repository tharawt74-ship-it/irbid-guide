import { 
  LayoutGrid, 
  UtensilsCrossed, 
  Coffee, 
  CakeSlice, 
  BookOpen, 
  Building2, 
  Landmark, 
  HeartPulse, 
  Shirt, 
  Smartphone, 
  ShoppingCart, 
  Scissors, 
  Dumbbell, 
  Car, 
  Sparkles,
  Hammer, 
  Sprout, 
  GraduationCap, 
  Laptop, 
  Store,
  LucideIcon
} from 'lucide-react';

export interface CategoryMeta {
  icon: LucideIcon;
  bg: string;
}

export function getCategoryMeta(cat: string): CategoryMeta {
  const c = (cat || '').toLowerCase().trim();
  if (!cat || c === 'الكل') {
    return { icon: LayoutGrid, bg: 'bg-emerald-50 text-[#1a4d2e]' };
  }
  if (c.includes('معلم') || c.includes('معلمات') || c.includes('دروس خصوصية') || c.includes('تدريس')) {
    return { icon: GraduationCap, bg: 'bg-indigo-50 text-indigo-700' };
  }
  if (c.includes('منزلية') || c.includes('أونلاين') || c.includes('من المنزل') || c.includes('أون لاين')) {
    return { icon: Laptop, bg: 'bg-[#1a4d2e]/10 text-[#1a4d2e]' };
  }
  if (c.includes('مطاعم') || c.includes('أكل') || c.includes('وجبات') || c.includes('طعام') || c.includes('شاورما') || c.includes('برغر') || c.includes('مشاوي') || c.includes('بيتزا')) {
    return { icon: UtensilsCrossed, bg: 'bg-amber-50 text-amber-700' };
  }
  if (c.includes('مقاهي') || c.includes('كافيه') || c.includes('قهوة') || c.includes('مشروبات') || c.includes('شاي') || c.includes('عصائر')) {
    return { icon: Coffee, bg: 'bg-orange-50 text-orange-700' };
  }
  if (c.includes('حلويات') || c.includes('حلو') || c.includes('كيك') || c.includes('مخبز') || c.includes('معجنات') || c.includes('آيس كريم')) {
    return { icon: CakeSlice, bg: 'bg-pink-50 text-pink-700' };
  }
  if (c.includes('مكتب') || c.includes('قرطاس') || c.includes('كتب') || c.includes('طباعة') || c.includes('دراسة') || c.includes('جامع') || c.includes('مدرس') || c.includes('تعليم') || c.includes('تدريب')) {
    return { icon: BookOpen, bg: 'bg-blue-50 text-blue-700' };
  }
  if (c.includes('سكن') || c.includes('شقق') || c.includes('عقار') || c.includes('إسكان') || c.includes('استوديو') || c.includes('فنادق')) {
    return { icon: Building2, bg: 'bg-indigo-50 text-indigo-700' };
  }
  if (c.includes('سياح') || c.includes('معالم') || c.includes('حدائق') || c.includes('منتزه') || c.includes('آثار') || c.includes('ترفيه') || c.includes('ملاهي')) {
    return { icon: Landmark, bg: 'bg-emerald-50 text-emerald-700' };
  }
  if (c.includes('صيدل') || c.includes('طب') || c.includes('صحة') || c.includes('عياد') || c.includes('مستشفى') || c.includes('مختبر') || c.includes('علاج')) {
    return { icon: HeartPulse, bg: 'bg-rose-50 text-rose-700' };
  }
  if (c.includes('ملابس') || c.includes('أزياء') || c.includes('بوتيك') || c.includes('أقمشة') || c.includes('أحذية') || c.includes('حقائب')) {
    return { icon: Shirt, bg: 'bg-purple-50 text-purple-700' };
  }
  if (c.includes('إلكترون') || c.includes('هواتف') || c.includes('موبايل') || c.includes('كمبيوتر') || c.includes('صيانة') || c.includes('كهربائ')) {
    return { icon: Smartphone, bg: 'bg-cyan-50 text-cyan-700' };
  }
  if (c.includes('سوبر') || c.includes('بقال') || c.includes('ماركت') || c.includes('تموين') || c.includes('دكان') || c.includes('خضار') || c.includes('ملاحم')) {
    return { icon: ShoppingCart, bg: 'bg-green-50 text-green-700' };
  }
  if (c.includes('صالون') || c.includes('حلاق') || c.includes('تجميل') || c.includes('ميك اب') || c.includes('عطور') || c.includes('بشرة')) {
    return { icon: Scissors, bg: 'bg-fuchsia-50 text-fuchsia-700' };
  }
  if (c.includes('رياض') || c.includes('جيم') || c.includes('نوادي') || c.includes('لياقة') || c.includes('أكاديمي')) {
    return { icon: Dumbbell, bg: 'bg-red-50 text-red-700' };
  }
  if (c.includes('سيار') || c.includes('كراج') || c.includes('ميكانيك') || c.includes('غسيل') || c.includes('مركبات')) {
    return { icon: Car, bg: 'bg-slate-50 text-slate-700' };
  }
  if (c.includes('ذهب') || c.includes('مجوهرات') || c.includes('إكسسوار') || c.includes('هدايا') || c.includes('أفراح') || c.includes('زفاف')) {
    return { icon: Sparkles, bg: 'bg-yellow-50 text-yellow-700' };
  }
  if (c.includes('صناع') || c.includes('حرف') || c.includes('انشاءات') || c.includes('نجار') || c.includes('حداد') || c.includes('حجر') || c.includes('سيراميك') || c.includes('طوب') || c.includes('بناء') || c.includes('المنيوم')) {
    return { icon: Hammer, bg: 'bg-orange-50 text-orange-800' };
  }
  if (c.includes('زراع') || c.includes('حدائق') || c.includes('نبات') || c.includes('مستلزمات زراعية') || c.includes('زيتون')) {
    return { icon: Sprout, bg: 'bg-emerald-50 text-emerald-800' };
  }
  return { icon: Store, bg: 'bg-stone-50 text-stone-700' };
}
