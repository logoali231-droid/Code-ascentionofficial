const CACHE_NAME = "code-ascention-v1.5.2";

const ASSETS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/coins.png",
  "/icons/xp_potion_hd.png",
  "/icons/xp_potion.png", // Verificado: Case-sensitive corrigido
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
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request: req } = event;
  const url = new URL(req.url);

  if (req.method !== 'GET' || !url.protocol.startsWith("http")) return;

  // Blindagem Samsung M23: Não intercepta binários pesados (deixa para IndexedDB)
  const isAIAsset = 
    url.hostname.includes("huggingface.co") || 
    url.hostname.includes("mlc-ai") || 
    url.pathname.endsWith(".wasm") || 
    url.pathname.endsWith(".bin") ||
    (url.pathname.endsWith(".json") && url.pathname.includes("config"));

  if (url.origin !== self.location.origin || isAIAsset) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req)
        .then((res) => {
          if (!res || res.status === 404) {
            if (req.mode === "navigate") return caches.match("/");
          }
          return res;
        })
        .catch(() => req.mode === "navigate" ? caches.match("/") : new Response("Offline", { status: 503 }))
    })
  );
});