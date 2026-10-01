// In-memory & Session cache for lightning-fast navigation across Shoof Irbid
import { Business, HomepageBanner } from '../types';

interface CachedData<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes fresh in-memory cache
const PERSISTENT_TTL_MS = 30 * 60 * 1000; // 30 minutes persistent cache
const BIZ_STORAGE_KEY = 'shoof_cached_businesses_v3';
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

export function isBusinessesCacheFresh(): boolean {
  if (cachedBusinesses && (Date.now() - cachedBusinesses.timestamp < CACHE_TTL_MS)) {
    return true;
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(BIZ_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.data) && parsed.data.length > 0 && (Date.now() - parsed.timestamp < CACHE_TTL_MS)) {
          return true;
        }
      }
    } catch {
      // ignore
    }
  }
  return false;
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
  cachedOffers = null;
  cachedJobs = null;
  cachedHousings = null;
  cachedProducts = null;
  businessDetailsMap.clear();
  userProfileDataMap.clear();
  userRequestsMap.clear();

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(BIZ_STORAGE_KEY);
      localStorage.removeItem(BANNERS_STORAGE_KEY);
      localStorage.removeItem(OFFERS_STORAGE_KEY);
      localStorage.removeItem(JOBS_STORAGE_KEY);
      localStorage.removeItem(HOUSINGS_STORAGE_KEY);
      localStorage.removeItem(PRODUCTS_STORAGE_KEY);

      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('shoof_user_profile_data_') || key.startsWith('shoof_user_requests_'))) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // ignore
    }
  }
}

export function updateBusinessMenuItemsInCache(businessId: string, updatedMenuItems: any[]) {
  if (!businessId || !Array.isArray(updatedMenuItems)) return;

  // 1. Update in-memory businesses cache
  if (cachedBusinesses?.data) {
    cachedBusinesses.data = cachedBusinesses.data.map(b => {
      if (b.id === businessId) {
        return { ...b, menuItems: updatedMenuItems };
      }
      return b;
    });
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(BIZ_STORAGE_KEY, JSON.stringify(cachedBusinesses));
      } catch {
        // ignore quota
      }
    }
  }

  // 2. Update in businessDetailsMap
  for (const [key, item] of businessDetailsMap.entries()) {
    if (item.data?.id === businessId) {
      businessDetailsMap.set(key, {
        ...item,
        data: {
          ...item.data,
          menuItems: updatedMenuItems
        },
        timestamp: Date.now()
      });
    }
  }

  // 3. Update in user profile caches
  for (const [uid, userProfile] of userProfileDataMap.entries()) {
    if (userProfile.data?.businesses) {
      userProfile.data.businesses = userProfile.data.businesses.map(b => {
        if (b.id === businessId) {
          return { ...b, menuItems: updatedMenuItems };
        }
        return b;
      });
    }
  }
}

export function removeBusinessFromAllCaches(businessId: string) {
  if (!businessId) return;

  // 1. Purge from in-memory businesses cache
  if (cachedBusinesses?.data) {
    cachedBusinesses.data = cachedBusinesses.data.filter(
      b => b.id !== businessId && b.parentBusinessId !== businessId
    );
  }

  // 2. Purge from detail mappings
  businessDetailsMap.delete(businessId);
  for (const [key, item] of businessDetailsMap.entries()) {
    if (item.data?.id === businessId || item.data?.parentBusinessId === businessId) {
      businessDetailsMap.delete(key);
    }
  }

  // 3. Purge offers & jobs
  if (cachedOffers?.data) {
    cachedOffers.data = cachedOffers.data.filter(o => o.businessId !== businessId);
  }
  if (cachedJobs?.data) {
    cachedJobs.data = cachedJobs.data.filter(j => j.businessId !== businessId);
  }

  // 4. Purge from all user profile caches
  for (const [uid, userProfile] of userProfileDataMap.entries()) {
    if (userProfile.data?.businesses) {
      userProfile.data.businesses = userProfile.data.businesses.filter(
        b => b.id !== businessId && b.parentBusinessId !== businessId
      );
    }
  }

  // 5. Invalidate persistent and runtime caches
  invalidateCache();
}

export interface UserProfileCacheData {
  businesses: Business[];
  userJobs: any[];
  userHousings: any[];
}

export interface UserRequestsCacheData {
  businessRequests: any[];
  marketingRequests: any[];
}

const userProfileDataMap = new Map<string, CachedData<UserProfileCacheData>>();
const userRequestsMap = new Map<string, CachedData<UserRequestsCacheData>>();

export function getCachedUserProfileData(uid: string): UserProfileCacheData | null {
  if (!uid) return null;
  const inMem = userProfileDataMap.get(uid);
  if (inMem && (Date.now() - inMem.timestamp < CACHE_TTL_MS)) {
    return inMem.data;
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('shoof_user_profile_data_' + uid);
      if (stored) {
        const parsed: CachedData<UserProfileCacheData> = JSON.parse(stored);
        if (parsed && parsed.data && (Date.now() - parsed.timestamp < PERSISTENT_TTL_MS)) {
          userProfileDataMap.set(uid, parsed);
          return parsed.data;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export function setCachedUserProfileData(uid: string, data: UserProfileCacheData) {
  if (!uid) return;
  const entry = { data, timestamp: Date.now() };
  userProfileDataMap.set(uid, entry);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('shoof_user_profile_data_' + uid, JSON.stringify(entry));
    } catch {
      // ignore
    }
  }
}

export function invalidateUserProfileCache(uid?: string) {
  if (uid) {
    userProfileDataMap.delete(uid);
    userRequestsMap.delete(uid);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('shoof_user_profile_data_' + uid);
        localStorage.removeItem('shoof_user_requests_' + uid);
      } catch {}
    }
  } else {
    userProfileDataMap.clear();
    userRequestsMap.clear();
  }
}

export function getCachedUserRequests(uid: string): UserRequestsCacheData | null {
  if (!uid) return null;
  const inMem = userRequestsMap.get(uid);
  if (inMem && (Date.now() - inMem.timestamp < CACHE_TTL_MS)) {
    return inMem.data;
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('shoof_user_requests_' + uid);
      if (stored) {
        const parsed: CachedData<UserRequestsCacheData> = JSON.parse(stored);
        if (parsed && parsed.data && (Date.now() - parsed.timestamp < PERSISTENT_TTL_MS)) {
          userRequestsMap.set(uid, parsed);
          return parsed.data;
        }
      }
    } catch {}
  }
  return null;
}

export function setCachedUserRequests(uid: string, data: UserRequestsCacheData) {
  if (!uid) return;
  const entry = { data, timestamp: Date.now() };
  userRequestsMap.set(uid, entry);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('shoof_user_requests_' + uid, JSON.stringify(entry));
    } catch {}
  }
}

