import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  limit
} from 'firebase/firestore';
import { LoyaltyProgramConfig, UserLoyaltyCard } from '../types';

export const LOCAL_CARDS_KEY_PREFIX = 'shoof_user_loyalty_';
const bizLoyaltyCache = new Map<string, { data: UserLoyaltyCard[]; time: number }>();

// Default loyalty config if not yet customized
export const DEFAULT_LOYALTY_CONFIG: LoyaltyProgramConfig = {
  enabled: true,
  targetStamps: 6,
  rewardTitle: 'وجبة أو مشروب مجاني',
  rewardDescription: 'عند إتمام 6 أختام احصل على مكافأة مجانية من اختيارك',
  stampExpiryDays: 90,
  secretPin: '1234',
  terms: 'ختم واحد لكل زيارة أو طلب بحد أدنى'
};

/**
 * Fetch all loyalty cards belonging to a specific user
 */
export async function fetchUserLoyaltyCards(userId: string): Promise<UserLoyaltyCard[]> {
  if (!userId) return [];

  // Check fast local cache (5 mins) to avoid redundant reads on profile navigation
  try {
    const raw = localStorage.getItem(LOCAL_CARDS_KEY_PREFIX + userId);
    const cachedTime = Number(localStorage.getItem(LOCAL_CARDS_KEY_PREFIX + userId + '_time') || 0);
    if (raw && (Date.now() - cachedTime < 5 * 60 * 1000)) {
      return JSON.parse(raw);
    }
  } catch {}

  // Try Firestore
  if (db) {
    try {
      const q = query(
        collection(db, 'user_loyalty_cards'),
        where('userId', '==', userId),
        limit(50)
      );
      const snap = await getDocs(q);
      const cards: UserLoyaltyCard[] = [];
      snap.forEach(d => {
        cards.push({ id: d.id, ...d.data() } as UserLoyaltyCard);
      });

      if (cards.length > 0) {
        try {
          localStorage.setItem(LOCAL_CARDS_KEY_PREFIX + userId, JSON.stringify(cards));
          localStorage.setItem(LOCAL_CARDS_KEY_PREFIX + userId + '_time', String(Date.now()));
        } catch {}
        return cards.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      }
    } catch (err) {
      console.warn('Error fetching loyalty cards from firestore:', err);
    }
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(LOCAL_CARDS_KEY_PREFIX + userId);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  return [];
}

/**
 * Fetch all subscribers and stamp data for a specific shop
 */
export async function fetchBusinessLoyaltySubscribers(businessId: string): Promise<UserLoyaltyCard[]> {
  if (!businessId) return [];

  // Check in-memory cache (5 mins)
  const cached = bizLoyaltyCache.get(businessId);
  if (cached && (Date.now() - cached.time < 5 * 60 * 1000)) {
    return cached.data;
  }

  if (db) {
    try {
      const q = query(
        collection(db, 'user_loyalty_cards'),
        where('businessId', '==', businessId),
        limit(50)
      );
      const snap = await getDocs(q);
      const cards: UserLoyaltyCard[] = [];
      snap.forEach(d => {
        cards.push({ id: d.id, ...d.data() } as UserLoyaltyCard);
      });
      const sorted = cards.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      bizLoyaltyCache.set(businessId, { data: sorted, time: Date.now() });
      return sorted;
    } catch (err) {
      console.warn('Error fetching loyalty subscribers for business:', err);
    }
  }

  // Search localStorage for any cards matching this businessId
  try {
    const results: UserLoyaltyCard[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_CARDS_KEY_PREFIX)) {
        const val = localStorage.getItem(key);
        if (val) {
          const list: UserLoyaltyCard[] = JSON.parse(val);
          list.forEach(c => {
            if (c.businessId === businessId) results.push(c);
          });
        }
      }
    }
    return results;
  } catch {}

  return [];
}

/**
 * Add stamps to a customer's loyalty card
 */
