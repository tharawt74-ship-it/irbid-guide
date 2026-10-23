import { collection, getDocs, query, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { HomepageBanner } from '../types';
import { getCachedBanners, setCachedBanners, invalidateCache } from './dataCache';

export const BOOK_YOUR_AD_BANNER: HomepageBanner = {
  id: 'book-your-ad-banner',
  type: 'text_and_button',
  title: 'احجز مساحتك الإعلانية هنا',
  subtitle: 'انشر إعلانك الترويجي ليصل لآلاف الزوار والطلاب في محافظة إربد وتواصل مع عملائك مباشرة.',
  imageUrl: '',
  badgeText: 'مساحة إعلانية متاحة',
  buttonText: 'احجز إعلانك الآن',
  buttonLink: '/profile?tab=services'
};

// Aliases for backwards compatibility returning strictly the BOOK_YOUR_AD_BANNER
export const DEFAULT_OFFERS_BANNERS: HomepageBanner[] = [BOOK_YOUR_AD_BANNER];
export const DEFAULT_JOBS_BANNERS: HomepageBanner[] = [BOOK_YOUR_AD_BANNER];
export const DEFAULT_HOUSING_BANNERS: HomepageBanner[] = [BOOK_YOUR_AD_BANNER];
export const DEFAULT_TRANSPORT_BANNERS: HomepageBanner[] = [BOOK_YOUR_AD_BANNER];
export const DEFAULT_NEWS_BANNERS: HomepageBanner[] = [BOOK_YOUR_AD_BANNER];
export const DEFAULT_TOURISM_BANNERS: HomepageBanner[] = [BOOK_YOUR_AD_BANNER];
export const DEFAULT_MEDICAL_BANNERS: HomepageBanner[] = [
  {
    id: 'medical-hero-banner',
    type: 'text_and_button',
    title: 'دليلك الطبي الأول في محافظة إربد',
    subtitle: 'ابحث عن طبيبك المناسب وتصفح جميع العيادات، المستشفيات، الصيدليات والمختبرات في إربد بأعلى درجات الدقة والتقييم الحقيقي.',
    imageUrl: '/src/assets/images/medical_banner_hero_1789156288017.jpg',
    badgeText: 'الرعاية الطبية الموثوقة',
    buttonText: 'تصفح العيادات والمرافق',
    buttonLink: '#specialties-list'
  },
  BOOK_YOUR_AD_BANNER
];

/**
 * Normalizes date values from various formats (timestamps, ISO strings, Firestore Timestamps) to milliseconds.
 * If isEndOfDay is true, sets or extends to end of that day (23:59:59.999).
 */
export function normalizeDateToMillis(dateVal: any, isEndOfDay: boolean = false): number | undefined {
  if (dateVal === null || dateVal === undefined || dateVal === '') {
    return undefined;
  }
  // Firestore Timestamp object
  if (typeof dateVal === 'object') {
    if (typeof dateVal.toMillis === 'function') {
      const ms = dateVal.toMillis();
      return adjustEndOfDay(ms, isEndOfDay);
    }
    if (typeof dateVal.seconds === 'number') {
      const ms = dateVal.seconds * 1000 + (dateVal.nanoseconds ? Math.floor(dateVal.nanoseconds / 1e6) : 0);
      return adjustEndOfDay(ms, isEndOfDay);
    }
  }
  // Numeric timestamp
  if (typeof dateVal === 'number') {
    if (isNaN(dateVal)) return undefined;
    return adjustEndOfDay(dateVal, isEndOfDay);
  }
  // String format
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (!trimmed) return undefined;
    // Pure numeric string
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      if (isNaN(num)) return undefined;
      return adjustEndOfDay(num, isEndOfDay);
    }
    // Date only string: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const targetStr = isEndOfDay ? `${trimmed}T23:59:59.999` : `${trimmed}T00:00:00.000`;
      const parsed = new Date(targetStr).getTime();
      return isNaN(parsed) ? new Date(trimmed).getTime() : parsed;
    }
    const parsed = new Date(trimmed).getTime();
    if (isNaN(parsed)) return undefined;
    return adjustEndOfDay(parsed, isEndOfDay);
  }
  return undefined;
}

function adjustEndOfDay(ms: number, isEndOfDay: boolean): number {
  if (!isEndOfDay) return ms;
  const d = new Date(ms);
  // If the time is set to start of day (midnight 00:00:00), push to end of day
  if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) {
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }
  return ms;
}

