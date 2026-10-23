import { messaging, db } from './firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { collection, doc, setDoc } from 'firebase/firestore';

export interface PushStatus {
  isSupported: boolean;
  permission: NotificationPermission;
  token: string | null;
}

const DEFAULT_VAPID_PUBLIC_KEY = "BF7BlmkqjBP1Fjc5aI6SHcmZpBVOT5_Q9mSP5bhS9GVf_7vO_04WVI4nYwDI2sLUQVLXu5ZlMB2hPgbmiXeiNVk";

// Helper to convert base64 VAPID public key to Uint8Array for PushManager
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function checkPushSupport(): Promise<boolean> {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return Notification.permission;
}

// Fetch VAPID public key from backend or fallback to default
async function getVapidPublicKey(): Promise<string> {
  try {
    const res = await fetch('/api/push/vapid-public-key');
    if (res.ok) {
      const data = await res.json();
      if (data.publicKey) return data.publicKey;
    }
  } catch {}
  return import.meta.env.VITE_FIREBASE_VAPID_KEY || DEFAULT_VAPID_PUBLIC_KEY;
}

export async function requestPushPermission(userId?: string, role?: string): Promise<PushStatus> {
  const supported = await checkPushSupport();
  if (!supported) {
    return { isSupported: false, permission: 'denied', token: null };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { isSupported: true, permission, token: null };
    }

    // 1. Register W3C Push Subscription via Service Worker pushManager
    let pushSubscriptionToken: string | null = null;
    let pushSubObj: PushSubscription | null = null;

    if ('PushManager' in window && 'serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js').catch(() => {});
        const swReg = await navigator.serviceWorker.ready;
        const vapidPublicKey = await getVapidPublicKey();
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

        let sub = await swReg.pushManager.getSubscription();
        if (!sub) {
          sub = await swReg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey as any
          });
        }
        pushSubObj = sub;
        pushSubscriptionToken = sub.endpoint;

        // Sync subscription to backend server
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: sub.toJSON(),
            userId: userId || 'anonymous',
            role: role || 'user',
            platform: 'web_pwa',
            userAgent: navigator.userAgent
          })
        }).catch(err => console.warn('Could not sync push subscription to server:', err));

        // Save directly to Firestore for high availability
        if (db && sub) {
          try {
            const subId = 'sub_' + btoa(sub.endpoint).replace(/[^a-zA-Z0-9_-]/g, '').slice(-40);
            await setDoc(doc(collection(db, 'pushSubscriptions'), subId), {
              subscription: sub.toJSON(),
              endpoint: sub.endpoint,
              userId: userId || 'anonymous',
              role: role || 'user',
              platform: 'web_pwa',
              updatedAt: Date.now(),
              userAgent: navigator.userAgent
            }, { merge: true });
          } catch (fsErr) {
            console.warn("Could not write pushSubscription to Firestore:", fsErr);
          }
        }
      } catch (pushManagerErr) {
        console.warn("PushManager subscription warning:", pushManagerErr);
      }
    }

    // 2. Also register FCM token if Firebase Messaging is configured
    let fcmToken: string | null = null;
    if (messaging) {
      try {
        const swRegistration = await navigator.serviceWorker.ready;
        const vapidKey = await getVapidPublicKey();
        fcmToken = await getToken(messaging, {
          serviceWorkerRegistration: swRegistration,
          vapidKey
        });
      } catch (err) {
        console.warn("Could not retrieve FCM token:", err);
      }
    }

    const token = pushSubscriptionToken || fcmToken || `web_device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Store token locally
    localStorage.setItem('irbid_push_token', token);
    localStorage.setItem('irbid_push_enabled', 'true');

    // Save token to Firestore deviceTokens
    if (db && token) {
      try {
        const tokenRef = doc(collection(db, 'deviceTokens'), token.startsWith('http') ? 'sub_' + btoa(token).replace(/[^a-zA-Z0-9_-]/g, '').slice(-40) : token);
        await setDoc(tokenRef, {
          token,
          userId: userId || 'anonymous',
          role: role || 'user',
          platform: 'web_pwa',
          updatedAt: Date.now(),
          userAgent: navigator.userAgent
        }, { merge: true });
      } catch (e) {
        console.warn("Could not sync token to firestore:", e);
      }
    }

    // Register active foreground message listener
    if (messaging) {
      onMessage(messaging, (payload) => {
        if (payload.notification) {
          showNativeNotification(
            payload.notification.title || 'شو في بإربد؟',
            payload.notification.body || '',
            payload.data?.url
          );
        }
      });
    }

    // Optional: send quick test push to phone if newly subscribed
    if (pushSubObj) {
      fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: pushSubObj.toJSON() })
      }).catch(() => {});
    }

    return { isSupported: true, permission: 'granted', token };
  } catch (error) {
    console.error("Error requesting push permission:", error);
    return { isSupported: true, permission: 'denied', token: null };
  }
}

// Background auto-synchronization for users who already granted notification permission
export async function ensurePushSubscription(userId?: string, role?: string) {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const swReg = await navigator.serviceWorker.ready;
    const vapidPublicKey = await getVapidPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    let sub = await swReg.pushManager.getSubscription();
    if (!sub) {
      sub = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any
      });
    }

    if (sub) {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          userId: userId || 'anonymous',
          role: role || 'user',
          platform: 'web_pwa',
          userAgent: navigator.userAgent
        })
      }).catch(() => {});
    }
  } catch (e) {
    // Silent fail in background sync
  }
}

export function showNativeNotification(title: string, body: string, url: string = '/', iconUrl?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      const icon = iconUrl || '/favicon.jpg';
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
