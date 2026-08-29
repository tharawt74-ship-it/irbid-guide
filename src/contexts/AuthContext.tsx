import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserRole, UserProfile, SupervisorPermissions, Business } from '../types';

const ADMIN_BOOTSTRAP_EMAILS = [
  'princessofx2344@gmail.com',
  'admin@shoofiirbid.com',
  'irbid.admin@gmail.com'
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

    // 1. Check bootstrap email match for Super Admin
    if (ADMIN_BOOTSTRAP_EMAILS.some(adminEmail => adminEmail.toLowerCase() === userEmail)) {
      isAdminRole = true;
      computedRole = 'super_admin';
    }

    if (db) {
      try {
        // Check admin document in /admins/{uid}
        const adminDocRef = doc(db, 'admins', user.uid);
        const adminDocSnap = await getDoc(adminDocRef);
        if (adminDocSnap.exists()) {
          isAdminRole = true;
          computedRole = 'super_admin';
        }

        // Check supervisor document in /supervisors/{uid}
        const supervisorDocRef = doc(db, 'supervisors', user.uid);
        const supervisorDocSnap = await getDoc(supervisorDocRef);
        if (supervisorDocSnap.exists() && !isAdminRole) {
          isSupervisorRole = true;
          computedRole = 'supervisor';
          const supData = supervisorDocSnap.data();
          perms = supData.permissions || {
            canApproveShops: true,
            canModerateJobs: true,
            canModerateReviews: true,
            canManageBanners: false
          };
        }

        // Check user profile doc in /users/{uid}
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        let profileData = userDocSnap.exists() ? userDocSnap.data() : null;

        let activeFavorites = userFavorites;
        if (profileData) {
          if (profileData.role === 'admin' || profileData.role === 'super_admin') {
            isAdminRole = true;
            computedRole = 'super_admin';
          } else if (profileData.role === 'supervisor' && !isAdminRole) {
            isSupervisorRole = true;
            computedRole = 'supervisor';
            perms = profileData.supervisorPermissions || perms;
          }

          if (Array.isArray(profileData.savedFavorites) && profileData.savedFavorites.length > 0) {
            activeFavorites = profileData.savedFavorites;
            setUserFavorites(profileData.savedFavorites);
            saveFavorites(profileData.savedFavorites, user.uid);
          }
        }

        // Fetch owned businesses (Strictly matching userId == user.uid)
        const bizQuery = query(collection(db, 'businesses'), where('userId', '==', user.uid));
        const bizSnap = await getDocs(bizQuery);
        const userBizList: Business[] = [];
        bizSnap.forEach(d => {
          userBizList.push({ id: d.id, ...d.data() } as Business);
        });
        setOwnedBusinesses(userBizList);

        if (userBizList.length > 0 && computedRole === 'user') {
          computedRole = 'merchant';
        }

        // Sync/upsert updated profile data with computed role into Firestore /users/{uid}
        try {
          await setDoc(userDocRef, {
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
          }, { merge: true });
        } catch (e) {
          console.warn("Could not sync user profile to firestore:", e);
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
          supervisorPermissions: perms
        };

        setUserProfile(fullProfile);

      } catch (err) {
        console.error("Error fetching user role from firestore:", err);
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
      {!loading && children}
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
