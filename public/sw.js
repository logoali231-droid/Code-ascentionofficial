/// <reference lib="webworker" />

// Definimos o escopo global do Service Worker de forma explícita
const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

sw.addEventListener("install", (event) => {
  console.log("Service Worker installed");
  sw.skipWaiting();
});

sw.addEventListener("fetch", (event) => {
  // Agora o TypeScript sabe que event é um FetchEvent
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response("Offline", {
        status: 503,
        statusText: "Service Unavailable",
        headers: new Headers({ "Content-Type": "text/plain" }),
      });
    })
  );
});