import { db, auth } from './firebase';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';

export interface AuthInputResolution {
  isPhone: boolean;
  effectiveEmail: string;
  isAuthorized: boolean;
  phoneDigits?: string;
  matchedBusinessIds?: string[];
  errorMessage?: string;
}

/**
 * Normalizes Jordanian phone numbers into search variants.
 * Examples: "079 123 4567" -> ["0791234567", "962791234567", "+962791234567", "00962791234567"]
 */
export function getPhoneVariants(input: string): string[] {
  const digits = input.replace(/\D/g, '');
  if (digits.length < 8) return [input.trim()];

  const set = new Set<string>();
  set.add(input.trim());
  set.add(digits);

  let local = digits;
  if (digits.startsWith('962') && digits.length >= 11) {
    local = '0' + digits.slice(3);
  } else if (digits.startsWith('00962') && digits.length >= 13) {
    local = '0' + digits.slice(5);
  } else if (digits.length === 9 && digits.startsWith('7')) {
    local = '0' + digits;
  }

  if (local.startsWith('07') && local.length === 10) {
    const raw7 = local.slice(1); // 79xxxxxxx
    set.add(local); // 079xxxxxxx
    set.add(`+962${raw7}`); // +96279xxxxxxx
    set.add(`962${raw7}`); // 96279xxxxxxx
    set.add(`00962${raw7}`); // 0096279xxxxxxx
  }

  return Array.from(set);
}

/**
 * Checks if a given email or phone number belongs to a business or medical facility created/onboarded by Admin.
 * Returns true if the user was onboarded by Admin and should bypass verification completely.
 */
export async function isUserOnboardedByAdmin(emailOrPhone: string): Promise<boolean> {
  const clean = emailOrPhone.trim();
  if (!clean || !db) return false;

  try {
    const cleanLower = clean.toLowerCase();
    const phoneVariants = getPhoneVariants(clean);
    const businessesRef = collection(db, 'businesses');

    // 1. Check direct query matches in businesses
    const [snapOwnerEmail, snapOwnerContact, snapUserEmail, snapOwnerPhone, snapPhone] = await Promise.all([
      getDocs(query(businessesRef, where('ownerEmail', '==', cleanLower))).catch(() => null),
      getDocs(query(businessesRef, where('ownerContact', '==', cleanLower))).catch(() => null),
      getDocs(query(businessesRef, where('userEmail', '==', cleanLower))).catch(() => null),
      getDocs(query(businessesRef, where('ownerPhone', 'in', phoneVariants.slice(0, 10)))).catch(() => null),
      getDocs(query(businessesRef, where('phone', 'in', phoneVariants.slice(0, 10)))).catch(() => null)
    ]);

    if (
      (snapOwnerEmail && !snapOwnerEmail.empty) ||
      (snapOwnerContact && !snapOwnerContact.empty) ||
      (snapUserEmail && !snapUserEmail.empty) ||
      (snapOwnerPhone && !snapOwnerPhone.empty) ||
      (snapPhone && !snapPhone.empty)
    ) {
      return true;
    }

    // 2. Fallback deep scan across businesses for substring phone/email matches
    const allBizSnap = await getDocs(businessesRef).catch(() => null);
    if (allBizSnap && !allBizSnap.empty) {
      const digitsOnly = clean.replace(/\D/g, '');
      let matchFound = false;
      allBizSnap.forEach(docSnap => {
        if (matchFound) return;
        const data = docSnap.data();
        const oEmail = (data.ownerEmail || '').trim().toLowerCase();
        const uEmail = (data.userEmail || '').trim().toLowerCase();
        const oContact = (data.ownerContact || '').trim().toLowerCase();

        if (oEmail === cleanLower || uEmail === cleanLower || oContact === cleanLower) {
          matchFound = true;
          return;
        }

        if (digitsOnly.length >= 8) {
          const fields = [data.ownerPhone, data.ownerContact, data.phone, data.whatsapp];
          for (const f of fields) {
            if (f) {
              const bDigits = String(f).replace(/\D/g, '');
              if (bDigits && bDigits.length >= 8 && (bDigits.includes(digitsOnly) || digitsOnly.includes(bDigits))) {
                matchFound = true;
                return;
              }
            }
          }
        }
      });
      if (matchFound) return true;
    }

    return false;
  } catch (err) {
    console.warn("isUserOnboardedByAdmin check warning:", err);
    return false;
  }
}