/**
 * Checks whether the banner's validity has started.
 * Accommodates timezone shifts, same-day starts, and multiple field names.
 */
export function isBannerStarted(banner: Partial<HomepageBanner>, now: number = Date.now()): boolean {
  if (!banner) return true;
  const rawStart = banner.bannerStartDate ?? (banner as any).startDate ?? (banner as any).publishStartDate;
  const start = normalizeDateToMillis(rawStart, false);
  if (!start) return true;
  if (start <= now) return true;

  // Grace: If start is scheduled for today in local time, consider started
  const sDate = new Date(start);
  const nDate = new Date(now);
  if (
    sDate.getFullYear() === nDate.getFullYear() &&
    sDate.getMonth() === nDate.getMonth() &&
    sDate.getDate() === nDate.getDate()
  ) {
    return true;
  }
  // Allow slight clock drift up to 12 hours
  if (start - now <= 12 * 60 * 60 * 1000) {
    return true;
  }
  return false;
}

/**
 * Checks whether the banner's validity has expired.
 * Checks multiple field aliases and ensures expiry day is fully included.
 */
export function isBannerExpired(banner: Partial<HomepageBanner>, now: number = Date.now()): boolean {
  if (!banner) return false;
  const rawExpiry = banner.bannerExpiryDate ?? (banner as any).expiryDate ?? (banner as any).endDate ?? (banner as any).expiresAt;
  const expiry = normalizeDateToMillis(rawExpiry, true);
  if (!expiry || expiry <= 0) return false;
  return expiry <= now;
}

/**
 * Checks whether the banner is currently active and within its valid date window.
 */
export function isBannerActiveAndValid(banner: Partial<HomepageBanner>, now: number = Date.now()): boolean {
  if (!banner) return false;
  // Check active flag (both boolean and string variants)
  if (banner.active === false || (banner as any).active === 'false') return false;
  
  // Check status flags if present
  const status = (banner as any).status;
  if (status === 'inactive' || status === 'paused' || status === 'expired' || status === 'rejected' || status === 'deleted') {
    return false;
  }

  if (!isBannerStarted(banner, now)) return false;
  if (isBannerExpired(banner, now)) return false;
  return true;
}

/**
 * Helper to match pageTarget with requested page key, handling 'all', aliases, and formatting.
 */
export function targetMatchesPage(bannerPageTarget: string | undefined, requestedPageKey: string | undefined): boolean {
  if (!requestedPageKey || requestedPageKey === 'all') return true;

  const rawReq = requestedPageKey.trim().toLowerCase();
  const rawTarget = typeof bannerPageTarget === 'string' ? bannerPageTarget.trim().toLowerCase() : '';

  // Universal target
  if (!rawTarget || rawTarget === 'all' || rawTarget === 'all_pages' || rawTarget === 'عام' || rawTarget === 'الكل') {
    return true;
  }

  // The Homepage is the central showcase for all platform promotional banners
  if (rawReq === 'home' || rawReq === 'homepage' || rawReq === 'main' || rawReq === 'الرئيسية' || rawReq === 'رئيسية') {
    return true;
  }

  if (rawTarget === rawReq) return true;

  // Target aliases
  const targetAliases: Record<string, string[]> = {
    home: ['home', 'homepage', 'main', 'رئيسية', 'الرئيسية'],
    offers: ['offers', 'offer', 'deals', 'discounts', 'عروض', 'خصومات'],
    jobs: ['jobs', 'job', 'careers', 'وظائف', 'شواغر'],
    housing: ['housing', 'housings', 'realestate', 'apartments', 'سكنات', 'عقارات'],
    transportation: ['transportation', 'transport', 'transit', 'buses', 'نقل', 'مواصلات'],
    news: ['news', 'articles', 'أخبار', 'اخبار'],
    tourism: ['tourism', 'tourist', 'places', 'سياحة'],
    medical: ['medical', 'health', 'clinics', 'clinic', 'doctors', 'طبي', 'صحة', 'عيادات']
  };

  const reqGroup = targetAliases[rawReq] || [rawReq];
  const targetGroup = targetAliases[rawTarget] || [rawTarget];

  return reqGroup.some(r => targetGroup.includes(r)) || targetGroup.some(t => reqGroup.includes(t));
}

/**
 * Utility to completely delete all banners in Firestore (used strictly by explicit admin action)
 */
