const CACHE_NAME = 'irbid-guide-pwa-v2';
const urlsToCache = [
  '/',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Cache with network fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // Let browser handle dynamic APIs and Firebase endpoints directly
  const url = new URL(event.request.url);
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('firebasestorage')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response to cache if successful
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          const fallbackIndex = await caches.match('/');
          if (fallbackIndex) return fallbackIndex;
        }
        return new Response('Offline or network timeout', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
  );
});

// Handle FCM and Web Push Notifications in background (works even if browser/app is closed)
self.addEventListener('push', (event) => {
  let data = {
    title: 'شو في بإربد؟',
    body: 'تنبيه جديد من منصة دليل وعروض إربد',
    url: '/notifications'
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
      if (parsed.message && !parsed.body) {
        data.body = parsed.message;
      }
      if (parsed.link && !parsed.url) {
        data.url = parsed.link;
      }
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const notificationTitle = data.title || 'شو في بإربد؟';
  const notificationBody = data.body || data.message || 'لديك إشعار جديد';
  const targetUrl = data.url || data.link || '/notifications';

  const options = {
    body: notificationBody,
    icon: data.icon || '/favicon.jpg',
    badge: data.badge || '/favicon.jpg',
    vibrate: [200, 100, 200],
    tag: data.tag || 'irbid-notification-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    data: {
      url: targetUrl
    }
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, options)
  );
});

// Handle notification click to navigate to the target link
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || '/notifications';
  const targetUrl = rawUrl.startsWith('http') ? rawUrl : self.location.origin + (rawUrl.startsWith('/') ? rawUrl : '/' + rawUrl);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with this URL or on the site
      for (let client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      for (let client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client && 'navigate' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
