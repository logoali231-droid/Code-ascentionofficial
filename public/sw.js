self.addEventListener("install", (e) => {
  console.log("Service Worker installed");
});

self.addEventListener("fetch", (event) => {
  // fallback simples
});