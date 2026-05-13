const CACHE_NAME = "code-ascention-v1.5.2"; 

const ASSETS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/coins.png",
  "/icons/xp_potion_hd.png",
  "/icons/xp_potion.png",
];

// Instalação otimizada para Mobile (Samsung M23)
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usamos allSettled para evitar que um erro de rede em um ícone trave o motor
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(async (url) => {
          try {
            // Força a busca de uma versão limpa para evitar NetworkError de cache antigo
            const response = await fetch(url, { cache: "no-cache" });
            if (!response.ok) throw new Error(`Status: ${response.status}`);
            return await cache.put(url, response);
          } catch (err) {
            console.warn(`[SW] Falha ao registrar asset: ${url}`, err);
          }
        })
      );
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== 'GET' || !req.url.startsWith("http")) return;

  const isExternal = !req.url.includes(self.location.origin);
  
  // Blindagem reforçada para arquivos pesados da IA
  const isAIAsset = 
    req.url.includes("huggingface.co") || 
    req.url.includes("mlc-ai") || 
    req.url.includes("cdn-lfs") ||
    req.url.endsWith(".wasm") || 
    req.url.endsWith(".bin") ||
    (req.url.endsWith(".json") && req.url.includes("config"));

  if (isExternal || isAIAsset) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((response) => {
          if (!response || response.status === 404) {
            if (req.mode === "navigate") return caches.match("/");
          }
          return response;
        })
        .catch(() => {
          if (req.mode === "navigate") return caches.match("/");
          return new Response("Offline", { status: 503 });
        });
    })
  );
});
