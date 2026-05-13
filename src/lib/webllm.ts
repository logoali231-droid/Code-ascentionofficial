"use client";

import { CreateWebWorkerMLCEngine, MLCEngineInterface } from "@mlc-ai/web-llm";
import { playSound } from "./sounds";
import { detectSystemCapabilities } from "./modelManager";

let worker: Worker | null = null;
let engine: MLCEngineInterface | null = null;
let loadingPromise: Promise<MLCEngineInterface> | null = null;
let currentModel: string | null = null;
let generationLock = false;

/**
 * Inicializa o motor da IA garantindo o uso de IndexedDB para evitar o crash de cache no M23.
 */
export async function initEngine(modelId?: string, onProgress?: (report: any) => void) {
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const selectedModelId = modelId || "Phi-3.5-mini-instruct-q4f16_1-MLC";
      
      if (engine && currentModel === selectedModelId) {
        return engine;
      }

      // Destrói worker anterior para liberar RAM física no M23 antes de começar novo carregamento
      if (worker) {
        worker.terminate();
        worker = null;
      }

      // Criação do Worker apontando para o seu arquivo de worker
      worker = new Worker(new URL("./webllm.worker.ts", import.meta.url), {
        type: "module",
      });

      console.log(`[WebLLM] Inicializando motor: ${selectedModelId} via IndexedDB`);

      // CONFIGURAÇÃO CRÍTICA PARA O M23: useIndexedDBCache: true
      // Isso impede que ele tente usar a Cache API que faz o Chrome fechar.
      engine = await CreateWebWorkerMLCEngine(worker, selectedModelId, {
        initProgressCallback: onProgress,
        logLevel: "warn",
        engineConfig: {
          // No WebLLM moderno, as configurações de app vão aqui
          appConfig: {
            useIndexedDBCache: true,
          },
        } as any, // O 'as any' previne quebras se a definição de tipos local estiver desatualizada
      });

      currentModel = selectedModelId;
      return engine;
    } catch (err) {
      loadingPromise = null;
      console.error("[WebLLM] Falha catastrófica na inicialização:", err);
      throw err;
    }
  })();

  return loadingPromise;
}

/* =========================================================
   UNLOAD & GENERATE (Otimizados para Mobile)
========================================================= */

export async function unloadEngine() {
  try {
    if (engine) {
      await engine.unload();
      console.log("[WebLLM] Engine descarregada.");
    }
  } catch (err) {
    console.error("[WebLLM] Erro ao descarregar engine:", err);
  } finally {
    // Limpeza absoluta de memória para evitar que o Android mate o Chrome
    if (worker) {
      worker.terminate();
      worker = null;
    }
    engine = null;
    loadingPromise = null;
    currentModel = null;
    generationLock = false;
    console.log("[WebLLM] Worker destruído e RAM liberada.");
  }
}

export async function* generate(prompt: string, temperature = 0.7) {
  if (generationLock) return;
  generationLock = true;

  try {
    const currentEngine = await initEngine();
    if (!currentEngine) throw new Error("Engine unavailable");

    // Configuração para streaming
    const request = {
      messages: [{ role: "user" as const, content: prompt }],
      temperature: temperature,
      stream: true, // Habilita o modo stream
    };

    const asyncChunkGenerator = await currentEngine.chat.completions.create(request);

    for await (const chunk of asyncChunkGenerator) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        yield content; // Envia cada pedaço de texto para a UI
      }
    }
  } catch (err) {
    console.error("[WebLLM Generate Error]", err);
    playSound("error", 0.4);
    throw err;
  } finally {
    generationLock = false;
  }
}
