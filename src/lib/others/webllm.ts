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
let gpuRecoveryInProgress = false;

async function CacheReset() {
  try {
    // 1. Cache API (principal culpado do Cache.add crash)
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map(k => caches.delete(k)));

    // 2. IndexedDB cleanup
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      dbs.forEach(db => {
        if (db.name) indexedDB.deleteDatabase(db.name);
      });
    }

    // 3. Service Workers (MUITO importante)
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r => r.unregister()));

    console.log("[WEBLLM] Nuclear cache reset done");
  } catch (e) {
    console.warn("[WEBLLM] reset failed:", e);
  }
}

/* =========================================================
   🔥 SAFE CACHE RESET (CRÍTICO PARA MOBILE)
========================================================= */
async function hardResetWebCache() {
  try {
    // Cache API
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));

    // IndexedDB (WebLLM pode deixar lixo aqui)
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      dbs.forEach(db => {
        if (db.name) indexedDB.deleteDatabase(db.name);
      });
    }

    // Service Workers (causa MUITO Cache.add crash)
    if (navigator.serviceWorker) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }

    console.log("[WEBLLM] Cache reset complete");
  } catch (e) {
    console.warn("[WEBLLM] Cache reset failed:", e);
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

      const isMobile =
        /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

      const selectedModelId =
        modelId ??
        specs?.recommended?.model_id ??
        SYSTEM_CONFIG.AVAILABLE_MODELS[0].model_id;

      if (!SYSTEM_CONFIG.AVAILABLE_MODELS.some(m => m.model_id === selectedModelId)) {
        throw new Error(`Invalid model_id: ${selectedModelId}`);
      }

      const modelConfig = SYSTEM_CONFIG.AVAILABLE_MODELS.find(
        m => m.model_id === selectedModelId
      );

      if (!modelConfig) {
        throw new Error(`Model not found: ${selectedModelId}`);
      }

      // 🔥 evita reinit redundante
      if (engine && currentModel === selectedModelId) {
        return engine;
      }

      // 🔥 CRÍTICO: limpa estado quebrado antes de iniciar
      await hardResetWebCache();

      // Worker cleanup
      if (worker) {
        worker.terminate();
        worker = null;
      }

      if (typeof window === "undefined") {
        throw new Error("SSR blocked for WebLLM");
      }

      worker = new Worker(
        new URL("../workers/webllm.worker.ts", import.meta.url),
        { type: "module" }
      );

      worker.onerror = async (err) => {
        console.error("[WORKER ERROR]", err);
        await localUnloadEngine();
        loadingPromise = null;
      };

      const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");

      const isPhi = selectedModelId.includes("Phi");

      if (isMobile && isPhi) {
        console.warn("[WEBLLM] Mobile Phi safe mode");
      }

      await CacheReset();

      engine = await CreateWebWorkerMLCEngine(worker, selectedModelId, {
        initProgressCallback: onProgress,
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

        // 🔥 ESSENCIAL: mobile não usa cache persistente
        useIndexedDBCache: !isMobile && (specs.ramGB ?? 0) > 4,
        enableProgressiveLoading: true,
      } as any);

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
    if (engine) {
      await engine.unload();
    }
  } catch (err) {
    console.warn("[UNLOAD ERROR]", err);
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
    throw new Error("Generation in progress");
  }

  generationLock = true;

  const abortHandler = () => {
    generationLock = false;
  };

  signal?.addEventListener("abort", abortHandler);

  try {
    const engineRef = await initEngine(undefined, onProgress);

    const stream = await engineRef.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature,
      stream: true,
      signal,
      max_tokens: 6000
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
    const isMobile =
      /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    if (document.hidden) {
      backgroundSince = Date.now();
      return;
    }

    if (backgroundSince && isMobile) {
      const timeAway = Date.now() - backgroundSince;

      if (timeAway > SYSTEM_CONFIG.CLEANUP.MOBILE_BACKGROUND_TIMEOUT_MS) {
        await localUnloadEngine();
      }

      backgroundSince = null;
    }
  });
}