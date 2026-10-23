import { MenuItem } from '../types';

export const PROFESSIONAL_SERVICES_SUBCATEGORIES = [
  'مكاتب محاماة واستشارات قانونية',
  'مكاتب هندسية ومقاولات',
  'مكاتب ترجمة معتمدة وتدقيق',
  'مهندسو ديكور وتصاميم هندسية',
  'خدمات طباعة وتصوير وتصميم',
  'تصميم جرافيك وتسويق وإدارة صفحات أونلاين',
  'ترجمة وكتابة محتوى وأعمال أونلاين (Freelancing)',
  'وكالات التسويق الرقمي وتصميم الهويات وتطوير الويب'
];

export function isProfessionalServiceSubCategory(subCategory?: string, category?: string): boolean {
  if (!subCategory) return false;
  const s = subCategory.trim();
  return PROFESSIONAL_SERVICES_SUBCATEGORIES.some(target => s === target || s.includes(target));
}

export const CONSULTATION_TYPES = [
  { id: 'written', label: 'استشارة مكتوبة', hint: 'تقرير أو رأي مهني مكتوب' },
  { id: 'phone', label: 'استشارة هاتفية', hint: 'مكالمة استشارية مباشرة' },
  { id: 'in_person', label: 'استشارة حضورية', hint: 'جلسة وجاهية بالمكتب' },
  { id: 'online_meeting', label: 'اجتماع مرئي', hint: 'جلسة فيديو عبر Zoom أو Meet' }
] as const;

export const CONSULTATION_ACTION_BUTTONS = [
  { id: 'request_consultation', label: 'طلب استشارة' },
  { id: 'book_appointment', label: 'حجز موعد استشاري' },
  { id: 'submit_project', label: 'إرسال ملف المشروع للتقييم' }
] as const;

export function getConsultationActionLabel(action?: string): string {
  switch (action) {
    case 'book_appointment':
      return 'حجز موعد استشاري';
    case 'submit_project':
      return 'إرسال ملف المشروع للتقييم';
    case 'request_consultation':
    default:
      return 'طلب استشارة';
  }
}

export function formatConsultationPrice(item: MenuItem): { formatted: string; isRange: boolean; isEstimate: boolean } {
  const isEstimate = !!item.consultationPriceRange?.isEstimate;

  if (item.consultationPriceRange && (item.consultationPriceRange.minPrice || item.consultationPriceRange.maxPrice)) {
    const min = item.consultationPriceRange.minPrice ? `${item.consultationPriceRange.minPrice} د.أ` : '';
    const max = item.consultationPriceRange.maxPrice ? `${item.consultationPriceRange.maxPrice} د.أ` : '';
    if (min && max) {
      return { formatted: `${min} - ${max}`, isRange: true, isEstimate };
    }
    if (min) {
      return { formatted: `يبدأ من ${min}`, isRange: true, isEstimate };
    }
    if (max) {
      return { formatted: `حتى ${max}`, isRange: true, isEstimate };
    }
  }

  const p = parseFloat(item.price);
  if (!isNaN(p) && p > 0) {
    return { formatted: `${p.toFixed(2)} د.أ`, isRange: false, isEstimate };
  }

  return { formatted: 'حسب متطلبات المشروع', isRange: false, isEstimate: true };
}

export function generateConsultationWhatsAppMessage(
  arg1: string | MenuItem,
  arg2: string | MenuItem,
  arg3?: string | {
    actionType?: string;
    consultationType?: string;
    clientName?: string;
    notes?: string;
    preferredDate?: string;
    projectFileUrl?: string;
  }
): string {
  let businessName = '';
  let item: MenuItem;
  let details: {
    actionType?: string;
    consultationType?: string;
    clientName?: string;
    notes?: string;
    preferredDate?: string;
    projectFileUrl?: string;
  } | undefined;

  if (typeof arg1 === 'string') {
    businessName = arg1;
    item = arg2 as MenuItem;
    if (typeof arg3 === 'object') {
      details = arg3;
    } else if (typeof arg3 === 'string') {
      details = { actionType: arg3 };
    }
  } else {
    item = arg1 as MenuItem;
    businessName = typeof arg2 === 'string' ? arg2 : '';
    if (typeof arg3 === 'string') {
      details = { actionType: arg3 };
    } else if (typeof arg3 === 'object') {
      details = arg3;
    }
  }

  const actionLabel = getConsultationActionLabel(details?.actionType || item.consultationActionType);
  const consultType = details?.consultationType ? `نوع الاستشارة: ${details.consultationType}` : '';
  const dateText = details?.preferredDate ? `الموعد المقترح: ${details.preferredDate}` : '';
  const priceInfo = formatConsultationPrice(item);
  const priceText = `الأتعاب: ${priceInfo.formatted}`;
  const expertText = item.expertProfile?.name ? `المستشار المسؤول: ${item.expertProfile.name}` : '';
  const notesText = details?.notes ? `تفاصيل الاستشارة / المشروع: ${details.notes}` : '';
  const fileText = details?.projectFileUrl ? `رابط وثائق المشروع: ${details.projectFileUrl}` : '';

  const lines = [
    `مرحباً ${businessName}`,
    `أود ${actionLabel} بخصوص: ${item.name}`,
    priceText,
    expertText,
    consultType,
    dateText,
    fileText,
    notesText,
    'عبر منصة شو في بإربد'
  ].filter(Boolean);

  return lines.join('\n');
}
