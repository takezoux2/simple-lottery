const CACHE_NAME = "simple-lottery-v1";

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./favicon.ico",
  "./manifest.webmanifest",
  "./icons/icon-192x192.png",
  "./icons/icon-512x512.png",
  "./icons/apple-touch-icon.png",
  "./icons/icon.svg",
];

// Install: Precache shell assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn("[SW] Precache failed during install:", err);
      }),
  );
});

// Activate: Clean up older caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              return caches.delete(name);
            }
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// Fetch: Caching strategies
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle GET requests and http/https schemes
  if (request.method !== "GET" || !request.url.startsWith("http")) {
    return;
  }

  const url = new URL(request.url);

  // Check if same-origin
  if (url.origin === self.location.origin) {
    // Navigation requests (HTML) -> Network First with Cache Fallback
    if (request.mode === "navigate") {
      event.respondWith(
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(async () => {
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
              return cachedResponse;
            }
            return (await caches.match("./")) || (await caches.match("./index.html"));
          }),
      );
      return;
    }

    // Static Assets (Next.js bundles, images, icons, fonts) -> Cache First / Stale While Revalidate
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Network failed, nothing to do if not cached
          });

        return cachedResponse || fetchPromise;
      }),
    );
  }
});
