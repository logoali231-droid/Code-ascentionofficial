"use client";

import {
  CreateWebWorkerMLCEngine,
  type MLCEngineInterface,
} from "@mlc-ai/web-llm";
import { playSound } from "./sounds";
import { unloadEngine, detectSystemCapabilities } from "./modelManager";
import { SYSTEM_CONFIG } from "@/config/system";

let worker: Worker | null = null;
let engine: MLCEngineInterface | null = null;
let loadingPromise: Promise<MLCEngineInterface> | null = null;
let currentModel: string | null = null;
let generationLock = false;
let backgroundSince: number | null = null;

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
      const selectedModelId = modelId || specs.recommended.model_id;

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

      worker = new Worker(new URL("./workers/webllm.worker", import.meta.url), {
        type: "module",
      });

      worker.onerror = (err) => {
        console.error("%c[WORKER:COGNITIVE:ERROR]", "color: #ff0055", err);
        loadingPromise = null;
        throw new Error(
          "Falha crítica na inicialização do thread do Web Worker.",
        );
      };

      engine = await CreateWebWorkerMLCEngine(worker, selectedModelId, {
        initProgressCallback: onProgress,
        logLevel: "INFO",
        chatOpts: {
          context_window_size: SYSTEM_CONFIG.LLM.context_window_size,
          sliding_window_size: SYSTEM_CONFIG.LLM.sliding_window_size,
          attention_sink_size: SYSTEM_CONFIG.LLM.attention_sink_size,
        },
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
          await localUnloadEngine();
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
  if (generationLock) return;
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  generationLock = true;

  const abortHandler = () => {
    generationLock = false;
  };
  signal?.addEventListener("abort", abortHandler);

  try {
    const currentEngine = await initEngine(undefined, onProgress);

    const stream = await currentEngine.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature,
      stream: true,
      signal: signal,
    } as any);

    for await (const chunk of stream as any) {
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
if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", async () => {
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    if (document.hidden) {
      backgroundSince = Date.now();
      console.log(
        "%c[WEBLLM] Modo background ativado. Monitorando consumo térmico...",
        "color: #ff9900",
      );
      return;
    }

    if (!document.hidden && backgroundSince) {
      const timeAway = Date.now() - backgroundSince;
      console.log(
        `%c[WEBLLM] Foco retomado após ${timeAway}ms.`,
        "color: #00ffcc",
      );

      if (
        isMobile &&
        timeAway > SYSTEM_CONFIG.CLEANUP.MOBILE_BACKGROUND_TIMEOUT_MS
      ) {
        console.warn(
          "%c[WEBLLM] Tempo limite em background excedido no Mobile. Expulsando VRAM.",
          "color: #ff0055",
        );
        await localUnloadEngine();
        await unloadEngine();
      }
      backgroundSince = null;
    }
  });
}
