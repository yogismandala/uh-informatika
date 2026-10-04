// service-worker.js
// App shell: HTML selalu coba ambil dari jaringan dulu (network-first) supaya perubahan
// aplikasi langsung sampai ke siswa. Cache hanya dipakai jika offline.
// Request ke Supabase / API lain tidak pernah di-cache.

const CACHE_NAME = "uh-informatika-v3";   // NAIKKAN angka ini setiap kali ada perubahan besar
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

  // Hanya GET ke origin sendiri. Supabase / domain lain dibiarkan lewat apa adanya.
  if (url.origin !== self.location.origin || event.request.method !== "GET") {
    return;
  }

  const isHTML =
    event.request.mode === "navigate" ||
    (event.request.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    // NETWORK-FIRST untuk halaman HTML
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return networkResponse;
        })
        .catch(() =>
          caches.match(event.request).then((cached) =>
            cached ||
            caches.match("./index.html").then((fallback) =>
              fallback || new Response("Offline", { status: 503, statusText: "Offline" })
            )
          )
        )
    );
    return;
  }

  // CACHE-FIRST untuk file statis (ikon, manifest, dll)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(
        () => new Response("Offline", { status: 503, statusText: "Offline" })
      );
    })
  );
});
