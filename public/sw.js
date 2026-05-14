const CACHE_NAME = "code-ascention-v1.7.1";
const ASSETS_TO_CACHE = [
  "/", "/manifest.json", "/favicon.ico",
  "/icons/icon-192.png", "/icons/icon-512.png",
  "/icons/coins.png", "/icons/xp_potion_hd.png", "/icons/xp_potion.png",
];

document.addEventListener(
  "visibilitychange",
  async () => {
    if (
      document.hidden &&
      navigator.deviceMemory <= 4
    ) {
      console.log(
        "[WebLLM] Background detected"
      );
    }
  }
);

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of ASSETS_TO_CACHE) {
        try {
          const res = await fetch(url);
          if (res.ok) await cache.put(url, res);
        } catch (e) {
          // ignora silenciosamente
        }
      }
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
  if (event.request.method !== "GET")
    return;

  const url =
    new URL(event.request.url);

  const isAI =
    url.hostname.includes(
      "huggingface.co"
    ) ||

    url.hostname.includes(
      "cdn-lfs.huggingface.co"
    ) ||

    url.hostname.includes(
      "raw.githubusercontent.com"
    ) ||

    url.pathname.endsWith(".wasm") ||

    url.pathname.endsWith(".bin") ||

    url.pathname.endsWith(".gguf");

  /*
    AI ASSETS:
    NEVER CACHE IN SW
  */

  if (isAI) {
    event.respondWith(
      fetch(event.request)
    );

    return;
  }

  /*
    NORMAL CACHE
  */

  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached)
          return cached;

        return fetch(event.request)
          .then((response) => {
            if (
              !response ||
              response.status !== 200
            ) {
              return response;
            }

            const cloned =
              response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(
                  event.request,
                  cloned
                );
              });

            return response;
          });
      })
  );
});