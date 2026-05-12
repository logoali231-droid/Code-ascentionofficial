"use client";

import * as webllm from "@mlc-ai/web-llm";
import { playSound } from "./sounds";
import {
  AVAILABLE_MODELS,
  detectSystemCapabilities,
} from "./modelManager";

let engine: webllm.MLCEngine | null = null;
let loadingPromise: Promise<webllm.MLCEngine> | null = null;
let currentModel: string | null = null;
let generationLock = false;
export async function initEngine(modelId?: string, onProgress?: (report: any) => void) {
  let selectedModelId = modelId;

  if (!selectedModelId) {
    const specs = await detectSystemCapabilities();
    selectedModelId = specs.recommended.model_id;
  }

  if (engine && currentModel === selectedModelId) return engine;

  // 1. LIMPEZA TOTAL antes de novo carregamento (Evita acúmulo na GPU do M23)
  if (engine) {
    await engine.unload();
    engine = null;
  }
  engine = await webllm.CreateWebWorkerMLCEngine(
    new Worker(new URL("./webllm.worker.ts", import.meta.url), { type: "module" }),
    selectedModelId,
    {
      initProgressCallback: onProgress,
      // CONFIGURAÇÃO CRÍTICA PARA MOBILE:
      appConfig: {
        // Força o uso do IndexedDB para não estourar o cache do Service Worker
        useIndexedDBCache: true, 
      },
      // Gerenciamento agressivo de memória
      chatOpts: {
        repetition_penalty: 1.1,
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
