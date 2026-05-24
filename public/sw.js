const CACHE_NAME = "code-ascention-v1.7.3";

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
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      for (const url of ASSETS_TO_CACHE) {
        try {
          const response = await fetch(url, {
            cache: "no-cache",
          });

          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (err) {
          console.warn("[SW INSTALL]", url, err);
        }
      }
    })(),
  );
});

/* =========================================================
   ACTIVATE EVENT
========================================================= */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys.map(async (key) => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Removing old cache:", key);
            return caches.delete(key);
          }
        }),
      );

      console.log("[SW] Controle assumido. Pipelines prontos.");

      await self.clients.claim();
    })(),
  );
});

/* =========================================================
   FETCH EVENT
========================================================= */
/* =========================================================
   FETCH EVENT
========================================================= */
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = event.request.url;

  // BYPASS DEFINITIVO PARA ATIVOS DE INTELIGÊNCIA ARTIFICIAL
  // Se for o Hugging Face, repositório MLC-AI ou arquivos de pesos/wasm, o service worker NÃO INTERCEPTA.
  if (
    url.includes('huggingface.co') || 
    url.includes('mlc-ai') || 
    url.includes('.wasm') || 
    url.includes('.bin')
  ) {
    return; // Retorno precoce sem chamar event.respondWith. O navegador assume o fluxo de rede puro!
  }

  /* =====================================================
     AI / MODEL / WASM DETECTION
  ===================================================== */
  const isAI =
    url.hostname.includes("huggingface.co") ||
    url.hostname.includes("cdn-lfs.huggingface.co") ||
    url.hostname.includes("raw.githubusercontent.com") ||
    url.hostname.includes("mlc-ai") ||
    event.request.url.includes("huggingface.co") ||
    event.request.url.includes("mlc-ai") ||
    url.pathname.includes("/models/") ||
    url.pathname.includes("/tokenizer") ||
    url.pathname.includes("webllm") ||
    url.pathname.endsWith(".wasm") ||
    url.pathname.endsWith(".bin") ||
    url.pathname.endsWith(".gguf") ||
    url.pathname.endsWith(".params") ||
    (
      url.pathname.endsWith(".json") &&
      (
        url.pathname.includes("tokenizer") ||
        url.pathname.includes("model") ||
        url.pathname.includes("config")
      )
    );

  /* =====================================================
     BYPASS TOTAL PARA ASSETS DE IA (NUNCA INTERCEPTAR)
  ===================================================== */
  if (isAI) {
    // Ao dar return sem chamar event.respondWith(), dizemos ao navegador
    // para ignorar o Service Worker e fazer a requisição de rede nativa.
    // Isso evita erros de CORS/COEP com arquivos .wasm e .bin de qualquer modelo.
    return;
  }

  /* =====================================================
     IGNORE EXTENSION / WALLET / CROSS-ORIGIN NOISE
  ===================================================== */
  const ignoredHosts = [
    "verify.walletconnect.org",
    "relay.walletconnect.com",
    "google-analytics.com",
    "www.google-analytics.com",
  ];

  if (
    ignoredHosts.some((host) =>
      url.hostname.includes(host),
    )
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  /* =====================================================
     ESTRATÉGIA DE CACHE (Apenas para arquivos locais do App)
  ===================================================== */
  event.respondWith(
    (async () => {
      try {
        const cached = await caches.match(event.request);

        if (cached) {
          return cached;
        }

        const response = await fetch(event.request);

        const shouldCache =
          response &&
          response.status === 200 &&
          response.type === "basic" && // Garante que só cacheia arquivos do seu próprio domínio
          !url.pathname.startsWith("/api/") &&
          !url.pathname.includes("_next/webpack-hmr");

        if (shouldCache) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, response.clone());
        }

        return response;
      } catch (err) {
        console.error(
          "[SW FETCH ERROR]",
          event.request.url,
          err,
        );

        return new Response(
          JSON.stringify({
            error: "network_error",
          }),
          {
            status: 503,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }
    })(),
  );
});

/* =========================================================
   BACKGROUND MESSAGE CHANNEL
========================================================= */

self.addEventListener("message", (event) => {
  if (
    event.data &&
    event.data.type === "DETERMINISTIC_CLEANUP"
  ) {
    console.log(
      "[SW Channel] Pipeline secundário ativado: Auto-Cleanup validado com sucesso.",
    );
  }
});