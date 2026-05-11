"use client"

import * as webllm from "@mlc-ai/web-llm";
import { playSound } from "./sounds";
import { detectSystemCapabilities } from "./modelManager"; 

/* =========================================================
   SINGLETONS
========================================================= */
let engine: webllm.MLCEngine | null = null;
let loadingPromise: Promise<webllm.MLCEngine> | null = null;
let currentModel: string | null = null;
let generationLock = false;
let generationId = 0;
let recovering = false;

/* =====================================
   HARD MEMORY SAFE MODE
===================================== */
const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad/i.test(navigator.userAgent);
const SAFE_MAX_TOKENS = isMobile ? 512 : 1024;

/* =========================================================
   INIT ENGINE
========================================================= */
export async function initEngine(modelId?: string, onProgress?: (p: any) => void) {
  let selectedModelId = modelId;

  if (!selectedModelId) {
    const { modelTier } = await detectSystemCapabilities();
    selectedModelId = modelTier;
    console.log(`[GPU Discovery] Iniciando com modelo: ${selectedModelId}`);
  }

  // Se já existe um engine para esse modelo, retorna ele
  if (engine && currentModel === selectedModelId) {
    return engine;
  }

  // Evita múltiplas inicializações simultâneas
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      // Se houver um engine antigo ou de outro modelo, limpa primeiro (Crucial para o M23)
      if (engine) {
        await unloadEngine();
      }

      console.log("[SYSTEM] Iniciando CreateMLCEngine...");

      // CONFIGURAÇÃO CORRIGIDA: No WebLLM moderno, kvCacheConfig fica no EngineConfig direto
      const engineConfig: webllm.ChatOptions = {
        temperature: 0.7,
        repetition_penalty: 1.1,
      };

      // Nota: No CreateMLCEngine, o segundo parâmetro é o MLCEngineConfig
      // O erro .find() geralmente vem de um appConfig mal estruturado internamente.
      const mlcConfig: webllm.MLCEngineConfig = {
        initProgressCallback: onProgress,
        // Configurações de GPU para dispositivos limitados
        appConfig: {
          kvCacheConfig: {
            context_window_size: isMobile ? 1536 : 2048, // Reduzido para evitar crash no M23
          },
        },
        // Forçar limites de buffer para WebGPU no mobile
        requiredCapabilities: {
          maxStorageBufferBindingSize: 419430400, 
        } as any
      };

      engine = await webllm.CreateMLCEngine(selectedModelId as string, mlcConfig);

      currentModel = selectedModelId as string;
      return engine;
    } catch (error: any) {
      const errorMsg = error?.message || JSON.stringify(error) || "Erro de WebGPU";
      console.error("[ERROR] Engine Init Failed:", errorMsg);
      
      engine = null;
      loadingPromise = null; // Libera para tentar de novo
      throw error;
    }
  })();

  return loadingPromise;
}

/* ========================================================= 
   UNLOAD ENGINE
========================================================= */
export async function unloadEngine() {
  try {
    if (engine) {
      console.log("[SYSTEM] Unloading Engine...");
      await engine.unload();
    }
  } catch (err) {
    console.warn("[WebLLM Unload Error]", err);
  } finally {
    engine = null;
    loadingPromise = null;
    currentModel = null;
  }
}

/* =========================================================
   GENERATE
========================================================= */
export async function generate(
  prompt: string,
  temperature: number = 0.7
) {
  // Trava de concorrência
  while (generationLock) { await sleep(50); }
  generationLock = true;
  const myGenerationId = ++generationId;

  try {
    const currentEngine = await initEngine(); 

    if (!currentEngine) { throw new Error("AI_OFFLINE"); }

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), 60000) // 60s para mobile
    );

    const request = currentEngine.chat.completions.create({
      messages: [
        { role: "system", content: "You are a Cyberpunk AI tutor. Return ONLY valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature,
      response_format: { type: "json_object" },
      max_tokens: SAFE_MAX_TOKENS,
    });

    const response: any = await Promise.race([request, timeout]);

    if (myGenerationId !== generationId) { throw new Error("STALE_GENERATION"); }

    return response?.choices?.[0]?.message?.content;
  } catch (err: any) {
    console.error("[WebLLM Generate Error]", err);
    playSound("error", 0.4);
    
    const msg = String(err);

    // Se for erro de memória, tenta resetar o motor para a próxima tentativa
    if (msg.includes("OutOfMemory") || msg.includes("disposed") || 
        msg.includes("Device") || msg.includes("context") || msg.includes("find")) {
      if (!recovering) {
        recovering = true;
        await unloadEngine();
        await sleep(1500);
        recovering = false;
      }
    }
    return JSON.stringify({ error: "System Glitch", details: msg });
  } finally {
    generationLock = false;
    await sleep(isMobile ? 300 : 100); // Delay maior no mobile para resfriar a GPU
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
