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
    try {
      const system = await detectSystemCapabilities();
      const selectedModelId = modelId || "Phi-3.5-mini-instruct-q4f16_1-MLC";

      if (engine && currentModel === selectedModelId) return engine;

      if (worker) {
        worker.terminate();
        worker = null;
      }

      worker = new Worker(new URL("./webllm.worker.ts", import.meta.url), {
        type: "module",
      });

      // Ponte para o seu Console Debug capturar o que acontece no Worker
      worker.onmessage = (msg) => {
        if (msg.data.type === "worker_error") console.error("[WORKER]", msg.data.error);
        if (msg.data.type === "heartbeat_ack") console.log("[HEARTBEAT]", msg.data.timestamp);
      };

      // DENTRO DO SEU webllm.ts
// No seu arquivo webllm.ts
engine = await CreateWebWorkerMLCEngine(worker, selectedModelId, {  
  initProgressCallback: onProgress,  
  logLevel: "INFO",
  appConfig: {  
    // Forçamos o TS a aceitar as configurações de cache
    useIndexedDBCache: true, 
  } as any, // O 'as any' evita o erro de "known properties" na Vercel
});

      currentModel = selectedModelId;
      return engine;
    } catch (err) {
      loadingPromise = null;
      console.error("[WebLLM] Falha na inicialização:", err);
      throw err;
    }
  })();

  return loadingPromise;
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

