const CACHE_NAME = "debatething-cache-v5";
const urlsToCache = [
  "/",
  "/styles.css",
  "/favicon.ico",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/apple-touch-icon.png",
  "/site.webmanifest",
  "/android-chrome-512x512.png",
  "/android-chrome-192x192.png",
  "/mstile-150x150.png",
  "/img/social.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return Promise.all(
          urlsToCache.map((url) => {
            return fetch(url)
              .then((response) => {
                if (!response.ok) {
                  throw new Error(`Failed to fetch ${url}`);
                }
                return cache.put(url, response);
              })
              .catch((error) => {
                console.error("Caching failed for", url, error);
                return Promise.resolve();
              });
          }),
        );
      }),
  );
});

self.addEventListener("fetch", (event) => {
  // Check if the request is a POST request
  if (event.request.method === "POST") {
    // For POST requests, bypass the cache and fetch from the network
    event.respondWith(fetch(event.request));
    return;
  }

  // For non-POST requests, use a cache-first strategy with network fallback
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
              console.error(`Failed to fetch: ${event.request.url}`, networkResponse);
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch((error) => {
            console.error(`Network error for: ${event.request.url}`, error);
            // Optionally, you can return a custom offline page or a fallback response here
            return new Response("Network error occurred. Please try again later.", {
              status: 503,
              statusText: "Service Unavailable",
              headers: new Headers({ "Content-Type": "text/plain" }),
            });
          });
      })
  );
});

self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});