export async function addStampToLoyaltyCard(params: {
  businessId: string;
  businessName: string;
  businessCategory?: string;
  businessLogoUrl?: string;
  targetStamps?: number;
  rewardTitle?: string;
  rewardDescription?: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  stampsCount?: number;
}): Promise<{ success: boolean; message: string; card?: UserLoyaltyCard }> {
  const {
    businessId,
    businessName,
    businessCategory,
    businessLogoUrl,
    targetStamps = 6,
    rewardTitle = 'مكافأة مجانية',
    rewardDescription,
    userId,
    userEmail,
    userName,
    userPhone,
    stampsCount = 1
  } = params;

  if (!businessId || !userId) {
    return { success: false, message: 'بيانات المحل أو الزبون غير مكتملة' };
  }

  const cardId = `${userId}_${businessId}`;
  let existingCard: UserLoyaltyCard | null = null;
  let resolvedUserName = userName;
  let resolvedUserPhone = userPhone;
  let resolvedUserEmail = userEmail;

  // Check Firestore first
  if (db) {
    try {
      const cardRef = doc(db, 'user_loyalty_cards', cardId);
      const snap = await getDoc(cardRef);
      if (snap.exists()) {
        existingCard = { id: snap.id, ...snap.data() } as UserLoyaltyCard;
      }

      // If user details not provided, try fetching user document
      if ((!resolvedUserName || !resolvedUserPhone || !resolvedUserEmail) && userId && !userId.startsWith('user_')) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const uData = userDoc.data();
            if (!resolvedUserName) resolvedUserName = uData?.displayName || uData?.name;
            if (!resolvedUserPhone) resolvedUserPhone = uData?.phone;
            if (!resolvedUserEmail) resolvedUserEmail = uData?.email;
          }
        } catch {}
      }
    } catch (e) {
      console.warn('Notice checking loyalty card in firestore:', e);
    }
  }

  const now = Date.now();
  const isNewCard = !existingCard;
  const currentStamps = existingCard ? existingCard.currentStamps + stampsCount : stampsCount;
  const target = existingCard?.targetStamps || targetStamps;
  const isReady = currentStamps >= target;

  const updatedCard: UserLoyaltyCard = {
    id: cardId,
    userId,
    userEmail: resolvedUserEmail || existingCard?.userEmail,
    userName: resolvedUserName || existingCard?.userName || 'زبون مميز',
    userPhone: resolvedUserPhone || existingCard?.userPhone,
    businessId,
    businessName: businessName || existingCard?.businessName || 'محل تجاري',
    businessCategory: businessCategory || existingCard?.businessCategory,
    businessLogoUrl: businessLogoUrl || existingCard?.businessLogoUrl,
    targetStamps: target,
    currentStamps,
    totalCompletedCards: existingCard?.totalCompletedCards || 0,
    rewardTitle: rewardTitle || existingCard?.rewardTitle || 'مكافأة مجانية',
    rewardDescription: rewardDescription || existingCard?.rewardDescription,
    isRewardReady: isReady,
    rewardClaimed: isReady ? false : existingCard?.rewardClaimed,
    createdAt: existingCard?.createdAt || now,
    updatedAt: now,
    lastStampAt: now
  };

  // Save to Firestore
  if (db) {
    try {
      await setDoc(doc(db, 'user_loyalty_cards', cardId), updatedCard, { merge: true });
    } catch (e) {
      console.warn('Error saving loyalty card to firestore:', e);
    }
  }

  // Update localStorage cache
  try {
    const raw = localStorage.getItem(LOCAL_CARDS_KEY_PREFIX + userId);
    let list: UserLoyaltyCard[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(c => c.id === cardId);
    if (idx >= 0) {
      list[idx] = updatedCard;
    } else {
      list.push(updatedCard);
    }
    localStorage.setItem(LOCAL_CARDS_KEY_PREFIX + userId, JSON.stringify(list));
  } catch {}

  return {
    success: true,
    message: isReady ? 'تمت إضافة الختم واكتملت البطاقة بنجاح' : 'تمت إضافة الختم بنجاح',
    card: updatedCard
  };
}

/**
 * Redeem the reward when the card is complete
 */
