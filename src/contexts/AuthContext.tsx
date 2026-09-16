import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserRole, UserProfile, SupervisorPermissions, Business } from '../types';
import { linkUserToMatchedBusinesses } from '../lib/authPhoneHelper';

const ADMIN_BOOTSTRAP_EMAILS = [
  'princessofx2344@gmail.com',
  'admin@shoofiirbid.com',
  'irbid.admin@gmail.com',
  'tharawt74@gmail.com'
];

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  userRole: UserRole;
  isAdmin: boolean;           // Super admin (مدير الموقع العام)
  isSupervisor: boolean;      // Supervisor / Moderator (مشرف)
  isStaff: boolean;           // Admin or Supervisor (فريق الإدارة والإشراف)
  isMerchant: boolean;        // Business owner with shops (صاحب محل)
  supervisorPermissions?: SupervisorPermissions;
  ownedBusinesses: Business[];
  userFavorites: string[];
  toggleFavorite: (businessId: string) => Promise<void>;
  isFavorite: (businessId: string) => boolean;
  refreshUserData: () => Promise<void>;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('guest');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [supervisorPermissions, setSupervisorPermissions] = useState<SupervisorPermissions | undefined>(undefined);
  const [ownedBusinesses, setOwnedBusinesses] = useState<Business[]>([]);
  const [userFavorites, setUserFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user favorites from localStorage or sync with user
  const loadLocalFavorites = useCallback((uid?: string) => {
    try {
      const key = uid ? `irbid_favorites_${uid}` : 'irbid_favorites_guest';
      const stored = localStorage.getItem(key);
      if (stored) {
        setUserFavorites(JSON.parse(stored));
      } else {
        setUserFavorites([]);
      }
    } catch {
      setUserFavorites([]);
    }
  }, []);

  const saveFavorites = useCallback((newFavs: string[], uid?: string) => {
    try {
      const key = uid ? `irbid_favorites_${uid}` : 'irbid_favorites_guest';
      localStorage.setItem(key, JSON.stringify(newFavs));
      setUserFavorites(newFavs);
    } catch (e) {
      console.warn("Could not persist favorites:", e);
    }
  }, []);

  const toggleFavorite = useCallback(async (businessId: string) => {
    const isFav = userFavorites.includes(businessId);
    const updated = isFav 
      ? userFavorites.filter(id => id !== businessId)
      : [...userFavorites, businessId];

    saveFavorites(updated, currentUser?.uid);

    // If user is logged in, optionally save in user document
    if (currentUser && db) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, { savedFavorites: updated }, { merge: true });
      } catch (err) {
        console.warn("Could not sync favorite to firestore:", err);
      }
    }
  }, [userFavorites, currentUser, saveFavorites]);

  const isFavorite = useCallback((businessId: string) => {
    return userFavorites.includes(businessId);
  }, [userFavorites]);

  // Fetch full user role, profile and owned businesses
  const fetchUserData = useCallback(async (user: User | null) => {
    if (!user) {
      setUserProfile(null);
      setUserRole('guest');
      setIsAdmin(false);
      setIsSupervisor(false);
      setSupervisorPermissions(undefined);
      setOwnedBusinesses([]);
      loadLocalFavorites();
      return;
    }

    loadLocalFavorites(user.uid);

    const userEmail = (user.email || '').toLowerCase().trim();
    let computedRole: UserRole = 'user';
    let isAdminRole = false;
    let isSupervisorRole = false;
    let perms: SupervisorPermissions | undefined = undefined;

    // 1. Instant cache check for zero-delay admin and profile recognition
    if (typeof window !== 'undefined') {
      try {
        const cachedRaw = localStorage.getItem('shoof_auth_cache_' + user.uid);
        if (cachedRaw) {
          const cachedProf = JSON.parse(cachedRaw);
          if (cachedProf && cachedProf.uid === user.uid) {
            setUserProfile(cachedProf);
            setUserRole(cachedProf.role || 'user');
            setIsAdmin(cachedProf.role === 'super_admin');
            setIsSupervisor(cachedProf.role === 'supervisor');
            if (cachedProf.supervisorPermissions) {
              setSupervisorPermissions(cachedProf.supervisorPermissions);
            }
            if (cachedProf.role === 'super_admin') {
              isAdminRole = true;
              computedRole = 'super_admin';
            }
            setLoading(false);
          }
        }
      } catch {
        // ignore cache parse error
      }
    }

    // 2. Check bootstrap email match for Super Admin
    const isGoogleUser = user.providerData.some(p => p.providerId === 'google.com');
    if ((user.emailVerified || isGoogleUser || userEmail) && ADMIN_BOOTSTRAP_EMAILS.some(adminEmail => adminEmail.toLowerCase() === userEmail)) {
      isAdminRole = true;
      computedRole = 'super_admin';
    }

    if (db) {
      try {
        // Fetch all auth and user documents concurrently in parallel
        const [adminDocSnap, supervisorDocSnap, userDocSnap, bizSnap] = await Promise.all([
          getDoc(doc(db, 'admins', user.uid)).catch(e => {
            console.warn("Could not fetch admin role:", e);
            return null;
          }),
          getDoc(doc(db, 'supervisors', user.uid)).catch(e => {
            console.warn("Could not fetch supervisor role:", e);
            return null;
          }),
          getDoc(doc(db, 'users', user.uid)).catch(e => {
            console.warn("Could not fetch user profile:", e);
            return null;
          }),
          getDocs(query(collection(db, 'businesses'), where('userId', '==', user.uid))).catch(e => {
            console.warn("Could not fetch owned businesses:", e);
            return null;
          })
        ]);

        if (adminDocSnap && adminDocSnap.exists()) {
          isAdminRole = true;
          computedRole = 'super_admin';
        }

        if (supervisorDocSnap && supervisorDocSnap.exists() && !isAdminRole) {
          isSupervisorRole = true;
          computedRole = 'supervisor';
          const supData = supervisorDocSnap.data();
          perms = supData?.permissions || {
            canApproveShops: true,
            canModerateJobs: true,
            canModerateReviews: true,
            canManageBanners: false
          };
        }

        const profileData = userDocSnap && userDocSnap.exists() ? userDocSnap.data() : null;

        let activeFavorites = userFavorites;
        if (profileData) {
          if (isAdminRole) {
            computedRole = 'super_admin';
          } else if (isSupervisorRole) {
            computedRole = 'supervisor';
            perms = profileData.supervisorPermissions || perms;
          }

          if (Array.isArray(profileData.savedFavorites) && profileData.savedFavorites.length > 0) {
            activeFavorites = profileData.savedFavorites;
            setUserFavorites(profileData.savedFavorites);
            saveFavorites(profileData.savedFavorites, user.uid);
          }
        }

        const userPhone = profileData?.phone || (userEmail.startsWith('phone_') ? userEmail.replace('phone_', '').split('@')[0] : '');
        
        // Auto-link any business created with this user's phone or email in golden field
        if (db) {
          await linkUserToMatchedBusinesses(user.uid, userPhone, userEmail);
        }

        const userBizMap = new Map<string, Business>();

        // Re-query businesses now that matching businesses have been transferred to user.uid in Firestore
        const postLinkSnap = await getDocs(query(collection(db, 'businesses'), where('userId', '==', user.uid))).catch(() => null);
        if (postLinkSnap) {
          postLinkSnap.forEach(d => {
            userBizMap.set(d.id, { id: d.id, ...d.data() } as Business);
          });
        }

        // Additional fallback match by ownerEmail, ownerPhone or ownerContact
        if (db && (userEmail || userPhone)) {
          try {
            const [snapEmail, snapPhone, snapContact] = await Promise.all([
              userEmail ? getDocs(query(collection(db, 'businesses'), where('ownerEmail', '==', userEmail))).catch(() => null) : null,
              userPhone ? getDocs(query(collection(db, 'businesses'), where('ownerPhone', '==', userPhone))).catch(() => null) : null,
              userEmail ? getDocs(query(collection(db, 'businesses'), where('ownerContact', '==', userEmail))).catch(() => null) : null
            ]);
            if (snapEmail && !snapEmail.empty) {
              snapEmail.forEach(d => userBizMap.set(d.id, { id: d.id, ...d.data() } as Business));
            }
            if (snapPhone && !snapPhone.empty) {
              snapPhone.forEach(d => userBizMap.set(d.id, { id: d.id, ...d.data() } as Business));
            }
            if (snapContact && !snapContact.empty) {
              snapContact.forEach(d => userBizMap.set(d.id, { id: d.id, ...d.data() } as Business));
            }
          } catch (e) {
            console.warn("Could not query secondary owned businesses:", e);
          }
        }

        const userBizList: Business[] = Array.from(userBizMap.values());
        setOwnedBusinesses(userBizList);

        if (userBizList.length > 0 && computedRole === 'user') {
          computedRole = 'merchant';
        }

        // Background non-blocking profile sync to Firestore
        const userDocRef = doc(db, 'users', user.uid);
        setDoc(userDocRef, {
          uid: user.uid,
          email: userEmail,
          displayName: user.displayName || userEmail.split('@')[0] || 'مستخدم إربد',
          role: computedRole,
          status: profileData?.status || 'active',
          statusReason: profileData?.statusReason || '',
          createdAt: profileData?.createdAt || Date.now(),
          lastLoginAt: Date.now(),
          isMerchant: userBizList.length > 0,
          merchantBusinessIds: userBizList.map(b => b.id),
        }, { merge: true }).catch(err => {
          console.warn("Could not sync user profile to firestore:", err);
        });

        const fullProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || profileData?.displayName || user.email?.split('@')[0] || 'مستخدم إربد',
          photoURL: user.photoURL || profileData?.photoURL || undefined,
          phone: profileData?.phone || '',
          district: profileData?.district || '',
          bio: profileData?.bio || '',
          preferences: profileData?.preferences || {
            notifyOffers: true,
            notifyJobs: true,
            notifyMessages: true,
            hidePublicActivity: false,
            allowDirectMessages: true
          },
          role: computedRole,
          savedFavorites: activeFavorites,
          isMerchant: userBizList.length > 0,
          merchantBusinessIds: userBizList.map(b => b.id),
          supervisorPermissions: perms,
          customEmailVerified: profileData?.customEmailVerified || false,
          emailVerified: profileData?.emailVerified || false,
          readNotificationIds: profileData?.readNotificationIds || [],
          lastNotificationsReadAt: profileData?.lastNotificationsReadAt || 0,
          clearedNotificationsAt: profileData?.clearedNotificationsAt || 0,
          hiddenNotificationIds: profileData?.hiddenNotificationIds || [],
        };

        setUserProfile(fullProfile);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('shoof_auth_cache_' + user.uid, JSON.stringify(fullProfile));
          } catch {
            // ignore storage error
          }
        }

      } catch (err) {
        console.warn("Could not fetch user role from firestore (requires Firestore rules update):", err);
      }
    }

    setIsAdmin(isAdminRole);
    setIsSupervisor(isSupervisorRole);
    setSupervisorPermissions(perms);
    setUserRole(computedRole);
  }, [loadLocalFavorites, saveFavorites]);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      await fetchUserData(user);
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchUserData]);

  const refreshUserData = async () => {
    if (currentUser) {
      await fetchUserData(currentUser);
    }
  };

  const logout = async () => {
    if (auth) {
      if (currentUser?.uid && typeof window !== 'undefined') {
        try {
          localStorage.removeItem('shoof_auth_cache_' + currentUser.uid);
        } catch {
          // ignore
        }
      }
      setIsAdmin(false);
      setIsSupervisor(false);
      setUserRole('guest');
      setUserProfile(null);
      setOwnedBusinesses([]);
      return firebaseSignOut(auth);
    }
    return Promise.resolve();
  };

  const isStaff = isAdmin || isSupervisor;
  const isMerchant = ownedBusinesses.length > 0 || userRole === 'merchant';

  const value = {
    currentUser,
    userProfile,
    userRole,
    isAdmin,
    isSupervisor,
    isStaff,
    isMerchant,
    supervisorPermissions,
    ownedBusinesses,
    userFavorites,
    toggleFavorite,
    isFavorite,
    refreshUserData,
    loading,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
