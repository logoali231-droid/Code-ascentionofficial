"use client";

import { SYSTEM_CONFIG } from "@/config/system";
import type { MLCEngineInterface } from "@mlc-ai/web-llm";
import { detectSystemCapabilities } from "./modelManager";

/* =========================================================
   STATE MACHINE (V2 MAX CORE)
========================================================= */
let cancelled = false;

export function cancelGeneration() {
  cancelled = true;
}

let worker: Worker | null = null;

let workerCleanupTimeout:
  ReturnType<typeof setTimeout> | null = null;
let engine: MLCEngineInterface | null = null;

let initPromise: Promise<MLCEngineInterface> | null = null;

let currentModel: string | null = null;

let isDownloading = false;
let isInitializing = false;
let generationLock = false;
let isUnloading = false;

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
function scheduleWorkerCleanup() {
  if (workerCleanupTimeout) {
    clearTimeout(workerCleanupTimeout);
  }

  workerCleanupTimeout = setTimeout(async () => {
    if (generationLock) return;

    console.warn("[WEBLLM] Idle cleanup triggered");

    await localUnloadEngine();
  }, 45000);
}

function isLowMemoryDevice() {
  const ram =
    (navigator as any)?.deviceMemory ?? 4;

  return ram <= 4;
}

/* =========================================================
   MODEL FALLBACK CHAIN (REAL ENGINE CORE)
========================================================= */

function resolveModel(requested?: string) {
  const isMob = isMobile();

  // deviceMemory é meia verdade no Android
  const rawRam = (navigator as any)?.deviceMemory ?? 4;

  // ajuste heurístico de zRAM (realista pra Android)
  const effectiveRam = isMob
    ? rawRam + 1.5
    : rawRam;

  const models = SYSTEM_CONFIG.AVAILABLE_MODELS;

  const safeLow = models[0].model_id;
  const mid = models.find(m => m.recommendedFor === "MID")?.model_id;

  let selected = requested ?? mid ?? safeLow;

  const isPhi = selected.toLowerCase().includes("phi");

  // 🔥 NOVA REGRA: Phi permitido em 4GB+ reais com zRAM
  const allowPhi =
    isMob
      ? effectiveRam >= 5.2   // 4GB + zRAM realista
      : true;

  // 🚫 bloqueio agora é mais justo, não agressivo
  if (isMob && isPhi && !allowPhi) {
    console.warn("[MODEL] Phi blocked - insufficient effective RAM", {
      rawRam,
      effectiveRam,
    });
    selected = safeLow;
  }

  // fallback de segurança real
  if (isMob && effectiveRam < 3.2) {
    selected = safeLow;
  }

  if (!models.some(m => m.model_id === selected)) {
    selected = safeLow;
  }

  return selected;
}

/* =========================================================
   CLEAN ENGINE
========================================================= */

export async function localUnloadEngine() {
  if (isUnloading) return;
  isUnloading = true;

  try {
    if (engine) {
      await Promise.race([
        engine.unload(),
        delay(2500),
      ]);
    }

    if (worker) {
      worker.postMessage({ type: "ABORT" });
      await delay(100);
      worker.terminate();
    }
  } finally {
    engine = null;
    worker = null;
    initPromise = null;
    currentModel = null;
    isDownloading = false;
    isInitializing = false;
    isUnloading = false;
    generationLock = false;
  }
}

/* =========================================================
   EMERGENCY RESET
========================================================= */

export async function emergencyWebLLMCleanup() {
  await localUnloadEngine();

  try {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k.includes("webllm"))
        .map(k => caches.delete(k))
    );
  } catch { }
}

/* =========================================================
   ENGINE INIT V2 MAX
========================================================= */

export async function initEngine(
  modelId?: string,
  onProgress?: (r: any) => void
): Promise<MLCEngineInterface> {

  if (engine && currentModel === modelId) return engine;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {

      if (typeof window === "undefined") {
        throw new Error("SSR_BLOCKED");
      }

      const isMob = isMobile();

      await delay(isMob ? 250 : 40);

      if (memoryMB() > (isMob ? 420 : 900)) {
        await emergencyWebLLMCleanup();
        throw new Error("MEMORY_BLOCK");
      }

      const specs = await detectSystemCapabilities();

      let selectedModelId = resolveModel(
        modelId ?? specs?.recommended?.model_id
      );
      const resolvedModelId = selectedModelId;

      if (modelId && modelId !== resolvedModelId) {
        console.info("[MODEL RESOLUTION]", {
          requested: modelId,
          resolved: resolvedModelId,
          reason: "hardware_constraints"
        });
      }

      // 🔥 ESTRATÉGIA 1: Single-model lockdown mode
      // Impede que o mobile destrua a VRAM tentando recarregar outro modelo
      if (isMob && currentModel && currentModel !== selectedModelId) {
        console.warn("[LOCKDOWN] Model switching bloqueado no mobile. Mantendo a instância atual congelada:", currentModel);
        selectedModelId = currentModel;
      } else if (currentModel && currentModel !== selectedModelId) {
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
          await emergencyWebLLMCleanup();
        };

        worker.onmessageerror = async () => {
          await emergencyWebLLMCleanup();
        };
      }

      await delay(isMob ? 120 : 40);

      const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");

      const useCache =
        !isMob && ((navigator as any).deviceMemory ?? 4) >= 4;

      isInitializing = true;
      worker.postMessage({ type: "INIT_START" });

      await delay(isMob ? 300 : 60);

      isDownloading = true;

      engine = await CreateWebWorkerMLCEngine(
        worker,
        selectedModelId,
        {
          initProgressCallback: (r: any) => {
            onProgress?.(r);

            if (memoryMB() > (isMob ? 420 : 900)) {
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

            attention_sink_size: SYSTEM_CONFIG.LLM.attention_sink_size,

            // 🔥 ESTRATÉGIA 3: Processamento linear rígido
            batch_size: isMob ? 1 : undefined,
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
      await emergencyWebLLMCleanup();
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

/* =========================================================
   GENERATE V2 MAX SAFE
========================================================= */

export async function* generate(
  prompt: string,
  temperature = 0.7,
  onProgress?: (r: any) => void,
  signal?: AbortSignal
) {

  if (generationLock) throw new Error("GEN_LOCK");
  generationLock = true;

  try {
    const engineRef = await initEngine(undefined, onProgress);

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

      if (cancelled) {
        cancelled = false;
        break;
      }

      const text = chunk?.choices?.[0]?.delta?.content;

      if (text) {
        yield text;
        // 🔥 ESTRATÉGIA 4: Throttling Térmico Essencial
        // Um delay minúsculo impede que o M23 sature o Thread Pool do Android
        if (isMobile()) {
          await delay(4);
        }
      }
    }
  } catch (err) {
    await emergencyWebLLMCleanup();
    throw err;

  } finally {
    generationLock = false;
    scheduleWorkerCleanup();
  }
}