export async function redeemLoyaltyReward(cardId: string): Promise<{ success: boolean; message: string }> {
  if (!cardId) return { success: false, message: 'معرف البطاقة غير صحيح' };

  const now = Date.now();
  let updatedCard: UserLoyaltyCard | null = null;

  if (db) {
    try {
      const cardRef = doc(db, 'user_loyalty_cards', cardId);
      const snap = await getDoc(cardRef);
      if (snap.exists()) {
        const data = snap.data() as UserLoyaltyCard;
        const totalCompleted = (data.totalCompletedCards || 0) + 1;
        // Reset current stamps to leftover or 0 for next card cycle
        const leftoverStamps = Math.max(0, data.currentStamps - data.targetStamps);
        updatedCard = {
          ...data,
          currentStamps: leftoverStamps,
          isRewardReady: leftoverStamps >= data.targetStamps,
          totalCompletedCards: totalCompleted,
          rewardClaimed: true,
          updatedAt: now
        };
        await updateDoc(cardRef, {
          currentStamps: leftoverStamps,
          isRewardReady: leftoverStamps >= data.targetStamps,
          totalCompletedCards: totalCompleted,
          rewardClaimed: true,
          updatedAt: now
        });
      }
    } catch (e) {
      console.warn('Error redeeming reward in firestore:', e);
    }
  }

  return {
    success: true,
    message: 'تم استبدال وتسليم المكافأة بنجاح وبدء دورة أختام جديدة'
  };
}

/**
 * Save loyalty program configuration for a business
 */
export async function saveBusinessLoyaltyConfig(businessId: string, config: LoyaltyProgramConfig): Promise<boolean> {
  if (!businessId) return false;

  if (db) {
    try {
      const bizRef = doc(db, 'businesses', businessId);
      await updateDoc(bizRef, {
        loyaltyProgram: config
      });
      return true;
    } catch (err) {
      console.error('Error saving loyalty program configuration:', err);
      return false;
    }
  }
  return true;
}

export interface ParsedLoyaltyQr {
  userId: string;
  userName?: string;
  userPhone?: string;
  userEmail?: string;
}

/**
 * Parse a customer loyalty QR code string into user identifiers
 */
export function parseLoyaltyUserQr(qrText: string): ParsedLoyaltyQr | null {
  const trimmed = (qrText || '').trim();
  if (!trimmed) return null;

  // Format 1: shofi_loyalty_user:<uid> or shofi_loyalty_user:{...}
  if (trimmed.startsWith('shofi_loyalty_user:')) {
    const raw = trimmed.replace('shofi_loyalty_user:', '').trim();
    if (raw.startsWith('{') && raw.endsWith('}')) {
      try {
        const parsed = JSON.parse(raw);
        return {
          userId: parsed.uid || parsed.userId,
          userName: parsed.name || parsed.userName,
          userPhone: parsed.phone || parsed.userPhone,
          userEmail: parsed.email || parsed.userEmail,
        };
      } catch {}
    }
    return { userId: raw };
  }

  // Format 2: JSON format { type: 'shofi_loyalty', uid: ... }
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.type === 'shofi_loyalty' || parsed.loyaltyUserId || (parsed.uid && parsed.loyalty)) {
        return {
          userId: parsed.uid || parsed.userId || parsed.loyaltyUserId,
          userName: parsed.name || parsed.userName,
          userPhone: parsed.phone || parsed.userPhone,
          userEmail: parsed.email || parsed.userEmail,
        };
      }
    } catch {}
  }

  return null;
}

/**
 * Generate a standardized QR payload string for a customer's loyalty profile
 */
export function generateCustomerLoyaltyQrPayload(params: {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
}): string {
  const { uid, displayName, email, phoneNumber } = params;
  if (!uid) return '';
  return `shofi_loyalty_user:${JSON.stringify({
    uid,
    name: displayName || undefined,
    email: email || undefined,
    phone: phoneNumber || undefined
  })}`;
}

/**
 * Resolves a loyalty user from a QR payload or manual input code (UID, phone, email, or loyalty prefix)
 */
