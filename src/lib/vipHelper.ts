import { Business } from '../types';

export interface VipStatusResult {
  isVip: boolean;
  packagePlan: 'golden' | 'basic' | 'pay_per_use';
  tier?: 'gold' | 'silver' | 'bronze' | 'free';
  badgeLabel?: string;
  isVerified: boolean;
  isScheduled: boolean;
  expiresAt?: number;
  startsAt?: number;
  statusLabel: string;
  badgeColor: string;
  daysRemaining?: number;
  isExpiringSoon?: boolean;
}

/**
 * Checks whether a business currently has active VIP (Golden) status,
 * strictly enforcing tier rules and expiration dates.
 * A store on the Basic Tier (الباقة الأساسية) will NEVER receive VIP privileges.
 */
export function getBusinessVipStatus(business?: Business | null): VipStatusResult {
  if (!business) {
    return {
      isVip: false,
      packagePlan: 'basic',
      tier: 'free',
      badgeLabel: 'باقة مجانية',
      isVerified: false,
      isScheduled: false,
      statusLabel: 'باقة أساسية',
      badgeColor: 'bg-stone-100 text-stone-600',
    };
  }

  const now = Date.now();
  
  // Explicitly check package plan. If explicitly set to 'basic' or 'pay_per_use', it is NOT golden.
  let plan: 'golden' | 'basic' | 'pay_per_use' = 'basic';
  if (business.packagePlan === 'golden' || business.packagePlan === 'vip') {
    plan = 'golden';
  } else if (business.packagePlan === 'pay_per_use') {
    plan = 'pay_per_use';
  } else if (business.packagePlan === 'basic') {
    plan = 'basic';
  } else if (business.isVerified) {
    // Legacy fallback only if packagePlan is not explicitly defined
    plan = 'golden';
  }

  // If the plan is basic or pay-per-use, it CANNOT have VIP status under any circumstances.
  if (plan !== 'golden') {
    return {
      isVip: false,
      packagePlan: plan,
      tier: 'free',
      badgeLabel: 'باقة مجانية',
      isVerified: false,
      isScheduled: false,
      statusLabel: plan === 'pay_per_use' ? 'الدفع حسب الاستخدام' : 'باقة أساسية',
      badgeColor: 'bg-stone-100 text-stone-600',
    };
  }

  const startsAt = business.vipSubscriptionStartsAt;
  const expiresAt = business.vipSubscriptionExpiresAt;
  const isScheduled = !!(business.isVipScheduled || startsAt || expiresAt);

  // If there's a scheduled future start date that hasn't arrived yet
  if (startsAt && startsAt > now) {
    const daysUntilStart = Math.ceil((startsAt - now) / (1000 * 60 * 60 * 24));
    return {
      isVip: false,
      packagePlan: 'golden',
      tier: 'gold',
      badgeLabel: 'الباقة الذهبية (مجدول)',
      isVerified: false,
      isScheduled: true,
      startsAt,
      expiresAt,
      daysRemaining: daysUntilStart,
      statusLabel: `ترقية مجدولة تبدأ بعد ${daysUntilStart} يوم`,
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }

  // If there's an expiration date and it has expired
  if (expiresAt && expiresAt <= now) {
    return {
      isVip: false,
      packagePlan: 'basic',
      tier: 'free',
      badgeLabel: 'انتهت الباقة الذهبية',
      isVerified: false,
      isScheduled: true,
      startsAt,
      expiresAt,
      statusLabel: 'انتهت فترة الترقية الذهبية',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    };
  }

  // VIP is active!
  let daysRemaining: number | undefined;
  let isExpiringSoon = false;
  if (expiresAt) {
    daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
    isExpiringSoon = daysRemaining <= 7;
  }

  return {
    isVip: true,
    packagePlan: 'golden',
    tier: 'gold',
    badgeLabel: 'الباقة الذهبية VIP',
    isVerified: true,
    isScheduled,
    startsAt,
    expiresAt,
    daysRemaining,
    isExpiringSoon,
    statusLabel: expiresAt ? `ذهبي VIP (متبقي ${daysRemaining} يوم)` : 'ذهبي VIP (دائم)',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
  };
}

/**
 * Feature Permission Checkers
 */

/** Check if business is allowed to use Digital Menu */
export function canAccessDigitalMenu(business?: Business | null): boolean {
  return getBusinessVipStatus(business).isVip;
}

/** Check if business is allowed to create & publish promotional offers */
export function canPublishOffers(business?: Business | null): boolean {
  return getBusinessVipStatus(business).isVip;
}

/** Check if business is allowed to view advanced analytics dashboard & competitor benchmarks */
export function canAccessAdvancedAnalytics(business?: Business | null): boolean {
  return getBusinessVipStatus(business).isVip;
}

/** Check if business owner is allowed to post official replies to customer reviews */
export function canReplyToReviews(business?: Business | null): boolean {
  return getBusinessVipStatus(business).isVip;
}

/** Check if customer live chat / instant messaging is enabled for this business */
export function canUseLiveChat(business?: Business | null): boolean {
  return getBusinessVipStatus(business).isVip;
}

/** Get maximum allowed gallery images for business: 5 for basic, 100 for golden */
export function getMaxGalleryImages(business?: Business | null): number {
  return getBusinessVipStatus(business).isVip ? 100 : 5;
}

/** Check if business has active verification badge */
export function hasVerificationBadge(business?: Business | null): boolean {
  return getBusinessVipStatus(business).isVip;
}

