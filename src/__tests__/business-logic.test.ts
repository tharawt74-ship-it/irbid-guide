import { describe, it, expect } from 'vitest';
import { stripUrlsAndLinks, sanitizeInput } from '../lib/security';
import { getBusinessVipStatus } from '../lib/vipHelper';
import { Business } from '../types';
import { getSubcategoryCatalogTabInfo, getCategoryOfferConfig, getCategoryFallbackImage } from '../lib/categoryOfferConfig';
import { BUSINESS_CATEGORIES, resolveBusinessCategory } from '../lib/categories';
import { isMedicalBusiness } from '../lib/medicalHelper';
import { getCategoryTheme } from '../lib/digitalMenuThemes';
import { getDynamicCatalogLabels } from '../components/vip/DigitalMenuManagerModal';
import { targetMatchesPage } from '../lib/pageBanners';

describe('Business Logic & Security Tests', () => {
  describe('Security & XSS Sanitization', () => {
    it('should strip malicious script tags and URLs from user input', () => {
      const malicious = '<script>alert("xss")</script>مطعم رائع https://malicious-site.com';
      const cleaned = stripUrlsAndLinks(sanitizeInput(malicious));
      expect(cleaned).not.toContain('<script>');
      expect(cleaned).not.toContain('https://');
      expect(cleaned).toContain('مطعم رائع');
    });

    it('should trim and sanitize empty or whitespace inputs gracefully', () => {
      expect(sanitizeInput('   ')).toBe('');
      expect(stripUrlsAndLinks('')).toBe('');
    });
  });

  describe('VIP Status & Expiration Calculations', () => {
    it('should return VIP active when within valid date range', () => {
      const mockBusiness: Partial<Business> = {
        id: 'biz-1',
        packagePlan: 'golden',
        vipSubscriptionStartsAt: Date.now() - 24 * 60 * 60 * 1000,
        vipSubscriptionExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
      };

      const status = getBusinessVipStatus(mockBusiness as Business);
      expect(status.isVip).toBe(true);
      expect(status.packagePlan).toBe('golden');
    });

    it('should return basic plan when store is on basic plan', () => {
      const mockBusiness: Partial<Business> = {
        id: 'biz-2',
        packagePlan: 'basic'
      };

      const status = getBusinessVipStatus(mockBusiness as Business);
      expect(status.isVip).toBe(false);
      expect(status.packagePlan).toBe('basic');
    });

    it('should detect expired VIP subscriptions gracefully', () => {
      const mockBusiness: Partial<Business> = {
        id: 'biz-3',
        packagePlan: 'vip',
        vipSubscriptionStartsAt: Date.now() - 60 * 24 * 60 * 60 * 1000,
        vipSubscriptionExpiresAt: Date.now() - 1000
      };

      const status = getBusinessVipStatus(mockBusiness as Business);
      expect(status.isVip).toBe(false);
    });
  });

  describe('Rating Aggregation & Math Precision', () => {
    it('should correctly calculate new weighted average rating', () => {
      const currentCount = 4;
      const currentSum = 18; // Ratings: 5, 4, 5, 4 (avg = 4.5)
      const newRating = 5;

      const newReviewCount = currentCount + 1;
      const newRatingSum = currentSum + newRating;
      const newAverageRating = Number((newRatingSum / newReviewCount).toFixed(1));

      expect(newReviewCount).toBe(5);
      expect(newRatingSum).toBe(23);
      expect(newAverageRating).toBe(4.6);
    });

    it('should clamp ratings between 1 and 5', () => {
      const clampRating = (val: number) => Math.min(5, Math.max(1, Number(val) || 5));
      expect(clampRating(10)).toBe(5);
      expect(clampRating(-2)).toBe(1);
      expect(clampRating(4.2)).toBe(4.2);
    });
  });

  describe('Cart Calculations & Discounts', () => {
    it('should calculate cart total price accurately with discounts', () => {
      const items = [
        { id: '1', name: 'وجبة شاورما عائلي', price: 10.5, quantity: 2 },
        { id: '2', name: 'عصير برتقال طبيعي', price: 2.0, quantity: 3 }
      ];

      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      expect(subtotal).toBe(27.0);

      const discountPercent = 15; // 15% discount
      const discountAmount = (subtotal * discountPercent) / 100;
      const total = Number((subtotal - discountAmount).toFixed(2));

      expect(discountAmount).toBe(4.05);
      expect(total).toBe(22.95);
    });
  });

  describe('Coupon Code Formatting & Validation', () => {
    it('should normalize and format reward codes uniformly', () => {
      const rawCode = '  irbid-vip-2026  ';
      const normalized = rawCode.trim().toUpperCase();
      expect(normalized).toBe('IRBID-VIP-2026');
      expect(normalized.length).toBeLessThanOrEqual(64);
    });
  });

  describe('Firestore Payload Sanitization', () => {
    it('should strip undefined properties from documents to prevent Firestore errors', () => {
      const rawPayload: Record<string, any> = {
        title: 'شاورما على الفحم',
        description: undefined,
        price: 3.5,
        location: null
      };

      const cleanPayload: Record<string, any> = {};
      Object.keys(rawPayload).forEach(key => {
        if (rawPayload[key] !== undefined) {
          cleanPayload[key] = rawPayload[key];
        }
      });

      expect(cleanPayload).not.toHaveProperty('description');
      expect(cleanPayload).toHaveProperty('title', 'شاورما على الفحم');
      expect(cleanPayload).toHaveProperty('price', 3.5);
      expect(cleanPayload).toHaveProperty('location', null);
    });
  });

  describe('Batched Query Chunking Logic', () => {
    it('should correctly partition array of codes into chunks <= 30 for Firestore "in" queries', () => {
      const codes = Array.from({ length: 75 }, (_, i) => `CODE_${i + 1}`);
      const CHUNK_SIZE = 30;
      const chunks: string[][] = [];

      for (let i = 0; i < codes.length; i += CHUNK_SIZE) {
        chunks.push(codes.slice(i, i + CHUNK_SIZE));
      }

      expect(chunks.length).toBe(3);
      expect(chunks[0].length).toBe(30);
      expect(chunks[1].length).toBe(30);
      expect(chunks[2].length).toBe(15);
    });
  });

  describe('Order State Machine & Transition Rules', () => {
    it('should allow valid transitions (pending -> completed, pending -> cancelled)', () => {
      const allowedTransitions: Record<string, string[]> = {
        pending: ['preparing', 'completed', 'cancelled'],
        preparing: ['completed', 'cancelled'],
        completed: [],
        cancelled: []
      };

      const canTransition = (from: string, to: string) => allowedTransitions[from]?.includes(to) ?? false;

      expect(canTransition('pending', 'cancelled')).toBe(true);
      expect(canTransition('pending', 'completed')).toBe(true);
      expect(canTransition('completed', 'pending')).toBe(false);
      expect(canTransition('cancelled', 'preparing')).toBe(false);
    });
  });

  describe('Background Queue Payload & Security Assertions', () => {
    it('should validate broadcast notification queue payloads correctly', () => {
      const validPayload = {
        title: 'عرض خاص لجميع سكان إربد',
        body: 'استمتع بتخفيضات 20% لدى أفضل المطاعم',
        targetGroup: 'all',
        extraData: { link: '/offers' }
      };

      const isPayloadValid = (data: any) => {
        return (
          typeof data.title === 'string' && data.title.trim().length > 0 && data.title.length <= 150 &&
          typeof data.body === 'string' && data.body.trim().length > 0 && data.body.length <= 500 &&
          (!data.targetGroup || typeof data.targetGroup === 'string')
        );
      };

      expect(isPayloadValid(validPayload)).toBe(true);
      expect(isPayloadValid({ title: '', body: 'محتوى' })).toBe(false);
      expect(isPayloadValid({ title: 'عنوان', body: '' })).toBe(false);
    });

    it('should validate audit log queue payload formats', () => {
      const auditPayload = {
        action: 'UPDATE_VIP_SUBSCRIPTION',
        performedBy: 'admin@shoofiirbid.com',
        details: 'ترقية محل الشاورما الذهبية للباقة المتميزة'
      };

      const isAuditValid = (data: any) => {
        return (
          typeof data.action === 'string' && data.action.trim().length > 0 &&
          typeof data.performedBy === 'string' &&
          typeof data.details === 'string'
        );
      };

      expect(isAuditValid(auditPayload)).toBe(true);
    });

    it('should disallow unauthenticated rating field tampering according to security rules', () => {
      const publicAllowedKeys = ['views', 'analytics', 'whatsappClicks', 'phoneClicks', 'directionsClicks'];
      const attemptedKeys = ['rating', 'reviewCount', 'ratingSum', 'views'];

      const isPublicAllowed = attemptedKeys.every(k => publicAllowedKeys.includes(k));
      expect(isPublicAllowed).toBe(false);

      const validInteractionKeys = ['views', 'whatsappClicks'];
      expect(validInteractionKeys.every(k => publicAllowedKeys.includes(k))).toBe(true);
    });

    it('should format file sizes correctly', () => {
      const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 بايت';
        const k = 1024;
        const sizes = ['بايت', 'كيلوبايت KB', 'ميغابايت MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
      };

      expect(formatFileSize(1024)).toContain('KB');
      expect(formatFileSize(1048576)).toContain('MB');
    });

    it('should validate dynamic collection admin checks without relying on static email lists', () => {
      const checkAdminDynamic = (user: { uid: string; isAdminClaim?: boolean }, adminUids: Set<string>, supervisorUids: Set<string>) => {
        if (!user || !user.uid) return false;
        if (adminUids.has(user.uid)) return true;
        if (supervisorUids.has(user.uid)) return true;
        if (user.isAdminClaim === true) return true;
        return false;
      };

      const adminSet = new Set(['admin-uid-1', 'admin-uid-2']);
      const supervisorSet = new Set(['supervisor-uid-1']);

      expect(checkAdminDynamic({ uid: 'admin-uid-1' }, adminSet, supervisorSet)).toBe(true);
      expect(checkAdminDynamic({ uid: 'supervisor-uid-1' }, adminSet, supervisorSet)).toBe(true);
      expect(checkAdminDynamic({ uid: 'custom-user', isAdminClaim: true }, adminSet, supervisorSet)).toBe(true);
      expect(checkAdminDynamic({ uid: 'regular-user' }, adminSet, supervisorSet)).toBe(false);
    });

    it('should strictly validate user emails for verification dispatch', () => {
      const isValidEmail = (email: unknown): boolean => {
        if (typeof email !== 'string') return false;
        const trimmed = email.trim();
        return trimmed.length <= 100 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
      };

      expect(isValidEmail('admin@shoofiirbid.com')).toBe(true);
      expect(isValidEmail('user.test+irbid@gmail.com')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('   ')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
    });
  });

  describe('Subcategory Tabs Accuracy & Consistency (عن المحل والمنتجات والخدمات)', () => {
    it('should assign accurate titles for private tutoring & foundation education', () => {
      const info = getSubcategoryCatalogTabInfo(
        'معلمات ومعلمون ودروس خصوصية',
        'تأسيس أطفال وقراءة وكتابة وحساب'
      );
      expect(info.aboutTabTitle).toBe('من نحن');
      expect(info.catalogTabTitle).toBe('برامج التأسيس والحصص التعليمية');

      const config = getCategoryOfferConfig(
        'معلمات ومعلمون ودروس خصوصية',
        'تأسيس أطفال وقراءة وكتابة وحساب'
      );
      expect(config.aboutTabTitle).toBe('من نحن');
      expect(config.catalogTabTitle).toBe('برامج التأسيس والحصص التعليمية');
    });

    it('should assign accurate titles for high school & university tutoring', () => {
      const math = getSubcategoryCatalogTabInfo('معلمات ومعلمون ودروس خصوصية', 'معلمو ومعلمات رياضيات وفيزياء');
      expect(math.aboutTabTitle).toBe('من نحن');
      expect(math.catalogTabTitle).toBe('حصص ودورات الرياضيات والفيزياء');

      const uni = getSubcategoryCatalogTabInfo('معلمات ومعلمون ودروس خصوصية', 'مدرسو ومدرسات تدريس جامعي ومواد طبية وهندسية');
      expect(uni.aboutTabTitle).toBe('من نحن');
      expect(uni.catalogTabTitle).toBe('المواد والمساقات الجامعية والتدريس');
    });

    it('should assign accurate titles for sweets and oriental grills', () => {
      const sweets = getSubcategoryCatalogTabInfo('مأكولات ومشروبات', 'حلويات شرقية وغربية');
      expect(sweets.aboutTabTitle).toBe('عن محل الحلويات');
      expect(sweets.catalogTabTitle).toBe('منيو الحلويات الشرقية والغربية');

      const sweetsConfig = getCategoryOfferConfig('مأكولات ومشروبات', 'حلويات شرقية وغربية');
      expect(sweetsConfig.catalogTabTitle).toBe('منيو الحلويات الشرقية والغربية');

      const grills = getSubcategoryCatalogTabInfo('مأكولات ومشروبات', 'مطاعم مشاوي ومأكولات شرقية');
      expect(grills.aboutTabTitle).toBe('عن المطعم');
      expect(grills.catalogTabTitle).toBe('منيو المشاوي والمأكولات الشرقية');
    });

    it('should assign accurate titles for flower & gift arrangement and never mistake events for spa', () => {
      const flowers = getSubcategoryCatalogTabInfo('مناسبات وأفراح', 'تنسيق ورود وهدايا ومناسبات');
      expect(flowers.catalogTabTitle).toBe('باقات الورد وتنسيق الهدايا والمناسبات');
      expect(flowers.catalogTabTitle).not.toContain('مساج');
      expect(flowers.catalogTabTitle).not.toContain('جلسات');
      expect(flowers.catalogTabTitle).not.toContain('السبا');

      const flowersConfig = getCategoryOfferConfig('مناسبات وأفراح', 'تنسيق ورود وهدايا ومناسبات');
      expect(flowersConfig.catalogTabTitle).toBe('باقات الورد وتنسيق الهدايا والمناسبات');

      const spa = getSubcategoryCatalogTabInfo('عناية شخصية وتجميل', 'مساج وسبا واستجمام');
      expect(spa.catalogTabTitle).toBe('جلسات المساج والسبا والاسترخاء');
    });

    it('should assign accurate titles for perfumes & cosmetics and never mistake them for beauty care center services', () => {
      const perfumes = getSubcategoryCatalogTabInfo('تسوق وتجزئة', 'عطور ومستحضرات تجميل');
      expect(perfumes.catalogTabTitle).toBe('كتالوج العطور ومستحضرات التجميل');
      expect(perfumes.aboutTabTitle).toBe('عن المتجر');
      expect(perfumes.catalogTabTitle).not.toContain('خدمات العناية');
      expect(perfumes.catalogTabTitle).not.toContain('باقات وخدمات');

      const perfumesConfig = getCategoryOfferConfig('تسوق وتجزئة', 'عطور ومستحضرات تجميل');
      expect(perfumesConfig.catalogTabTitle).toBe('كتالوج العطور ومستحضرات التجميل');

      const salon = getSubcategoryCatalogTabInfo('عناية شخصية وتجميل', 'تجميل وصالونات (سيدات)');
      expect(salon.catalogTabTitle).toBe('خدمات التجميل والعناية بالشعر والبشرة');
      expect(salon.aboutTabTitle).toBe('عن الصالون');
    });

    it('should assign accurate titles for mobile phones and accessories and never confuse them with wedding events or halls regardless of name or location', () => {
      const phones = getSubcategoryCatalogTabInfo('تسوق وتجزئة', 'هواتف محمولة وإكسسواراتها');
      expect(phones.catalogTabTitle).toBe('كتالوج الهواتف الذكية والإكسسوارات');
      expect(phones.aboutTabTitle).toBe('عن المحل');
      expect(phones.catalogTabTitle).not.toContain('باقات الحفلات والخدمات');
      expect(phones.catalogTabTitle).not.toContain('صالات');
      expect(phones.catalogTabTitle).not.toContain('أفراح');

      // Even when business name has "اتصالات" or location has "بجانب صالة فينيسيا"
      const storeConfig = getCategoryOfferConfig(
        'تسوق وتجزئة',
        'هواتف محمولة وإكسسواراتها',
        false,
        'برج حمّود للاتصالات 2'
      );
      expect(storeConfig.catalogTabTitle).toBe('كتالوج الهواتف الذكية والإكسسوارات');
      expect(storeConfig.aboutTabTitle).toBe('عن المحل');
      expect(storeConfig.catalogTabTitle).not.toContain('باقات الحفلات والخدمات');

      // Direct category name check
      const directCategory = getSubcategoryCatalogTabInfo('هواتف محمولة وإكسسواراتها', 'هواتف محمولة وإكسسواراتها');
      expect(directCategory.catalogTabTitle).toBe('كتالوج الهواتف الذكية والإكسسوارات');
    });

    it('should assign accurate titles for photography studios and never confuse them with housing furnished studios', () => {
      const photoStudio = getSubcategoryCatalogTabInfo('مناسبات وأفراح', 'استوديوهات تصوير');
      expect(photoStudio.catalogTabTitle).toBe('باقات التصوير الفوتوغرافي والفيديو');
      expect(photoStudio.aboutTabTitle).toBe('عن الاستوديو');
      expect(photoStudio.catalogTabTitle).not.toContain('الشقق المفروشة والاستوديوهات');
      expect(photoStudio.catalogTabTitle).not.toContain('شقق');
      expect(photoStudio.catalogTabTitle).not.toContain('سكن');

      const photoConfig = getCategoryOfferConfig('مناسبات وأفراح', 'استوديوهات تصوير');
      expect(photoConfig.catalogTabTitle).toBe('باقات التصوير الفوتوغرافي والفيديو');
      expect(photoConfig.aboutTabTitle).toBe('عن الاستوديو');
      expect(photoConfig.catalogTabTitle).not.toContain('الشقق المفروشة');

      // Direct category check
      const directPhoto = getSubcategoryCatalogTabInfo('استوديوهات تصوير', 'استوديوهات تصوير');
      expect(directPhoto.catalogTabTitle).toBe('باقات التصوير الفوتوغرافي والفيديو');
      expect(directPhoto.aboutTabTitle).toBe('عن الاستوديو');
    });

    it('should assign accurate titles for catering & banquet kitchens and never confuse them with carpentry kitchens', () => {
      const cateringKitchen = getSubcategoryCatalogTabInfo('مأكولات ومشروبات', 'مطابخ تواصي ومناسبات');
      expect(cateringKitchen.catalogTabTitle).toBe('قائمة التواصي والولائم والمناسف');
      expect(cateringKitchen.aboutTabTitle).toBe('عن المطبخ');
      expect(cateringKitchen.catalogTabTitle).not.toContain('أعمال النجارة وتفصيل المطابخ والأبواب');
      expect(cateringKitchen.catalogTabTitle).not.toContain('نجارة');
      expect(cateringKitchen.catalogTabTitle).not.toContain('منجرة');

      const cateringConfig = getCategoryOfferConfig('مأكولات ومشروبات', 'مطابخ تواصي ومناسبات');
      expect(cateringConfig.catalogTabTitle).toBe('قائمة التواصي والولائم والمناسف');
      expect(cateringConfig.aboutTabTitle).toBe('عن المطبخ');
      expect(cateringConfig.catalogTabTitle).not.toContain('نجارة');

      // Direct category check
      const directCatering = getSubcategoryCatalogTabInfo('مطابخ تواصي ومناسبات', 'مطابخ تواصي ومناسبات');
      expect(directCatering.catalogTabTitle).toBe('قائمة التواصي والولائم والمناسف');
      expect(directCatering.aboutTabTitle).toBe('عن المطبخ');

      // Carpentry kitchen check to ensure carpentry still works accurately
      const carpentryKitchen = getSubcategoryCatalogTabInfo('صناعة وحرف وإنشاءات', 'منجرة ومحلات نجارة ومطابخ');
      expect(carpentryKitchen.catalogTabTitle).toBe('أعمال النجارة وتفصيل المطابخ والأبواب');
      expect(carpentryKitchen.aboutTabTitle).toBe('عن المنجرة');
    });

    it('should never assign inaccurate "المحل / المطعم" or end with emoji for any category subcategory', () => {
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]$/u;

      for (const [mainCat, subCats] of Object.entries(BUSINESS_CATEGORIES)) {
        for (const subCat of subCats) {
          const info = getSubcategoryCatalogTabInfo(mainCat, subCat);
          expect(info.aboutTabTitle).not.toContain('المحل / المطعم');
          expect(info.aboutTabTitle).not.toContain('المحل/المطعم');
          expect(emojiRegex.test(info.aboutTabTitle)).toBe(false);
          expect(emojiRegex.test(info.catalogTabTitle)).toBe(false);
          expect(info.aboutTabTitle.trim().length).toBeGreaterThan(0);
          expect(info.catalogTabTitle.trim().length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Non-Medical Categories Segregation Tests', () => {
    it('should never classify natural cosmetics, 3D printing labs, or beauty salons as medical facilities', () => {
      const naturalCosmeticsBiz: Partial<Business> = {
        name: 'شمع وصابون طبيعي',
        category: 'شمع وصابون ومستحضرات تجميل طبيعية بيتية',
        description: 'منتجات عناية طبيعية منزلية'
      };

      const printing3dBiz: Partial<Business> = {
        name: 'مختبر الطباعة 3D',
        category: 'مختبرات وخدمات الطباعة ثلاثية الأبعاد (3D Printing) والنمذجة',
        description: 'خدمات طباعة ثلاثية الأبعاد ونمذجة هندسية'
      };

      const salonBiz: Partial<Business> = {
        name: 'صالون ليدي كوين',
        category: 'مراكز تجميل وصالونات (سيدات)',
        description: 'خدمات تجميل ومكياج وعناية للشعر'
      };

      expect(isMedicalBusiness(naturalCosmeticsBiz as Business)).toBe(false);
      expect(isMedicalBusiness(printing3dBiz as Business)).toBe(false);
      expect(isMedicalBusiness(salonBiz as Business)).toBe(false);

      const resolvedCosmetics = resolveBusinessCategory(naturalCosmeticsBiz as Business);
      expect(resolvedCosmetics.mainCategory).toBe('مشاريع منزلية وأونلاين');
      expect(resolvedCosmetics.subCategory).toBe('شمع وصابون ومستحضرات تجميل طبيعية بيتية');

      const resolved3D = resolveBusinessCategory(printing3dBiz as Business);
      expect(resolved3D.mainCategory).toBe('تقنية وبرمجيات وابتكار');
      expect(resolved3D.subCategory).toBe('مختبرات وخدمات الطباعة ثلاثية الأبعاد (3D Printing) والنمذجة');

      const resolvedSalon = resolveBusinessCategory(salonBiz as Business);
      expect(resolvedSalon.mainCategory).toBe('عناية شخصية وتجميل');
      expect(resolvedSalon.subCategory).toBe('مراكز تجميل وصالونات (سيدات)');
    });

    it('should never assign medical tab titles to teaching medical/engineering, medical factories, or cosmetics shops', () => {
      const tutorBiz: Partial<Business> = {
        name: 'مدرس مساقات طبية',
        category: 'مدرسو ومدرسات تدريس جامعي ومواد طبية وهندسية',
        description: 'تدريس مساقات ومادة علمية'
      };

      const factoryBiz: Partial<Business> = {
        name: 'مصنع الأدوية والمستلزمات الطبية',
        category: 'مصانع أدوية ومستلزمات طبية وتجميلية',
        description: 'إنتاج ومستلزمات طبية'
      };

      const cosmeticsBiz: Partial<Business> = {
        name: 'متجر عطور ومستحضرات تجميل',
        category: 'عطور ومستحضرات تجميل',
        description: 'عطور ومكياج ومستحضرات تجميل'
      };

      expect(isMedicalBusiness(tutorBiz as Business)).toBe(false);
      expect(isMedicalBusiness(factoryBiz as Business)).toBe(false);
      expect(isMedicalBusiness(cosmeticsBiz as Business)).toBe(false);

      const tutorTab = getSubcategoryCatalogTabInfo(tutorBiz.category, tutorBiz.category, false, tutorBiz.name);
      expect(tutorTab.catalogTabTitle).not.toContain('الكشوفات والخدمات الطبية');

      const factoryTab = getSubcategoryCatalogTabInfo(factoryBiz.category, factoryBiz.category, false, factoryBiz.name);
      expect(factoryTab.catalogTabTitle).not.toContain('الكشوفات والخدمات الطبية');

      const cosmeticsTab = getSubcategoryCatalogTabInfo(cosmeticsBiz.category, cosmeticsBiz.category, false, cosmeticsBiz.name);
      expect(cosmeticsTab.catalogTabTitle).not.toContain('الكشوفات والخدمات الطبية');

      // Theme assertions (digital menu / catalog presentation)
      const tutorTheme = getCategoryTheme(tutorBiz.category!, tutorBiz.category!, tutorBiz.name);
      expect(tutorTheme.title).not.toContain('الكشوفات والخدمات الطبية');
      expect(tutorTheme.title).toBe('دليل المساقات والمواد الجامعية والتدريس التخصصي');
      expect(tutorTheme.addItemLabel).not.toContain('الكشفية');
      expect(tutorTheme.addItemLabel).toContain('المساق');
      expect(tutorTheme.presetImages.some(img => img.name.includes('كشفية') || img.name.includes('سماعة طبية'))).toBe(false);

      const factoryTheme = getCategoryTheme(factoryBiz.category!, factoryBiz.category!, factoryBiz.name);
      expect(factoryTheme.title).not.toContain('الكشوفات والخدمات الطبية');
      expect(factoryTheme.title).toBe('دليل المنتجات الدوائية والمستلزمات الطبية والتجميلية المصنعة');
      expect(factoryTheme.addItemLabel).not.toContain('الكشفية');
      expect(factoryTheme.addItemLabel).toContain('المصنع');
      expect(factoryTheme.presetImages.some(img => img.name.includes('كشفية') || img.name.includes('سماعة طبية'))).toBe(false);

      const cosmeticsTheme = getCategoryTheme(cosmeticsBiz.category!, cosmeticsBiz.category!, cosmeticsBiz.name);
      expect(cosmeticsTheme.title).not.toContain('الكشوفات والخدمات الطبية');
      expect(cosmeticsTheme.title).toBe('كتالوج العطور الفاخرة ومستحضرات التجميل');
      expect(cosmeticsTheme.addItemLabel).not.toContain('الكشفية');
      expect(cosmeticsTheme.addItemLabel).toContain('العطر');
      expect(cosmeticsTheme.presetImages.some(img => img.name.includes('كشفية') || img.name.includes('سماعة طبية'))).toBe(false);

      // Fallback image assertions
      const tutorFallback = getCategoryFallbackImage(tutorBiz.category, tutorBiz.category, false);
      expect(tutorFallback).not.toContain('photo-1629909613654');
      const factoryFallback = getCategoryFallbackImage(factoryBiz.category, factoryBiz.category, false);
      expect(factoryFallback).not.toContain('photo-1629909613654');
      const cosmeticsFallback = getCategoryFallbackImage(cosmeticsBiz.category, cosmeticsBiz.category, false);
      expect(cosmeticsFallback).not.toContain('photo-1629909613654');

      // Dynamic catalog studio labels assertions
      const tutorLabels = getDynamicCatalogLabels(tutorBiz as Business);
      expect(tutorLabels.bannerTitle).not.toContain('خدمة طبية');
      expect(tutorLabels.bannerBtn).not.toContain('خدمة طبية');
      expect(tutorLabels.listTitle).not.toContain('الخدمات الطبية');
      expect(tutorLabels.bannerBtn).toBe('فتح استوديو إضافة حصة/مساق');
      expect(tutorLabels.listTitle).toBe('المساقات والحصص التعليمية المضافة في الكتالوج');

      const factoryLabels = getDynamicCatalogLabels(factoryBiz as Business);
      expect(factoryLabels.bannerTitle).not.toContain('خدمة طبية');
      expect(factoryLabels.bannerBtn).not.toContain('خدمة طبية');
      expect(factoryLabels.listTitle).not.toContain('الخدمات الطبية');
      expect(factoryLabels.bannerBtn).toBe('فتح استوديو إضافة منتج مصنعي');
      expect(factoryLabels.listTitle).toBe('المنتجات والمستحضرات المضافة في الكتالوج');

      const cosmeticsLabels = getDynamicCatalogLabels(cosmeticsBiz as Business);
      expect(cosmeticsLabels.bannerTitle).not.toContain('خدمة طبية');
      expect(cosmeticsLabels.bannerBtn).not.toContain('خدمة طبية');
      expect(cosmeticsLabels.listTitle).not.toContain('الخدمات الطبية');
      expect(cosmeticsLabels.bannerBtn).toBe('فتح استوديو إضافة عطر/مستحضر');
      expect(cosmeticsLabels.listTitle).toBe('العطور ومستحضرات التجميل المضافة في الكتالوج');
    });

    it('should correctly register all 10 new subcategories in BUSINESS_CATEGORIES without modifying existing ones', () => {
      const shopping = BUSINESS_CATEGORIES['تسوق وتجزئة'];
      expect(shopping).toContain('محلات بيع وصيانة الساعات');
      expect(shopping).toContain('محلات بيع الشالات والحجاب');
      expect(shopping).toContain('محلات بيع الفضة');
      expect(shopping).toContain('محلات مطاحن القهوة');
      expect(shopping).toContain('محلات بيع الأقمشة والصوف');
      expect(shopping).toContain('محلات بيع السجاد');

      const industry = BUSINESS_CATEGORIES['صناعة وحرف وإنشاءات'];
      expect(industry).toContain('محلات بيع المعدات والعدد الصناعية');
      expect(industry).toContain('محلات بيع مواد البناء والدهانات');
      expect(industry).toContain('محلات بيع معدات وأدوات المطاعم والمقاهي والحلويات');
      expect(industry).toContain('محلات الخياطة وتفصيل الملابس');

      // Ensure key existing categories are still present and intact
      expect(shopping).toContain('ذهب ومجوهرات وإكسسوارات');
      expect(shopping).toContain('هواتف محمولة وإكسسواراتها');
      expect(industry).toContain('خياطة وتنجيد ومفروشات وصيانة');
      expect(BUSINESS_CATEGORIES['مناسبات وأفراح']).toContain('استوديوهات تصوير');
      expect(BUSINESS_CATEGORIES['مأكولات ومشروبات']).toContain('مطابخ تواصي ومناسبات');
    });

    it('should assign accurate, distinctive catalog tab titles to all new subcategories with zero trailing emojis', () => {
      const newSubcats = [
        {
          cat: 'تسوق وتجزئة',
          sub: 'محلات بيع وصيانة الساعات',
          expectedCatalog: 'معرض الساعات وخدمات الصيانة',
          expectedAbout: 'عن المحل'
        },
        {
          cat: 'تسوق وتجزئة',
          sub: 'محلات بيع الشالات والحجاب',
          expectedCatalog: 'تشكيلة الشالات والحجاب والأوشحة',
          expectedAbout: 'عن المحل'
        },
        {
          cat: 'تسوق وتجزئة',
          sub: 'محلات بيع الفضة',
          expectedCatalog: 'معرض الفضيات والمشغولات والإكسسوارات',
          expectedAbout: 'عن المعرض'
        },
        {
          cat: 'تسوق وتجزئة',
          sub: 'محلات مطاحن القهوة',
          expectedCatalog: 'قائمة أصناف القهوة والبن والمطاحن',
          expectedAbout: 'عن المحل'
        },
        {
          cat: 'تسوق وتجزئة',
          sub: 'محلات بيع الأقمشة والصوف',
          expectedCatalog: 'تشكيلة الأقمشة ومستلزمات الصوف والنسيج',
          expectedAbout: 'عن المحل'
        },
        {
          cat: 'تسوق وتجزئة',
          sub: 'محلات بيع السجاد',
          expectedCatalog: 'معرض السجاد والموكيت والمفروشات الأرضية',
          expectedAbout: 'عن المعرض'
        },
        {
          cat: 'صناعة وحرف وإنشاءات',
          sub: 'محلات بيع المعدات والعدد الصناعية',
          expectedCatalog: 'كتالوج المعدات والعدد الصناعية والمهنية',
          expectedAbout: 'عن المحل'
        },
        {
          cat: 'صناعة وحرف وإنشاءات',
          sub: 'محلات بيع مواد البناء والدهانات',
          expectedCatalog: 'قائمة مواد البناء والدهانات والديكور',
          expectedAbout: 'عن المحل'
        },
        {
          cat: 'صناعة وحرف وإنشاءات',
          sub: 'محلات بيع معدات وأدوات المطاعم والمقاهي والحلويات',
          expectedCatalog: 'كتالوج معدات المطاعم والمقاهي والحلويات',
          expectedAbout: 'عن المعرض'
        },
        {
          cat: 'صناعة وحرف وإنشاءات',
          sub: 'محلات الخياطة وتفصيل الملابس',
          expectedCatalog: 'خدمات الخياطة وتفصيل الملابس والأزياء',
          expectedAbout: 'عن المشغل'
        }
      ];

      // Regex to detect emoji characters
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      newSubcats.forEach(({ cat, sub, expectedCatalog, expectedAbout }) => {
        const tabInfo = getSubcategoryCatalogTabInfo(cat, sub, false);
        expect(tabInfo.catalogTabTitle).toBe(expectedCatalog);
        expect(tabInfo.aboutTabTitle).toBe(expectedAbout);

        // Verify zero trailing emojis
        expect(emojiRegex.test(tabInfo.catalogTabTitle)).toBe(false);
        expect(emojiRegex.test(tabInfo.aboutTabTitle)).toBe(false);
      });
    });

    it('should correctly evaluate hidden state for medical facilities in public filtering', () => {
      const activeFacility: Partial<Business> = {
        id: 'med-1',
        name: 'عيادة إربد التخصصية',
        category: 'عيادات ومراكز طبية',
        status: 'approved',
        isHidden: false
      };

      const hiddenFacility: Partial<Business> = {
        id: 'med-2',
        name: 'عيادة الأمل',
        category: 'عيادات ومراكز طبية',
        status: 'hidden',
        isHidden: true
      };

      const isPubliclyVisible = (b: Partial<Business>) => {
        return b.status !== 'pending' && b.status !== 'rejected' && b.status !== 'hidden' && !b.isHidden;
      };

      expect(isPubliclyVisible(activeFacility)).toBe(true);
      expect(isPubliclyVisible(hiddenFacility)).toBe(false);

      // Verify toggle inversion
      const toggledState = !Boolean(hiddenFacility.isHidden || hiddenFacility.status === 'hidden');
      expect(toggledState).toBe(false); // next hidden state is false (i.e. unhidden)
    });

    it('should export Firebase verification functions without referencing Resend endpoints', async () => {
      const emailModule = await import('../lib/email');
      expect(typeof emailModule.sendFirebaseVerificationEmail).toBe('function');
      expect(typeof emailModule.sendCustomVerificationEmail).toBe('function');
      expect(emailModule.sendCustomVerificationEmail).toBe(emailModule.sendFirebaseVerificationEmail);
      expect(typeof emailModule.enqueueVerificationEmail).toBe('function');
    });

    it('should display all active promotional banners on the Homepage while keeping specific page targeting for subpages', () => {
      // 1. All active promotional banners regardless of target match the Homepage
      expect(targetMatchesPage('home', 'home')).toBe(true);
      expect(targetMatchesPage('all', 'home')).toBe(true);
      expect(targetMatchesPage(undefined, 'home')).toBe(true);
      expect(targetMatchesPage('offers', 'home')).toBe(true);
      expect(targetMatchesPage('jobs', 'home')).toBe(true);
      expect(targetMatchesPage('housing', 'home')).toBe(true);
      expect(targetMatchesPage('tourism', 'home')).toBe(true);
      expect(targetMatchesPage('medical', 'home')).toBe(true);

      // 2. Specific subpages only receive their own banners or universal 'all' banners
      expect(targetMatchesPage('offers', 'offers')).toBe(true);
      expect(targetMatchesPage('all', 'offers')).toBe(true);
      expect(targetMatchesPage('jobs', 'offers')).toBe(false);
      expect(targetMatchesPage('housing', 'jobs')).toBe(false);
      expect(targetMatchesPage('medical', 'tourism')).toBe(false);
    });
  });
});


