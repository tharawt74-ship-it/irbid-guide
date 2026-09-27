import { Business } from '../../../types';
import { PosterElement, PosterTemplate } from '../../../types/posterDesigner';
import html2canvas from 'html2canvas';

export function getLogoFilterCSS(filterType?: string): string {
  if (!filterType || filterType === 'original') {
    return 'drop-shadow(0 1px 2px rgba(0,0,0,0.06))';
  }
  if (filterType === 'white') {
    return 'brightness(0) invert(1) drop-shadow(0 1px 2px rgba(255,255,255,0.2))';
  }
  if (filterType === 'black') {
    return 'brightness(0) drop-shadow(0 1px 2px rgba(0,0,0,0.15))';
  }
  if (filterType === 'gold') {
    return 'sepia(1) saturate(6) hue-rotate(15deg) brightness(0.95) drop-shadow(0 1px 2px rgba(0,0,0,0.15))';
  }
  if (filterType === 'grayscale') {
    return 'grayscale(1) drop-shadow(0 1px 2px rgba(0,0,0,0.06))';
  }
  if (filterType === 'invert') {
    return 'invert(1) drop-shadow(0 1px 2px rgba(0,0,0,0.06))';
  }
  return filterType;
}

export function getElementBorderRadiusCSS(el: PosterElement): string {
  if (el.clipShape === 'circle') return '9999px';
  const base = el.borderRadius ?? 0;
  const tl = el.borderRadiusTopLeft ?? base;
  const tr = el.borderRadiusTopRight ?? base;
  const br = el.borderRadiusBottomRight ?? base;
  const bl = el.borderRadiusBottomLeft ?? base;

  if (tl === 0 && tr === 0 && br === 0 && bl === 0) return '0px';
  if (tl === tr && tr === br && br === bl) return `${tl}px`;
  return `${tl}px ${tr}px ${br}px ${bl}px`;
}

export const VARIABLE_TOKENS = [
  { token: '{{business_name}}', label: 'اسم المحل', fallback: 'مطعم ومقهى النخبة' },
  { token: '{{category}}', label: 'التصنيف', fallback: 'مطاعم ومأكولات' },
  { token: '{{phone}}', label: 'رقم الهاتف', fallback: '0790000000' },
  { token: '{{address}}', label: 'العنوان', fallback: 'إربد - شارع الجامعة' },
  { token: '{{working_hours}}', label: 'ساعات العمل', fallback: '10:00 ص - 12:00 م' },
  { token: '{{table_number}}', label: 'رقم الطاولة', fallback: 'طاولة رقم 01' },
  { token: '{{menu_url}}', label: 'رابط المنيو الذكي', fallback: 'https://shofibirbid.site/business/demo' }
];

export interface PosterExtraVars {
  tableNumber?: string;
  tableBadgeMode?: 'table' | 'welcome'; // table number or custom greeting
  overrideTableBadgeText?: string;      // custom text for table badge / greeting
  overrideTitle?: string;
  overrideSubtitle?: string;
  overrideEnglishText?: string;
  overrideDigitalBadge?: string;        // شارة منيو رقمي (e.g. ✨ منيو إلكتروني ذكي)
  overrideInstructions?: string;        // تعليمات الكاميرا (e.g. 📷 افتح كاميرا هاتفك ووجّهها نحو الرمز مباشرة)
  overrideWaveTitle?: string;           // عنوان القسم السفلي
  overrideWaveSubtitle?: string;        // وصف القسم السفلي
  overrideCategoryBadge?: string;       // شارة التصنيف الفرعية
  coverImage?: string;
  customPosterLogo?: string;            // شعار مخصص للبوستر مؤقت في الجلسة (Cache only)
  customPosterFoodPhoto?: string;       // صورة وجبة ترويجية مخصصة للبوستر مؤقت في الجلسة (Cache only)
  removeLogoSquareFrame?: boolean;      // إلغاء التقييد بالإطار المربع ذو الزوايا المستديرة لشعار المحل
  removeDishCircleFrame?: boolean;      // إلغاء التقييد بالإطار الدائري الأبيض وبدون سمك الإطار الأبيض للوجبة
  dishCornerRadius?: number;            // استدارة حواف صورة الوجبة الترويجية (افتراضي 20px أو 0)
  dishBorderWidth?: number;             // سمك إطار الوجبة المخصص (0 = بدون سمك)
  dishScale?: number;                   // معامل تكبير/تصغير صورة الوجبة الترويجية (افتراضي 1)
  dishOffsetX?: number;                 // إزاحة أفقية لصورة الوجبة (يمين/يسار بالبكسل)
  dishOffsetY?: number;                 // إزاحة رأسية لصورة الوجبة (فوق/تحت بالبكسل)
  logoScale?: number;                   // معامل تكبير/تصغير شعار المحل (افتراضي 1)
  logoOffsetX?: number;                 // إزاحة أفقية لشعار المحل (يمين/يسار بالبكسل)
  logoOffsetY?: number;                 // إزاحة رأسية لشعار المحل (فوق/تحت بالبكسل)
  includeContact?: boolean;
  includeEnglish?: boolean;
  platformLogoUrl?: string;             // شعار المنصة للبوستر
  platformDomain?: string;              // رابط/دومين المنصة
  // Dynamic Merchant Color Overrides:
  customPrimaryColor?: string;     // Bottom wave, accent shapes, primary themes
  customSecondaryColor?: string;   // Secondary badges/accents
  customCardBgColor?: string;      // Middle scan card background
  customCardBorderColor?: string;  // Middle scan card border
  customQrColor?: string;          // QR code color & QR frame border
  customQrBgColor?: string;        // QR code background
  customTableBadgeBg?: string;     // Table number / Welcome box background
  customTableBadgeColor?: string;  // Table number / Welcome box text color
  customTitleColor?: string;       // Scan title / Main headlines text color
  customTextColor?: string;        // Subtitles, hint text, descriptions
  customQrTargetUrl?: string;      // Custom URL for QR code (e.g. review page)
}

