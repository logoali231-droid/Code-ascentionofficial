/// <reference lib="webworker" />

const CACHE_NAME = "code-ascention-v1.5";

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
      // Usamos map com fetch individual para ter controle total
      return Promise.all(
        ASSETS_TO_CACHE.map(async (url) => {
          try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Offline hotfix: ${response.status}`);
            return await cache.put(url, response);
          } catch (err) {
            console.warn(`[SW] Pulando asset inexistente: ${url}`);
            return Promise.resolve(); // Ignora o erro e continua
          }
        })
      );
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log(
                "[SW] Removing old cache:",
                cache
              );

              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (!req.url.startsWith("http")) {
    return;
  }

  // NÃO intercepta assets do WebLLM
  if (
  req.url.includes("huggingface.co") ||
  req.url.includes(
    "raw.githubusercontent.com"
  ) ||
  req.url.includes(
    "cdn-lfs.huggingface.co"
  ) ||
  req.url.includes("/resolve/") ||
  req.url.endsWith(".wasm") ||
  req.url.endsWith(".bin")
) {
  return;
}

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(req)
        .then((response) => {
          if (
            !response ||
            response.status === 404
          ) {
            if (req.mode === "navigate") {
              return caches.match("/");
            }
          }

          return response;
        })
        .catch((err) => {
          console.error(
            "[SW Fetch Error]",
            err
          );

          if (req.mode === "navigate") {
            return caches.match("/");
          }

          return new Response(
            "Offline",
            {
              status: 503,
              headers: {
                "Content-Type":
                  "text/plain",
              },
            }
          );
        });
    })
  );
});
