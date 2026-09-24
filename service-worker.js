// service-worker.js
// Cache sederhana untuk "app shell" saja (file HTML, manifest, ikon).
// Semua permintaan ke Supabase / API lain SELALU diambil dari jaringan (tidak di-cache),
// supaya data soal/nilai/login tetap live dan tidak pernah "basi".

const CACHE_NAME = "asts-smpn11-shell-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Hanya proses request GET ke origin sendiri.
  // Request ke Supabase / domain lain dibiarkan lewat apa adanya (tidak di-cache).
  if (url.origin !== self.location.origin || event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((networkResponse) => {
          return networkResponse;
        })
        .catch(() => {
          // PENTING: harus selalu mengembalikan sebuah Response, jangan pernah undefined,
          // atau Chrome akan menganggap ada error dan bisa menggagalkan syarat instalasi PWA.
          return caches.match("./index.html").then((fallback) => {
            return fallback || new Response("Offline", { status: 503, statusText: "Offline" });
          });
        });
    })
  );
});
