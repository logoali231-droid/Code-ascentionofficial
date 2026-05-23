"use client";

import type { MLCEngineInterface } from "@mlc-ai/web-llm";
import { playSound } from "./sounds";
import { unloadEngine, detectSystemCapabilities } from "./modelManager";
import { SYSTEM_CONFIG } from "@/config/system";

let worker: Worker | null = null;
let engine: MLCEngineInterface | null = null;
let loadingPromise: Promise<MLCEngineInterface> | null = null;
let currentModel: string | null = null;
let generationLock = false;
let backgroundSince: number | null = null;
let gpuRecoveryInProgress = false;

/* =========================================================
   ENGINE INITIALIZATION (WITH WEB WORKER)
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

// 🔥 FORÇA fallback inteligente no mobile fraco
let selectedModelId = modelId || specs.recommended.model_id;

if (isMobile && selectedModelId.includes("Phi-3")) {
  console.warn("[WEBLLM] Mobile detected → Phi risk mode enabled");
}

      const modelConfig = SYSTEM_CONFIG.AVAILABLE_MODELS.find(
        (m) => m.model_id === selectedModelId,
      );

      if (!modelConfig) {
        throw new Error(
          `Modelo ${selectedModelId} não mapeado no esqueleto do sistema.`,
        );
      }

      if (engine && currentModel === selectedModelId) {
        return engine;
      }

      if (worker) {
        worker.terminate();
        worker = null;
      }

       if (typeof window === "undefined") {
  throw new Error(
    "WebLLM worker cannot initialize during SSR.",
  );
       }

      worker = new Worker(
  new URL(
    "../workers/webllm.worker.ts",
    import.meta.url,
  ),
  {
    type: "module",
  },
);

      worker.onerror = async (err) => {
        console.error(
          "%c[WORKER:COGNITIVE:ERROR]",
          "color: #ff0055",
          err,
        );

        await localUnloadEngine();

        loadingPromise = null;
      };
      const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");
      


const isPhi = selectedModelId.includes("Phi");

if (isMobile && isPhi) {
  console.warn("[WEBLLM] Mobile + Phi detected → enabling SAFE INIT MODE");
}

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

  // 🔥 NOVO: evita crash no restore de cache
  useIndexedDBCache: !isMobile,
  enableProgressiveLoading: true,
} as any);

      const gpuDevice =

        (engine as any)?.engine?.device || (engine as any)?._device;
      if (gpuDevice) {
        gpuDevice.lost.then(async (info: any) => {
          console.warn(
            "%c[WEBGPU:DEVICE:LOST] Context Evicted da GPU.",
            "color: #ff9900",
            info,
          );
          if (gpuRecoveryInProgress) return;

          gpuRecoveryInProgress = true;

          try {
            await localUnloadEngine();
          } finally {
            gpuRecoveryInProgress = false;
          }
        });
      }

      currentModel = selectedModelId;
      console.log(
        `%c[WEBLLM] Engine isolada e pronta para execuções: ${selectedModelId}`,
        "color: #00ffcc",
      );

      return engine;
    } catch (err) {
      console.error("%c[WEBLLM:INIT:ERROR]", "color: #ff0055", err);
      loadingPromise = null;
      throw err;
    }
  })();

  return loadingPromise;
}

/* =========================================================
   STRICT MEMORY UNLOAD (VRAM GUARD)
========================================================= */
export async function localUnloadEngine(): Promise<void> {
  try {
    if (engine) {
      await engine.unload();
    }
  } catch (err) {
    console.error(
      "%c[UNLOAD:ERROR] Falha ao descarregar tensores da engine:",
      "color: #ff0055",
      err,
    );
  } finally {
    if (worker) {
      worker.terminate();
      worker = null;
    }
    engine = null;
    loadingPromise = null;
    currentModel = null;
    generationLock = false;
    console.log(
      "%c[WEBLLM] Memória volátil e Web Worker destruídos com sucesso.",
      "color: #00ffcc",
    );
  }
}

/* =========================================================
   REACTIVE GENERATION ENGINE (STREAMING & ABORT)
========================================================= */
export async function* generate(
  prompt: string,
  temperature = 0.7,
  onProgress?: (report: any) => void,
  signal?: AbortSignal,
): AsyncGenerator<string, void, unknown> {
  if (generationLock) {
    throw new Error(
      "Generation already in progress."
    );
  }
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  generationLock = true;

  const abortHandler = () => {
    generationLock = false;
  };
  signal?.addEventListener("abort", abortHandler);

try {
    const startTime = performance.now();
    let isFirstToken = true;

    const currentEngine = await initEngine(undefined, onProgress);

    const stream = await currentEngine.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature,
      stream: true,
      signal: signal,
    } as any);

    for await (const chunk of stream as any) {
      // Instrumentação de Telemetria Térmica (TTFT)
      if (isFirstToken) {
        const ttft = performance.now() - startTime;
        // Importa e atualiza de forma assíncrona para não travar a geração
        import('./thermal').then(({ thermalMonitor }) => thermalMonitor.updateTTFT(ttft));
        isFirstToken = false;
      }

      if (signal?.aborted) {
        throw new DOMException(
          "Generation aborted by system runtime request.",
          "AbortError",
        );
      }
      const content = chunk.choices?.[0]?.delta?.content || "";
      if (content) yield content;
    }
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.log(
        "%c[WEBLLM] Geração cancelada ativamente via AbortController.",
        "color: #ff9900",
      );
    } else {
      console.error("%c[GENERATE:ERROR]", "color: #ff0055", err);
      playSound("error", 0.4);
      throw err;
    }
  } finally {
    signal?.removeEventListener("abort", abortHandler);
    generationLock = false;
}
}

/* =========================================================
   MOBILE VISIBILITY & BACKGROUND CYCLE LIFECYCLE
========================================================= */

let visibilityHandlerAttached = false;

function setupVisibilityHandler() {
  if (
    typeof window === "undefined" ||
    visibilityHandlerAttached
  ) {
    return;
  }

  visibilityHandlerAttached = true;

  const handler = async () => {
    const isMobile =
      /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    if (document.hidden) {
      backgroundSince = Date.now();

      console.log(
        "%c[WEBLLM] Background mode enabled.",
        "color: #ff9900",
      );

      return;
    }

    if (!document.hidden && backgroundSince) {
      const timeAway = Date.now() - backgroundSince;

      if (
        isMobile &&
        timeAway >
        SYSTEM_CONFIG.CLEANUP
          .MOBILE_BACKGROUND_TIMEOUT_MS
      ) {
        console.warn(
          "%c[WEBLLM] Mobile timeout exceeded. Releasing VRAM.",
          "color: #ff0055",
        );

        await localUnloadEngine();
      }

      backgroundSince = null;
    }
  };

  document.addEventListener(
    "visibilitychange",
    handler,
    { passive: true },
  );
}

if (typeof window !== "undefined") {
  setupVisibilityHandler();
}
