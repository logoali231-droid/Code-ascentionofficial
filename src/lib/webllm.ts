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

    // CORREÇÃO FINAL:
    // As configurações da Engine (MLCEngineConfig) são passadas DIRETAMENTE 
    // no objeto do terceiro parâmetro.
    engine = await CreateWebWorkerMLCEngine(
      worker,
      selectedModelId,
      {
        initProgressCallback: onProgress || ((p) => console.log(p.text)),
        // Removido o nesting 'engineConfig: { ... }'
        low_resource_mode: true,
        context_window_size: 2048,
        sliding_window_size: 1024,
      }
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
