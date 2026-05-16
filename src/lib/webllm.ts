// webLLM.ts
"use client";

import {
  CreateWebWorkerMLCEngine,
  MLCEngineInterface,
} from "@mlc-ai/web-llm";

import { playSound } from "./sounds";

import {
  unloadEngine,
  detectSystemCapabilities,
} from "./modelManager";

import { SYSTEM_CONFIG, Model } from "@/config/system";

let worker: Worker | null = null;
let engine: MLCEngineInterface | null = null;
let loadingPromise: Promise<MLCEngineInterface> | null = null;
let currentModel: string | null = null;
let generationLock = false;
let backgroundSince: number | null = null;

export async function initEngine(
  modelId?: string,
  onProgress?: (report: any) => void
) {
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const specs = await detectSystemCapabilities();

      // CORREÇÃO 1: O fallback padrão agora bate exatamente com o ID do SYSTEM_CONFIG (q4f32_1)
      // ou assume dinamicamente o modelo recomendado para o hardware detectado
      const selectedModelId = modelId || specs.recommended.model_id;

      const modelConfig = SYSTEM_CONFIG.AVAILABLE_MODELS.find(
        (m) => m.model_id === selectedModelId
      );

      if (!modelConfig) {
        throw new Error(`Modelo ${selectedModelId} não mapeado no esqueleto do sistema.`);
      }

      if (engine && currentModel === selectedModelId) {
        return engine;
      }

      if (worker) {
        worker.terminate();
        worker = null;
      }

      worker = new Worker(
        new URL("../workers/webllm.worker", import.meta.url), // Remova a extensão explícita .ts aqui
        { type: "module" }
      );

      // CORREÇÃO 2: Evita o travamento eterno. Se o Worker falhar na VRAM/Rede, rejeita a Promise
      worker.onerror = (err) => {
        console.error("[WORKER COGNITIVE ERROR]", err);
        loadingPromise = null;
        throw new Error("Falha crítica na inicialização do thread do Web Worker.");
      };

      engine = await CreateWebWorkerMLCEngine(
        worker,
        selectedModelId,
        {
          initProgressCallback: onProgress,
          logLevel: "INFO",
          chatOpts: {
            context_window_size: SYSTEM_CONFIG.LLM.context_window_size,
            sliding_window_size: SYSTEM_CONFIG.LLM.sliding_window_size,
            attention_sink_size: SYSTEM_CONFIG.LLM.attention_sink_size,
          },
        } as any
      );

      const gpuDevice = (engine as any)?.engine?.device || (engine as any)?._device;

      if (gpuDevice) {
        gpuDevice.lost.then(async (info: any) => {
          console.warn("[WebGPU Device Lost - Context Evicted]", info);
          // CORREÇÃO 3: Chama a função local de limpeza estrita que limpa worker e referências
          await localUnloadEngine();
        });
      }

      currentModel = selectedModelId;
      console.log("[WebLLM] Engine isolada e pronta:", selectedModelId);

      return engine;
    } catch (err) {
      console.error("[WebLLM INIT ERROR]", err);
      loadingPromise = null; // Libera a trava para tentativas subsequentes
      throw err;
    }
  })();

  return loadingPromise;
}

export async function localUnloadEngine() {
  try {
    if (engine) {
      await engine.unload();
    }
  } catch (err) {
    console.error(
      "[UNLOAD ERROR]",
      err
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
      "[WebLLM] Memória liberada."
    );
  }
}

// ... (mantenha os imports e a função initEngine intactos)

export async function* generate(
  prompt: string,
  temperature = 0.7,
  onProgress?: (report: any) => void,
  signal?: AbortSignal // <-- Injeção do parâmetro de controle ativo
) {
  if (generationLock) return;
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  generationLock = true;

  // Escutador local para interromper imediatamente o loop do generator caso abortado externo
  const abortHandler = () => {
    generationLock = false;
  };
  signal?.addEventListener("abort", abortHandler);

  try {
    const currentEngine = await initEngine(undefined, onProgress);

    // Coerção cirúrgica com 'as any' para burlar a omissão do 'signal' no tipo estrito do MLC-AI
    const stream = await currentEngine.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature,
      stream: true,
      signal: signal,
    } as any);

    for await (const chunk of stream as any) {
      // Verificação de segurança em tempo real a cada token/pedaço processado da Stream
      if (signal?.aborted) {
        throw new DOMException("Generation aborted by system runtime request.", "AbortError");
      }

      const content = chunk.choices?.[0]?.delta?.content || "";
      if (content) yield content;
    }
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.log("[WebLLM] Geração cancelada ativamente via AbortController.");
    } else {
      console.error("[GENERATE ERROR]", err);
      playSound("error", 0.4);
      throw err;
    }
  } finally {
    signal?.removeEventListener("abort", abortHandler);
    generationLock = false;
  }
}

// ... (Mantenha o restante do event listener de visibilidade mobile abaixo)

if (typeof window !== "undefined") {
  document.addEventListener(
    "visibilitychange",
    async () => {
      const isMobile =
        /Mobi|Android|iPhone/i.test(
          navigator.userAgent
        );

      /*
        BACKGROUND
      */

      if (document.hidden) {
        backgroundSince =
          Date.now();

        console.log(
          "[WebLLM] Background mode"
        );

        return;
      }

      /*
        RETURN
      */

      if (
        !document.hidden &&
        backgroundSince
      ) {
        const timeAway =
          Date.now() -
          backgroundSince;

        console.log(
          "[WebLLM] Returned after:",
          timeAway
        );

        /*
          MOBILE SAFETY
        */

        // Ajustado para ler o timeout dinâmico e seguro de background do config
        if (
          isMobile &&
          timeAway > SYSTEM_CONFIG.CLEANUP.MOBILE_BACKGROUND_TIMEOUT_MS
        ) {
          console.warn(
            "[WebLLM] Long background detected. Resetting engine."
          );

          await unloadEngine();
        }

        backgroundSince = null;
      }
    }
  );
}