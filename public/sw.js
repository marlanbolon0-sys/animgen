/* AnimGen Service Worker (PWA)
 * Strategi:
 *  - Navigasi halaman: network-first (selalu segar saat online), fallback ke cache, lalu ke "/" yang tersimpan.
 *  - Aset statis (chunk Next, sample MP4, upload, ikon): cache-first.
 *  - /api/* dan cross-origin: DILEWATI (tidak pernah di-cache) supaya data/kredit selalu live.
 */
const VERSION = "animgen-v1";
const PAGE_CACHE = `${VERSION}-pages`;
const STATIC_CACHE = `${VERSION}-static`;

const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/animgen-icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // API selalu jaringan

  // Navigasi halaman
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches
            .open(PAGE_CACHE)
            .then((cache) => cache.put(req, copy))
            .catch(() => {});
          return res;
        })
        .catch(() =>
          caches
            .match(req)
            .then((hit) => hit || caches.match("/"))
        )
    );
    return;
  }

  // Aset statis
  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/samples/") ||
    url.pathname.startsWith("/uploads/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/animgen-icon.svg" ||
    url.pathname === "/manifest.webmanifest";

  if (isStatic) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches
              .open(STATIC_CACHE)
              .then((cache) => cache.put(req, copy))
              .catch(() => {});
            return res;
          })
      )
    );
  }
});
