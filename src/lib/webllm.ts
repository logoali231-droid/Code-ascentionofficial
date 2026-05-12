"use client";

import { CreateWebWorkerMLCEngine, MLCEngine } from "@mlc-ai/web-llm";
import { playSound } from "./sounds";
import { detectSystemCapabilities } from "./modelManager";

let worker: Worker | null = null;
let engine: MLCEngine | null = null;
let loadingPromise: Promise<MLCEngine> | null = null;
let currentModel: string | null = null;
let generationLock = false;

export async function initEngine(modelId?: string, onProgress?: (report: any) => void) {
  let selectedModelId = modelId;

  if (!selectedModelId) {
    const specs = await detectSystemCapabilities();
    selectedModelId = specs.recommended.model_id;
  }

  // Se já está carregado e é o mesmo modelo, retorna direto
  if (engine && currentModel === selectedModelId) return engine;

  // 1. LIMPEZA TOTAL antes de novo carregamento (Evita acúmulo na GPU do M23)
  if (engine) {
    await engine.unload();
    engine = null;
  }

  // 2. CRIAÇÃO DO WORKER ISOLADO
  worker = new Worker(new URL("./webllm.worker.ts", import.meta.url), { type: "module" });

  worker.onerror = (e) => {
    console.error("[Code Ascension] Worker de IA morreu (Possível Aw Snap)! Reiniciando orquestrador...");
    engine = null; // Força reinicialização no próximo chamado
  };

  // 3. APLICAÇÃO DAS TRAVAS DE MEMÓRIA (Seu código entra aqui)
  engine = await CreateWebWorkerMLCEngine(
    worker,
    selectedModelId,
    {
      initProgressCallback: onProgress || ((progress) => console.log(progress.text)),
      appConfig: {
        // Força o uso do IndexedDB para evitar falhas de cache do Service Worker
        useIndexedDBCache: true,
      },
      // engineConfig substitui a antiga forma de passar limites e protege o M23
      engineConfig: {
        low_resource_mode: true, // Força uso menor de VRAM
        context_window_size: 2048, // Trava o contexto (MUITO importante para não dar OOM)
        sliding_window_size: 1024
      }
    }
  );

  currentModel = selectedModelId;
  return engine;
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
      worker.terminate(); // Mata o worker por completo ao descarregar
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
