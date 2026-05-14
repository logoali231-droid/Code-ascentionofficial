const CACHE_NAME = "code-ascention-v1.7.1";
const ASSETS_TO_CACHE = [
  "/", "/manifest.json", "/favicon.ico",
  "/icons/icon-192.png", "/icons/icon-512.png",
  "/icons/coins.png", "/icons/xp_potion_hd.png", "/icons/xp_potion.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(async (url) => {
          const response = await fetch(url, { cache: "no-cache" });
          if (response.ok) return cache.put(url, response);
        })
      );
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => 
      Promise.all(keys.map(async (key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
        // Limpeza agressiva de lixo binário em caches antigos/atuais
        const cache = await caches.open(key);
        const requests = await cache.keys();
        return Promise.all(requests.map(req => {
          if (req.url.endsWith(".wasm") || req.url.endsWith(".bin")) {
            return cache.delete(req);
          }
        }));
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  const isAI =
    url.hostname.includes("huggingface.co") ||
    url.hostname.includes("mlc-ai") ||
    url.pathname.includes(".bin") ||
    url.pathname.includes(".wasm") ||
    url.pathname.includes(".gguf") ||
    url.pathname.includes("model");

  if (isAI) {
    return; // deixa browser lidar direto
  }

  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => caches.match("/"))
      );
    })
  );
});
