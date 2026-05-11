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

  if (engine && currentModel === selectedModelId) {
    return engine;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  try {
    // Reset de segurança
    loadingPromise = null; 

    const config = {
      kvCacheConfig: {
        context_window_size: 2048, // Reduzido para o M23
      },
      requiredCapabilities: {
        maxStorageBufferBindingSize: 419430400, // 400MB estável
      }
    } as any;

    console.log("[SYSTEM] Iniciando CreateMLCEngine...");
    
    // CORREÇÃO AQUI: Acessando via namespace webllm
    engine = await webllm.CreateMLCEngine(selectedModelId as string, { 
      initProgressCallback: onProgress,
      appConfig: config 
    });

    currentModel = selectedModelId as string;
    return engine;
  } catch (error: any) {
    const errorMsg = error?.message || JSON.stringify(error) || "Erro desconhecido de Hardware/WebGPU";
    console.error("[ERROR] Engine Init Failed:", errorMsg);
    
    engine = null;
    loadingPromise = null;
    throw error;
  }
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
  }
  engine = null;
  loadingPromise = null;
  currentModel = null;
}

/* =========================================================
   GENERATE
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
      setTimeout(() => reject(new Error("TIMEOUT")), 45000)
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

    if (msg.includes("OutOfMemory") || msg.includes("disposed") || 
        msg.includes("Device") || msg.includes("STALE_GENERATION")) {
      if (!recovering) {
        recovering = true;
        await unloadEngine();
        await sleep(1000);
        recovering = false;
      }
    }
    return JSON.stringify({ error: "System Glitch" });
  } finally {
    generationLock = false;
    await sleep(isMobile ? 180 : 80);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
