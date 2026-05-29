import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

/* =========================================================
   STATE MACHINE
========================================================= */

let handler: WebWorkerMLCEngineHandler | null = null;

let state: "idle" | "init" | "active" | "shutting" = "idle";

let lastActivity = Date.now();

let idleTimer: any = null;

/* =========================================================
   HELPERS
========================================================= */

const delay = (ms: number) =>
  new Promise((r) => setTimeout(r, ms));

const isRecentlyActive = (ms = 15000) =>
  Date.now() - lastActivity < ms;

/* =========================================================
   ACTIVITY TRACKING
========================================================= */

function touch() {
  lastActivity = Date.now();
}

/* =========================================================
   IDLE CLEANUP (SMART VERSION)
========================================================= */

function resetIdleTimer() {
  clearTimeout(idleTimer);

  idleTimer = setTimeout(async () => {

    if (state === "init") {
      resetIdleTimer();
      return;
    }

    if (state === "active" && isRecentlyActive(15000)) {
      // still hot, delay cleanup
      resetIdleTimer();
      return;
    }

    if (state === "shutting") return;

    state = "shutting";

    console.warn("[WEBLLM WORKER] Smart idle shutdown");

    try {
      await safeDrainAndClose();
    } finally {
      state = "idle";
      resetIdleTimer();
    }

  }, 180_000);
}

/* =========================================================
   HANDLER FACTORY (SAFE)
========================================================= */

function getHandler() {
  if (!handler) {
    handler = new WebWorkerMLCEngineHandler();
  }
  return handler;
}

/* =========================================================
   SAFE DRAIN SHUTDOWN (CRITICAL UPGRADE)
========================================================= */

async function safeDrainAndClose() {

  try {

    await delay(300);

    if (handler) {

      try {

        // força flush do pipeline
        await Promise.race([
          // @ts-ignore
          handler.unload?.(),
          delay(2000)
        ]);

      } catch (err) {
        console.warn("[WEBLLM WORKER] handler unload failed", err);
      }

      handler = null;
    }

    // @ts-ignore
    globalThis.gc?.();

    await delay(300);

  } catch (err) {
    console.warn("[WEBLLM WORKER] drain failed", err);
  }
}

/* =========================================================
   HARD SHUTDOWN
========================================================= */

async function shutdown(reason: string) {
  if (state === "shutting") return;

  state = "shutting";

  console.warn("[WEBLLM WORKER] shutdown:", reason);

  clearTimeout(idleTimer);

  try {
    await safeDrainAndClose();

    self.postMessage({
      type: "WORKER_SHUTDOWN",
      reason,
    });

  } finally {
    state = "idle";
  }
}

/* =========================================================
   MESSAGE PIPELINE (V2)
========================================================= */

self.onmessage = async (msg: MessageEvent) => {
  try {
    const { type } = msg.data;

    touch();

    /* =====================================================
       INIT START
    ===================================================== */

    if (type === "INIT_START") {
      state = "init";
      resetIdleTimer();
      return;
    }

    /* =====================================================
       INIT END
    ===================================================== */

    if (type === "INIT_END") {
      state = "idle";
      resetIdleTimer();
      return;
    }

    /* =====================================================
       ABORT
    ===================================================== */

    if (type === "ABORT" || type === "unload") {
      await shutdown("forced_abort");
      return;
    }

    /* =====================================================
       ACTIVE EXECUTION
    ===================================================== */

    state = "active";

    try {

      const h = getHandler();

      await h.onmessage(msg);

    } finally {

      state = "idle";
      resetIdleTimer();
    }
  } catch (err) {

    const msg =
      err instanceof Error ? err.message : String(err);

    console.error("[WEBLLM WORKER ERROR]", msg);

    self.postMessage({
      type: "worker_error",
      error: msg,
    });

    /* =====================================================
       CRITICAL RESET LOGIC
    ===================================================== */

    if (
      msg.includes("OOM") ||
      msg.includes("memory") ||
      msg.includes("WebGPU") ||
      msg.includes("context lost")
    ) {
      console.warn("[WEBLLM WORKER] HARD RESET TRIGGERED");
      await shutdown("memory_pressure");
      return;
    }
  }
};
