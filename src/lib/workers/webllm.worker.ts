import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

let handler: WebWorkerMLCEngineHandler | null = null;

/* =========================================================
   IDLE AUTO CLEANUP
========================================================= */

let idleTimer: ReturnType<typeof setTimeout> | null = null;

function resetIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer);
  }

  idleTimer = setTimeout(async () => {
    try {
      console.warn("[WEBLLM WORKER] Idle timeout cleanup");

      handler = null;

      // @ts-ignore
      globalThis.gc?.();

      await new Promise((r) => setTimeout(r, 50));
    } catch (err) {
      console.warn("[WEBLLM WORKER] Idle cleanup failed", err);
    } finally {
      self.close();
    }
  }, 45_000);
}

/* =========================================================
   HANDLER FACTORY
========================================================= */

function createHandler() {
  if (!handler) {
    handler = new WebWorkerMLCEngineHandler();
  }

  return handler;
}

/* =========================================================
   MESSAGE PIPELINE
========================================================= */

self.onmessage = async (msg: MessageEvent) => {
  try {
    const { type } = msg.data;

    /* =====================================================
       HARD UNLOAD / ABORT
    ===================================================== */

    if (type === "ABORT" || type === "unload") {
      try {
        console.warn("[WEBLLM WORKER] Forced unload");

        handler = null;

        self.postMessage({
          type: "ABORTED_SUCCESS",
        });

        // @ts-ignore
        globalThis.gc?.();

        await new Promise((r) => setTimeout(r, 50));
      } catch (err) {
        console.warn("[WORKER UNLOAD ERROR]", err);
      } finally {
        self.close();
      }

      return;
    }

    /* =====================================================
       KEEP WORKER ALIVE ONLY DURING ACTIVE USAGE
    ===================================================== */

    resetIdleTimer();

    const currentHandler = createHandler();

    await currentHandler.onmessage(msg);

  } catch (err) {

    const errorMessage =
      err instanceof Error
        ? err.message
        : String(err);

    console.error("[WEBLLM WORKER ERROR]", errorMessage);

    self.postMessage({
      type: "worker_error",
      error: errorMessage,
    });
  }
};