/**
 * Checks if input is an email or a phone number.
 * If phone number:
 * 1. Queries Firestore 'businesses' collection (publicly readable) to verify if this phone number
 *    is registered as an owner/contact in any business or medical facility.
 * 2. If registered, returns authorized = true and synthetic/real email for Firebase Auth.
 * 3. If NOT registered, returns authorized = false with an Arabic error message.
 */
export async function resolveAuthInput(input: string): Promise<AuthInputResolution> {
  const cleanInput = input.trim();
  if (!cleanInput) {
    return { 
      isPhone: false, 
      effectiveEmail: '', 
      isAuthorized: false, 
      errorMessage: 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف.' 
    };
  }

  // 1. If input contains '@', it is an email address
  if (cleanInput.includes('@')) {
    return {
      isPhone: false,
      effectiveEmail: cleanInput.toLowerCase(),
      isAuthorized: true
    };
  }

  // 2. Input does not contain '@' -> Phone number attempt
  const digitsOnly = cleanInput.replace(/\D/g, '');
  const phoneVariants = getPhoneVariants(cleanInput);

  if (digitsOnly.length < 8) {
    return {
      isPhone: true,
      effectiveEmail: '',
      isAuthorized: false,
      errorMessage: 'يرجى إدخال بريد إلكتروني صحيح أو رقم هاتف أردني يتكون من 10 أرقام (مثال: 0791234567).'
    };
  }

  const syntheticEmail = `phone_${digitsOnly}@shoofiirbid.com`;

  if (!db) {
    return {
      isPhone: true,
      effectiveEmail: syntheticEmail,
      isAuthorized: true,
      phoneDigits: digitsOnly
    };
  }

  try {
    const businessesRef = collection(db, 'businesses');

    // Query 'businesses' collection only (which has 'allow read: if true') to avoid unauthenticated rule errors
    const [
      snapOwnerPhone,
      snapOwnerContact,
      snapOwnerEmail,
      snapPhone
    ] = await Promise.all([
      getDocs(query(businessesRef, where('ownerPhone', 'in', phoneVariants.slice(0, 10)))).catch(() => null),
      getDocs(query(businessesRef, where('ownerContact', 'in', phoneVariants.slice(0, 10)))).catch(() => null),
      getDocs(query(businessesRef, where('ownerEmail', 'in', phoneVariants.slice(0, 10)))).catch(() => null),
      getDocs(query(businessesRef, where('phone', 'in', phoneVariants.slice(0, 10)))).catch(() => null)
    ]);

    const matchedBusinessIds: string[] = [];
    let foundMatch = false;
    let realEmailIfAny = '';

    const processSnap = (snap: any) => {
      if (snap && !snap.empty) {
        snap.forEach((docSnap: any) => {
          foundMatch = true;
          matchedBusinessIds.push(docSnap.id);
          const data = docSnap.data();
          if (data.ownerEmail && data.ownerEmail.includes('@')) {
            realEmailIfAny = data.ownerEmail;
          } else if (data.userEmail && data.userEmail.includes('@')) {
            realEmailIfAny = data.userEmail;
          }
        });
      }
    };

    processSnap(snapOwnerPhone);
    processSnap(snapOwnerContact);
    processSnap(snapOwnerEmail);
    processSnap(snapPhone);

    // Deep check across all businesses if queries yielded no exact indexed match
    if (!foundMatch) {
      const allBizSnap = await getDocs(businessesRef).catch(() => null);
      if (allBizSnap) {
        allBizSnap.forEach(docSnap => {
          const data = docSnap.data();
          const fields = [
            data.ownerPhone,
            data.ownerContact,
            data.phone,
            data.whatsapp,
            data.ownerEmail,
            data.medicalProfile?.emergencyPhone
          ];
          for (const f of fields) {
            if (f) {
              const str = String(f);
              const bDigits = str.replace(/\D/g, '');
              if (bDigits && (bDigits.includes(digitsOnly) || digitsOnly.includes(bDigits))) {
                foundMatch = true;
                matchedBusinessIds.push(docSnap.id);
                if (data.ownerEmail && data.ownerEmail.includes('@')) {
                  realEmailIfAny = data.ownerEmail;
                }
                break;
              }
            }
          }
        });
      }
    }

    if (!foundMatch) {
      return {
        isPhone: true,
        effectiveEmail: '',
        isAuthorized: false,
        phoneDigits: digitsOnly,
        errorMessage: 'عذراً، رقم الهاتف هذا غير مسجل كمالك منشأة أو محل بالمنصة. يرجى استخدام البريد الإلكتروني للتسجيل/تسجيل الدخول، أو التواصل مع إدارة المنصة لتفويض رقم هاتفك كمالك منشأة.'
      };
    }

    const effectiveEmail = realEmailIfAny || syntheticEmail;

    return {
      isPhone: true,
      effectiveEmail,
      isAuthorized: true,
      phoneDigits: digitsOnly,
      matchedBusinessIds
    };
  } catch (err) {
    console.warn("Phone owner authorization check error:", err);
    return {
      isPhone: true,
      effectiveEmail: syntheticEmail,
      isAuthorized: true,
      phoneDigits: digitsOnly
    };
  }
}