export async function clearAllBannersInFirestore() {
  if (!db) return;
  try {
    const q = query(collection(db, 'banners'));
    const snap = await getDocs(q);
    const deletePromises: Promise<void>[] = [];
    snap.forEach(docSnap => {
      deletePromises.push(deleteDoc(doc(db, 'banners', docSnap.id)));
    });
    await Promise.all(deletePromises);
    invalidateCache();
  } catch (err) {
    console.error('Error clearing banners:', err);
  }
}

// In-flight singleton promise to prevent duplicate concurrent Firestore reads
let bannersFetchPromise: Promise<HomepageBanner[]> | null = null;
let lastBannersFetchTime = 0;
const BANNERS_FRESH_TTL_MS = 15 * 60 * 1000; // 15 minutes fresh memory window

if (typeof window !== 'undefined') {
  window.addEventListener('shoof_banners_updated', () => {
    lastBannersFetchTime = 0;
  });
}

export function invalidateBannersFetchCache() {
  lastBannersFetchTime = 0;
}

/**
 * Helper to fetch banners for a specific page.
 * Returns active Firestore banners matching pageTarget within their validity period.
 * Employs smart, reliable caching: returns cached instantly when available, but NEVER
 * hides active banners if the cache doesn't contain matching banners for this page.
 */
export async function fetchPageBanners(
  categoryKeywords?: string[],
  fallbackBanners?: HomepageBanner[],
  pageKey?: string
): Promise<HomepageBanner[]> {
  try {
    const now = Date.now();
    const cached = getCachedBanners();
    const validCached = cached ? cached.filter(b => isBannerActiveAndValid(b, now)) : [];
    const pageMatchedCached = validCached.filter(b => targetMatchesPage(b.pageTarget || (b as any).targetPage, pageKey));

    const isCacheFresh = (now - lastBannersFetchTime) < BANNERS_FRESH_TTL_MS;

    // 1. If we have matching active banners and the cache was fetched recently, return immediately
    if (pageMatchedCached.length > 0 && isCacheFresh) {
      return pageMatchedCached;
    }

    // If banners collection was already fetched recently from Firestore and this page has no matching custom banner,
    // do not query Firestore again. Return fallback immediately to avoid read quota waste.
    if (isCacheFresh && lastBannersFetchTime > 0) {
      return fallbackBanners && fallbackBanners.length > 0 ? fallbackBanners : [BOOK_YOUR_AD_BANNER];
    }

    // Worker function to fetch fresh banners from Firestore
    const fetchFromFirestore = async (): Promise<HomepageBanner[]> => {
      if (!db) return [];
      const q = query(collection(db, 'banners'));
      const snap = await getDocs(q);
      const items: HomepageBanner[] = [];
      const fetchNow = Date.now();
      snap.forEach(docSnap => {
        const data = docSnap.data();
        const bannerObj = { id: docSnap.id, ...data } as HomepageBanner;
        if (bannerObj.active === undefined && (data.status === 'active' || !data.status)) {
          bannerObj.active = true;
        }
        if (isBannerActiveAndValid(bannerObj, fetchNow)) {
          items.push(bannerObj);
        }
      });
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      lastBannersFetchTime = Date.now();
      if (items.length > 0) {
        setCachedBanners(items);
      }
      return items;
    };

    // 2. Stale-While-Revalidate: If we have cached matches but cache is slightly stale (> 2 mins),
    // return cached immediately so the UI is responsive, and revalidate in background
    if (pageMatchedCached.length > 0 && !isCacheFresh) {
      if (!bannersFetchPromise) {
        bannersFetchPromise = fetchFromFirestore().finally(() => {
          bannersFetchPromise = null;
        });
      }
      return pageMatchedCached;
    }

    // 3. Cache has 0 matches for this page (or no cache): we MUST fetch from Firestore
    if (!bannersFetchPromise) {
      bannersFetchPromise = fetchFromFirestore().finally(() => {
        bannersFetchPromise = null;
      });
    }

    const allFresh = await bannersFetchPromise;
    const pageMatchedFresh = allFresh.filter(b => targetMatchesPage(b.pageTarget || (b as any).targetPage, pageKey));

    if (pageMatchedFresh.length > 0) {
      return pageMatchedFresh;
    }

    // Fallback to cached matches if available
    if (pageMatchedCached.length > 0) {
      return pageMatchedCached;
    }

    return fallbackBanners && fallbackBanners.length > 0 ? fallbackBanners : [BOOK_YOUR_AD_BANNER];
  } catch (err) {
    console.warn('Error loading page banners:', err);
    return fallbackBanners && fallbackBanners.length > 0 ? fallbackBanners : [BOOK_YOUR_AD_BANNER];
  }
}
