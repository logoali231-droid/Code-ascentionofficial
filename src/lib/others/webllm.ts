"use client";

import { SYSTEM_CONFIG } from "@/config/system";
import type { MLCEngineInterface } from "@mlc-ai/web-llm";
import { detectSystemCapabilities } from "./modelManager";

/* =========================================================
   GLOBAL SAFE STATE
========================================================= */

let engine: MLCEngineInterface | null = null;
let worker: Worker | null = null;

let initPromise: Promise<MLCEngineInterface> | null = null;

let currentModel: string | null = null;
let engineHealthy = false;

let engineSession = 0;

/* locks */
let isInitializing = false;
let isDownloading = false;
let generationLock = false;
let isUnloading = false;

let cancelled = false;

export function cancelGeneration() {
  cancelled = true;
}

/* =========================================================
   HELPERS
========================================================= */

const delay = (ms: number) =>
  new Promise((r) => setTimeout(r, ms));

function isMobile() {
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}

function memoryMB() {
  const mem = (performance as any)?.memory?.usedJSHeapSize;
  return mem ? mem / 1024 / 1024 : 0;
}

function isLowMemoryDevice() {
  const ram = (navigator as any)?.deviceMemory ?? 4;
  return ram <= 4;
}

/* =========================================================
   HARD SINGLETON GUARD (ANTI LOOP CORE)
========================================================= */

function isEngineReady(modelId?: string) {
  return (
    engine &&
    engineHealthy &&
    currentModel &&
    (!modelId || currentModel === modelId)
  );
}

/* =========================================================
   MODEL RESOLUTION
========================================================= */

function resolveModel(requested?: string) {
  const models = SYSTEM_CONFIG.AVAILABLE_MODELS;

  const safeLow = models[0].model_id;
  const mid = models.find((m) => m.recommendedFor === "MID")?.model_id;

  let selected = requested ?? mid ?? safeLow;

  const isMob = isMobile();
  const rawRam = (navigator as any)?.deviceMemory ?? 4;
  const effectiveRam = isMob ? rawRam + 1.5 : rawRam;

  const isPhi = selected.toLowerCase().includes("phi");

  if (isMob && isPhi && effectiveRam < 5) {
    selected = safeLow;
  }

  if (isMob && effectiveRam < 3.2) {
    selected = safeLow;
  }

  if (!models.some((m) => m.model_id === selected)) {
    selected = safeLow;
  }

  return selected;
}

/* =========================================================
   CLEAN ENGINE (SAFE RESET)
========================================================= */

export async function localUnloadEngine() {
  if (isUnloading) return;
  isUnloading = true;

  try {
    engineHealthy = false;

    if (engine) {
      await Promise.race([
        engine.unload(),
        delay(2000),
      ]);
    }

    if (worker) {
      const w = worker;

      try {
        w.postMessage({ type: "ABORT" });
      } catch {}

      w.terminate();
    }
  } finally {
    engine = null;
    worker = null;
    initPromise = null;
    currentModel = null;

    isInitializing = false;
    isDownloading = false;
    generationLock = false;
    isUnloading = false;
  }
}

/* =========================================================
   EMERGENCY CLEAN
========================================================= */

export async function emergencyWebLLMCleanup() {
  await localUnloadEngine();

  try {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k.includes("webllm"))
        .map((k) => caches.delete(k))
    );
  } catch {}
}

/* =========================================================
   INIT ENGINE (ANTI LOOP VERSION)
========================================================= */

export async function initEngine(
  modelId?: string,
  onProgress?: (r: any) => void
): Promise<MLCEngineInterface> {

  if (isEngineReady(modelId)) {
    return engine!;
  }

  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      if (typeof window === "undefined") {
        throw new Error("SSR_BLOCKED");
      }

      /* 🚫 HARD LOCK: evita múltiplos boots simultâneos */
      if (isInitializing || isDownloading) {
        return engine!;
      }

      isInitializing = true;

      const isMob = isMobile();

      /* memory guard */
      if (memoryMB() > (isMob ? 420 : 900)) {
        await emergencyWebLLMCleanup();
        throw new Error("MEMORY_BLOCK");
      }

      const specs = await detectSystemCapabilities();

      let selectedModelId = resolveModel(
        modelId ?? specs?.recommended?.model_id
      );

      /* 🔒 LOCK: não troca modelo em runtime */
      if (currentModel && currentModel !== selectedModelId) {
        await localUnloadEngine();
      }

      /* =====================================================
         WORKER SINGLETON
      ===================================================== */

      if (!worker) {
        worker = new Worker(
          new URL("../workers/webllm.worker.ts", import.meta.url),
          { type: "module" }
        );

        worker.onerror = async () => {
          engineHealthy = false;
          await emergencyWebLLMCleanup();
        };

        worker.onmessageerror = async () => {
          engineHealthy = false;
          await emergencyWebLLMCleanup();
        };
      }

      const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");

      isDownloading = true;

      engine = await CreateWebWorkerMLCEngine(
        worker,
        selectedModelId,
        {
          initProgressCallback: (r: any) => {
            onProgress?.(r);

            if (memoryMB() > 950) {
              throw new Error("MEMORY_DURING_INIT");
            }
          },

          logLevel: "INFO",

          chatOpts: {
            context_window_size: isMob
              ? SYSTEM_CONFIG.LLM.MOBILE.context_window_size
              : SYSTEM_CONFIG.LLM.context_window_size,

            sliding_window_size: isMob
              ? SYSTEM_CONFIG.LLM.MOBILE.sliding_window_size
              : SYSTEM_CONFIG.LLM.sliding_window_size,

            attention_sink_size:
              SYSTEM_CONFIG.LLM.attention_sink_size,

            batch_size: isMob ? 1 : undefined,
          },

          useIndexedDBCache: true,
          enableProgressiveLoading: true,
        } as any
      );

      currentModel = selectedModelId;
      engineHealthy = true;
      engineSession++;

      isDownloading = false;
      isInitializing = false;

      initPromise = null;

      return engine;
    } catch (err) {
      await emergencyWebLLMCleanup();
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

/* =========================================================
   GENERATE SAFE STREAM
========================================================= */

export async function* generate(
  prompt: string,
  temperature = 0.7,
  onProgress?: (r: any) => void,
  signal?: AbortSignal
) {
  while (generationLock) {
    await delay(20);
  }

  generationLock = true;

  try {
    const engineRef = await initEngine(undefined, onProgress);

    const session = engineSession;

    const stream = await engineRef.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature,
      stream: true,
      max_tokens: isLowMemoryDevice()
        ? 256
        : isMobile()
          ? 384
          : 1024,
    } as any);

    for await (const chunk of stream as any) {
      if (session !== engineSession || !engineHealthy) {
        throw new Error("STALE_ENGINE");
      }

      if (cancelled) {
        cancelled = false;
        break;
      }

      const text = chunk?.choices?.[0]?.delta?.content;

      if (text) {
        yield text;

        if (isMobile()) {
          await delay(3);
        }
      }
    }
  } catch (err) {
    await emergencyWebLLMCleanup();
    throw err;
  } finally {
    generationLock = false;
  }
}