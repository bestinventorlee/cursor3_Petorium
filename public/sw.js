// Service Worker for offline support and video caching
const CACHE_NAME = 'petorium-v1';
const STATIC_CACHE = 'petorium-static-v1';
const VIDEO_CACHE = 'petorium-videos-v1';

// Assets to cache
const STATIC_ASSETS = [
  '/',
  '/feed',
  '/trending',
  '/search',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(VIDEO_CACHE).then((cache) => {
        // Pre-cache some popular videos if needed
        return cache;
      }),
    ])
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => 
            name !== CACHE_NAME && 
            name !== STATIC_CACHE && 
            name !== VIDEO_CACHE
          )
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except for videos and images)
  if (!url.origin.startsWith(self.location.origin) && 
      !url.pathname.match(/\.(mp4|webm|jpg|jpeg|png|webp)$/i)) {
    return;
  }

  // Handle video requests with special caching
  if (request.destination === 'video' || url.pathname.match(/\.(mp4|webm)$/i)) {
    event.respondWith(handleVideoRequest(request));
    return;
  }

  // Handle image requests
  if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Handle static assets
  event.respondWith(handleStaticRequest(request));
});

async function handleVideoRequest(request) {
  const cache = await caches.open(VIDEO_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    
    // Only cache successful responses
    if (response.ok) {
      // Clone response before caching
      const responseToCache = response.clone();
      
      // Cache with size limit (e.g., 50MB per video)
      const contentLength = response.headers.get('content-length');
      if (!contentLength || parseInt(contentLength) < 50 * 1024 * 1024) {
        cache.put(request, responseToCache);
      }
    }

    return response;
  } catch (error) {
    // Return cached version if available, even if stale
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function handleImageRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function handleAPIRequest(request) {
  // For API requests, try network first, then cache
  try {
    const response = await fetch(request);
    
    // Cache GET requests only
    if (request.method === 'GET' && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Try cache as fallback
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-videos') {
    event.waitUntil(syncVideos());
  }
});

async function syncVideos() {
  // Sync watched videos, likes, etc.
  // Implementation depends on your needs
}

// Push notification handling
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Petorium';
  const options = {
    body: data.body || '새로운 알림이 있습니다',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    data: data.url || '/',
    tag: data.tag || 'default',
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const url = event.notification.data || '/';
      
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
