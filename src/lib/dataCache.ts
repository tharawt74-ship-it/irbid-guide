// In-memory & Session cache for lightning-fast navigation across Shoof Irbid
import { Business, HomepageBanner } from '../types';

interface CachedData<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes fresh cache

// Memory cache
let cachedBusinesses: CachedData<Business[]> | null = null;
let cachedBanners: CachedData<HomepageBanner[]> | null = null;
const businessDetailsMap = new Map<string, CachedData<any>>();

export function getCachedBusinesses(): Business[] | null {
  if (cachedBusinesses && (Date.now() - cachedBusinesses.timestamp < CACHE_TTL_MS)) {
    return cachedBusinesses.data;
  }
  return null;
}

export function setCachedBusinesses(data: Business[]) {
  cachedBusinesses = {
    data,
    timestamp: Date.now()
  };
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
  return null;
}

export function setCachedBanners(data: HomepageBanner[]) {
  cachedBanners = {
    data,
    timestamp: Date.now()
  };
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
