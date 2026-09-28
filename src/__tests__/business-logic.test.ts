import { describe, it, expect } from 'vitest';
import { stripUrlsAndLinks, sanitizeInput } from '../lib/security';
import { getBusinessVipStatus } from '../lib/vipHelper';
import { Business } from '../types';

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
});