export function isDarkColor(colorHex?: string): boolean {
  if (!colorHex) return true;
  const hex = colorHex.replace('#', '').trim();
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum < 0.6;
  }
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16) || 0;
    const g = parseInt(hex[1] + hex[1], 16) || 0;
    const b = parseInt(hex[2] + hex[2], 16) || 0;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum < 0.6;
  }
  return true;
}

export function getProcessedElement(el: PosterElement, extraVars?: PosterExtraVars): PosterElement {
  if (!extraVars) return el;

  const processed = { ...el };

  // 1. QR Code Color & Frame Overrides
  if (el.type === 'qr_code') {
    if (extraVars.customQrColor) {
      processed.qrColor = extraVars.customQrColor;
      processed.borderColor = extraVars.customQrColor;
    }
    if (extraVars.customQrBgColor) {
      processed.qrBgColor = extraVars.customQrBgColor;
    }
  }

  // 2. Wave section / Primary accent background & shapes
  const isWaveOrBottomSection = 
    el.id === 'el-wave-section' || 
    el.type === 'shape_wave' || 
    el.name?.includes('سفلي') || 
    el.name?.includes('تموجي') ||
    el.name?.includes('موجة') ||
    el.name?.includes('خلفية تموج');

  const waveColor = extraVars.customPrimaryColor || el.backgroundColor || '#0f766e';
  const waveIsDark = isDarkColor(waveColor);

  if (isWaveOrBottomSection && extraVars.customPrimaryColor) {
    processed.backgroundColor = extraVars.customPrimaryColor;
    processed.svgFill = extraVars.customPrimaryColor;
    if (processed.backgroundGradient) {
      processed.backgroundGradient = {
        ...processed.backgroundGradient,
        from: extraVars.customPrimaryColor,
        to: extraVars.customPrimaryColor
      };
    }
  }

  // 3. Middle Scan Card / Main Card
  const isScanCard = 
    el.id === 'el-scan-card' || 
    el.name?.includes('بطاقة المسح') || 
    el.name?.includes('كارت المسح') ||
    el.name?.includes('بطاقة المنتصف');

  if (isScanCard) {
    if (extraVars.customCardBgColor) {
      processed.backgroundColor = extraVars.customCardBgColor;
    }
    if (extraVars.customCardBorderColor) {
      processed.borderColor = extraVars.customCardBorderColor;
    }
  }

  // 4. Table Number / Welcome Box / Badges
  const isTableOrWelcomeBox = 
    el.id === 'el-table-badge' || 
    el.type === 'table_number' || 
    el.name?.includes('طاولة') || 
    el.name?.includes('الترحيب') ||
    el.name?.includes('بوكس');

  if (isTableOrWelcomeBox) {
    if (extraVars.customTableBadgeBg) {
      processed.backgroundColor = extraVars.customTableBadgeBg;
      processed.borderColor = extraVars.customSecondaryColor || extraVars.customTableBadgeBg;
    }
    if (extraVars.customTableBadgeColor) {
      processed.color = extraVars.customTableBadgeColor;
    }
  }

  // 5. Digital badge (شارة منيو رقمي)
  const isDigitalBadge = 
    el.id === 'el-digital-badge' || 
    el.name?.includes('شارة منيو رقمي') || 
    el.name?.includes('منيو رقمي') ||
    el.type === 'shape_badge';

  if (isDigitalBadge) {
    if (extraVars.customTableBadgeBg) {
      processed.backgroundColor = extraVars.customTableBadgeBg;
    }
    if (extraVars.customSecondaryColor || extraVars.customPrimaryColor) {
      processed.borderColor = extraVars.customSecondaryColor || extraVars.customPrimaryColor;
    }
    if (extraVars.customTableBadgeColor) {
      processed.color = extraVars.customTableBadgeColor;
    } else if (extraVars.customPrimaryColor) {
      processed.color = extraVars.customPrimaryColor;
    }
  }

  // 6. Wave Section Texts (النصوص الموجودة في القسم السفلي التموجي: عنوان القسم، وسط القسم، الشعار الإنجليزي، أوقات العمل)
  const isWaveTitle = 
    el.id === 'el-wave-title' || 
    el.name?.includes('عنوان القسم التموجي') || 
    el.name?.includes('عنوان التموج');

  const isWaveSubtitle = 
    el.id === 'el-wave-sub' || 
    el.name?.includes('وصف القسم التموجي') || 
    el.name?.includes('وسط القسم التموجي') ||
    (el.name?.includes('القسم التموجي') && el.type === 'subtitle');

  const isEnglishSlogan = 
    el.id === 'el-english-slogan' || 
    el.name?.includes('الشعار الإنجليزي') ||
    (el.type === 'english_text' && (el.y > 450 || el.name?.includes('إنجليزي')));

  const isWorkingHours = 
    el.id === 'el-hours-badge' || 
    el.type === 'working_hours' || 
    el.name?.includes('أوقات العمل');

  if (isWaveTitle) {
    processed.color = waveIsDark ? '#ffffff' : '#0f172a';
  } else if (isWaveSubtitle) {
    processed.color = waveIsDark ? '#f1f5f9' : '#334155';
  } else if (isEnglishSlogan) {
    if (waveIsDark) {
      processed.color = '#fef08a';
      processed.backgroundColor = 'rgba(255, 255, 255, 0.15)';
      processed.borderColor = 'rgba(255, 255, 255, 0.3)';
    } else {
      processed.color = '#0f172a';
      processed.backgroundColor = 'rgba(0, 0, 0, 0.08)';
      processed.borderColor = 'rgba(0, 0, 0, 0.18)';
    }
  } else if (isWorkingHours) {
    if (waveIsDark) {
      processed.color = '#ffffff';
      processed.backgroundColor = 'rgba(0, 0, 0, 0.25)';
      processed.borderColor = 'rgba(255, 255, 255, 0.2)';
    } else {
      processed.color = '#0f172a';
      processed.backgroundColor = 'rgba(0, 0, 0, 0.08)';
      processed.borderColor = 'rgba(0, 0, 0, 0.18)';
    }
  }

  // 7. Upper Scan Area Titles (عنوان المسح الرئيسي في بطاقة المسح العلوية)
  const isScanTitle = 
    el.id === 'el-scan-title' || 
    el.name?.includes('عنوان المسح') || 
    (el.type === 'hero_title' && !isWaveTitle && el.id !== 'el-wave-title' && (el.y || 0) < 500);

  if (isScanTitle) {
    if (extraVars.customTitleColor) {
      processed.color = extraVars.customTitleColor;
    } else if (extraVars.customPrimaryColor) {
      processed.color = extraVars.customPrimaryColor;
    }
  }

  // 8. Upper Subtitles & helper texts (نص التوجيه للمسح وتعليمات الكاميرا)
  const isScanSubtitle = 
    el.id === 'el-scan-sub' || 
    el.name?.includes('توجيه للمسح') || 
    (el.type === 'subtitle' && !isWaveSubtitle && el.id !== 'el-wave-sub' && (el.y || 0) < 500);

  if (isScanSubtitle) {
    if (extraVars.customTextColor) {
      processed.color = extraVars.customTextColor;
    }
  }

  if (el.id === 'el-instructions' || el.name?.includes('تعليمات الكاميرا')) {
    if (extraVars.customTextColor) {
      processed.color = '#64748b';
    }
  }

  // 9. Merchant Logo Frame Unconstraining (إلغاء التقييد بالإطار المربع ذو الزوايا المستديرة)
  const isLogo = el.type === 'logo' || el.id === 'el-logo';
  const hasCustomLogo = Boolean(extraVars.customPosterLogo);
  const shouldUnconstrainLogo = extraVars.removeLogoSquareFrame ?? hasCustomLogo;

  if (isLogo && shouldUnconstrainLogo) {
    processed.borderWidth = 0;
    processed.borderStyle = 'none';
    processed.borderColor = 'transparent';
    processed.borderRadius = 0;
    processed.boxShadow = 'none';
    processed.backgroundColor = 'transparent';
    processed.clipShape = 'none';
    processed.objectFit = 'contain';
  }

  // 10. Food Photo Circular & Square Border Unconstraining (رفع الصورة كما هي بدون حدود مربعة أو دائرية وبدون سمك أبيض)
  const isFoodPhoto = el.type === 'food_photo' || el.id === 'el-food-photo' || el.id === 'el-ff-food-img';
  const hasCustomDish = Boolean(extraVars.customPosterFoodPhoto);
  const shouldUnconstrainDish = extraVars.removeDishCircleFrame ?? hasCustomDish;

  if (isFoodPhoto && shouldUnconstrainDish) {
    processed.borderWidth = 0;
    processed.borderStyle = 'none';
    processed.borderColor = 'transparent';
    processed.borderRadius = 0;
    processed.boxShadow = 'none';
    processed.backgroundColor = 'transparent';
    processed.clipShape = 'none';
    processed.objectFit = 'contain';
  }

  return processed;
}

