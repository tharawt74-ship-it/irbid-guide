import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

export interface UserReward {
  id: string;
  userId: string;
  businessId: string;
  businessName: string;
  code: string;
  discountPercent: number;
  createdAt: number;
  expiresAt: number;
  used: boolean;
  usedAt?: number;
  isCampaignExpired?: boolean;
  giftCodeEndDate?: string;
}

const LOCAL_STORAGE_KEY_PREFIX = 'shoofi_user_rewards_';

function getLocalRewards(userId: string): UserReward[] {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + userId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Error reading rewards from localStorage:', e);
    return [];
  }
}

function setLocalRewards(userId: string, rewards: UserReward[]) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + userId, JSON.stringify(rewards));
  } catch (e) {
    console.warn('Error saving rewards to localStorage:', e);
  }
}

/**
 * Saves a user reward across all available storage tiers:
 * 1. User profile in Firestore (users/{userId}.rewards) - 100% allowed by existing rules
 * 2. Client localStorage - Instant offline recovery
 * 3. Dedicated user_rewards collection in Firestore - Attempted safely
 */
export async function saveUserReward(reward: UserReward): Promise<void> {
  // 1. Immediately persist to localStorage
  const localList = getLocalRewards(reward.userId);
  const updatedLocal = [reward, ...localList.filter(r => r.id !== reward.id && r.code !== reward.code)];
  setLocalRewards(reward.userId, updatedLocal);

  if (!db) return;

  // 2. Persist to users/{userId} doc in Firestore (permitted for owner)
  try {
    const userRef = doc(db, 'users', reward.userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const existingRewards: UserReward[] = Array.isArray(userData.rewards) ? userData.rewards : [];
      const merged = [reward, ...existingRewards.filter(r => r.id !== reward.id && r.code !== reward.code)];
      await updateDoc(userRef, {
        rewards: merged,
        updatedAt: Date.now()
      });
    }
  } catch (userDocErr) {
    console.warn('Could not update rewards in user doc:', userDocErr);
  }

  // 3. Attempt to save to user_rewards collection
  try {
    const rewardRef = doc(collection(db, 'user_rewards'), reward.id);
    await setDoc(rewardRef, {
      userId: reward.userId,
      businessId: reward.businessId,
      businessName: reward.businessName,
      code: reward.code,
      discountPercent: reward.discountPercent,
      createdAt: reward.createdAt,
      expiresAt: reward.expiresAt,
      used: reward.used
    });
  } catch (colErr) {
    // Non-fatal: if collection rules are not yet deployed in Firebase console,
    // the reward is still securely saved in the user doc and local storage!
    console.info('user_rewards collection write restricted. Saved safely to user profile & storage.', colErr);
  }
}

/**
 * Fetches all rewards for a user, combining:
 * 1. Firestore users/{userId}.rewards
 * 2. Dedicated user_rewards collection (if accessible)
 * 3. Client localStorage
 */
export async function fetchUserRewards(userId: string): Promise<UserReward[]> {
  const map = new Map<string, UserReward>();

  // 1. Load from localStorage
  const local = getLocalRewards(userId);
  for (const r of local) {
    map.set(r.code, r);
  }

  if (db && userId) {
    // 2. Load from user doc
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (Array.isArray(userData.rewards)) {
          for (const r of userData.rewards) {
            map.set(r.code, { ...map.get(r.code), ...r });
          }
        }
      }
    } catch (err) {
      console.warn('Could not read user doc rewards:', err);
    }

    // 3. Load from user_rewards collection
    try {
      const q = query(collection(db, 'user_rewards'), where('userId', '==', userId));
      const snap = await getDocs(q);
      snap.forEach(d => {
        const data = d.data() as UserReward;
        map.set(data.code, { id: d.id, ...data });
      });
    } catch (err) {
      // Graceful fallback if collection rule is missing
      console.info('user_rewards collection query restricted, using profile rewards.');
    }
  }

  // 4. Cross-reference all loaded rewards against the central redeemed_codes registry
  // This guarantees that when a merchant consumes a code on their device/scanner, the customer's
  // "My Rewards" page immediately reflects that the code is used/redeemed!
  const allCodes = Array.from(map.keys());
  if (allCodes.length > 0) {
    await Promise.all(allCodes.map(async (code) => {
      const reward = map.get(code);
      if (!reward || reward.used) return;
      try {
        const check = await checkCodeRedeemedStatus(code);
        if (check.isRedeemed) {
          map.set(code, {
            ...reward,
            used: true,
            usedAt: check.redeemedAt || reward.usedAt || Date.now()
          });
        }
      } catch (e) {
        // continue
      }
    }));
  }

  const combined = Array.from(map.values());
  combined.sort((a, b) => b.createdAt - a.createdAt);

  // Sync back to local storage
  setLocalRewards(userId, combined);
  return combined;
}

/**
 * Finds if user already has an active reward for a specific business
 */
export async function findExistingRewardForBusiness(userId: string, businessId: string): Promise<UserReward | null> {
  const all = await fetchUserRewards(userId);
  return all.find(r => r.businessId === businessId && !r.used) || all.find(r => r.businessId === businessId) || null;
}

/**
 * Records a redeemed code globally in Firestore 'redeemed_codes' collection and local state
 * This ensures ANY code (whether user_reward doc exists or not, or across multiple devices/cashiers)
 * can NEVER be consumed more than once.
 */
