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

const isRecentlyActive = (ms = 5000) =>
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

    if (state === "active" && isRecentlyActive(3000)) {
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
      self.close();
    }

  }, 5 * 60_000);
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

    // give GPU / queue time to flush
    await delay(150);

    handler = null;

    // GC hint (best effort only)
    // @ts-ignore
    globalThis.gc?.();

    await delay(150);

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
    self.close();
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

    const h = getHandler();

    await h.onmessage(msg);

    state = "idle";
    resetIdleTimer();

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

      handler = null;

      state = "idle";

      // aggressive recovery delay
      await delay(200);
    }
  }
};
