/// <reference lib="webworker" />

// Mudado para 1.5.1 conforme solicitado
const CACHE_NAME = "code-ascention-v1.5.1";

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

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        ASSETS_TO_CACHE.map(async (url) => {
          try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Offline hotfix: ${response.status}`);
            return await cache.put(url, response);
          } catch (err) {
            console.warn(`[SW] Pulando asset inexistente: ${url}`);
            return Promise.resolve();
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
            console.log("[SW] Removing old cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // 1. Só intercepta requisições HTTP/HTTPS
  if (!req.url.startsWith("http")) return;

  // 2. FILTRO AGRESSIVO (DENTRO DO FETCH)
  // Isso impede que o SW tente tocar em qualquer arquivo da IA
  if (
    req.url.includes("huggingface.co") ||
    req.url.includes("mlc-ai") ||
    req.url.includes("raw.githubusercontent.com") ||
    req.url.includes("cdn-lfs") ||
    req.url.endsWith(".wasm") ||
    req.url.endsWith(".bin") ||
    (req.url.endsWith(".json") && req.url.includes("config"))
  ) {
    return; // Sai do SW e deixa o navegador baixar normalmente
  }

  // 3. Lógica de Cache para o restante do site
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((response) => {
          // Se for erro 404 em navegação, volta para a home
          if (!response || response.status === 404) {
            if (req.mode === "navigate") return caches.match("/");
          }
          return response;
        })
        .catch((err) => {
          if (req.mode === "navigate") return caches.match("/");
          return new Response("Offline", { status: 503 });
        });
    })
  );
});
