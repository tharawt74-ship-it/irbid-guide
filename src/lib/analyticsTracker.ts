import { doc, updateDoc, setDoc, increment } from 'firebase/firestore';
import { db } from './firebase';
import { Business, BusinessAnalytics } from '../types';
import { getJordanNow, getJordanDateISO } from './jordanTime';

export type InteractionType = 'view' | 'whatsapp' | 'call' | 'direction' | 'menu' | 'share';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type DayKey = typeof DAY_KEYS[number];

export interface TrackingOptions {
  isOwner?: boolean;
  currentUserId?: string;
  ownerId?: string;
  isAdmin?: boolean;
}

const TTL_VIEW_MS = 6 * 60 * 60 * 1000; // 6 hours deduplication for page views
const TTL_MENU_MS = 2 * 60 * 60 * 1000; // 2 hours for menu views
const TTL_CLICK_MS = 60 * 60 * 1000;    // 1 hour for contact/direction/share clicks

const memoryCache = new Map<string, number>();
const inFlightRequests = new Set<string>();

function safeGet(key: string): number | null {
  try {
    const val = localStorage.getItem(key);
    if (val) {
      const num = parseInt(val, 10);
      if (!isNaN(num)) return num;
    }
  } catch {
    // fallback
  }
  return memoryCache.get(key) ?? null;
}

function safeSet(key: string, timestamp: number): void {
  try {
    localStorage.setItem(key, timestamp.toString());
  } catch {
    // fallback
  }
  memoryCache.set(key, timestamp);
}

export async function trackBusinessInteraction(
  businessId: string, 
  type: InteractionType,
  options?: TrackingOptions
): Promise<void> {
  if (!businessId || businessId.startsWith('demo-')) return;

  // Exclude store owner and administrators from inflating view metrics
  const isOwnerOrAdmin = Boolean(
    options?.isOwner ||
    options?.isAdmin ||
    (options?.currentUserId && options?.ownerId && options?.currentUserId === options?.ownerId)
  );

  if (isOwnerOrAdmin && (type === 'view' || type === 'menu')) {
    return;
  }

  // Determine TTL for the interaction type
  let ttl = TTL_CLICK_MS;
  if (type === 'view') {
    ttl = TTL_VIEW_MS;
  } else if (type === 'menu') {
    ttl = TTL_MENU_MS;
  }

  // Check device-level deduplication
  const now = Date.now();
  const storageKey = `shofi_trk_${businessId}_${type}`;
  const lastRecorded = safeGet(storageKey);

  if (lastRecorded && (now - lastRecorded < ttl)) {
    return;
  }

  // In-flight guard to avoid concurrent duplicate requests
  const flightKey = `${businessId}_${type}`;
  if (inFlightRequests.has(flightKey)) {
    return;
  }
  inFlightRequests.add(flightKey);

  // Mark timestamp immediately
  safeSet(storageKey, now);

  if (!db) {
    inFlightRequests.delete(flightKey);
    return;
  }

  try {
    const docRef = doc(db, 'businesses', businessId);
    const fieldMap: Record<InteractionType, string> = {
      view: 'analytics.views',
      whatsapp: 'analytics.whatsappClicks',
      call: 'analytics.callClicks',
      direction: 'analytics.directionClicks',
      menu: 'analytics.menuViews',
      share: 'analytics.shareClicks',
    };

    const targetField = fieldMap[type];
    if (!targetField) {
      return;
    }

    // Calculate current day and ISO date key (YYYY-MM-DD) in Jordan timezone
    const today = getJordanNow();
    const dayIndex = today.getDay(); // 0 = sun, 1 = mon, ..., 6 = sat
    const dayKey = DAY_KEYS[dayIndex];
    const dateKey = getJordanDateISO(today);

    const updateObj: Record<string, any> = {
      [targetField]: increment(1),
      'analytics.lastUpdated': now,
      // Track real day of week counts
      [`analytics.dayOfWeekStats.${dayKey}.${type === 'view' ? 'views' : 'interactions'}`]: increment(1),
      // Track real daily date key
      [`analytics.dailyStats.${dateKey}.${type}`]: increment(1),
    };

    if (type === 'call') {
      updateObj[`analytics.dayOfWeekStats.${dayKey}.calls`] = increment(1);
    }

    if (type === 'view') {
      updateObj['views'] = increment(1);
    }

    await updateDoc(docRef, updateObj);
  } catch (err) {
    console.warn("Analytics update warning:", err);
  } finally {
    inFlightRequests.delete(flightKey);
  }
}

export function getDefaultAnalytics(views = 0, isVip = false): BusinessAnalytics {
  const baseViews = typeof views === 'number' ? views : 0;
  return {
    views: baseViews,
    whatsappClicks: 0,
    callClicks: 0,
    directionClicks: 0,
    menuViews: 0,
    shareClicks: 0,
    lastUpdated: Date.now(),
    peakHours: '5:30 مساءً - 11:00 ليلاً',
    dayOfWeekStats: {
      sat: { views: 0, interactions: 0, calls: 0 },
      sun: { views: 0, interactions: 0, calls: 0 },
      mon: { views: 0, interactions: 0, calls: 0 },
      tue: { views: 0, interactions: 0, calls: 0 },
      wed: { views: 0, interactions: 0, calls: 0 },
      thu: { views: 0, interactions: 0, calls: 0 },
      fri: { views: 0, interactions: 0, calls: 0 },
    },
    dailyStats: {},
  };
}

export async function ensureBusinessAnalyticsSaved(business: Business): Promise<BusinessAnalytics> {
  const existing = business.analytics;
  const isVip = business.packagePlan === 'golden' || business.packagePlan === 'vip';
  
  if (existing && typeof existing.views === 'number') {
    return {
      views: existing.views ?? business.views ?? 0,
      whatsappClicks: existing.whatsappClicks ?? 0,
      callClicks: existing.callClicks ?? 0,
      directionClicks: existing.directionClicks ?? 0,
      menuViews: existing.menuViews ?? 0,
      shareClicks: existing.shareClicks ?? 0,
      lastUpdated: existing.lastUpdated || Date.now(),
      peakHours: existing.peakHours || '5:30 مساءً - 11:00 ليلاً'
    };
  }

  const newAnalytics = getDefaultAnalytics(business.views || 0, isVip);

  if (db && business.id && !business.id.startsWith('demo-')) {
    try {
      const docRef = doc(db, 'businesses', business.id);
      await setDoc(docRef, {
        views: newAnalytics.views,
        analytics: newAnalytics
      }, { merge: true });
    } catch (e) {
      console.warn("Could not save initial analytics to firestore:", e);
    }
  }

  return newAnalytics;
}