export function resolveVariableText(
  templateText: string | undefined, 
  business: Business | null, 
  fallbackText: string = '',
  extraVars?: PosterExtraVars
): string {
  if (!templateText) return fallbackText;
  
  let resolved = templateText;
  const bizName = business?.name || 'مطعم ومقهى السرايا';
  const category = business?.subCategory || business?.category || 'مأكولات ومشروبات';
  const phone = business?.phone || business?.ownerPhone || '0791234567';
  const address = business?.address || business?.district || 'إربد - دوار القبة';
  const workingHours = business?.workingHours?.isOpen24Hours
    ? 'مفتوح 24 ساعة'
    : (business?.workingHours?.openTime && business?.workingHours?.closeTime
        ? `${business.workingHours.openTime} - ${business.workingHours.closeTime}`
        : '10:00 ص - 12:00 منتصف الليل');
  const menuUrl = business?.id 
    ? `${window.location.origin}/business/${business.id}/menu-offers` 
    : 'https://shofibirbid.site/business/demo';
  let tableNumberText = '';
  if (extraVars?.tableBadgeMode === 'welcome') {
    tableNumberText = extraVars.overrideTableBadgeText || '🍽️ نتشرف بخدمتكم • أهلاً وسهلاً بكم';
  } else if (extraVars?.tableBadgeMode === 'table') {
    if (extraVars.tableNumber && extraVars.tableNumber.trim()) {
      const trimmed = extraVars.tableNumber.trim();
      tableNumberText = trimmed.startsWith('طاولة') ? trimmed : `طاولة رقم ${trimmed}`;
    } else {
      tableNumberText = extraVars.overrideTableBadgeText || '';
    }
  } else if (extraVars?.overrideTableBadgeText) {
    tableNumberText = extraVars.overrideTableBadgeText;
  } else if (extraVars?.tableNumber && extraVars.tableNumber.trim()) {
    const trimmed = extraVars.tableNumber.trim();
    tableNumberText = trimmed.startsWith('طاولة') ? trimmed : `طاولة رقم ${trimmed}`;
  }

  resolved = resolved.replace(/\{\{business_name\}\}/g, bizName);
  resolved = resolved.replace(/\{\{category\}\}/g, category);
  resolved = resolved.replace(/\{\{phone\}\}/g, phone);
  resolved = resolved.replace(/\{\{address\}\}/g, address);
  resolved = resolved.replace(/\{\{working_hours\}\}/g, workingHours);
  resolved = resolved.replace(/\{\{menu_url\}\}/g, menuUrl);
  resolved = resolved.replace(/\{\{table_number\}\}/g, tableNumberText);

  return resolved;
}

