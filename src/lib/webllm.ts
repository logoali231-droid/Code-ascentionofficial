"use client";

import { CreateWebWorkerMLCEngine, MLCEngineInterface } from "@mlc-ai/web-llm";
import { playSound } from "./sounds";
import { detectSystemCapabilities } from "./modelManager";

let worker: Worker | null = null;
let engine: MLCEngineInterface | null = null;
let loadingPromise: Promise<MLCEngineInterface> | null = null;
let currentModel: string | null = null;
let generationLock = false;
// 1. Detecta o hardware antes de criar o motor
const system = await detectSystemCapabilities();
console.log(`[WebLLM] Hardware Detectado: RAM ~${system.ramGB}GB, Mobile: ${system.isMobile}`);


/**
 * Inicializa o motor da IA garantindo o uso de IndexedDB para evitar o crash de cache no M23.
 */
export async function initEngine(modelId?: string, onProgress?: (report: any) => void) {
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      // 1. Detecta capacidades APENAS na hora de inicializar
      const system = await detectSystemCapabilities();
      
      const selectedModelId = modelId || "Phi-3.5-mini-instruct-q4f16_1-MLC";

      if (engine && currentModel === selectedModelId) {
        return engine;
      }

      if (worker) {
        worker.terminate();
        worker = null;
      }

      worker = new Worker(new URL("./webllm.worker.ts", import.meta.url), {
        type: "module",
      });

      console.log(`[WebLLM] Inicializando motor: ${selectedModelId}`);

      // 2. CORREÇÃO CRÍTICA: Passar o model_list se o modelo for customizado
      // Se o erro 'find' persistir, é porque ele não achou o modelo no catálogo padrão.
      engine = await CreateWebWorkerMLCEngine(worker, selectedModelId, {
        initProgressCallback: onProgress,
        logLevel: "WARN",
        appConfig: {
          useIndexedDBCache: true,
          // Forçamos a inclusão do modelo nas configurações da aplicação
          model_list: [
            {
              model: `https://huggingface.co/mlc-ai/${selectedModelId}-main`,
              model_id: selectedModelId,
              model_lib: `https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/${selectedModelId}-ctx4k-webgpu.wasm`,
            },
          ],
        },
      });

      currentModel = selectedModelId;
      return engine;
    } catch (err) {
      loadingPromise = null;
      console.error("[WebLLM] Erro na inicialização:", err);
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

    // Forçamos a tipagem para AsyncIterable para habilitar o for await
    const asyncChunkGenerator = await currentEngine.chat.completions.create(request) as AsyncIterable<any>;

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
