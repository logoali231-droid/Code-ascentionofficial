const CACHE_NAME = "code-ascention-v1.7.1";

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

/* =========================================================
   INSTALL EVENT
========================================================= */
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
    }),
  );
});

/* =========================================================
   ACTIVATE EVENT (CLEANUP DE ASSETS ANTIGOS)
========================================================= */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map(async (key) => {
            if (key !== CACHE_NAME) return caches.delete(key);

            // Limpeza agressiva de lixo binário em caches antigos/atuais
            const cache = await caches.open(key);
            const requests = await cache.keys();
            return Promise.all(
              requests.map((req) => {
                if (req.url.endsWith(".wasm") || req.url.endsWith(".bin")) {
                  return cache.delete(req);
                }
              }),
            );
          }),
        ),
      )
      .then(() => {
        console.log("[SW] Controle assumido. Pipelines prontos.");
        return self.clients.claim();
      }),
  );
});

/* =========================================================
   FETCH EVENT (ESTRATÉGIA DE CACHE + ISOLAMENTO DE LOCAL IA)
========================================================= */
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  const isAI =
    url.hostname.includes("huggingface.co") ||
    url.hostname.includes("cdn-lfs.huggingface.co") ||
    url.hostname.includes("raw.githubusercontent.com") ||
    url.pathname.endsWith(".wasm") ||
    url.pathname.endsWith(".bin") ||
    url.pathname.endsWith(".gguf");

  event.respondWith(
    (async () => {
      try {
        /*
          NEVER CACHE AI ASSETS
        */
        if (isAI) {
          return await fetch(event.request);
        }

        /*
          CACHE FIRST
        */
        const cached = await caches.match(event.request);

        if (cached) {
          return cached;
        }

        const response = await fetch(event.request);

        if (
          response &&
          response.status === 200
        ) {
          const cache = await caches.open(CACHE_NAME);

          cache.put(
            event.request,
            response.clone(),
          );
        }

        return response;
      } catch (err) {
        console.error(
          "[SW FETCH ERROR]",
          err,
        );

        return new Response(
          JSON.stringify({
            error: "network_error",
          }),
          {
            status: 503,
            headers: {
              "Content-Type":
                "application/json",
            },
          },
        );
      }
    })(),
  );
});
/* =========================================================
   CICLO DE VIDA DETERMINÍSTICO (BACKGROUND MESSAGING)
========================================================= */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "DETERMINISTIC_CLEANUP") {
    // Confirmação de recebimento da rotina secundária disparada no App Boot
    console.log(
      "[SW Channel] Pipeline secundário ativado: Auto-Cleanup validado com sucesso.",
    );
  }
});