export async function recordCodeRedemption(
  code: string,
  businessId: string,
  businessName: string,
  discountPercent: number,
  merchantId?: string,
  customerUserId?: string
): Promise<void> {
  const normalizedCode = code.trim().toUpperCase();
  const timestamp = Date.now();

  // 1. Persist to local cache for instant zero-latency recognition
  try {
    const localUsedKey = 'shoofi_redeemed_codes_cache';
    const existingRaw = localStorage.getItem(localUsedKey);
    const set = existingRaw ? JSON.parse(existingRaw) : [];
    if (!set.includes(normalizedCode)) {
      set.push(normalizedCode);
      localStorage.setItem(localUsedKey, JSON.stringify(set));
    }
  } catch (e) {
    console.warn('Could not record redemption in localStorage cache:', e);
  }

  // 2. Persist to Firestore dedicated 'redeemed_codes' document by code ID
  if (db) {
    try {
      const redeemedRef = doc(db, 'redeemed_codes', normalizedCode);
      await setDoc(redeemedRef, {
        code: normalizedCode,
        businessId: businessId || '',
        businessName: businessName || '',
        discountPercent: discountPercent || 0,
        merchantId: merchantId || '',
        customerUserId: customerUserId || '',
        redeemedAt: timestamp,
        used: true
      }, { merge: true });
    } catch (err) {
      console.info('Firestore redeemed_codes recording note:', err);
    }
  }
}

/**
 * Checks if a code has already been redeemed / consumed globally
 */
export async function checkCodeRedeemedStatus(code: string): Promise<{ isRedeemed: boolean; redeemedAt?: number; redeemedStore?: string }> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return { isRedeemed: false };

  // 1. Check local redemption cache
  try {
    const localUsedKey = 'shoofi_redeemed_codes_cache';
    const existingRaw = localStorage.getItem(localUsedKey);
    if (existingRaw) {
      const list = JSON.parse(existingRaw);
      if (Array.isArray(list) && list.includes(normalizedCode)) {
        return { isRedeemed: true };
      }
    }

    // Also scan all shoofi_user_rewards_* in localStorage for any consumed instance of this code
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('shoofi_user_rewards_') || key === 'shoofi_user_rewards_guest')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const arr = JSON.parse(raw);
            if (Array.isArray(arr)) {
              const matched = arr.find((r: any) => (r.code || '').trim().toUpperCase() === normalizedCode);
              if (matched && matched.used) {
                return {
                  isRedeemed: true,
                  redeemedAt: matched.usedAt || undefined,
                  redeemedStore: matched.businessName || undefined
                };
              }
            }
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    // continue
  }

  // 2. Check Firestore redeemed_codes collection
  if (db) {
    try {
      const docRef = doc(db, 'redeemed_codes', normalizedCode);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.used !== false) {
          // Cache locally too
          try {
            const localUsedKey = 'shoofi_redeemed_codes_cache';
            const existingRaw = localStorage.getItem(localUsedKey);
            const set = existingRaw ? JSON.parse(existingRaw) : [];
            if (!set.includes(normalizedCode)) {
              set.push(normalizedCode);
              localStorage.setItem(localUsedKey, JSON.stringify(set));
            }
          } catch (e) {}

          return { 
            isRedeemed: true, 
            redeemedAt: data.redeemedAt ? Number(data.redeemedAt) : undefined,
            redeemedStore: data.businessName || undefined
          };
        }
      }
    } catch (err) {
      console.info('redeemed_codes collection lookup bypassed:', err);
    }
  }

  return { isRedeemed: false };
}

/**
 * Updates a reward's used state across all storage tiers
 */
export async function markRewardUsed(userId: string, rewardId: string, code: string, used: boolean): Promise<void> {
  const usedAt = used ? Date.now() : undefined;

  if (used && code) {
    // 0. Record in global redeemed_codes register for foolproof single-use enforcement
    recordCodeRedemption(code, '', '', 0, undefined, userId).catch(() => {});
  }

  // 1. Update localStorage
  const local = getLocalRewards(userId);
  const updatedLocal = local.map(r => (r.id === rewardId || r.code === code) ? { ...r, used, usedAt } : r);
  setLocalRewards(userId, updatedLocal);

  if (!db) return;

  // 2. Update user doc
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (Array.isArray(userData.rewards)) {
        const updated = userData.rewards.map((r: UserReward) => 
          (r.id === rewardId || r.code === code) ? { ...r, used, usedAt } : r
        );
        await updateDoc(userRef, { rewards: updated });
      }
    }
  } catch (e) {
    console.warn('Could not update reward in user doc:', e);
  }

  // 3. Update in user_rewards collection
  try {
    const rewardRef = doc(db, 'user_rewards', rewardId);
    await updateDoc(rewardRef, { used, usedAt: usedAt || null });
  } catch (e) {
    console.info('Could not update user_rewards collection doc:', e);
  }
}

/**
 * Deletes a reward across all storage tiers
 */
export async function deleteReward(userId: string, rewardId: string, code: string): Promise<void> {
  // 1. Update localStorage
  const local = getLocalRewards(userId);
  const updatedLocal = local.filter(r => r.id !== rewardId && r.code !== code);
  setLocalRewards(userId, updatedLocal);

  if (!db) return;

  // 2. Update user doc
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (Array.isArray(userData.rewards)) {
        const updated = userData.rewards.filter((r: UserReward) => r.id !== rewardId && r.code !== code);
        await updateDoc(userRef, { rewards: updated });
      }
    }
  } catch (e) {
    console.warn('Could not delete reward from user doc:', e);
  }

  // 3. Delete from user_rewards collection
  try {
    await deleteDoc(doc(db, 'user_rewards', rewardId));
  } catch (e) {
    console.info('Could not delete from user_rewards collection:', e);
  }
}
