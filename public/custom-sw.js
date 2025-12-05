// Custom Service Worker with auth-safe caching
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(clients.claim());
});

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  if (event.data.type === 'CLEAR_AUTH_CACHE') {
    console.log('Clearing auth caches...');
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        if (cacheName.includes('supabase') || cacheName.includes('api')) {
          caches.delete(cacheName);
        }
      });
    });
  }
});

// Fetch event - use careful caching strategies
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Don't cache auth endpoints
  if (url.pathname.includes('/auth/') || url.host.includes('supabase.co')) {
    // Use network only for Supabase auth
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Don't cache HTML pages
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // For static assets, use cache first
  if (event.request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).then(fetchResponse => {
          return caches.open('static-assets').then(cache => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
    return;
  }
  
  // For everything else, use network first
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});