/**
 * Links a newly registered/logged-in user UID to their matched business documents in Firestore.
 */
export async function linkUserToMatchedBusinesses(userId: string, phoneDigits?: string, email?: string): Promise<void> {
  if (!db || !userId) return;

  try {
    const businessesRef = collection(db, 'businesses');
    const allBizSnap = await getDocs(businessesRef).catch(() => null);
    if (!allBizSnap) return;

    const updates: Promise<void>[] = [];

    allBizSnap.forEach(docSnap => {
      const data = docSnap.data();
      let match = false;

      // Extract phone digits if phone digits provided
      if (phoneDigits && phoneDigits.length >= 8) {
        const fields = [
          data.ownerPhone, 
          data.ownerContact, 
          data.phone, 
          data.whatsapp, 
          data.ownerEmail,
          data.medicalProfile?.emergencyPhone
        ];
        for (const f of fields) {
          if (f) {
            const bDigits = String(f).replace(/\D/g, '');
            if (bDigits && bDigits.length >= 8 && (bDigits.includes(phoneDigits) || phoneDigits.includes(bDigits))) {
              match = true;
              break;
            }
          }
        }
      }

      // Check email match if email provided and not synthetic or synthetic matched
      if (!match && email && email.includes('@')) {
        const cleanEmail = email.trim().toLowerCase();
        const oEmail = (data.ownerEmail || '').trim().toLowerCase();
        const uEmail = (data.userEmail || '').trim().toLowerCase();
        const oContact = (data.ownerContact || '').trim().toLowerCase();

        if (oEmail === cleanEmail || uEmail === cleanEmail || oContact === cleanEmail) {
          match = true;
        } else if (cleanEmail.startsWith('phone_')) {
          const digitsFromEmail = cleanEmail.replace('phone_', '').split('@')[0];
          if (digitsFromEmail.length >= 8) {
            const fields = [data.ownerPhone, data.ownerContact, data.phone, data.whatsapp];
            for (const f of fields) {
              if (f) {
                const bDigits = String(f).replace(/\D/g, '');
                if (bDigits && (bDigits.includes(digitsFromEmail) || digitsFromEmail.includes(bDigits))) {
                  match = true;
                  break;
                }
              }
            }
          }
        }
      }

      if (match && data.userId !== userId) {
        const docRef = doc(db, 'businesses', docSnap.id);
        updates.push(updateDoc(docRef, { 
          userId, 
          isVerified: true,
          ...(email && !email.startsWith('phone_') ? { userEmail: email } : {}) 
        }).catch((err) => {
          console.warn(`Failed to link business ${docSnap.id} to user ${userId}:`, err);
        }));
      }
    });

    await Promise.all(updates);
  } catch (e) {
    console.warn("Could not auto-link user to matched businesses:", e);
  }
}
