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
   WATCHDOG (ANTI FREEZE CORE)
========================================================= */

setInterval(() => {
  if (
    state === "FETCHING_MODEL" &&
    Date.now() - lastProgress > 20000
  ) {
    console.warn("[WEBLLM V4] STUCK DETECTED → RECOVERY");
    state = "STUCK";
    emergencyRecover();
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

  const effectiveRam = isMob ? ram + 1.5 : ram;

  const isPhi = selected.toLowerCase().includes("phi");

  if (isMob && isPhi && effectiveRam < 5) {
    selected = safeLow;
  }

  if (effectiveRam < 3.2) {
    selected = safeLow;
  }

  return selected;
}

/* =========================================================
   EMERGENCY RECOVERY (FIX LOOP STATE)
========================================================= */

async function emergencyRecover() {
  state = "RECOVERING";

  try {
    if (engine) {
      await engine.unload().catch(() => {});
    }

    if (worker) {
      worker.terminate();
    }
  } catch {}

  engine = null;
  worker = null;
  initPromise = null;
  currentModel = null;

  state = "IDLE";
}

/* =========================================================
   CLEAN RESET
========================================================= */

export async function localUnloadEngine() {
  await emergencyRecover();
}

/* =========================================================
   EMERGENCY CLEAN CACHE
========================================================= */

export async function emergencyWebLLMCleanup() {
  await emergencyRecover();

  try {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k.includes("webllm"))
        .map(k => caches.delete(k))
    );
  } catch {}
}

/* =========================================================
   INIT ENGINE V4 CORE
========================================================= */

export async function initEngine(
  modelId?: string,
  onProgress?: (r: any) => void
): Promise<MLCEngineInterface> {

  /* =======================================================
     HARD GUARD
  ======================================================= */

  if (state === "READY" && engine && currentModel === modelId) {
    return engine;
  }

  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {

      if (typeof window === "undefined") {
        throw new Error("SSR_BLOCKED");
      }

      state = "BOOTING";

      const isMob = isMobile();

      if (memoryMB() > (isMob ? 420 : 900)) {
        await emergencyWebLLMCleanup();
        throw new Error("MEMORY_BLOCK");
      }

      const specs = await detectSystemCapabilities();

      let selectedModel = resolveModel(
        modelId ?? specs?.recommended?.model_id
      );

      /* =====================================================
         WORKER INIT
      ===================================================== */

      state = "LOADING_ENGINE";

      if (!worker) {
        worker = new Worker(
          new URL("../workers/webllm.worker.ts", import.meta.url),
          { type: "module" }
        );

        worker.onerror = () => {
          state = "FAILED";
        };
      }

      const { CreateWebWorkerMLCEngine } =
        await import("@mlc-ai/web-llm");

      state = "FETCHING_MODEL";
      lastProgress = Date.now();

      engine = await CreateWebWorkerMLCEngine(
        worker,
        selectedModel,
        {
          initProgressCallback: (r: any) => {
            onProgress?.(r);
            lastProgress = Date.now();

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

      state = "READY";

      currentModel = selectedModel;
      engineSession++;

      initPromise = null;

      return engine;
    } catch (err) {
      await emergencyWebLLMCleanup();
      state = "FAILED";
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

/* =========================================================
   GENERATE STREAM SAFE
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

    const session = engineSession;

    const stream = await engineRef.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature,
      stream: true,
      max_tokens: isMobile() ? 384 : 1024,
    } as any);

    for await (const chunk of stream as any) {

      if (state !== "READY") {
        throw new Error("ENGINE_NOT_READY");
      }

      if (cancelled) {
        cancelled = false;
        break;
      }

      const text = chunk?.choices?.[0]?.delta?.content;

      if (text) {
        yield text;
      }
    }

  } catch (err) {
    await emergencyWebLLMCleanup();
    throw err;
  } finally {
    generationLock = false;
  }
}