export async function resolveLoyaltyUser(input: string): Promise<ParsedLoyaltyQr | null> {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;

  // 1. Direct QR parse
  const directParsed = parseLoyaltyUserQr(trimmed);
  if (directParsed) return directParsed;

  // 2. Check known prefixes
  const lower = trimmed.toLowerCase();
  const knownPrefixes = ['loyalty:', 'loyalty_user:', 'uid:', 'user:', 'id:'];
  for (const prefix of knownPrefixes) {
    if (lower.startsWith(prefix)) {
      const cleanId = trimmed.slice(prefix.length).trim();
      if (cleanId) {
        return await resolveLoyaltyUserByIdOrQuery(cleanId);
      }
    }
  }

  // 3. Resolve by ID or Query
  return await resolveLoyaltyUserByIdOrQuery(trimmed);
}

async function resolveLoyaltyUserByIdOrQuery(idOrQuery: string): Promise<ParsedLoyaltyQr | null> {
  const clean = idOrQuery.trim();
  if (!clean) return null;

  // Check Firestore
  if (db) {
    try {
      // 1. Check direct user document by UID
      const userDocRef = doc(db, 'users', clean);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const uData = userSnap.data();
        return {
          userId: userSnap.id,
          userName: uData?.displayName || uData?.name,
          userPhone: uData?.phoneNumber || uData?.phone,
          userEmail: uData?.email
        };
      }

      // 2. Check if a card already exists with this userId in user_loyalty_cards
      const qCard = query(collection(db, 'user_loyalty_cards'), where('userId', '==', clean));
      const cardSnap = await getDocs(qCard);
      if (!cardSnap.empty) {
        const cData = cardSnap.docs[0].data();
        return {
          userId: clean,
          userName: cData?.userName,
          userPhone: cData?.userPhone,
          userEmail: cData?.userEmail
        };
      }

      // 3. If input is an email, search by email
      if (clean.includes('@')) {
        const qEmail = query(collection(db, 'users'), where('email', '==', clean.toLowerCase()));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          const uData = snapEmail.docs[0].data();
          return {
            userId: snapEmail.docs[0].id,
            userName: uData?.displayName || uData?.name,
            userPhone: uData?.phoneNumber || uData?.phone,
            userEmail: uData?.email
          };
        }
      }

      // 4. If input is phone digits, search by phone
      const phoneDigits = clean.replace(/\D/g, '');
      if (phoneDigits.length >= 7 && phoneDigits.length <= 15) {
        const qPhone = query(collection(db, 'users'), where('phone', '==', clean));
        const snapPhone = await getDocs(qPhone);
        if (!snapPhone.empty) {
          const uData = snapPhone.docs[0].data();
          return {
            userId: snapPhone.docs[0].id,
            userName: uData?.displayName || uData?.name,
            userPhone: uData?.phoneNumber || uData?.phone,
            userEmail: uData?.email
          };
        }
      }
    } catch (e) {
      console.warn('Notice resolving loyalty user in firestore:', e);
    }
  }

  // LocalStorage fallback
  try {
    const raw = localStorage.getItem(LOCAL_CARDS_KEY_PREFIX + clean);
    if (raw) {
      const cards: UserLoyaltyCard[] = JSON.parse(raw);
      if (cards && cards.length > 0) {
        return {
          userId: clean,
          userName: cards[0].userName,
          userPhone: cards[0].userPhone,
          userEmail: cards[0].userEmail
        };
      }
    }
  } catch {}

  // If format matches typical Firebase Auth UID or user ID (between 6 and 64 alphanumeric characters, underscores, or dashes)
  // Ensure it is not a coupon format (e.g. SHOP-15-XXXX) or order (ORD_...)
  const isCouponFormat = /^[A-Z0-9_]+-\d{1,3}-[A-Z0-9]+$/i.test(clean);
  const isOrderFormat = /^ORD_/i.test(clean) || (/^\d{4}$/.test(clean) && clean.length === 4);
  if (!isCouponFormat && !isOrderFormat && /^[a-zA-Z0-9_-]{6,64}$/.test(clean)) {
    return {
      userId: clean,
      userName: 'زبون المنصة'
    };
  }

  return null;
}
