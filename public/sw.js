self.addEventListener("install", (e) => {
  console.log("Service Worker installed");
});

self.addEventListener("fetch", (event) => {
  // fallback simples
});
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  // Necessário para satisfazer os critérios de instalação do PWA
  event.respondWith(fetch(event.request));
});