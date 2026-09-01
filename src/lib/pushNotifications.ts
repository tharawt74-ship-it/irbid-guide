import { messaging, db } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { collection, doc, setDoc } from 'firebase/firestore';

export interface PushStatus {
  isSupported: boolean;
  permission: NotificationPermission;
  token: string | null;
}

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;

export async function checkPushSupport(): Promise<boolean> {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
}

export async function requestPushPermission(userId?: string): Promise<PushStatus> {
  const supported = await checkPushSupport();
  if (!supported) {
    return { isSupported: false, permission: 'denied', token: null };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { isSupported: true, permission, token: null };
    }

    // Try FCM token
    let token: string | null = null;

    if (messaging) {
      try {
        const swRegistration = await navigator.serviceWorker.ready;
        token = await getToken(messaging, {
          serviceWorkerRegistration: swRegistration,
          vapidKey: VAPID_KEY
        });
      } catch (err) {
        console.warn("Could not retrieve FCM VAPID token, using device ID token:", err);
      }
    }

    // Fallback token if FCM token isn't available
    if (!token) {
      token = `web_device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    // Store token locally
    localStorage.setItem('irbid_push_token', token);
    localStorage.setItem('irbid_push_enabled', 'true');

    // Save token to Firestore if user/db available
    if (db && token) {
      try {
        const tokenRef = doc(collection(db, 'deviceTokens'), token);
        await setDoc(tokenRef, {
          token,
          userId: userId || 'anonymous',
          platform: 'web_pwa',
          updatedAt: Date.now(),
          userAgent: navigator.userAgent
        }, { merge: true });
      } catch (e) {
        console.warn("Could not sync token to firestore:", e);
      }
    }

    // Register active message listener
    if (messaging) {
      onMessage(messaging, (payload) => {
        console.log("FCM Foreground Notification Received:", payload);
        if (payload.notification) {
          showNativeNotification(
            payload.notification.title || 'شو في بإربد؟ 📢',
            payload.notification.body || '',
            payload.data?.url
          );
        }
      });
    }

    return { isSupported: true, permission: 'granted', token };
  } catch (error) {
    console.error("Error requesting push permission:", error);
    return { isSupported: true, permission: 'denied', token: null };
  }
}

export function showNativeNotification(title: string, body: string, url: string = '/', iconUrl?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      const icon = iconUrl || '/favicon.ico';
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon,
            badge: icon,
            data: { url }
          });
        }).catch(() => {
          new Notification(title, { body, icon });
        });
      } else {
        new Notification(title, { body, icon });
      }
    } catch (e) {
      console.warn("Native notification display failed:", e);
    }
  }
}
