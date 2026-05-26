"use client";

import { SYSTEM_CONFIG } from "@/config/system";
import type { MLCEngineInterface } from "@mlc-ai/web-llm";
import { detectSystemCapabilities } from "./modelManager";
import { playSound } from "./sounds";

/* =========================================================
   GLOBAL STATE
========================================================= */

let worker: Worker | null = null;
let engine: MLCEngineInterface | null = null;
let loadingPromise: Promise<MLCEngineInterface> | null = null;
let currentModel: string | null = null;
let generationLock = false;
let backgroundSince: number | null = null;

/* =========================================================
   HELPERS
========================================================= */

function isMobileDevice() {
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}

/* =========================================================
   MEMORY GUARD (NEW)
========================================================= */

function getMemoryUsage() {
  return (performance as any).memory?.usedJSHeapSize || 0;
}

function isMemoryCritical(isMobile: boolean) {
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
    console.warn("[WEBLLM] Emergency cleanup started");

    await localUnloadEngine();

    const cacheKeys = await caches.keys();

    await Promise.all(
      cacheKeys
        .filter((k) => k.toLowerCase().includes("webllm"))
        .map((k) => caches.delete(k))
    );

    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();

      dbs.forEach((db) => {
        if (db.name?.toLowerCase().includes("webllm")) {
          indexedDB.deleteDatabase(db.name);
        }
      });
    }

    console.warn("[WEBLLM] Emergency cleanup completed");
  } catch (err) {
    console.warn("[WEBLLM] Cleanup failed:", err);
  }
}

/* =========================================================
   ENGINE INIT
========================================================= */

export async function initEngine(
  modelId?: string,
  onProgress?: (report: any) => void,
): Promise<MLCEngineInterface> {

  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {

    try {

      const specs = await detectSystemCapabilities();
      const isMobile = isMobileDevice();

      const selectedModelId =
        modelId ??
        specs?.recommended?.model_id ??
        SYSTEM_CONFIG.AVAILABLE_MODELS[0].model_id;

      if (
        !SYSTEM_CONFIG.AVAILABLE_MODELS.some(
          (m) => m.model_id === selectedModelId
        )
      ) {
        throw new Error(`Invalid model_id: ${selectedModelId}`);
      }

      if (engine && currentModel === selectedModelId) {
        return engine;
      }

      if (isMobile && selectedModelId.includes("Phi-3.5")) {
        throw new Error("Phi-3.5 disabled on mobile");
      }

      /* =====================================================
         🧠 CRITICAL FIX: PRE-LOAD UNLOAD + GC WINDOW
      ===================================================== */

      if (engine && currentModel !== selectedModelId) {
  await localUnloadEngine();
  await new Promise((r) => setTimeout(r, 150));
      }

      if (isMemoryCritical(isMobile)) {
  console.warn(
    "[WEBLLM] Memory pressure detected during init"
  );
   }

      if (typeof window === "undefined") {
        throw new Error("SSR blocked for WebLLM");
      }

      worker = new Worker(
        new URL("../workers/webllm.worker.ts", import.meta.url),
        { type: "module" }
      );

      worker.onerror = async (err) => {
        console.error("[WEBLLM WORKER ERROR]", err);
        await localUnloadEngine();
      };

      const { CreateWebWorkerMLCEngine } =
        await import("@mlc-ai/web-llm");

      const useCache = true;

      engine = await CreateWebWorkerMLCEngine(
        worker,
        selectedModelId,
        {
          initProgressCallback: (report: any) => {

            onProgress?.(report);

            if (isMemoryCritical(isMobile)) {
              console.warn("[WEBLLM] INIT THROTTLED");
              throw new Error("INIT_THROTTLED");
            }
          },

          logLevel: "INFO",

          chatOpts: {
            context_window_size: isMobile
              ? SYSTEM_CONFIG.LLM.MOBILE.context_window_size
              : SYSTEM_CONFIG.LLM.context_window_size,

            sliding_window_size: isMobile
              ? SYSTEM_CONFIG.LLM.MOBILE.sliding_window_size
              : SYSTEM_CONFIG.LLM.sliding_window_size,

            attention_sink_size:
              SYSTEM_CONFIG.LLM.attention_sink_size,
          },

          /* =================================================
             🧠 FIX CRÍTICO: CACHE ADAPTATIVO
          ================================================= */
          useIndexedDBCache: useCache,

          enableProgressiveLoading: true,
        } as any
      );

      currentModel = selectedModelId;

      console.log("[WEBLLM] Engine ready:", selectedModelId);

      return engine;

    } catch (err) {

      console.error("[WEBLLM INIT ERROR]", err);
      loadingPromise = null;
      throw err;

    }

  })();

  return loadingPromise;
}

/* =========================================================
   UNLOAD SAFE
========================================================= */

export async function localUnloadEngine(): Promise<void> {

  try {
    if (engine) await engine.unload();
  } catch (err) {
    console.warn("[WEBLLM UNLOAD ERROR]", err);
  } finally {

    if (worker) {
      worker.terminate();
      worker = null;
    }

    engine = null;
    loadingPromise = null;
    currentModel = null;
    generationLock = false;

    console.log("[WEBLLM] Clean unload complete");
  }
}

/* =========================================================
   GENERATION STREAM
========================================================= */

export async function* generate(
  prompt: string,
  temperature = 0.7,
  onProgress?: (report: any) => void,
  signal?: AbortSignal,
): AsyncGenerator<string> {

  if (generationLock) {
    throw new Error("Generation already in progress");
  }

  generationLock = true;

  const abortHandler = () => {
    generationLock = false;
  };

  signal?.addEventListener("abort", abortHandler);

  try {

    const engineRef = await initEngine(undefined, onProgress);
    const isMobile = isMobileDevice();

    const stream = await engineRef.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature,
      stream: true,
      signal,

      max_tokens: isMobile ? 512 : 1024,
    } as any);

    for await (const chunk of stream as any) {
      if (signal?.aborted) break;

      const text = chunk?.choices?.[0]?.delta?.content;

      if (text) yield text;
    }

  } catch (err) {

    console.error("[GENERATE ERROR]", err);
    playSound("error", 0.4);
    throw err;

  } finally {

    signal?.removeEventListener("abort", abortHandler);
    generationLock = false;
  }
}

/* =========================================================
   VISIBILITY CLEANUP
========================================================= */

let visibilityAttached = false;

if (typeof window !== "undefined" && !visibilityAttached) {

  visibilityAttached = true;

  document.addEventListener("visibilitychange", async () => {

    const isMobile = isMobileDevice();

    if (document.hidden) {
      backgroundSince = Date.now();
      return;
    }

    if (backgroundSince && isMobile) {

      const timeAway = Date.now() - backgroundSince;

      if (
        timeAway >
        SYSTEM_CONFIG.CLEANUP.MOBILE_BACKGROUND_TIMEOUT_MS
      ) {
        await localUnloadEngine();
      }

      backgroundSince = null;
    }
  });
}
