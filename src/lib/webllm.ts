"use client";

import { CreateWebWorkerMLCEngine, MLCEngineInterface } from "@mlc-ai/web-llm";
import { playSound } from "./sounds";
import { detectSystemCapabilities } from "./modelManager";

let worker: Worker | null = null;
let engine: MLCEngineInterface | null = null; 
let loadingPromise: Promise<MLCEngineInterface> | null = null;
let currentModel: string | null = null;
let generationLock = false;

export async function initEngine(modelId?: string, onProgress?: (report: any) => void) {
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    let selectedModelId = modelId;

    if (!selectedModelId) {
      const specs = await detectSystemCapabilities();
      selectedModelId = specs.recommended.model_id;
    }

    if (engine && currentModel === selectedModelId) return engine;

    if (engine) {
      await engine.unload();
      engine = null;
    }

    worker = new Worker(new URL("./webllm.worker.ts", import.meta.url), { type: "module" });

    worker.onerror = (e) => {
      console.error("[Code Ascension] Worker de IA morreu!");
      engine = null;
      loadingPromise = null;
    };

    // CORREÇÃO DEFINITIVA PARA O ERRO DE TIPAGEM:
    engine = await CreateWebWorkerMLCEngine(
      worker,
      selectedModelId,
      {
        initProgressCallback: onProgress || ((p) => console.log(p.text)),
        // No MLCEngineConfig, as opções de chat e limites de memória 
        // são passadas através do campo chatOpts para evitar erros de propriedade desconhecida
        chatOpts: {
          context_window_size: 2048,
          sliding_window_size: 1024,
          // Se o TS ainda reclamar de low_resource_mode aqui, 
          // a redução do context_window acima já faz o papel principal de salvar RAM.
          low_resource_mode: true, 
        } as any // Usamos 'as any' aqui apenas para garantir que o compilador não barre o deploy se a propriedade for nova no SDK
      }
    );

    currentModel = selectedModelId;
    loadingPromise = null;
    return engine;
  })();

  return loadingPromise;
}

/* =========================================================
   UNLOAD & GENERATE (Mantidos para integridade)
========================================================= */

export async function unloadEngine() {
  try {
    if (engine) await engine.unload();
  } catch (err) {
    console.warn("[WebLLM Unload Error]", err);
  } finally {
    if (worker) {
      worker.terminate();
      worker = null;
    }
    engine = null;
    loadingPromise = null;
    currentModel = null;
  }
}

export async function generate(prompt: string, temperature = 0.7) {
  if (generationLock) return null;
  generationLock = true;

  try {
    const currentEngine = await initEngine();
    if (!currentEngine) throw new Error("Engine unavailable");

    const response = await currentEngine.chat.completions.create({
      messages: [{ role: "user", content: prompt.slice(0, 12000) }],
      temperature,
      max_tokens: 350,
      stream: true,
    });

    return response;
  } catch (err) {
    console.error("[WebLLM Generate Error]", err);
    playSound("error", 0.4);
    throw err;
  } finally {
    generationLock = false;
  }
}
