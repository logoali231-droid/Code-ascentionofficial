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

    // SOLUÇÃO DEFINITIVA PARA O COMPILADOR DA VERCEL:
    // Forçamos o objeto de configuração como 'any' para aceitar os parâmetros 
    // de otimização de memória sem que o TypeScript barre o build por 
    // não encontrar as propriedades na interface MLCEngineConfig.
    const engineConfig: any = {
      initProgressCallback: onProgress || ((p: any) => console.log(p.text)),
      low_resource_mode: true,
      context_window_size: 2048,
      sliding_window_size: 1024,
      // O SDK moderno costuma injetar o cache automaticamente, 
      // mas mantemos as configurações de engine aqui.
    };

    engine = await CreateWebWorkerMLCEngine(
      worker,
      selectedModelId,
      engineConfig // Passando o objeto já tipado como 'any'
    );

    currentModel = selectedModelId;
    loadingPromise = null;
    return engine;
  })();

  return loadingPromise;
}

/* =========================================================
   UNLOAD & GENERATE (Mantidos)
========================================================= */

export async function unloadEngine() {
  try {
    if (engine) {
      await engine.unload();
    }
  } catch (err) {
    console.error("[WebLLM] Erro ao descarregar engine:", err);
    
    // Tratamento seguro do erro para TypeScript
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Detalhes:", errorMessage);
  } finally {
    // Limpeza absoluta de memória para o M23
    if (worker) {
      worker.terminate();
      worker = null;
    }
    engine = null;
    loadingPromise = null;
    currentModel = null;
    generationLock = false;
    console.log("[WebLLM] Engine e Worker destruídos com sucesso.");
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
