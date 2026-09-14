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
  isTrial?: boolean;
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
      isTrial: false,
    };
  }

  const now = Date.now();
  const isTrial = !!business.isVipTrial;
  
  // Explicitly check package plan or trial status. If explicitly set to 'golden', 'vip', or has active trial, it is golden.
  let plan: 'golden' | 'basic' | 'pay_per_use' = 'basic';
  if (business.packagePlan === 'golden' || business.packagePlan === 'vip' || isTrial) {
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
      isTrial: false,
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
      isTrial,
    };
  }

  // If there's an expiration date and it has expired
  if (expiresAt && expiresAt <= now) {
    return {
      isVip: false,
      packagePlan: 'basic',
      tier: 'free',
      badgeLabel: isTrial ? 'انتهت تجربة VIP المجانية' : 'انتهت الباقة الذهبية',
      isVerified: false,
      isScheduled: true,
      startsAt,
      expiresAt,
      statusLabel: isTrial ? 'انتهت فترة التجربة المجانية (شهر مجاني)' : 'انتهت فترة الترقية الذهبية',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
      isTrial,
    };
  }

  // VIP is active!
  let daysRemaining: number | undefined;
  let isExpiringSoon = false;
  if (expiresAt) {
    daysRemaining = Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)));
    isExpiringSoon = daysRemaining <= 7;
  }

  const badgeLabel = isTrial
    ? `تجربة مجانية VIP (${daysRemaining ?? 30} يوم)`
    : 'الباقة الذهبية VIP';

  const statusLabel = isTrial
    ? `تجربة مجانية شهر (متبقي ${daysRemaining ?? 30} يوم)`
    : (expiresAt ? `ذهبي VIP (متبقي ${daysRemaining} يوم)` : 'ذهبي VIP (دائم)');

  return {
    isVip: true,
    packagePlan: 'golden',
    tier: 'gold',
    badgeLabel,
    isVerified: true,
    isScheduled,
    startsAt,
    expiresAt,
    daysRemaining,
    isExpiringSoon,
    statusLabel,
    badgeColor: isTrial ? 'bg-[#ff9f1c]/15 text-[#b26b00] border-[#ff9f1c]/30 font-black' : 'bg-amber-100 text-amber-900 border-amber-300',
    isTrial,
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

/**
 * Checks if a business is actively featured right now.
 */
export function isBusinessCurrentlyFeatured(business?: Business | null, now = Date.now()): boolean {
  if (!business || !business.isFeatured) return false;
  const startsOk = !business.featuredStartDate || business.featuredStartDate <= now;
  const endsOk = !business.featuredExpiryDate || business.featuredExpiryDate > now;
  return startsOk && endsOk;
}

/**
 * Returns the tier ranking:
 * 3 = Featured (المميز)
 * 2 = Golden VIP subscriber (أصحاب اشتراكات الـ VIP الذهبية)
 * 1 = Regular business (باقي المحلات)
 */
export function getBusinessTierRank(business?: Business | null, now = Date.now()): number {
  if (!business) return 0;
  if (isBusinessCurrentlyFeatured(business, now)) {
    return 3;
  }
  if (getBusinessVipStatus(business).isVip) {
    return 2;
  }
  return 1;
}

/**
 * Compares two businesses so that:
 * 1. Featured businesses come first (المميز)
 * 2. Golden VIP subscribers come second (أصحاب اشتراكات الـ VIP الذهبية)
 * 3. Regular businesses come third (باقي المحلات)
 * 
 * An optional secondarySort function is applied when two businesses share the same tier rank.
 */
export function compareBusinessesByTier(
  a: Business,
  b: Business,
  secondarySort?: (a: Business, b: Business) => number,
  now = Date.now()
): number {
  const rankA = getBusinessTierRank(a, now);
  const rankB = getBusinessTierRank(b, now);

  if (rankA !== rankB) {
    return rankB - rankA; // Higher rank first (3 -> 2 -> 1)
  }

  // Same tier rank: apply secondary sort if provided
  if (secondarySort) {
    const secondaryDiff = secondarySort(a, b);
    if (secondaryDiff !== 0) return secondaryDiff;
  }

  // Default tie-breakers: Newest to oldest (createdAt) first
  const createdDiff = (b.createdAt || 0) - (a.createdAt || 0);
  if (createdDiff !== 0) return createdDiff;

  // Fallback to rating and views if dates are missing or identical
  const ratingDiff = (b.rating || 0) - (a.rating || 0);
  if (ratingDiff !== 0) return ratingDiff;

  return (b.views || 0) - (a.views || 0);
}

export interface WelcomeGiftPlanDetails {
  packagePlan: 'golden' | 'basic';
  isVip: boolean;
  isVipTrial: boolean;
  vipSubscriptionStartsAt: number;
  vipSubscriptionExpiresAt?: number | null;
  isVerified: boolean;
  isFeatured: boolean;
  featuredStartDate?: number | null;
  featuredExpiryDate?: number | null;
}

/**
 * Applies the automatic onboarding perks for newly approved or added businesses & medical facilities:
 * 1. Basic Plan selection:
 *    - Gets a 1-month (30 days) free trial of the Golden VIP package (`isVipTrial: true`).
 *    - `isFeatured: false`.
 * 2. Golden VIP Plan selection:
 *    - Gets the full Golden VIP subscription (`isVipTrial: false`).
 *    - Gets 1 week (7 days) of Featured/Sponsored promotion with the golden border, crown, and "ممول" badge (`isFeatured: true`).
 */
export function applyNewBusinessWelcomeGift(
  chosenPlan: string = 'basic',
  billingPeriod: string = 'yearly',
  now = Date.now()
): WelcomeGiftPlanDetails {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const ONE_MONTH_MS = 30 * ONE_DAY_MS;
  const ONE_WEEK_MS = 7 * ONE_DAY_MS;
  const ONE_YEAR_MS = 365 * ONE_DAY_MS;

  const isGolden = chosenPlan === 'golden' || chosenPlan === 'vip';

  if (isGolden) {
    const vipDuration = billingPeriod === 'monthly' ? ONE_MONTH_MS : ONE_YEAR_MS;
    return {
      packagePlan: 'golden',
      isVip: true,
      isVipTrial: false,
      vipSubscriptionStartsAt: now,
      vipSubscriptionExpiresAt: now + vipDuration,
      isVerified: true,
      // 1-Week Featured / Sponsored promotion with golden frame & ممول badge
      isFeatured: true,
      featuredStartDate: now,
      featuredExpiryDate: now + ONE_WEEK_MS,
    };
  }

  // Basic plan selection -> 1-month free VIP trial!
  return {
    packagePlan: 'basic',
    isVip: true,
    isVipTrial: true,
    vipSubscriptionStartsAt: now,
    vipSubscriptionExpiresAt: now + ONE_MONTH_MS,
    isVerified: true,
    isFeatured: false,
    featuredStartDate: null,
    featuredExpiryDate: null,
  };
}


