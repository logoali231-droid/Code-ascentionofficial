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

    self.postMessage({
      type: "WORKER_STUCK",
      reason: "heartbeat_timeout",
    });
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

    self.postMessage({
      type: "WORKER_ERROR",
      message: err?.message ?? "unknown_error",
    });
  }
};

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

self.onerror = (err) => {
  console.error("[WEBLLM WORKER 2.0 FATAL]", err);

  healthy = false;

  self.postMessage({
    type: "WORKER_FATAL",
    reason: "onerror_triggered",
  });
};

/* =========================================================
   UNHANDLED PROMISE SAFETY NET
========================================================= */

self.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
  console.error("[WEBLLM WORKER 2.0 UNHANDLED]", event.reason);

  self.postMessage({
    type: "WORKER_PROMISE_REJECTION",
    reason: String(event.reason),
  });
});
