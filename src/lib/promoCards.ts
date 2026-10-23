import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { InFeedPromoCard } from '../types';

let cachedPromoCards: InFeedPromoCard[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory cache

export function invalidatePromoCardsCache() {
  cachedPromoCards = null;
  lastFetchTime = 0;
}

/**
 * Fetches active in-feed promotional cards for a given page.
 * Uses lightweight caching to eliminate unnecessary Firestore reads and avoid quota exhaustion.
 */
export async function fetchPagePromoCards(
  pageKey: 'home' | 'offers' | 'products' | 'medical' | 'jobs' | 'housing'
): Promise<InFeedPromoCard[]> {
  try {
    const now = Date.now();
    if (cachedPromoCards && now - lastFetchTime < CACHE_TTL_MS) {
      return cachedPromoCards.filter(c => c.targetPage === pageKey && c.active);
    }

    if (!db) return [];

    const q = query(collection(db, 'promo_cards'));
    const snap = await getDocs(q);
    const cards: InFeedPromoCard[] = [];

    snap.forEach(d => {
      const data = d.data();
      if (data.active) {
        const startsOk = !data.startDate || data.startDate <= now;
        const endsOk = !data.expiryDate || data.expiryDate > now;
        if (startsOk && endsOk) {
          cards.push({ id: d.id, ...data } as InFeedPromoCard);
        }
      }
    });

    cachedPromoCards = cards;
    lastFetchTime = now;

    return cards.filter(c => c.targetPage === pageKey && c.active);
  } catch (err) {
    console.warn('Error fetching promo cards:', err);
    return [];
  }
}
