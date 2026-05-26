"use client";

import { SYSTEM_CONFIG } from "@/config/system";
import type { MLCEngineInterface } from "@mlc-ai/web-llm";
import { detectSystemCapabilities } from "./modelManager";
import { playSound } from "./sounds";

/* =========================================================
   GLOBAL STATE
========================================================= */

let worker: Worker | null = null;

let engine: MLCEngineInterface | null =
  null;

let loadingPromise:
  | Promise<MLCEngineInterface>
  | null = null;

let currentModel: string | null =
  null;

let generationLock = false;

let backgroundSince: number | null =
  null;

let isUnloading = false;

let isInitializing = false;

/* =========================================================
   HELPERS
========================================================= */

function isMobileDevice() {
  return /Mobi|Android|iPhone|iPad/i.test(
    navigator.userAgent
  );
}

function delay(ms: number) {
  return new Promise((r) =>
    setTimeout(r, ms)
  );
}

function safeAbortError() {
  return new DOMException(
    "Aborted",
    "AbortError"
  );
}

/* =========================================================
   MEMORY GUARD
========================================================= */

function getMemoryUsage() {
  return (
    (performance as any).memory
      ?.usedJSHeapSize || 0
  );
}

function isMemoryCritical(
  isMobile: boolean
) {
  const mem = getMemoryUsage();

  if (!mem) return false;

  const limit = isMobile
    ? 200 * 1024 * 1024
    : 400 * 1024 * 1024;

  return mem > limit;
}

/* =========================================================
   SAFE CLEANUP
========================================================= */

export async function emergencyWebLLMCleanup() {
  try {
    console.warn(
      "[WEBLLM] Emergency cleanup started"
    );

    await localUnloadEngine();

    /* =========================================
       CACHE STORAGE
    ========================================= */

    if ("caches" in window) {
      const cacheKeys =
        await caches.keys();

      await Promise.all(
        cacheKeys
          .filter((k) =>
            k
              .toLowerCase()
              .includes("webllm")
          )
          .map((k) =>
            caches.delete(k)
          )
      );
    }

    /* =========================================
       INDEXEDDB
    ========================================= */

    if (indexedDB.databases) {
      const dbs =
        await indexedDB.databases();

      await Promise.all(
        dbs.map(async (db) => {
          if (
            db.name
              ?.toLowerCase()
              .includes("webllm")
          ) {
            try {
              indexedDB.deleteDatabase(
                db.name
              );
            } catch {}
          }
        })
      );
    }

    console.warn(
      "[WEBLLM] Emergency cleanup completed"
    );
  } catch (err) {
    console.warn(
      "[WEBLLM] Cleanup failed:",
      err
    );
  }
}

/* =========================================================
   ENGINE INIT
========================================================= */

