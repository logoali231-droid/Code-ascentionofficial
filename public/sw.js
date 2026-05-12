/// <reference lib="webworker" />

const CACHE_NAME = "code-ascention-v1.1"; // Versão atualizada

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
self.addEventListener("fetch", (event) => {
  // Ignora requisições de extensões ou esquemas que não sejam http/https
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response; // Retorna do cache
      }
      return fetch(event.request).then(res => {
        // Se for uma imagem ou fonte, podemos salvar no cache dinamicamente aqui (opcional)
        return res;
      }).catch(() => {
        // Se a rede falhar e for navegação, pode retornar a página inicial (offline)
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
