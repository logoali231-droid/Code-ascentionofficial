/// <reference lib="webworker" />

const CACHE_NAME = "code-ascention-v1.2"; // Versão atualizada

// Lista de ativos essenciais
const ASSETS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/coins.png",
  "/icons/xp_potion_hd.png",
  "/icons/xp_potion.png"
];

// Instalação: Tenta cachear, mas não trava se falhar em arquivos individuais
self.addEventListener("install", (event) => {
  self.skipWaiting(); // Força o SW a assumir o controle imediatamente
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Iniciando cache de ativos...");
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => 
          cache.add(url).catch(err => 
            console.warn(`[SW] Aviso: Item ignorado (não encontrado): ${url}`)
          )
        )
      );
    })
  );
});

// Ativação: Limpa caches antigos de versões anteriores
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("[SW] Limpando cache antigo:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Tenta Cache primeiro, se não tiver, busca na rede
// Fetch: Estratégia de Cache First com Fallback Seguro
self.addEventListener("fetch", (event) => {
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. Se estiver no cache, retorna imediatamente
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Se não estiver, tenta buscar na rede
      return fetch(event.request)
        .then((networkResponse) => {
          // Verifica se a resposta é válida antes de retornar
          if (!networkResponse || networkResponse.status === 404) {
            // Se for a navegação para uma página (como /machineLock) e deu 404
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
          }
          return networkResponse;
        })
        .catch((err) => {
          console.error("[SW] Falha na rede:", err);
          
          // 3. FALLBACK CRÍTICO: Se a rede falhar totalmente
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }

          // Retorna uma resposta de erro básica em vez de 'undefined'
          // Isso evita o erro "Failed to convert value to 'Response'"
          return new Response("Rede indisponível", {
            status: 503,
            statusText: "Service Unavailable",
            headers: new Header({ 'Content-Type': 'text/plain' })
          });
        });
    })
  );
});
