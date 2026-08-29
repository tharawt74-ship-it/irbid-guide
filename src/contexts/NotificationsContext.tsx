import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { collection, query, getDocs, orderBy, doc, updateDoc, setDoc, deleteDoc, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { AppNotification } from '../types';
import { getAppConfig } from '../lib/demoDataHelper';
import { showNativeNotification } from '../lib/pushNotifications';

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

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_READ_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [loading, setLoading] = useState(true);

  // Sync readIds to localStorage
  const saveReadIds = (newSet: Set<string>) => {
    setReadIds(newSet);
    try {
      localStorage.setItem(LOCAL_STORAGE_READ_KEY, JSON.stringify(Array.from(newSet)));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function loadNotifications() {
      setLoading(true);
      try {
        if (db) {
          const appConfig = await getAppConfig();
          // Listen to notifications collection in Firestore
          const notifQuery = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
          unsubscribe = onSnapshot(notifQuery, (snapshot) => {
            const firestoreItems: AppNotification[] = [];
            snapshot.forEach((d) => {
              const data = d.data();
              if (!appConfig.showDemoData && data.isDemo) {
                return;
              }
              // Check if notification is for all or for this user
              if (!data.userId || data.userId === 'all' || (currentUser && data.userId === currentUser.uid)) {
                // Only show notifications that have reached their scheduled start/publish date
                if (data.createdAt && data.createdAt > Date.now()) {
                  return;
                }
                firestoreItems.push({
                  id: d.id,
                  title: data.title || '',
                  message: data.message || '',
                  type: data.type || 'system',
                  link: data.link || '',
                  createdAt: data.createdAt || Date.now(),
                  userId: data.userId,
                  badge: data.badge,
                });
              }
            });

            setNotifications(firestoreItems);
            setLoading(false);
          }, (err) => {
            console.warn("Firestore notifications snapshot warning:", err);
            setNotifications([]);
            setLoading(false);
          });
        } else {
          setNotifications([]);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading notifications:", err);
        setNotifications([]);
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
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (db && !id.startsWith('init-')) {
      try {
        await deleteDoc(doc(db, 'notifications', id));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const clearAll = async () => {
    setNotifications([]);
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

    if (db) {
      try {
        await setDoc(doc(db, 'notifications', newNotif.id), newNotif);
      } catch (err) {
        console.warn("Could not save notification to Firestore:", err);
      }
    }

    // Trigger device native push notification
    showNativeNotification(notifData.title, notifData.message, notifData.link);

    setNotifications(prev => [newNotif, ...prev]);
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