export function getElementImageSrc(
  element: PosterElement, 
  business: Business | null, 
  extraCoverImage?: string,
  extraVars?: PosterExtraVars
): string {
  if (element.type === 'logo') {
    if (extraVars?.customPosterLogo) return extraVars.customPosterLogo;
    // شعار المحل: يكون دائماً وافتراضياً هو الصورة الشخصية للمحل (شعار / صورة شخصية)
    const profileImg = business?.logoUrl || business?.imageUrl || (business as any)?.image;
    return profileImg || element.src || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80';
  }
  if (element.type === 'food_photo') {
    if (extraVars?.customPosterFoodPhoto) return extraVars.customPosterFoodPhoto;
    // صورة الوجبة الترويجية: تكون هي صورة غلاف المحل بشكل دائم وافتراضي
    const shopCover = business?.coverImage || (business as any)?.cover || business?.imageUrl || (business as any)?.image || business?.menuQrCoverImage;
    
    // إذا كان هناك غلاف مخصص تم اختياره صراحة وليس مجرد نموذج خارجي افتراضي قديم
    if (extraCoverImage && !extraCoverImage.includes('photo-1555396273-367ea4eb4db5') && !extraCoverImage.includes('photo-1517248135467-4c7edcad34c4')) {
      return extraCoverImage;
    }

    return shopCover || extraCoverImage || element.src || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80';
  }
  return element.src || '';
}

/**
 * Reads an image File from user's device and compresses it into a high-quality DataURL
 * suitable for session caching (sessionStorage / memory) without bloating memory.
 */
