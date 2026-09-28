import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import { collection, query, doc, updateDoc, setDoc, deleteDoc, onSnapshot, limit, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { AppNotification } from '../types';
import { showNativeNotification } from '../lib/pushNotifications';
import { sanitizeFirestorePayload } from '../lib/firestoreHelper';

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt'>) => Promise<void>;
}

const getStorageReadPrefix = (uid?: string) => uid ? `irbid_read_notifs_${uid}` : 'irbid_read_notifications_ids_guest';
const LOCAL_STORAGE_CACHE_KEY = 'irbid_notifications_cached_list';

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const currentUid = currentUser?.uid;

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('irbid_read_notifications_ids');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [lastNotificationsReadAt, setLastNotificationsReadAt] = useState<number>(0);
  const [clearedNotificationsAt, setClearedNotificationsAt] = useState<number>(0);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const isInitialLoadedRef = useRef(false);

  // Sync notifications cache to localStorage
  const saveCache = (list: AppNotification[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(list.slice(0, 100)));
    } catch (e) {
      console.warn("Could not cache notifications:", e);
    }
  };

  // 1. Sync User-specific Read State across all browsers and devices in Real-Time
  useEffect(() => {
    if (!currentUid) {
      // For guests, attempt to read guest localStorage
      try {
        const guestData = localStorage.getItem('irbid_read_notifications_ids');
        if (guestData) {
          setReadIds(new Set(JSON.parse(guestData)));
        }
      } catch {}
      return;
    }

    const storageKey = getStorageReadPrefix(currentUid);

    // Fast hydration from user's local cache on this device to eliminate UI latency
    try {
      const localData = localStorage.getItem(storageKey);
      if (localData) {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed.readIds) && parsed.readIds.length > 0) {
          setReadIds(prev => new Set([...prev, ...parsed.readIds]));
        }
        if (typeof parsed.lastReadAt === 'number') {
          setLastNotificationsReadAt(prev => Math.max(prev, parsed.lastReadAt));
        }
        if (typeof parsed.clearedAt === 'number') {
          setClearedNotificationsAt(prev => Math.max(prev, parsed.clearedAt));
        }
        if (Array.isArray(parsed.hiddenIds) && parsed.hiddenIds.length > 0) {
          setHiddenIds(prev => new Set([...prev, ...parsed.hiddenIds]));
        }
      }
    } catch (e) {
      console.warn("Could not load local notification state for user:", e);
    }

    if (!db) return;

    // Real-time listener to user's profile document in Firestore
    // Whenever this user marks an item read in Browser A, Browser B receives it immediately!
    const userDocRef = doc(db, 'users', currentUid);
    const unsubscribeUser = onSnapshot(userDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const dbReadIds: string[] = Array.isArray(data.readNotificationIds) ? data.readNotificationIds : [];
        const dbLastReadAt: number = typeof data.lastNotificationsReadAt === 'number' ? data.lastNotificationsReadAt : 0;
        const dbClearedAt: number = typeof data.clearedNotificationsAt === 'number' ? data.clearedNotificationsAt : 0;
        const dbHiddenIds: string[] = Array.isArray(data.hiddenNotificationIds) ? data.hiddenNotificationIds : [];

        setReadIds(prev => {
          const merged = new Set([...prev, ...dbReadIds]);
          return merged;
        });

        if (dbLastReadAt > 0) {
          setLastNotificationsReadAt(prev => Math.max(prev, dbLastReadAt));
        }
        if (dbClearedAt > 0) {
          setClearedNotificationsAt(prev => Math.max(prev, dbClearedAt));
        }
        if (dbHiddenIds.length > 0) {
          setHiddenIds(prev => new Set([...prev, ...dbHiddenIds]));
        }

        // Cache state locally for this user
        try {
          localStorage.setItem(storageKey, JSON.stringify({
            readIds: dbReadIds,
            lastReadAt: dbLastReadAt,
            clearedAt: dbClearedAt,
            hiddenIds: dbHiddenIds
          }));
        } catch {}
      }
    }, (err) => {
      console.warn("Could not sync user notification profile in real-time:", err);
    });

    return () => {
      unsubscribeUser();
    };
  }, [currentUid]);

  // 2. Fetch Notifications Stream from Firestore
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function loadNotifications() {
      setLoading(true);
      try {
        if (db) {
          const notifQuery = query(collection(db, 'notifications'), limit(50));
          
          // Use onSnapshot to receive real-time broadcast and personal notifications
          unsubscribe = onSnapshot(notifQuery, (snapshot) => {
            const firestoreItems: AppNotification[] = [];
            const now = Date.now();

            snapshot.forEach((d) => {
              const data = d.data();
              if (data.isDemo) {
                return;
              }

              // Check audience: broadcast to 'all' or specifically to this user
              const isTargetAudience = !data.userId || data.userId === 'all' || (currentUser && data.userId === currentUser.uid);
              if (isTargetAudience) {
                // Parse timestamp correctly
                let createdAtNum = now;
                if (typeof data.createdAt === 'number') {
                  createdAtNum = data.createdAt;
                } else if (data.createdAt?.toMillis) {
                  createdAtNum = data.createdAt.toMillis();
                } else if (data.createdAt?.seconds) {
                  createdAtNum = data.createdAt.seconds * 1000;
                }

                // If scheduled for future, skip unless it has arrived
                if (createdAtNum > now + 60000) {
                  return;
                }

                firestoreItems.push({
                  id: d.id,
                  title: data.title || '',
                  message: data.message || '',
                  type: data.type || 'system',
                  link: data.link || '',
                  createdAt: createdAtNum,
                  userId: data.userId || 'all',
                  badge: data.badge || undefined,
                  targetArea: data.targetArea || undefined,
                  targetCategory: data.targetCategory || undefined,
                  targetSubCategory: data.targetSubCategory || undefined,
                  businessId: data.businessId || undefined,
                  businessName: data.businessName || undefined,
                  businessLogoUrl: data.businessLogoUrl || undefined,
                });
              }
            });

            // Sort newest first
            firestoreItems.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            // Trigger system native notification for active visitors when a new broadcast arrives in real-time
            if (isInitialLoadedRef.current) {
              snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                  const itemData = change.doc.data();
                  const isForVisitor = !itemData.userId || itemData.userId === 'all' || (currentUser && itemData.userId === currentUser.uid);
                  if (isForVisitor) {
                    const itemTime = typeof itemData.createdAt === 'number' ? itemData.createdAt : now;
                    // If arrived in last 5 minutes
                    if (now - itemTime < 5 * 60 * 1000) {
                      showNativeNotification(
                        itemData.title || 'إشعار جديد 📢',
                        itemData.message || 'وصلك إشعار وتحديث جديد في شو في بإربد',
                        itemData.link || '/notifications'
                      );
                    }
                  }
                }
              });
            }

            setNotifications(firestoreItems);
            saveCache(firestoreItems);
            setLoading(false);
            isInitialLoadedRef.current = true;
          }, (err) => {
            console.warn("Firestore notifications listener error:", err);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Error setting up notifications:", err);
        setLoading(false);
      }
    }

    loadNotifications();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser]);

  // Compute items with isRead state applied, hidden items excluded, and deduplicated by id
  const resolvedNotifications = useMemo(() => {
    const seen = new Set<string>();
    const list: AppNotification[] = [];

    for (const notif of notifications) {
      if (!notif.id || seen.has(notif.id)) continue;
      seen.add(notif.id);

      // Skip if marked hidden/deleted by this user
      if (hiddenIds.has(notif.id)) {
        continue;
      }

      // Skip if user cleared history before this notification was posted
      if (clearedNotificationsAt > 0 && notif.createdAt <= clearedNotificationsAt) {
        continue;
      }

      const isReadByBulkTime = lastNotificationsReadAt > 0 && notif.createdAt <= lastNotificationsReadAt;
      const isReadById = readIds.has(notif.id);
      const isReadDirectly = !!notif.isRead && notif.userId === currentUid;

      list.push({
        ...notif,
        isRead: isReadByBulkTime || isReadById || isReadDirectly
      });
    }

    return list;
  }, [notifications, readIds, lastNotificationsReadAt, clearedNotificationsAt, hiddenIds, currentUid]);

  const unreadCount = useMemo(() => {
    return resolvedNotifications.filter(n => !n.isRead).length;
  }, [resolvedNotifications]);

  // Mark single notification as read across all devices & browsers
  const markAsRead = async (id: string) => {
    // 1. Optimistic local state update
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    // 2. Persist locally for instant offline UI
    const storageKey = getStorageReadPrefix(currentUid);
    try {
      const stored = localStorage.getItem(storageKey);
      const parsed = stored ? JSON.parse(stored) : {};
      const existing = new Set(parsed.readIds || []);
      existing.add(id);
      localStorage.setItem(storageKey, JSON.stringify({
        ...parsed,
        readIds: Array.from(existing)
      }));
    } catch {}

    // 3. Persist to Firestore user document - syncs to other browsers in real-time
    if (currentUid && db) {
      try {
        await setDoc(doc(db, 'users', currentUid), {
          readNotificationIds: arrayUnion(id)
        }, { merge: true });
      } catch (err) {
        console.warn("Could not sync read notification to user document:", err);
      }
    }

    // 4. If personal notification owned by user, also update document directly
    if (db && !id.startsWith('init-')) {
      const targetNotif = notifications.find(n => n.id === id);
      if (targetNotif && targetNotif.userId === currentUid) {
        try {
          await updateDoc(doc(db, 'notifications', id), { isRead: true });
        } catch {}
      }
    }
  };

  // Mark all notifications as read across all devices & browsers
  const markAllAsRead = async () => {
    const now = Date.now();
    const allCurrentIds = notifications.map(n => n.id).filter(Boolean);

    // 1. Optimistic local state update
    setReadIds(prev => {
      const next = new Set(prev);
      allCurrentIds.forEach(id => next.add(id));
      return next;
    });
    setLastNotificationsReadAt(now);

    // 2. Persist to localStorage
    const storageKey = getStorageReadPrefix(currentUid);
    try {
      const stored = localStorage.getItem(storageKey);
      const parsed = stored ? JSON.parse(stored) : {};
      const existing = new Set(parsed.readIds || []);
      allCurrentIds.forEach(id => existing.add(id));
      localStorage.setItem(storageKey, JSON.stringify({
        ...parsed,
        readIds: Array.from(existing),
        lastReadAt: now
      }));
    } catch {}

    // 3. Persist to Firestore user document - any other browser will immediately mark them as read!
    if (currentUid && db) {
      try {
        await setDoc(doc(db, 'users', currentUid), {
          lastNotificationsReadAt: now,
          readNotificationIds: arrayUnion(...allCurrentIds.slice(0, 100))
        }, { merge: true });
      } catch (err) {
        console.warn("Could not sync markAllAsRead to user document:", err);
      }

      // Mark user-owned notifications directly
      notifications
        .filter(n => n.userId === currentUid && !n.isRead)
        .forEach(async (personalNotif) => {
          try {
            await updateDoc(doc(db, 'notifications', personalNotif.id), { isRead: true });
          } catch {}
        });
    }
  };

  // Delete notification (hides broadcast notifications for this user, deletes personal ones)
  const deleteNotification = async (id: string) => {
    setHiddenIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

    const storageKey = getStorageReadPrefix(currentUid);
    try {
      const stored = localStorage.getItem(storageKey);
      const parsed = stored ? JSON.parse(stored) : {};
      const existingHidden = new Set(parsed.hiddenIds || []);
      existingHidden.add(id);
      localStorage.setItem(storageKey, JSON.stringify({
        ...parsed,
        hiddenIds: Array.from(existingHidden)
      }));
    } catch {}

    if (currentUid && db) {
      try {
        await setDoc(doc(db, 'users', currentUid), {
          hiddenNotificationIds: arrayUnion(id)
        }, { merge: true });
      } catch (err) {
        console.warn("Could not sync hidden notification to user document:", err);
      }
    }

    if (db && !id.startsWith('init-')) {
      const target = notifications.find(n => n.id === id);
      if (target && target.userId === currentUid) {
        try {
          await deleteDoc(doc(db, 'notifications', id));
        } catch (e) {
          console.error("Error deleting notification from firestore:", e);
        }
      }
    }
  };

  // Clear all notifications for this user across all devices & browsers
  const clearAll = async () => {
    const now = Date.now();
    setClearedNotificationsAt(now);
    setNotifications([]);

    const storageKey = getStorageReadPrefix(currentUid);
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        readIds: [],
        lastReadAt: now,
        clearedAt: now,
        hiddenIds: []
      }));
    } catch {}

    if (currentUid && db) {
      try {
        await setDoc(doc(db, 'users', currentUid), {
          clearedNotificationsAt: now,
          lastNotificationsReadAt: now
        }, { merge: true });
      } catch (err) {
        console.warn("Could not sync clearAll to user document:", err);
      }

      notifications
        .filter(n => n.userId === currentUid)
        .forEach(async (personalNotif) => {
          try {
            await deleteDoc(doc(db, 'notifications', personalNotif.id));
          } catch {}
        });
    }
  };

  const addNotification = async (notifData: Omit<AppNotification, 'id' | 'createdAt'>) => {
    const newNotif: AppNotification = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      ...notifData,
      createdAt: Date.now(),
      isRead: false,
    };

    // Update local state immediately
    setNotifications(prev => {
      const updated = [newNotif, ...prev.filter(n => n.id !== newNotif.id)];
      saveCache(updated);
      return updated;
    });

    // Save to Firestore with clean payload without undefined fields
    if (db) {
      try {
        const sanitized = sanitizeFirestorePayload(newNotif, false);
        await setDoc(doc(db, 'notifications', newNotif.id), sanitized);
      } catch (err) {
        console.error("Error saving notification to Firestore:", err);
      }
    }

    // Trigger local push notification popup
    showNativeNotification(notifData.title, notifData.message, notifData.link || '/notifications');
  };

  return (
    <NotificationsContext.Provider
      value={{
        notifications: resolvedNotifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        addNotification
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}


