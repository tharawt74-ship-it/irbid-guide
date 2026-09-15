// In-memory & Session cache for lightning-fast navigation across Shoof Irbid
import { Business, HomepageBanner } from '../types';

interface CachedData<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes fresh in-memory cache
const PERSISTENT_TTL_MS = 30 * 60 * 1000; // 30 minutes persistent cache
const BIZ_STORAGE_KEY = 'shoof_cached_businesses_v2';
const BANNERS_STORAGE_KEY = 'shoof_cached_banners_v2';
const OFFERS_STORAGE_KEY = 'shoof_cached_offers_v2';
const JOBS_STORAGE_KEY = 'shoof_cached_jobs_v2';
const HOUSINGS_STORAGE_KEY = 'shoof_cached_housings_v2';
const PRODUCTS_STORAGE_KEY = 'shoof_cached_products_v2';

// Memory cache
let cachedBusinesses: CachedData<Business[]> | null = null;
let cachedBanners: CachedData<HomepageBanner[]> | null = null;
let cachedOffers: CachedData<any[]> | null = null;
let cachedJobs: CachedData<any[]> | null = null;
let cachedHousings: CachedData<any[]> | null = null;
let cachedProducts: CachedData<any[]> | null = null;
const businessDetailsMap = new Map<string, CachedData<any>>();

export function getCachedJobs(): any[] | null {
  if (cachedJobs && (Date.now() - cachedJobs.timestamp < CACHE_TTL_MS)) {
    return cachedJobs.data;
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(JOBS_STORAGE_KEY);
      if (stored) {
        const parsed: CachedData<any[]> = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.data) && (Date.now() - parsed.timestamp < PERSISTENT_TTL_MS)) {
          cachedJobs = parsed;
          return parsed.data;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export function setCachedJobs(data: any[]) {
  const entry = { data, timestamp: Date.now() };
  cachedJobs = entry;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(JOBS_STORAGE_KEY, JSON.stringify(entry));
    } catch {
      // ignore
    }
  }
}

export function getCachedHousings(): any[] | null {
  if (cachedHousings && (Date.now() - cachedHousings.timestamp < CACHE_TTL_MS)) {
    return cachedHousings.data;
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(HOUSINGS_STORAGE_KEY);
      if (stored) {
        const parsed: CachedData<any[]> = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.data) && (Date.now() - parsed.timestamp < PERSISTENT_TTL_MS)) {
          cachedHousings = parsed;
          return parsed.data;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export function setCachedHousings(data: any[]) {
  const entry = { data, timestamp: Date.now() };
  cachedHousings = entry;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(HOUSINGS_STORAGE_KEY, JSON.stringify(entry));
    } catch {
      // ignore
    }
  }
}

export function getCachedProducts(): any[] | null {
  if (cachedProducts && (Date.now() - cachedProducts.timestamp < CACHE_TTL_MS)) {
    return cachedProducts.data;
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (stored) {
        const parsed: CachedData<any[]> = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.data) && (Date.now() - parsed.timestamp < PERSISTENT_TTL_MS)) {
          cachedProducts = parsed;
          return parsed.data;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export function setCachedProducts(data: any[]) {
  const entry = { data, timestamp: Date.now() };
  cachedProducts = entry;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(entry));
    } catch {
      // ignore
    }
  }
}

export function getCachedOffers(): any[] | null {
  if (cachedOffers && (Date.now() - cachedOffers.timestamp < CACHE_TTL_MS)) {
    return cachedOffers.data;
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(OFFERS_STORAGE_KEY);
      if (stored) {
        const parsed: CachedData<any[]> = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.data) && (Date.now() - parsed.timestamp < PERSISTENT_TTL_MS)) {
          cachedOffers = parsed;
          return parsed.data;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export function setCachedOffers(data: any[]) {
  const entry = { data, timestamp: Date.now() };
  cachedOffers = entry;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(OFFERS_STORAGE_KEY, JSON.stringify(entry));
    } catch {
      // ignore
    }
  }
}

export function getCachedBusinesses(): Business[] | null {
  if (cachedBusinesses && (Date.now() - cachedBusinesses.timestamp < CACHE_TTL_MS)) {
    return cachedBusinesses.data;
  }

  // Fallback to local storage for instant cold-start presentation
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(BIZ_STORAGE_KEY);
      if (stored) {
        const parsed: CachedData<Business[]> = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0 && (Date.now() - parsed.timestamp < PERSISTENT_TTL_MS)) {
          cachedBusinesses = parsed;
          return parsed.data;
        }
      }
    } catch {
      // ignore storage error
    }
  }

  return null;
}

export function setCachedBusinesses(data: Business[]) {
  const entry = {
    data,
    timestamp: Date.now()
  };
  cachedBusinesses = entry;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(BIZ_STORAGE_KEY, JSON.stringify(entry));
    } catch {
      // ignore storage quota errors
    }
  }

  // Also populate individual business detail cache
  data.forEach(b => {
    businessDetailsMap.set(b.id, { data: b, timestamp: Date.now() });
    if (b.username) {
      businessDetailsMap.set(b.username.toLowerCase(), { data: b, timestamp: Date.now() });
    }
  });
}

export function getCachedBanners(): HomepageBanner[] | null {
  if (cachedBanners && (Date.now() - cachedBanners.timestamp < CACHE_TTL_MS)) {
    return cachedBanners.data;
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(BANNERS_STORAGE_KEY);
      if (stored) {
        const parsed: CachedData<HomepageBanner[]> = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.data) && (Date.now() - parsed.timestamp < PERSISTENT_TTL_MS)) {
          cachedBanners = parsed;
          return parsed.data;
        }
      }
    } catch {
      // ignore storage error
    }
  }

  return null;
}

export function setCachedBanners(data: HomepageBanner[]) {
  const entry = {
    data,
    timestamp: Date.now()
  };
  cachedBanners = entry;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(BANNERS_STORAGE_KEY, JSON.stringify(entry));
    } catch {
      // ignore storage quota errors
    }
  }
}

export function getCachedBusinessDetail(key: string): any | null {
  const cleanKey = key.startsWith('@') ? key.substring(1).trim().toLowerCase() : key.trim().toLowerCase();
  const item = businessDetailsMap.get(cleanKey) || businessDetailsMap.get(key);
  if (item && (Date.now() - item.timestamp < CACHE_TTL_MS)) {
    return item.data;
  }
  return null;
}

export function setCachedBusinessDetail(key: string, data: any) {
  const cleanKey = key.startsWith('@') ? key.substring(1).trim().toLowerCase() : key.trim().toLowerCase();
  const entry = { data, timestamp: Date.now() };
  businessDetailsMap.set(key, entry);
  businessDetailsMap.set(cleanKey, entry);
  if (data?.id) {
    businessDetailsMap.set(data.id, entry);
  }
  if (data?.username) {
    businessDetailsMap.set(data.username.toLowerCase(), entry);
  }
}

export function invalidateCache() {
  cachedBusinesses = null;
  cachedBanners = null;
  businessDetailsMap.clear();
}
