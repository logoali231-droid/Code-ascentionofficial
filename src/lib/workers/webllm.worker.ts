import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

/* =========================================================
   GLOBAL STATE
========================================================= */

let handler: WebWorkerMLCEngineHandler | null =
  null;

let isInitializing = false;

let isShuttingDown = false;

/* =========================================================
   HELPERS
========================================================= */

function delay(ms: number) {
  return new Promise((r) =>
    setTimeout(r, ms)
  );
}

/* =========================================================
   IDLE AUTO CLEANUP
========================================================= */

let idleTimer:
  | ReturnType<typeof setTimeout>
  | null = null;

function clearIdleTimer() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function resetIdleTimer() {

  clearIdleTimer();

  idleTimer = setTimeout(
    async () => {

      /* =====================================
         DO NOT CLEAN DURING INIT
      ===================================== */

      if (isInitializing) {

        console.warn(
          "[WEBLLM WORKER] Init in progress, skipping idle cleanup"
        );

        resetIdleTimer();

        return;
      }

      /* =====================================
         DO NOT DOUBLE SHUTDOWN
      ===================================== */

      if (isShuttingDown) {
        return;
      }

      isShuttingDown = true;

      try {

        console.warn(
          "[WEBLLM WORKER] Idle timeout cleanup"
        );

        handler = null;

        /* =====================================
           OPTIONAL GC
        ===================================== */

        // @ts-ignore
        globalThis.gc?.();

        await delay(200);

      } catch (err) {

        console.warn(
          "[WEBLLM WORKER] Idle cleanup failed",
          err
        );

      } finally {

        clearIdleTimer();

        self.close();
      }
    },

    /* =========================================
       5 MINUTES
    ========================================= */

    5 * 60_000
  );
}

/* =========================================================
   HANDLER FACTORY
========================================================= */

function createHandler() {

  if (!handler) {

    console.log(
      "[WEBLLM WORKER] Creating handler"
    );

    handler =
      new WebWorkerMLCEngineHandler();
  }

  return handler;
}

/* =========================================================
   SAFE SHUTDOWN
========================================================= */

async function shutdownWorker(
  reason: string
) {

  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  try {

    console.warn(
      `[WEBLLM WORKER] Shutdown: ${reason}`
    );

    clearIdleTimer();

    handler = null;

    self.postMessage({
      type: "WORKER_SHUTDOWN",
      reason,
    });

    // @ts-ignore
    globalThis.gc?.();

    await delay(200);

  } catch (err) {

    console.warn(
      "[WEBLLM WORKER] Shutdown failed",
      err
    );

  } finally {

    self.close();
  }
}

/* =========================================================
   MESSAGE PIPELINE
========================================================= */

self.onmessage = async (
  msg: MessageEvent
) => {

  try {

    const { type } = msg.data;

    /* =====================================================
       INIT START
    ===================================================== */

    if (type === "INIT_START") {

      isInitializing = true;

      console.log(
        "[WEBLLM WORKER] INIT_START"
      );

      resetIdleTimer();

      return;
    }

    /* =====================================================
       INIT END
    ===================================================== */

    if (type === "INIT_END") {

      isInitializing = false;

      console.log(
        "[WEBLLM WORKER] INIT_END"
      );

      resetIdleTimer();

      return;
    }

    /* =====================================================
       HARD ABORT
    ===================================================== */

    if (
      type === "ABORT" ||
      type === "unload"
    ) {

      await shutdownWorker(
        "forced_abort"
      );

      return;
    }

    /* =====================================================
       ACTIVE USAGE
    ===================================================== */

    resetIdleTimer();

    const currentHandler =
      createHandler();

    await currentHandler.onmessage(
      msg
    );

  } catch (err) {

    const errorMessage =
      err instanceof Error
        ? err.message
        : String(err);

    console.error(
      "[WEBLLM WORKER ERROR]",
      errorMessage
    );

    try {

      self.postMessage({
        type: "worker_error",
        error: errorMessage,
      });

    } catch {}

    /* =========================================
       RECOVERABLE STATE RESET
    ========================================= */

    if (
      errorMessage.includes(
        "memory"
      ) ||
      errorMessage.includes(
        "OOM"
      ) ||
      errorMessage.includes(
        "context lost"
      ) ||
      errorMessage.includes(
        "WebGPU"
      )
    ) {

      console.warn(
        "[WEBLLM WORKER] Resetting handler after critical error"
      );

      handler = null;

      // @ts-ignore
      globalThis.gc?.();
    }
  }
};
