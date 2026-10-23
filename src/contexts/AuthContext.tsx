import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot, limit } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserRole, UserProfile, SupervisorPermissions, Business } from '../types';
import { linkUserToMatchedBusinesses } from '../lib/authPhoneHelper';
import { invalidateUserProfileCache, setCachedUserProfileData, getCachedUserProfileData } from '../lib/dataCache';

const ADMIN_BOOTSTRAP_EMAILS = [
  'princessofx2344@gmail.com',
  'tharawt74@gmail.com',
  'hswtkly151@gmail.com'
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
  const favSyncTimerRef = useRef<any>(null);

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

    // Debounced sync to firestore to prevent quota waste
    if (currentUser && db) {
      if (favSyncTimerRef.current) {
        clearTimeout(favSyncTimerRef.current);
      }
      favSyncTimerRef.current = setTimeout(async () => {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          await setDoc(userRef, { savedFavorites: updated }, { merge: true });
        } catch (err) {
          console.warn("Could not sync favorite to firestore:", err);
        }
      }, 1500);
    }
  }, [userFavorites, currentUser, saveFavorites]);

  const isFavorite = useCallback((businessId: string) => {
    return userFavorites.includes(businessId);
  }, [userFavorites]);

  // Fetch full user role, profile and owned businesses
  const fetchUserData = useCallback(async (user: User | null, forceRefresh = false) => {
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

    // 1. Fresh cache check (< 5 mins) avoids redundant multi-doc reads on page navigation
    const AUTH_CACHE_TTL = 5 * 60 * 1000;
    if (typeof window !== 'undefined' && !forceRefresh) {
      try {
        const cachedRaw = localStorage.getItem('shoof_auth_cache_' + user.uid);
        if (cachedRaw) {
          const cachedProf = JSON.parse(cachedRaw);
          const cacheAge = Date.now() - (cachedProf._cachedAt || 0);
          if (cachedProf && cachedProf.uid === user.uid && cacheAge < AUTH_CACHE_TTL) {
            setUserProfile(cachedProf);
            setUserRole(cachedProf.role || 'user');
            setIsAdmin(cachedProf.role === 'super_admin');
            setIsSupervisor(cachedProf.role === 'supervisor');
            if (cachedProf.supervisorPermissions) {
              setSupervisorPermissions(cachedProf.supervisorPermissions);
            }
            const cachedUserBiz = getCachedUserProfileData(user.uid)?.businesses || [];
            setOwnedBusinesses(cachedUserBiz);
            setLoading(false);
            return;
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
        // Fetch user profile and owned businesses concurrently
        const [userDocSnap, bizSnap] = await Promise.all([
          getDoc(doc(db, 'users', user.uid)).catch(e => {
            console.warn("Could not fetch user profile:", e);
            return null;
          }),
          getDocs(query(collection(db, 'businesses'), where('userId', '==', user.uid), limit(50))).catch(e => {
            console.warn("Could not fetch owned businesses:", e);
            return null;
          })
        ]);

        const profileData = userDocSnap && userDocSnap.exists() ? userDocSnap.data() : null;

        // Only query admins or supervisors collections if bootstrap email matches or user profile indicates staff
        const isPotentialStaff = isAdminRole || profileData?.role === 'super_admin' || profileData?.role === 'supervisor' || profileData?.isAdmin || profileData?.isSupervisor;
        let adminDocSnap: any = null;
        let supervisorDocSnap: any = null;

        if (isPotentialStaff) {
          [adminDocSnap, supervisorDocSnap] = await Promise.all([
            getDoc(doc(db, 'admins', user.uid)).catch(() => null),
            getDoc(doc(db, 'supervisors', user.uid)).catch(() => null)
          ]);
        }

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
        
        // Smart Session Cache: avoid re-running 15 heavy phone/email matching queries on every single page navigation
        const lastLinkCheckKey = `shoof_biz_link_check_${user.uid}`;
        let shouldRunDeepBizLink = true;
        try {
          const lastLinkCheckTime = Number(sessionStorage.getItem(lastLinkCheckKey) || 0);
          // 20 minutes TTL
          if (Date.now() - lastLinkCheckTime < 20 * 60 * 1000) {
            shouldRunDeepBizLink = false;
          }
        } catch {
          // ignore sessionStorage error
        }

        const cachedProfile = getCachedUserProfileData(user.uid);
        let userBizList: Business[] = cachedProfile?.businesses || [];

        const userBizMap = new Map<string, Business>();
        if (bizSnap && !bizSnap.empty) {
          bizSnap.forEach(d => {
            userBizMap.set(d.id, { id: d.id, ...d.data() } as Business);
          });
        }

        if (userBizMap.size === 0 && shouldRunDeepBizLink) {
          // Auto-link any business created with this user's phone or email in golden field
          if (db) {
            await linkUserToMatchedBusinesses(user.uid, userPhone, userEmail);
          }

          // Re-query businesses now that matching businesses have been transferred to user.uid in Firestore
          const postLinkSnap = await getDocs(query(collection(db, 'businesses'), where('userId', '==', user.uid), limit(50))).catch(() => null);
          if (postLinkSnap) {
            postLinkSnap.forEach(d => {
              userBizMap.set(d.id, { id: d.id, ...d.data() } as Business);
            });
          }

          // Additional fallback match by ownerEmail, ownerPhone or ownerContact only if not found by userId
          if (db && userBizMap.size === 0 && (userEmail || userPhone)) {
            try {
              const [snapEmail, snapPhone, snapContact] = await Promise.all([
                userEmail ? getDocs(query(collection(db, 'businesses'), where('ownerEmail', '==', userEmail), limit(5))).catch(() => null) : null,
                userPhone ? getDocs(query(collection(db, 'businesses'), where('ownerPhone', '==', userPhone), limit(5))).catch(() => null) : null,
                userEmail ? getDocs(query(collection(db, 'businesses'), where('ownerContact', '==', userEmail), limit(5))).catch(() => null) : null
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

          try {
            sessionStorage.setItem(lastLinkCheckKey, String(Date.now()));
          } catch {}
        }

        userBizList = Array.from(userBizMap.values());

        setOwnedBusinesses(userBizList);
        try {
          const existingCached = getCachedUserProfileData(user.uid);
          setCachedUserProfileData(user.uid, {
            businesses: userBizList,
            userJobs: existingCached?.userJobs || [],
            userHousings: existingCached?.userHousings || []
          });
        } catch {
          // ignore cache error
        }

        if (userBizList.length > 0 && computedRole === 'user') {
          computedRole = 'merchant';
        }

        // Check if user was marked as deleted by admin
        try {
          const deletedCheckSnap = await getDoc(doc(db, 'deleted_emails', userEmail));
          if (deletedCheckSnap.exists() && !profileData) {
            await auth.signOut();
            setCurrentUser(null);
            setUserProfile(null);
            setUserRole('user');
            setLoading(false);
            return;
          }
        } catch {
          // ignore
        }

        // Throttled background profile sync to Firestore (prevents write quota exhaustion on navigation)
        const lastSyncTime = profileData?.lastLoginAt || 0;
        const needsRoleUpdate = profileData?.role !== computedRole || (profileData?.isMerchant !== (userBizList.length > 0));
        const shouldSyncProfile = !profileData || needsRoleUpdate || (Date.now() - lastSyncTime > 6 * 60 * 60 * 1000);

        if (shouldSyncProfile) {
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

          if (isAdminRole) {
            setDoc(doc(db, 'admins', user.uid), {
              uid: user.uid,
              email: userEmail,
              updatedAt: Date.now()
            }, { merge: true }).catch(err => {
              console.warn("Could not sync admin document to firestore:", err);
            });
          }
        }

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
            localStorage.setItem('shoof_auth_cache_' + user.uid, JSON.stringify({ ...fullProfile, _cachedAt: Date.now() }));
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
      await fetchUserData(currentUser, true);
    }
  };

  const logout = async () => {
    if (auth) {
      if (currentUser?.uid) {
        invalidateUserProfileCache(currentUser.uid);
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('shoof_auth_cache_' + currentUser.uid);
          } catch {
            // ignore
          }
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
