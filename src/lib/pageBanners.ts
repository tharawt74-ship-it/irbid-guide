import { collection, getDocs, query, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { HomepageBanner } from '../types';
import { getCachedBanners, setCachedBanners, invalidateCache } from './dataCache';

export const BOOK_YOUR_AD_BANNER: HomepageBanner = {
  id: 'book-your-ad-banner',
  type: 'text_and_button',
  title: 'احجز مساحتك الإعلانية هنا 📢',
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

/**
 * Utility to completely delete all banners in Firestore
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

/**
 * Helper to fetch banners for a specific page.
 * Returns active Firestore banners matching pageTarget.
 * If no custom banners exist in Firestore for this page, returns ONLY the single 'BOOK_YOUR_AD_BANNER'.
 */
export async function fetchPageBanners(
  categoryKeywords: string[],
  fallbackBanners?: HomepageBanner[],
  pageKey?: string
): Promise<HomepageBanner[]> {
  try {
    // One-time auto wipe of legacy/fake Firestore banners
    if (typeof window !== 'undefined' && !localStorage.getItem('shoof_banners_wiped_v2')) {
      localStorage.setItem('shoof_banners_wiped_v2', 'true');
      await clearAllBannersInFirestore();
    }

    const cached = getCachedBanners();
    let allBanners: HomepageBanner[] = [];

    if (cached && cached.length > 0) {
      allBanners = cached;
    } else if (db) {
      const q = query(collection(db, 'banners'));
      const snap = await getDocs(q);
      const items: HomepageBanner[] = [];
      const now = Date.now();
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.active) {
          const startsOk = !data.bannerStartDate || data.bannerStartDate <= now;
          const endsOk = !data.bannerExpiryDate || data.bannerExpiryDate > now;
          if (startsOk && endsOk) {
            items.push({ id: docSnap.id, ...data } as HomepageBanner);
          }
        }
      });
      if (items.length > 0) {
        setCachedBanners(items);
        allBanners = items;
      }
    }

    if (allBanners.length > 0) {
      // Find matching banners by STRICT pageTarget match
      const pageMatched = allBanners.filter(b => {
        if (pageKey) {
          return b.pageTarget === pageKey || b.pageTarget === 'all';
        }
        return b.pageTarget === 'all' || !b.pageTarget;
      });

      if (pageMatched.length > 0) {
        return pageMatched;
      }
    }

    return [BOOK_YOUR_AD_BANNER];
  } catch (err) {
    console.error('Error loading page banners:', err);
    return [BOOK_YOUR_AD_BANNER];
  }
}
