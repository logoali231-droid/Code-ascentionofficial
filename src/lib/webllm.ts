"use client";

import { CreateWebWorkerMLCEngine, MLCEngineInterface } from "@mlc-ai/web-llm";
import { playSound } from "./sounds";
import { AVAILABLE_MODELS, detectSystemCapabilities } from "./modelManager";

let worker: Worker | null = null;
let engine: MLCEngineInterface | null = null;
let loadingPromise: Promise<MLCEngineInterface> | null = null;
let currentModel: string | null = null;
let generationLock = false;

/**
 * Inicializa a engine do WebLLM com suporte a Worker e Cache via IndexedDB.
 */
export async function initEngine(modelId?: string, onProgress?: (report: any) => void) {
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      await detectSystemCapabilities();

      const selectedModelId = modelId || "Phi-3.5-mini-instruct-q4f16_1-MLC";
      const modelConfig = AVAILABLE_MODELS.find(m => m.model_id === selectedModelId);

      if (!modelConfig) throw new Error("Modelo não encontrado na base de dados.");
      if (engine && currentModel === selectedModelId) return engine;

      // CORREÇÃO: Usar a variável 'worker' (minúsculo), não o construtor 'Worker'
      if (worker) {
        worker.terminate();
        worker = null;
      }

      worker = new Worker(new URL("./webllm.worker.ts", import.meta.url), {
        type: "module",
      });

      engine = await CreateWebWorkerMLCEngine(worker, selectedModelId, {
        initProgressCallback: onProgress,
        appConfig: {
          useIndexedDBCache: true,
          model_list: [
            {
              model: modelConfig.model,
              model_id: selectedModelId,
              model_lib: modelConfig.model_lib,
            },
          ],
        } as any,
      });

      currentModel = selectedModelId;
      return engine;
    } catch (err) {
      loadingPromise = null;
      console.error("[WebLLM] Erro na Matrix:", err);
      throw err;
    }
  })();

  return loadingPromise;
}

export async function unloadEngine() {
  try {
    if (engine) {
      await engine.unload();
      console.log("[WebLLM] Engine descarregada.");
    }
  } catch (err) {
    console.error("[WebLLM] Erro ao descarregar engine:", err);
  } finally {
    if (worker) {
      worker.terminate();
      worker = null;
    }
    engine = null;
    loadingPromise = null;
    currentModel = null;
    generationLock = false;
    console.log("[WebLLM] Memória do Worker totalmente liberada.");
  }
}

export async function* generate(prompt: string, temperature = 0.7) {
  if (generationLock) return;
  generationLock = true;
  
  try {
    const currentEngine = await initEngine();
    const request = {
      messages: [{ role: "user" as const, content: prompt }],
      temperature: temperature,
      stream: true,
    };
    
    const asyncChunkGenerator = await currentEngine.chat.completions.create(request) as AsyncIterable<any>;
    
    for await (const chunk of asyncChunkGenerator) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) yield content;
    }
  } catch (err) {
    console.error("[WebLLM Generate Error]", err);
    playSound("error", 0.4);
    throw err;
  } finally {
    generationLock = false;
  }
}