export function readAndCompressImageFile(file: File, maxDimension = 1200, quality = 0.88): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('الملف المرفوع ليس صورة صالحة'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('فشل قراءة ملف الصورة'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('فشل تحميل الصورة'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Preserve PNG transparency if png, else jpeg
        const isPng = file.type === 'image/png' || file.type === 'image/webp';
        const mimeType = isPng ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function getQrCodeImageUrl(element: PosterElement, business: Business | null, customQrColor?: string, customQrBgColor?: string, customQrTargetUrl?: string): string {
  const targetUrl = customQrTargetUrl || (business?.id 
    ? `${window.location.origin}/business/${business.id}/menu-offers` 
    : 'https://shofibirbid.site');
  
  const chosenColor = customQrColor || element.qrColor || '#1a4d2e';
  const chosenBg = customQrBgColor || element.qrBgColor || '#ffffff';

  const colorHex = chosenColor.replace('#', '');
  const bgHex = chosenBg.replace('#', '');
  
  return `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(targetUrl)}&color=${colorHex}&bgcolor=${bgHex}&margin=1&format=svg`;
}

export async function exportPosterAsPng(elementId: string, filename: string = 'poster.png') {
  const node = document.getElementById(elementId);
  if (!node) return;
  
  try {
    const canvas = await html2canvas(node, {
      scale: 3, // Ultra 300DPI crisp export
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      logging: false
    });
    
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename;
    link.href = image;
    link.click();
  } catch (err) {
    console.error('Error exporting PNG:', err);
    alert('حدث خطأ أثناء تصدير الصورة، يرجى المحاولة مرة أخرى.');
  }
}

/**
 * Detects text direction based on the first strong letter or element type.
 * Rule:
 * - If element is english_text -> 'ltr'
 * - If text starts with English/Latin letter -> 'ltr'
 * - If text starts with Arabic or contains Arabic -> 'rtl'
 * - Defaults to 'rtl'
 */
export function detectTextDirection(text?: string, element?: PosterElement): 'rtl' | 'ltr' {
  if (element?.type === 'english_text') return 'ltr';
  if (!text || typeof text !== 'string') return 'rtl';

  // Strip leading whitespaces, punctuation, numbers, and emojis to find the first letter
  const cleaned = text.trim().replace(/^[\s\d\p{P}\p{S}]+/u, '');
  if (!cleaned) {
    if (/[a-zA-Z]/.test(text)) {
      return 'ltr';
    }
    return 'rtl';
  }

  const firstChar = cleaned.charAt(0);
  // Arabic Unicode blocks
  if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(firstChar)) {
    return 'rtl';
  }
  // Latin / English characters
  if (/[a-zA-Z]/.test(firstChar)) {
    return 'ltr';
  }

  // Fallback: check if the string has any Arabic
  if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(cleaned)) {
    return 'rtl';
  }

  return 'rtl';
}

/**
 * Calculates correct CSS textAlign and flex justifyContent based on alignment and direction.
 */
export function getElementTextAlignment(
  rawTextAlign: string | undefined, 
  dir: 'rtl' | 'ltr'
): { textAlign: 'right' | 'left' | 'center'; justifyContent: string } {
  let textAlign: 'right' | 'left' | 'center' = 'right';
  if (rawTextAlign === 'center') {
    textAlign = 'center';
  } else if (rawTextAlign === 'left') {
    textAlign = 'left';
  } else if (rawTextAlign === 'right') {
    textAlign = 'right';
  } else {
    textAlign = dir === 'rtl' ? 'right' : 'left';
  }

  let justifyContent = 'center';
  if (textAlign === 'center') {
    justifyContent = 'center';
  } else if (textAlign === 'right') {
    justifyContent = dir === 'rtl' ? 'flex-start' : 'flex-end';
  } else if (textAlign === 'left') {
    justifyContent = dir === 'rtl' ? 'flex-end' : 'flex-start';
  }

  return { textAlign, justifyContent };
}

export function printPosterTemplate(template: PosterTemplate, business: Business | null, extraVars?: PosterExtraVars) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
    return;
  }

  const { canvasWidth, canvasHeight, backgroundColor, elements } = template;

  const sortedElements = [...elements]
    .filter(el => !el.hidden)
    .filter(el => {
      if (extraVars?.includeEnglish === false && (el.type === 'english_text' || el.id === 'el-english-slogan')) {
        return false;
      }
      if (extraVars?.includeContact === false && (el.type === 'working_hours' || el.id === 'el-hours-badge' || el.type === 'contact_bar' || el.id === 'el-contact-bar')) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.zIndex - b.zIndex);

  const elementsHtml = sortedElements.map(rawEl => {
    const el = getProcessedElement(rawEl, extraVars);

    let resolvedText = resolveVariableText(el.text, business, '', extraVars);

    // Overrides for titles and sections:
    if (el.id === 'el-scan-title' || (el.type === 'hero_title' && (el.y || 0) < 500)) {
      if (extraVars?.overrideTitle) resolvedText = extraVars.overrideTitle;
    } else if (el.id === 'el-wave-title' || (el.type === 'hero_title' && (el.y || 0) >= 500)) {
      if (extraVars?.overrideWaveTitle) resolvedText = extraVars.overrideWaveTitle;
    }

    if (el.id === 'el-scan-sub' || (el.type === 'subtitle' && (el.y || 0) < 500)) {
      if (extraVars?.overrideSubtitle) resolvedText = extraVars.overrideSubtitle;
    } else if (el.id === 'el-wave-sub' || (el.type === 'subtitle' && (el.y || 0) >= 500)) {
      if (extraVars?.overrideWaveSubtitle) resolvedText = extraVars.overrideWaveSubtitle;
    }

    if (el.type === 'english_text' || el.id === 'el-english-slogan') {
      if (extraVars?.overrideEnglishText) resolvedText = extraVars.overrideEnglishText;
    }

    if (el.id === 'el-digital-badge' || el.type === 'shape_badge') {
      if (extraVars?.overrideDigitalBadge) resolvedText = extraVars.overrideDigitalBadge;
    }

    if (el.id === 'el-instructions' || el.name?.includes('تعليمات الكاميرا')) {
      if (extraVars?.overrideInstructions) resolvedText = extraVars.overrideInstructions;
    }

    if (el.id === 'el-category-badge') {
      if (extraVars?.overrideCategoryBadge) resolvedText = extraVars.overrideCategoryBadge;
    }

    if (el.type === 'table_number' || el.id === 'el-table-badge') {
      if (extraVars?.tableBadgeMode === 'welcome') {
        resolvedText = extraVars.overrideTableBadgeText || el.text || '🍽️ نتشرف بخدمتكم • أهلاً وسهلاً بكم';
      } else if (extraVars?.tableBadgeMode === 'table') {
        if (extraVars.tableNumber && extraVars.tableNumber.trim()) {
          const trimmed = extraVars.tableNumber.trim();
          resolvedText = trimmed.startsWith('طاولة') ? trimmed : `طاولة رقم ${trimmed}`;
        } else {
          resolvedText = extraVars.overrideTableBadgeText || '';
        }
      } else if (extraVars?.overrideTableBadgeText) {
        resolvedText = extraVars.overrideTableBadgeText;
      } else if (extraVars?.tableNumber && extraVars.tableNumber.trim()) {
        const trimmed = extraVars.tableNumber.trim();
        resolvedText = trimmed.startsWith('طاولة') ? trimmed : `طاولة رقم ${trimmed}`;
      }
    }

    const resolvedSrc = getElementImageSrc(el, business, extraVars?.coverImage, extraVars);
    const qrSrc = el.type === 'qr_code' ? getQrCodeImageUrl(el, business, extraVars?.customQrColor, extraVars?.customQrBgColor, extraVars?.customQrTargetUrl) : '';

    const itemDir = detectTextDirection(resolvedText, el);
    const { textAlign, justifyContent } = getElementTextAlignment(el.textAlign, itemDir);

    let contentHtml = '';
    if (el.type === 'qr_code') {
      contentHtml = `
        <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative;">
          <img src="${qrSrc}" alt="QR" style="width: 100%; height: 100%; object-fit: contain; border-radius: 0px !important;" />
        </div>
      `;
    } else if (el.type === 'logo' || el.type === 'food_photo' || el.type === 'custom_image') {
      const isDishUnconstrained = (el.type === 'food_photo' || el.id === 'el-food-photo' || el.id === 'el-ff-food-img') && (extraVars?.removeDishCircleFrame ?? Boolean(extraVars?.customPosterFoodPhoto));
      const isLogoUnconstrained = (el.type === 'logo' || el.id === 'el-logo') && (extraVars?.removeLogoSquareFrame ?? Boolean(extraVars?.customPosterLogo));

      let imgFit = el.objectFit || 'cover';
      let imgRadius = getElementBorderRadiusCSS(el);

      if (isLogoUnconstrained || isDishUnconstrained) {
        imgFit = 'contain';
        imgRadius = '0';
      }

      const logoFilterCSS = getLogoFilterCSS(el.logoFilter);
      contentHtml = `
        <img 
          src="${resolvedSrc}" 
          alt="${el.name}" 
          style="
            width: 100%; 
            height: 100%; 
            object-fit: ${imgFit}; 
            border-radius: ${imgRadius};
            filter: ${logoFilterCSS};
            border: none;
            box-shadow: none;
            background: transparent;
          " 
        />
      `;
    } else if (el.type === 'shape_wave') {
      contentHtml = `
        <svg viewBox="0 0 500 50" preserveAspectRatio="none" style="width: 100%; height: 100%; fill: ${el.svgFill || el.backgroundColor || '#1a4d2e'};">
          <path d="${el.svgPath || 'M0,0 C150,50 350,-20 500,20 L500,0 L0,0 Z'}"></path>
        </svg>
      `;
    } else if (el.type === 'shape_path' || el.svgPath) {
      contentHtml = `
        <svg viewBox="0 0 ${el.width} ${el.height}" style="width: 100%; height: 100%; overflow: visible;" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="${el.svgPath || ''}" 
            fill="${el.svgFill || el.backgroundColor || 'none'}" 
            stroke="${el.borderColor || el.color || 'none'}" 
            stroke-width="${el.borderWidth || 2}" 
            stroke-linecap="round" 
            stroke-linejoin="round" 
          />
        </svg>
      `;
    } else if (el.type === 'platform_branding' || el.id === 'el-footer-branding' || el.id.includes('footer-platform')) {
      const align = el.textAlign === 'center' ? 'center' : (el.textAlign === 'right' ? 'flex-end' : 'flex-start');
      const logoUrl = extraVars?.platformLogoUrl || '/logo.png';
      const domain = extraVars?.platformDomain || 'shofibirbid.site';
      const logoMaxH = Math.min((el.height || 80) * 0.55, 38);
      const logoFilterCSS = getLogoFilterCSS(el.logoFilter);
      contentHtml = `
        <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: ${align}; justify-content: center; gap: 4px; box-sizing: border-box;">
          <img 
            src="${logoUrl}" 
            alt="Logo" 
            style="max-height: ${logoMaxH}px; max-width: 180px; width: auto; height: auto; object-fit: contain; filter: ${logoFilterCSS};" 
          />
          <span 
            dir="ltr" 
            style="
              font-family: monospace, 'Cairo', sans-serif; 
              font-size: ${el.fontSize || 13}px; 
              font-weight: ${el.fontWeight || '800'}; 
              color: ${el.color || '#1a4d2e'}; 
              line-height: 1; 
              letter-spacing: 0.5px;
            "
          >
            ${domain}
          </span>
        </div>
      `;
    } else if (el.type.startsWith('shape_') && el.type !== 'shape_badge' && !resolvedText) {
      contentHtml = '';
    } else {
      contentHtml = `
        <div 
          dir="${itemDir}"
          style="
            width: 100%; 
            height: 100%; 
            display: flex; 
            align-items: center; 
            justify-content: ${justifyContent}; 
            text-align: ${textAlign}; 
            direction: ${itemDir}; 
            unicode-bidi: plaintext; 
            line-height: ${el.lineHeight || 1.3}; 
            word-break: break-word;
            font-family: ${el.fontFamily || 'Cairo, sans-serif'};
          "
        >
          ${resolvedText}
        </div>
      `;
    }

    const bgStyle = el.backgroundGradient 
      ? `background: linear-gradient(${el.backgroundGradient.direction || 'to bottom'}, ${el.backgroundGradient.from}, ${el.backgroundGradient.to});`
      : (el.backgroundColor && el.type !== 'shape_wave' ? `background-color: ${el.backgroundColor};` : '');

    const borderStyle = el.borderWidth 
      ? `border: ${el.borderWidth}px ${el.borderStyle || 'solid'} ${el.borderColor || '#000000'};` 
      : '';

    const radiusStyle = `border-radius: ${getElementBorderRadiusCSS(el)};`;
    const shadowStyle = el.boxShadow ? `box-shadow: ${el.boxShadow};` : '';
    const fontStyle = `
      font-size: ${el.fontSize || 16}px;
      font-weight: ${el.fontWeight || 'normal'};
      font-family: ${el.fontFamily || 'Cairo, sans-serif'};
      color: ${el.color || '#000000'};
      text-align: ${textAlign};
      direction: ${itemDir};
      unicode-bidi: plaintext;
      letter-spacing: ${el.letterSpacing || 0}px;
    `;

    const isFoodPhoto = el.type === 'food_photo' || el.id === 'el-food-photo' || el.id === 'el-ff-food-img';
    const isLogo = el.type === 'logo' || el.id === 'el-logo';

    let extraTransform = '';
    let transformOriginStyle = '';

    if (isFoodPhoto) {
      const scale = extraVars?.dishScale ?? 1;
      const dx = extraVars?.dishOffsetX ?? 0;
      const dy = extraVars?.dishOffsetY ?? 0;
      if (scale !== 1 || dx !== 0 || dy !== 0) {
        extraTransform = ` translate(${dx}px, ${dy}px) scale(${scale})`;
        transformOriginStyle = 'transform-origin: center center;';
      }
    } else if (isLogo) {
      const scale = extraVars?.logoScale ?? 1;
      const dx = extraVars?.logoOffsetX ?? 0;
      const dy = extraVars?.logoOffsetY ?? 0;
      if (scale !== 1 || dx !== 0 || dy !== 0) {
        extraTransform = ` translate(${dx}px, ${dy}px) scale(${scale})`;
        transformOriginStyle = 'transform-origin: center center;';
      }
    }

    const isLogoUnconstrained = isLogo && (extraVars?.removeLogoSquareFrame ?? Boolean(extraVars?.customPosterLogo));
    const isDishUnconstrained = isFoodPhoto && (extraVars?.removeDishCircleFrame ?? Boolean(extraVars?.customPosterFoodPhoto));
    const overflowVal = (isLogoUnconstrained || isDishUnconstrained) ? 'visible' : 'hidden';

    return `
      <div 
        id="${el.id}"
        dir="${itemDir}"
        style="
          position: absolute;
          left: ${el.x}px;
          top: ${el.y}px;
          width: ${el.width}px;
          height: ${el.height}px;
          z-index: ${el.zIndex};
          opacity: ${el.opacity ?? 1};
          transform: rotate(${el.rotation || 0}deg)${extraTransform};
          ${transformOriginStyle}
          padding: ${el.padding || 0}px;
          box-sizing: border-box;
          overflow: ${overflowVal};
          direction: ${itemDir};
          unicode-bidi: plaintext;
          ${bgStyle}
          ${borderStyle}
          ${radiusStyle}
          ${shadowStyle}
          ${fontStyle}
        "
      >
        ${contentHtml}
      </div>
    `;
  }).join('\n');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>طباعة بوستر الـ QR - ${business?.name || template.title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&family=Almarai:wght@300;400;700;800&family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Cairo:wght@400;600;700;800;900&family=Changa:wght@400;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            background-color: #f1f5f9;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            font-family: 'Cairo', sans-serif;
            direction: rtl;
          }
          .poster-canvas {
            width: ${canvasWidth}px;
            height: ${canvasHeight}px;
            background-color: ${backgroundColor};
            position: relative;
            overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            direction: rtl;
          }
          @media print {
            body {
              background: transparent;
              padding: 0;
            }
            .poster-canvas {
              width: 100vw !important;
              height: 100vh !important;
              box-shadow: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="poster-canvas" dir="rtl">
          ${elementsHtml}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 600);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function printBulkPosterTemplates(template: PosterTemplate, business: Business | null, tableNumbers: string[], extraVars?: PosterExtraVars) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
    return;
  }

  const { canvasWidth, canvasHeight, backgroundColor, elements } = template;

  const sortedElements = [...elements]
    .filter(el => !el.hidden)
    .filter(el => {
      if (extraVars?.includeEnglish === false && (el.type === 'english_text' || el.id === 'el-english-slogan')) {
        return false;
      }
      if (extraVars?.includeContact === false && (el.type === 'working_hours' || el.id === 'el-hours-badge' || el.type === 'contact_bar' || el.id === 'el-contact-bar')) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.zIndex - b.zIndex);

  const postersHtml = tableNumbers.map((tableNum) => {
    const tableVars = { ...extraVars, tableNumber: tableNum, tableBadgeMode: 'table' as const };
    const elementsHtml = sortedElements.map(rawEl => {
      const el = getProcessedElement(rawEl, tableVars);
      let resolvedText = resolveVariableText(el.text, business, '', tableVars);

      if (el.id === 'el-scan-title' || (el.type === 'hero_title' && (el.y || 0) < 500)) {
        if (tableVars?.overrideTitle) resolvedText = tableVars.overrideTitle;
      } else if (el.id === 'el-wave-title' || (el.type === 'hero_title' && (el.y || 0) >= 500)) {
        if (tableVars?.overrideWaveTitle) resolvedText = tableVars.overrideWaveTitle;
      }

      if (el.id === 'el-scan-sub' || (el.type === 'subtitle' && (el.y || 0) < 500)) {
        if (tableVars?.overrideSubtitle) resolvedText = tableVars.overrideSubtitle;
      } else if (el.id === 'el-wave-sub' || (el.type === 'subtitle' && (el.y || 0) >= 500)) {
        if (tableVars?.overrideWaveSubtitle) resolvedText = tableVars.overrideWaveSubtitle;
      }

      if (el.type === 'english_text' || el.id === 'el-english-slogan') {
        if (tableVars?.overrideEnglishText) resolvedText = tableVars.overrideEnglishText;
      }

      if (el.id === 'el-digital-badge' || el.type === 'shape_badge') {
        if (tableVars?.overrideDigitalBadge) resolvedText = tableVars.overrideDigitalBadge;
      }

      if (el.id === 'el-instructions' || el.name?.includes('تعليمات الكاميرا')) {
        if (tableVars?.overrideInstructions) resolvedText = tableVars.overrideInstructions;
      }

      if (el.id === 'el-category-badge') {
        if (tableVars?.overrideCategoryBadge) resolvedText = tableVars.overrideCategoryBadge;
      }

      if (el.type === 'table_number' || el.id === 'el-table-badge') {
        const trimmed = tableNum.trim();
        resolvedText = trimmed.startsWith('طاولة') ? trimmed : `طاولة رقم ${trimmed}`;
      }

      const resolvedSrc = getElementImageSrc(el, business, tableVars?.coverImage, tableVars);
      const tableUrl = `${window.location.origin}/business/${business?.id}/menu-offers?table=${encodeURIComponent(tableNum.trim())}`;
      const qrSrc = el.type === 'qr_code' ? getQrCodeImageUrl(el, business, tableVars?.customQrColor, tableVars?.customQrBgColor, tableUrl) : '';

      const itemDir = detectTextDirection(resolvedText, el);
      const { textAlign, justifyContent } = getElementTextAlignment(el.textAlign, itemDir);

      let contentHtml = '';
      if (el.type === 'qr_code') {
        contentHtml = `
          <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative;">
            <img src="${qrSrc}" alt="QR" style="width: 100%; height: 100%; object-fit: contain; border-radius: 0px !important;" />
          </div>
        `;
      } else if (el.type === 'logo' || el.type === 'food_photo' || el.type === 'custom_image') {
        const isDishUnconstrained = (el.type === 'food_photo' || el.id === 'el-food-photo' || el.id === 'el-ff-food-img') && (tableVars?.removeDishCircleFrame ?? Boolean(tableVars?.customPosterFoodPhoto));
        const isLogoUnconstrained = (el.type === 'logo' || el.id === 'el-logo') && (tableVars?.removeLogoSquareFrame ?? Boolean(tableVars?.customPosterLogo));

        let imgFit = el.objectFit || 'cover';
        let imgRadius = getElementBorderRadiusCSS(el);

        if (isLogoUnconstrained || isDishUnconstrained) {
          imgFit = 'contain';
          imgRadius = '0';
        }

        const logoFilterCSS = getLogoFilterCSS(el.logoFilter);
        contentHtml = `
          <img 
            src="${resolvedSrc}" 
            alt="${el.name}" 
            style="
              width: 100%; 
              height: 100%; 
              object-fit: ${imgFit}; 
              border-radius: ${imgRadius};
              filter: ${logoFilterCSS};
              border: none;
              box-shadow: none;
              background: transparent;
            " 
          />
        `;
      } else if (el.type === 'shape_wave') {
        contentHtml = el.text || '';
      } else {
        contentHtml = resolvedText;
      }

      const bgStyle = el.backgroundColor ? `background-color: ${el.backgroundColor};` : '';
      const borderStyle = el.borderWidth ? `border: ${el.borderWidth}px ${el.borderStyle || 'solid'} ${el.borderColor || '#000000'};` : '';
      const radiusStyle = `border-radius: ${getElementBorderRadiusCSS(el)};`;
      const shadowStyle = el.boxShadow ? `box-shadow: ${el.boxShadow};` : '';
      const fontStyle = `
        font-size: ${el.fontSize || 16}px;
        font-weight: ${el.fontWeight || 'normal'};
        font-family: ${el.fontFamily || 'Cairo, sans-serif'};
        color: ${el.color || '#000000'};
        text-align: ${textAlign};
        direction: ${itemDir};
        unicode-bidi: plaintext;
        letter-spacing: ${el.letterSpacing || 0}px;
      `;

      const isFoodPhoto = el.type === 'food_photo' || el.id === 'el-food-photo' || el.id === 'el-ff-food-img';
      const isLogo = el.type === 'logo' || el.id === 'el-logo';

      let extraTransform = '';
      let transformOriginStyle = '';

      if (isFoodPhoto) {
        const scale = tableVars?.dishScale ?? 1;
        const dx = tableVars?.dishOffsetX ?? 0;
        const dy = tableVars?.dishOffsetY ?? 0;
        if (scale !== 1 || dx !== 0 || dy !== 0) {
          extraTransform = ` translate(${dx}px, ${dy}px) scale(${scale})`;
          transformOriginStyle = 'transform-origin: center center;';
        }
      } else if (isLogo) {
        const scale = tableVars?.logoScale ?? 1;
        const dx = tableVars?.logoOffsetX ?? 0;
        const dy = tableVars?.logoOffsetY ?? 0;
        if (scale !== 1 || dx !== 0 || dy !== 0) {
          extraTransform = ` translate(${dx}px, ${dy}px) scale(${scale})`;
          transformOriginStyle = 'transform-origin: center center;';
        }
      }

      const isLogoUnconstrained = isLogo && (tableVars?.removeLogoSquareFrame ?? Boolean(tableVars?.customPosterLogo));
      const isDishUnconstrained = isFoodPhoto && (tableVars?.removeDishCircleFrame ?? Boolean(tableVars?.customPosterFoodPhoto));
      const overflowVal = (isLogoUnconstrained || isDishUnconstrained) ? 'visible' : 'hidden';

      return `
        <div 
          id="${el.id}"
          dir="${itemDir}"
          style="
            position: absolute;
            left: ${el.x}px;
            top: ${el.y}px;
            width: ${el.width}px;
            height: ${el.height}px;
            z-index: ${el.zIndex};
            opacity: ${el.opacity ?? 1};
            transform: rotate(${el.rotation || 0}deg)${extraTransform};
            ${transformOriginStyle}
            padding: ${el.padding || 0}px;
            box-sizing: border-box;
            overflow: ${overflowVal};
            direction: ${itemDir};
            unicode-bidi: plaintext;
            ${bgStyle}
            ${borderStyle}
            ${radiusStyle}
            ${shadowStyle}
            ${fontStyle}
          "
        >
          ${contentHtml}
        </div>
      `;
    }).join('\n');

    return `
      <div class="poster-container-page">
        <div class="poster-canvas" dir="rtl">
          ${elementsHtml}
        </div>
      </div>
    `;
  }).join('\n');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>طباعة بوسترات الـ QR المتعددة - ${business?.name || template.title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800;900&family=Almarai:wght@300;400;700;800&family=Amiri:ital,wght@0,400;0,700;1,400;1,700&family=Cairo:wght@400;600;700;800;900&family=Changa:wght@400;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            background-color: #f1f5f9;
            direction: rtl;
          }
          .poster-container-page {
            width: 100vw;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            page-break-after: always;
            box-sizing: border-box;
          }
          .poster-canvas {
            width: ${canvasWidth}px;
            height: ${canvasHeight}px;
            background-color: ${backgroundColor};
            position: relative;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
            direction: rtl;
          }
          @media print {
            body {
              background: transparent;
            }
            .poster-container-page {
              width: 100vw !important;
              height: 100vh !important;
              page-break-after: always !important;
              break-after: page !important;
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
            }
            .poster-canvas {
              width: 100vw !important;
              height: 100vh !important;
              box-shadow: none !important;
            }
          }
        </style>
      </head>
      <body>
        ${postersHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 800);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
