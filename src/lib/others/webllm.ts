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
let isDownloading = false;
let isInitializing = false;
let isUnloading = false;

let backgroundSince: number | null = null;

/* =========================================================
   HELPERS
========================================================= */

function isMobileDevice() {
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeAbortError() {
  return new DOMException("Aborted", "AbortError");
}

/* =========================================================
   MEMORY GUARD
========================================================= */

function getMemoryUsage() {
  return (performance as any).memory?.usedJSHeapSize || 0;
}

function isMemoryCritical(isMobile: boolean) {
  const mem = getMemoryUsage();
  if (!mem) return false;

  const limit = isMobile
    ? SYSTEM_CONFIG.CLEANUP.MEMORY.MOBILE_CRITICAL_MB * 1024 * 1024
    : SYSTEM_CONFIG.CLEANUP.MEMORY.DESKTOP_CRITICAL_MB * 1024 * 1024;

  return mem > limit;
}

/* =========================================================
   CLEANUP
========================================================= */

export async function emergencyWebLLMCleanup() {
  try {
    await localUnloadEngine();

    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.includes("webllm"))
          .map((k) => caches.delete(k))
      );
    }
  } catch (err) {
    console.warn("[WEBLLM CLEANUP ERROR]", err);
  }
}

/* =========================================================
   ENGINE INIT
========================================================= */

export async function initEngine(
  modelId?: string,
  onProgress?: (report: any) => void
): Promise<MLCEngineInterface> {

  if (engine && currentModel === modelId) return engine;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {

      if (typeof window === "undefined") {
        throw new Error("SSR_BLOCKED");
      }

      const isMobile = isMobileDevice();

      await delay(isMobile ? 250 : 50);

      /* ================= MEMORY CHECK ================= */

      if (isMemoryCritical(isMobile)) {
        await emergencyWebLLMCleanup();
        throw new Error("MEMORY_BLOCK");
      }

      /* ================= DOWNLOAD LOCK ================= */

      if (isDownloading && isMobile) {
        throw new Error("DOWNLOAD_LOCKED");
      }

      /* ================= CAPABILITIES ================= */

      const specs = await detectSystemCapabilities();

      let selectedModelId =
        modelId ??
        specs?.recommended?.model_id ??
        SYSTEM_CONFIG.AVAILABLE_MODELS[0].model_id;

      /* ================= MOBILE FALLBACK ================= */

      const isPhi = selectedModelId.includes("Phi-3");

      if (isMobile && isPhi) {
        const ram = (navigator as any).deviceMemory ?? 4;

        if (ram < 6) {
          selectedModelId =
            SYSTEM_CONFIG.AVAILABLE_MODELS[0].model_id; // Qwen fallback
        }
      }

      /* ================= VALIDATION ================= */

      if (
        !SYSTEM_CONFIG.AVAILABLE_MODELS.some(
          (m) => m.model_id === selectedModelId
        )
      ) {
        throw new Error("INVALID_MODEL");
      }

      /* ================= WORKER ================= */

      worker = new Worker(
        new URL("../workers/webllm.worker.ts", import.meta.url),
        { type: "module" }
      );

      worker.onerror = async () => {
        await localUnloadEngine();
      };

      worker.onmessageerror = async () => {
        await localUnloadEngine();
      };

      await delay(isMobile ? 150 : 50);

      const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");

      const nav = navigator as any;

      const useCache =
        !isMobile || (nav.deviceMemory ?? 4) >= 4;

      /* ================= INIT START ================= */

      isInitializing = true;
      isDownloading = true;

      worker.postMessage({ type: "INIT_START" });

      await delay(isMobile ? 300 : 80);

      /* ================= ENGINE CREATE ================= */

      engine = await CreateWebWorkerMLCEngine(
        worker,
        selectedModelId,
        {
          initProgressCallback: (report: any) => {
            onProgress?.(report);

            if (isMemoryCritical(isMobile)) {
              throw new Error("MEMORY_DURING_INIT");
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

            attention_sink_size: SYSTEM_CONFIG.LLM.attention_sink_size,
          },

          useIndexedDBCache: useCache,

          enableProgressiveLoading: true,
        } as any
      );

      currentModel = selectedModelId;

      isDownloading = false;
      isInitializing = false;

      worker.postMessage({ type: "INIT_END" });

      return engine;

    } catch (err) {
      await localUnloadEngine();
      loadingPromise = null;
      isDownloading = false;
      isInitializing = false;
      throw err;
    }
  })();

  return loadingPromise;
}

/* =========================================================
   UNLOAD
========================================================= */

export async function localUnloadEngine() {
  if (isUnloading) return;
  isUnloading = true;

  try {
    if (engine) {
      await Promise.race([engine.unload(), delay(2500)]);
    }

    if (worker) {
      worker.postMessage({ type: "ABORT" });
      await delay(100);
      worker.terminate();
    }
  } finally {
    engine = null;
    worker = null;
    loadingPromise = null;
    currentModel = null;
    generationLock = false;
    isDownloading = false;
    isInitializing = false;
    isUnloading = false;
  }
}

/* =========================================================
   GENERATION
========================================================= */

export async function* generate(
  prompt: string,
  temperature = 0.7,
  onProgress?: (r: any) => void,
  signal?: AbortSignal
) {
  if (signal?.aborted) throw safeAbortError();

  const isMobile = isMobileDevice();

  if (generationLock) throw new Error("LOCKED");
  generationLock = true;

  try {
    const engineRef = await initEngine(undefined, onProgress);

    const stream = await engineRef.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature,
      stream: true,
      signal,
      max_tokens: isMobile
        ? SYSTEM_CONFIG.LLM.MOBILE.max_tokens
        : 1024,
    } as any);

    for await (const chunk of stream as any) {
      const text = chunk?.choices?.[0]?.delta?.content;
      if (text) yield text;
    }

  } catch (err) {
    playSound("error", 0.4);
    throw err;
  } finally {
    generationLock = false;
  }
}
