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
        await engine.unload();
      }

      console.log("[SYSTEM] Iniciando CreateMLCEngine...");

      // Versão simplificada para evitar o erro .find() e passar na Vercel
      // Removi o aninhamento complexo que causa erro de tipagem
      const engineConfig: any = {
        initProgressCallback: onProgress,
        logLevel: "error", // Menos ruído no log ajuda a performance no M23
        appConfig: {
          // No M23, forçamos o buffer a ser o mínimo possível para WebGPU
          requiredCapabilities: { maxStorageBufferBindingSize: 419430400 }
        },
        // Configuração de cache no nível raiz (padrão MLC atual)
        kvCacheConfig: {
          context_window_size: isMobile ? 1280 : 2048, // Reduzido agressivamente para o M23
        }
      };

      engine = await webllm.CreateMLCEngine(selectedModelId as string, engineConfig);

      currentModel = selectedModelId as string;
      return engine;
    } catch (error: any) {
      console.error("[ERROR] Engine Init Failed:", error?.message || "GPU_REJECTED");
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
      console.log("[SYSTEM] Engine Unloaded para liberar VRAM");
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
export async function generate(prompt: string, temperature: number = 0.7) {
  // Trava de geração simultânea
  while (generationLock) { await sleep(100); }
  generationLock = true;
  const myGenerationId = ++generationId;

  try {
    const currentEngine = await initEngine(); 

    if (!currentEngine) throw new Error("ENGINE_NOT_READY");

    // Timeout de 90 segundos - o M23 pode ser lento no primeiro token
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), 90000)
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

    if (myGenerationId !== generationId) throw new Error("STALE_GENERATION");

    return response?.choices?.[0]?.message?.content;
  } catch (err: any) {
    console.error("[WebLLM Generate Error]", err);
    playSound("error", 0.4);
    
    const msg = String(err);
    // Se a GPU "morreu", forçamos o unload para a próxima tentativa
    if (msg.includes("OutOfMemory") || msg.includes("find") || msg.includes("undefined")) {
      if (!recovering) {
        recovering = true;
        await unloadEngine();
        await sleep(2000);
        recovering = false;
      }
    }
    return JSON.stringify({ error: "System Glitch", details: "Check Dev Console" });
  } finally {
    generationLock = false;
    await sleep(isMobile ? 500 : 100); 
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