export async function initEngine(
  modelId?: string,
  onProgress?: (report: any) => void
): Promise<MLCEngineInterface> {

  if (
    engine &&
    currentModel === modelId
  ) {
    return engine;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {

      if (
        typeof window === "undefined"
      ) {
        throw new Error(
          "SSR blocked for WebLLM"
        );
      }

      const specs =
        await detectSystemCapabilities();

      const isMobile =
        isMobileDevice();

      const selectedModelId =
        modelId ??
        specs?.recommended
          ?.model_id ??
        SYSTEM_CONFIG
          .AVAILABLE_MODELS[0]
          .model_id;

      /* =========================================
         VALIDATION
      ========================================= */

      if (
        !SYSTEM_CONFIG.AVAILABLE_MODELS.some(
          (m) =>
            m.model_id ===
            selectedModelId
        )
      ) {
        throw new Error(
          `Invalid model_id: ${selectedModelId}`
        );
      }

      /* =========================================
         MOBILE PROTECTION
      ========================================= */

      if (
        isMobile &&
        selectedModelId.includes(
          "Phi-3.5"
        )
      ) {
        throw new Error(
          "Phi-3.5 disabled on mobile"
        );
      }

      /* =========================================
         MEMORY PRESSURE
      ========================================= */

      if (
        isMemoryCritical(isMobile)
      ) {

        await emergencyWebLLMCleanup();

        throw new Error(
          "MEMORY_PRESSURE_BLOCKED_INIT"
        );
      }

      /* =========================================
         MODEL SWITCH
      ========================================= */

      if (
        engine &&
        currentModel !==
          selectedModelId
      ) {

        await localUnloadEngine();

        await delay(500);
      }

      /* =========================================
         WORKER CREATION
      ========================================= */

      worker = new Worker(
        new URL(
          "../workers/webllm.worker.ts",
          import.meta.url
        ),
        {
          type: "module",
        }
      );

      worker.onerror =
        async (err) => {

          console.error(
            "[WEBLLM WORKER ERROR]",
            err
          );

          loadingPromise = null;

          isInitializing = false;

          await localUnloadEngine();
        };

      worker.onmessageerror =
        async (err) => {

          console.error(
            "[WEBLLM MESSAGE ERROR]",
            err
          );

          loadingPromise = null;

          isInitializing = false;

          await localUnloadEngine();
        };

      const {
        CreateWebWorkerMLCEngine,
      } = await import(
        "@mlc-ai/web-llm"
      );

      const nav =
        navigator as Navigator & {
          deviceMemory?: number;
        };

      const useCache =
        !isMobile ||
        (nav.deviceMemory ?? 4) >=
          4;

      /* =========================================
         YIELD
      ========================================= */

      await delay(50);

      /* =========================================
         INIT START
      ========================================= */

      isInitializing = true;

      worker.postMessage({
        type: "INIT_START",
      });

      console.log(
        "[WEBLLM] INIT_START"
      );

      /* =========================================
         ENGINE CREATE
      ========================================= */

      engine =
        await CreateWebWorkerMLCEngine(
          worker,
          selectedModelId,
          {
            initProgressCallback:
              (report: any) => {

                try {

                  console.log(
                    "[WEBLLM PROGRESS]",
                    report
                  );

                  onProgress?.(
                    report
                  );

                  if (
                    isMemoryCritical(
                      isMobile
                    )
                  ) {

                    console.warn(
                      "[WEBLLM] MEMORY PRESSURE DURING INIT"
                    );

                    throw new Error(
                      "MEMORY_PRESSURE_DURING_INIT"
                    );
                  }

                } catch (err) {

                  console.warn(
                    "[WEBLLM PROGRESS ERROR]",
                    err
                  );
                }
              },

            logLevel: "INFO",

            chatOpts: {
              context_window_size:
                isMobile
                  ? SYSTEM_CONFIG
                      .LLM
                      .MOBILE
                      .context_window_size
                  : SYSTEM_CONFIG
                      .LLM
                      .context_window_size,

              sliding_window_size:
                isMobile
                  ? SYSTEM_CONFIG
                      .LLM
                      .MOBILE
                      .sliding_window_size
                  : SYSTEM_CONFIG
                      .LLM
                      .sliding_window_size,

              attention_sink_size:
                SYSTEM_CONFIG
                  .LLM
                  .attention_sink_size,
            },

            useIndexedDBCache:
              useCache,

            enableProgressiveLoading: true,
          } as any
        );

      currentModel =
        selectedModelId;

      /* =========================================
         INIT END
      ========================================= */

      isInitializing = false;

      worker.postMessage({
        type: "INIT_END",
      });

      console.log(
        "[WEBLLM] INIT_END"
      );

      console.log(
        "[WEBLLM] Engine ready:",
        selectedModelId
      );

      return engine;

    } catch (err) {

      console.error(
        "[WEBLLM INIT ERROR]",
        err
      );

      isInitializing = false;

      try {

        if (worker) {
          worker.postMessage({
            type: "INIT_END",
          });
        }

      } catch {}

      try {
        await localUnloadEngine();
      } catch {}

      loadingPromise = null;

      throw err;
    }
  })();

  return loadingPromise;
}

/* =========================================================
   SAFE UNLOAD
========================================================= */

