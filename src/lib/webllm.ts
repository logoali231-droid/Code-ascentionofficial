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

  if (engine && currentModel === selectedModelId) {
    return engine;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      if (engine) {
        await unloadEngine();
      }

      console.log("[SYSTEM] Iniciando CreateMLCEngine...");

      // Ajuste para evitar erro de tipagem: 
      // Definimos o MLCEngineConfig de forma que o TS aceite as extensões de baixo nível
      const mlcConfig: any = {
        initProgressCallback: onProgress,
        logLevel: "warn",
        appConfig: {
          // No M23, manter o buffer baixo é vital
          requiredCapabilities: {
            maxStorageBufferBindingSize: 419430400, 
          }
        },
        // Mover kvCacheConfig para fora do appConfig se o TS reclamar, 
        // ou usar o cast 'as any' para garantir que a lib receba o valor em runtime
        kvCacheConfig: {
          context_window_size: isMobile ? 1536 : 2048,
        }
      };

      engine = await webllm.CreateMLCEngine(selectedModelId as string, mlcConfig);

      currentModel = selectedModelId as string;
      return engine;
    } catch (error: any) {
      console.error("[ERROR] Engine Init Failed:", error?.message || error);
      engine = null;
      loadingPromise = null;
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
   GENERATE (LÓGICA COMPLETA)
========================================================= */
export async function generate(
  prompt: string,
  temperature: number = 0.7
) {
  while (generationLock) { await sleep(50); }
  generationLock = true;
  const myGenerationId = ++generationId;

  try {
    const currentEngine = await initEngine(); 

    if (!currentEngine) { throw new Error("AI_OFFLINE"); }

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), 60000)
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
    if (msg.includes("OutOfMemory") || msg.includes("disposed") || msg.includes("find")) {
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
    await sleep(isMobile ? 300 : 100);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
