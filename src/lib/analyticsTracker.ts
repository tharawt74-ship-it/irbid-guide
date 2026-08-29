import { doc, updateDoc, setDoc, increment } from 'firebase/firestore';
import { db } from './firebase';
import { Business, BusinessAnalytics } from '../types';

export type InteractionType = 'view' | 'whatsapp' | 'call' | 'direction' | 'menu' | 'share';

export async function trackBusinessInteraction(businessId: string, type: InteractionType): Promise<void> {
  if (!businessId) return;

  // Local storage quick caching to prevent spamming duplicates in the same session
  const sessionKey = `biz_interact_${businessId}_${type}`;
  const now = Date.now();
  const lastTime = sessionStorage.getItem(sessionKey);
  if (lastTime && (now - parseInt(lastTime, 10) < 60000)) {
    // Only track once per minute per session for views/menus
    if (type === 'view' || type === 'menu') return;
  }
  sessionStorage.setItem(sessionKey, now.toString());

  if (!db) return;

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

    const updateObj: Record<string, any> = {
      [fieldMap[type]]: increment(1),
      'analytics.lastUpdated': now,
    };

    if (type === 'view') {
      updateObj['views'] = increment(1);
    }

    await updateDoc(docRef, updateObj);
  } catch (err) {
    console.warn("Analytics update warning:", err);
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