export async function localUnloadEngine(): Promise<void> {

  if (isUnloading) return;

  isUnloading = true;

  try {

    /* =========================================
       ENGINE
    ========================================= */

    if (engine) {

      try {

        await Promise.race([
          engine.unload(),
          delay(3000),
        ]);

      } catch (err) {

        console.warn(
          "[WEBLLM UNLOAD ERROR]",
          err
        );
      }
    }

    /* =========================================
       WORKER
    ========================================= */

    if (worker) {

      try {
        worker.postMessage({
          type: "ABORT",
        });
      } catch {}

      await delay(100);

      try {
        worker.terminate();
      } catch {}

      worker = null;
    }

    /* =========================================
       GC WINDOW
    ========================================= */

    await delay(300);

  } finally {

    engine = null;

    worker = null;

    loadingPromise = null;

    currentModel = null;

    generationLock = false;

    isInitializing = false;

    isUnloading = false;

    console.log(
      "[WEBLLM] Clean unload complete"
    );
  }
}

/* =========================================================
   GENERATION STREAM
========================================================= */

export async function* generate(
  prompt: string,
  temperature = 0.7,
  onProgress?: (
    report: any
  ) => void,
  signal?: AbortSignal
): AsyncGenerator<string> {

  if (signal?.aborted) {
    throw safeAbortError();
  }

  const isMobile =
    isMobileDevice();

  /* =========================================
     HARD MOBILE LOCK
  ========================================= */

  if (
    isMobile &&
    generationLock
  ) {
    throw new Error(
      "MOBILE_GENERATION_LOCK"
    );
  }

  /* =========================================
     BACKGROUND BLOCK
  ========================================= */

  if (
    isMobile &&
    document.hidden
  ) {
    throw new Error(
      "BACKGROUND_GENERATION_BLOCKED"
    );
  }

  if (generationLock) {
    throw new Error(
      "Generation already in progress"
    );
  }

  generationLock = true;

  const abortHandler = () => {
    generationLock = false;
  };

  signal?.addEventListener(
    "abort",
    abortHandler
  );

  try {

    const engineRef =
      await initEngine(
        undefined,
        onProgress
      );

    if (signal?.aborted) {
      throw safeAbortError();
    }

    const stream =
      await engineRef.chat.completions.create(
        {
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],

          temperature,

          stream: true,

          signal,

          max_tokens:
            isMobile
              ? 512
              : 1024,
        } as any
      );

    for await (const chunk of stream as any) {

      if (signal?.aborted) {
        throw safeAbortError();
      }

      const text =
        chunk?.choices?.[0]
          ?.delta?.content;

      if (text) {
        yield text;
      }
    }

  } catch (err: any) {

    if (
      err?.name ===
      "AbortError"
    ) {

      console.warn(
        "[WEBLLM] Generation aborted"
      );

      return;
    }

    console.error(
      "[GENERATE ERROR]",
      err
    );

    playSound(
      "error",
      0.4
    );

    throw err;

  } finally {

    signal?.removeEventListener(
      "abort",
      abortHandler
    );

    generationLock = false;
  }
}

/* =========================================================
   VISIBILITY CLEANUP
========================================================= */

let visibilityAttached =
  false;

if (
  typeof window !==
    "undefined" &&
  !visibilityAttached
) {

  visibilityAttached = true;

  document.addEventListener(
    "visibilitychange",
    async () => {

      const isMobile =
        isMobileDevice();

      if (document.hidden) {

        backgroundSince =
          Date.now();

        return;
      }

      if (
        backgroundSince &&
        isMobile
      ) {

        const timeAway =
          Date.now() -
          backgroundSince;

        if (
          timeAway >
          SYSTEM_CONFIG
            .CLEANUP
            .MOBILE_BACKGROUND_TIMEOUT_MS
        ) {

          console.warn(
            "[WEBLLM] Background timeout reached"
          );

          await localUnloadEngine();
        }

        backgroundSince = null;
      }
    }
  );
         }
