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
 * Inicializa a engine do WebLLM com suporte a Worker e Cache via IndexedDB.
 * Configurado para evitar o erro de leitura 'find' em listas indefinidas.
 */
export async function initEngine(modelId?: string, onProgress?: (report: any) => void) {
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      // 1. Detecta capacidades de hardware antes de iniciar
      await detectSystemCapabilities();
      
      // 2. Define o modelo. Se nenhum for passado, usa o Phi-3.5 como padrão.
      const selectedModelId = modelId || "Phi-3.5-mini-instruct-q4f16_1-MLC";

      // 3. Singleton: Se a engine já está rodando o modelo correto, não reinicia
      if (engine && currentModel === selectedModelId) return engine;

      // 4. Limpeza de processos: Mata worker antigo se houver troca de modelo
      if (worker) {
        worker.terminate();
        worker = null;
      }

      // 5. Instanciação do Worker usando o arquivo dedicado
      worker = new Worker(new URL("./webllm.worker.ts", import.meta.url), {
        type: "module",
      });

      // 6. Monitoramento do Worker para Debug no Terminal
      worker.onmessage = (msg) => {
        if (msg.data.type === "worker_error") {
          console.error("[WORKER ERROR]", msg.data.error);
        }
        if (msg.data.type === "heartbeat_ack") {
          console.log("[WORKER HEARTBEAT]", msg.data.timestamp);
        }
      };

      /**
       * 7. Inicialização da Engine
       * Forçamos a 'model_list' dentro do appConfig para que o método interno
       * '.find()' da biblioteca encontre o modelo que enviamos no segundo parâmetro.
       */
      engine = await CreateWebWorkerMLCEngine(worker, selectedModelId, {  
        initProgressCallback: onProgress,  
        logLevel: "INFO",
        appConfig: {  
          useIndexedDBCache: true, 
          model_list: [
            {
              model: `https://huggingface.co/mlc-ai/${selectedModelId}-main`,
              model_id: selectedModelId,
              model_lib: `https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/${selectedModelId}-ctx4k-webgpu.wasm`,
            },
          ],
        } as any, 
      });

      currentModel = selectedModelId;
      return engine;
    } catch (err) {
      // Em caso de falha, limpa a promise para permitir nova tentativa
      loadingPromise = null;
      console.error("[WebLLM] Falha na inicialização:", err);
      throw err;
    }
  })();

  return loadingPromise;
}

/**
 * Gera texto via streaming. Bloqueia múltiplas gerações simultâneas.
 */
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

/**
 * Descarrega a engine e limpa o Worker. 
 * Crucial para dispositivos Android com RAM limitada para evitar crash do Chrome.
 */
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
