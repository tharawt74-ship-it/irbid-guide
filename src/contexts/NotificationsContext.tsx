import React, { createContext, useContext, useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import { collection, query, getDocs, orderBy, doc, updateDoc, setDoc, deleteDoc, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { AppNotification } from '../types';
import { getAppConfig } from '../lib/demoDataHelper';
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

const LOCAL_STORAGE_READ_KEY = 'irbid_read_notifications_ids';
const LOCAL_STORAGE_CACHE_KEY = 'irbid_notifications_cached_list';

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
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
      const stored = localStorage.getItem(LOCAL_STORAGE_READ_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [loading, setLoading] = useState(true);
  const isInitialLoadedRef = useRef(false);

  // Sync readIds to localStorage
  const saveReadIds = (newSet: Set<string>) => {
    setReadIds(newSet);
    try {
      localStorage.setItem(LOCAL_STORAGE_READ_KEY, JSON.stringify(Array.from(newSet)));
    } catch (e) {
      console.error(e);
    }
  };

  // Sync notifications cache to localStorage
  const saveCache = (list: AppNotification[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(list.slice(0, 100)));
    } catch (e) {
      console.warn("Could not cache notifications:", e);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function loadNotifications() {
      setLoading(true);
      try {
        if (db) {
          const appConfig = await getAppConfig();
          const notifCollection = collection(db, 'notifications');
          
          // Use onSnapshot to receive real-time broadcast and personal notifications
          unsubscribe = onSnapshot(notifCollection, (snapshot) => {
            const firestoreItems: AppNotification[] = [];
            const now = Date.now();

            snapshot.forEach((d) => {
              const data = d.data();
              if (!appConfig.showDemoData && data.isDemo) {
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

  // Compute items with isRead state applied and deduplicated by id
  const resolvedNotifications = useMemo(() => {
    const seen = new Set<string>();
    const list: AppNotification[] = [];
    for (const notif of notifications) {
      if (!notif.id || seen.has(notif.id)) continue;
      seen.add(notif.id);
      list.push({
        ...notif,
        isRead: readIds.has(notif.id) || !!notif.isRead
      });
    }
    return list;
  }, [notifications, readIds]);

  const unreadCount = useMemo(() => {
    return resolvedNotifications.filter(n => !n.isRead).length;
  }, [resolvedNotifications]);

  const markAsRead = async (id: string) => {
    const next = new Set(readIds);
    next.add(id);
    saveReadIds(next);

    if (db && !id.startsWith('init-')) {
      try {
        await updateDoc(doc(db, 'notifications', id), { isRead: true });
      } catch {
        // silently handled
      }
    }
  };

  const markAllAsRead = async () => {
    const next = new Set(readIds);
    notifications.forEach(n => next.add(n.id));
    saveReadIds(next);
  };

  const deleteNotification = async (id: string) => {
    setNotifications(prev => {
      const filtered = prev.filter(n => n.id !== id);
      saveCache(filtered);
      return filtered;
    });

    if (db && !id.startsWith('init-')) {
      try {
        await deleteDoc(doc(db, 'notifications', id));
      } catch (e) {
        console.error("Error deleting notification from firestore:", e);
      }
    }
  };

  const clearAll = async () => {
    setNotifications([]);
    saveCache([]);
    const next = new Set<string>();
    saveReadIds(next);
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

