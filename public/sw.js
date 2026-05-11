/// <reference lib="webworker" />

const CACHE_NAME = "code-ascention-v1";

// Liste apenas os arquivos que você tem CERTEZA que existem na pasta /public
const ASSETS_TO_CACHE = [
  "/",
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/coins.png",
  "/icons/xp_potion_hd.png",
  "/icons/xp_potion.png",
  // Adicione aqui ícones ou sons específicos que REALMENTE existem em /public
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usamos uma estratégia de tentativa individual para não quebrar tudo
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => {
          return cache.add(url).catch(err => console.error(`Falha ao cachear: ${url}`, err));
        })
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});