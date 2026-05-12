

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

// Instalação: Salva os arquivos essenciais da interface
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

// Ativação: Limpa caches antigos para evitar conflitos de versão
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

// Interceptação de Requisições


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

// Instalação: Salva os arquivos essenciais da interface
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

// Ativação: Limpa caches antigos para evitar conflitos de versão
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

// Interceptação de Requisições
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // 1. IGNORAR TUDO QUE NÃO SEJA GET
  // O WebLLM usa POST para telemetria e o IndexedDB não precisa de interceptação
  if (req.method !== 'GET') return;

  // 2. SÓ INTERCEPTA HTTP/HTTPS
  if (!req.url.startsWith("http")) return;

  const isExternal = !req.url.includes(self.location.origin);
  const isAIAsset = 
    req.url.includes("huggingface.co") || 
    req.url.includes("mlc-ai") || 
    req.url.includes("cdn-lfs") ||
    req.url.includes("raw.githubusercontent.com") ||
    req.url.endsWith(".wasm") || 
    req.url.endsWith(".bin") ||
    (req.url.endsWith(".json") && req.url.includes("config"));

  if (isExternal || isAIAsset) {
    return; // O navegador cuida disso sozinho (WebLLM vai usar IndexedDB)
  }

  // 4. LÓGICA DE CACHE PARA O RESTANTE DO SITE (PWA)
  event.respondWith(
    caches.match(req).then((cached) => {
      // Se já temos no cache (ex: ícones, fontes), retorna daqui
      if (cached) return cached;

      // Se não, tenta buscar na rede
      return fetch(req)
        .then((response) => {
          // Se for erro 404 em navegação, volta para a home para não dar tela branca
          if (!response || response.status === 404) {
            if (req.mode === "navigate") return caches.match("/");
          }
          return response;
        })
        .catch((err) => {
          // Em caso de erro total (offline), tenta carregar a página principal
          if (req.mode === "navigate") return caches.match("/");
          return new Response("Offline", { status: 503 });
        });
    })
  );
});
