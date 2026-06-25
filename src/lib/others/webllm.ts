"use client";

import { SYSTEM_CONFIG } from "@/config/system";
import type { MLCEngineInterface } from "@mlc-ai/web-llm";
import { detectSystemCapabilities } from "./modelManager";

/* =========================================================
   STATE MACHINE (REAL CORE V4)
========================================================= */

type EngineState =
  | "IDLE"
  | "BOOTING"
  | "FETCHING_MODEL"
  | "LOADING_ENGINE"
  | "READY"
  | "FAILED"
  | "RECOVERING"
  | "STUCK";

let state: EngineState = "IDLE";

/* =========================================================
   GLOBAL ENGINE STATE
========================================================= */

let engine: MLCEngineInterface | null = null;
let worker: Worker | null = null;

let initPromise: Promise<MLCEngineInterface> | null = null;

let currentModel: string | null = null;
let engineSession = 0;

let lastProgress = Date.now();

/* locks */
let generationLock = false;
let cancelled = false;

/* cache safety */
let cacheTrusted = true;

/* 🔒 ADDED: real global init lock */
let globalInitLock = false;

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

/* =========================================================
   WATCHDOG
========================================================= */

setInterval(() => {
  if (
    state === "FETCHING_MODEL" &&
    Date.now() - lastProgress > 120000
  ) {
    console.warn("[WEBLLM V4] STUCK DETECTED");
    state = "STUCK";
    cancelled = true;
    cacheTrusted = false;
  }
}, 5000);

/* =========================================================
   MODEL RESOLUTION
========================================================= */

function resolveModel(requested?: string) {
  const models = SYSTEM_CONFIG.AVAILABLE_MODELS;

  const safeLow = models[0].model_id;
  const mid = models.find(m => m.recommendedFor === "MID")?.model_id;

  let selected = requested ?? mid ?? safeLow;

  const isMob = isMobile();
  const ram = (navigator as any)?.deviceMemory ?? 4;

  const effectiveRam = isMob ? ram : ram;
  const isPhi = selected.toLowerCase().includes("phi");

  const explicitPhi = requested?.toLowerCase().includes("phi");

  if (isPhi) {
    const minOk = effectiveRam >= 4;

    if (!minOk && !explicitPhi) {
      selected = safeLow;
    }
  }

  return selected;
}

/* =========================================================
   RECOVERY (LESS DESTRUCTIVE)
========================================================= */

async function emergencyRecover() {
  state = "RECOVERING";

  try {
    await engine?.unload?.();
    worker?.terminate();
  } catch {}

  engine = null;
  worker = null;
  initPromise = null;
  currentModel = null;

  state = "IDLE";
}

/* =========================================================
   CACHE CONTROL (SOFTENED)
========================================================= */

async function validateCache() {
  try {
    const keys = await caches.keys();
    const webllmCaches = keys.filter(k => k.includes("webllm"));

    if (webllmCaches.length > 3) {
      console.warn("[WEBLLM] cache overflow → cleaning");
      await Promise.all(webllmCaches.map(k => caches.delete(k)));
    }
  } catch {}
}

/* ❌ REMOVED aggressive cache wipe (this was causing re-download loops) */
/*
async function forceCleanCacheIfNeeded() { ... }
*/

/* =========================================================
   INIT ENGINE
========================================================= */

export async function initEngine(
  
  modelId?: string,
  onProgress?: (r: any) => void
): Promise<MLCEngineInterface> {

   console.log(
  "[INIT ENGINE]",
  {
    state,
    currentModel,
    hasEngine: !!engine,
    hasWorker: !!worker,
    hasPromise: !!initPromise,
  }
);

  /* 🔒 GLOBAL LOCK (fixes parallel init) */
  if (globalInitLock) return initPromise!;
  globalInitLock = true;

  try {

    /* reuse safe instance */
    if (state === "READY" && engine && currentModel === modelId) {
      return engine;
    }

    /* prevent parallel init */
    if (initPromise) return initPromise;

    if (state === "FAILED") {
      await emergencyRecover();
    }

    initPromise = (async () => {
      try {

        if (typeof window === "undefined") {
          throw new Error("SSR_BLOCKED");
        }

        state = "BOOTING";

        const isMob = isMobile();

        if (memoryMB() > (isMob ? 420 : 900)) {
          throw new Error("MEMORY_BLOCK");
        }

        const specs = await detectSystemCapabilities();
         console.log(
  "[LIMITS]",
  {
    desktopContext:
      SYSTEM_CONFIG.LLM.context_window_size,
    mobileContext:
      SYSTEM_CONFIG.LLM.MOBILE.context_window_size,
    isMobile: isMob,
  }
);

        let selectedModel = resolveModel(
          modelId ?? specs?.recommended?.model_id
        );

        const forcedPhi =
          modelId?.toLowerCase().includes("phi");

        if (forcedPhi) {
          selectedModel = modelId!;
        }

        state = "LOADING_ENGINE";

        if (!worker) {
          worker = new Worker(
            new URL("../workers/webllm.worker.ts", import.meta.url),
            { type: "module" }
          );

          worker.onerror = () => {
            state = "FAILED";
            cancelled = true;
            cacheTrusted = false;
          };
        }

        const { CreateWebWorkerMLCEngine } =
          await import("@mlc-ai/web-llm");

        state = "FETCHING_MODEL";
        lastProgress = Date.now();

        await validateCache();

        
        console.log(
  "[CREATING ENGINE]",
  selectedModel
);
        engine = await CreateWebWorkerMLCEngine(
          worker,
          selectedModel,
          {
            initProgressCallback: (r: any) => {
              onProgress?.(r);
              lastProgress = Date.now();

              if (memoryMB() > 950) {
                cacheTrusted = false;
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

            /* 🔥 FIX: enable real cache */
            useIndexedDBCache: true,
            enableProgressiveLoading: true,
          } as any
        );

        state = "READY";

        currentModel = selectedModel;
        engineSession++;
        initPromise = null;

        return engine;

      } catch (err) {
        state = "FAILED";
        initPromise = null;
        cacheTrusted = false;
        await emergencyRecover();
        throw err;
      }
    })();

    return initPromise;

  } finally {
    globalInitLock = false;
  }
}

/* =========================================================
   GENERATION
========================================================= */

export async function* generate(
  prompt: string,
  temperature = 0.7,
  onProgress?: (r: any) => void
) {
  while (generationLock) {
    await delay(20);
  }

  generationLock = true;

  try {
    const engineRef = await initEngine(undefined, onProgress);
    console.log("[WEBLLM STATE]", { model: currentModel,promptSize: prompt.length,state,});


    const stream = await engineRef.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature,
      stream: true,
     max_tokens: isMobile() ? 256 : 512,
    } as any);

    for await (const chunk of stream as any) {

      if (state !== "READY") break;
      if (cancelled) {
        cancelled = false;
        break;
      }

      const text = chunk?.choices?.[0]?.delta?.content;
      if (text) yield text;
    }

  } catch (err) {
    cacheTrusted = false;
    await emergencyRecover();
    throw err;
  } finally {
    generationLock = false;
  }
}
