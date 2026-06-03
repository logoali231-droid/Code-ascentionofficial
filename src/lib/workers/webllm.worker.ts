import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

/* =========================================================
   WORKER 2.0 — HARDENED LIFECYCLE LAYER
========================================================= */

const handler = new WebWorkerMLCEngineHandler();

/* =========================================================
   STATE OBSERVABILITY
========================================================= */

let lastMessageTime = Date.now();
let healthy = true;

/* =========================================================
   HEARTBEAT WATCHDOG
   (detecta worker "vivo mas morto")
========================================================= */

setInterval(() => {
  const now = Date.now();

  // se ficou muito tempo sem mensagem → sinal de freeze silencioso
  if (now - lastMessageTime > 120000) {
    healthy = false;

    console.warn("[WEBLLM WORKER 2.0] HEARTBEAT LOST");

    healthy = false;
  }
}, 5000);

/* =========================================================
   MESSAGE PIPE (SAFE WRAPPER)
========================================================= */

self.onmessage = (msg: MessageEvent) => {
  lastMessageTime = Date.now();

  try {
    // reset health if recovered
    if (!healthy) healthy = true;

    handler.onmessage(msg);
  } catch (err: any) {
    console.error("[WEBLLM WORKER 2.0 ERROR]", err);

    healthy = false;
  }
};

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

self.onerror = (err) => {
  console.error("[WEBLLM WORKER 2.0 FATAL]", err);

  healthy = false;

  healthy = false;
};

/* =========================================================
   UNHANDLED PROMISE SAFETY NET
========================================================= */

self.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
  console.error("[WEBLLM WORKER 2.0 UNHANDLED]", event.reason);

  healthy = false;
});
