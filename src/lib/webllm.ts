"use client";

import * as webllm from "@mlc-ai/web-llm";
import { get, save } from "@/lib/db";
import { playSound } from "./sounds";
import { AVAILABLE_MODELS, detectSystemCapabilities } from "./modelManager"; 

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
/
export async function initEngine(
  modelId?: string,
  onProgress?: (p: any) => void
) {
  let selectedModelId = modelId;
  
  if (!selectedModelId) {
    const { modelTier } = await detectSystemCapabilities();
    selectedModelId = modelTier;
  }

  if (engine && currentModel === selectedModelId) return engine;
  if (loadingPromise) return loadingPromise;

  try {
    loadingPromise = webllm.CreateMLCEngine(
      selectedModelId, 
      {
        initProgressCallback: onProgress,
        logLevel: "INFO",
        appConfig: {
          // KV Cache: 128 é o "sweet spot" pro M23. 
          // Não é tão pouco que ele esquece tudo, nem tanto que trava o Chrome.
          kvCacheConfig: {
            maxNumSteps: isMobile ? 128 : 256, 
          }
        } as any, 
        requiredCapabilities: {
          // O M23 precisa disso para não cair no limite de 128MB da WebGPU.
          // Forçamos 512MB para o modelo de código rodar com folga.
          maxStorageBufferBindingSize: 536870912, 
        } as any
      }
    );

    engine = await loadingPromise;
    currentModel = selectedModelId;

    // Persistência no banco
    const user = await get("user", "main");
    if (user) {
      await save("user", { ...user, engineReady: true, model: selectedModelId }, "main");
    }

    return engine;
  } catch (err) {
    console.error("[WebLLM Init Error]", err);
    engine = null;
    currentModel = null;
    throw err;
  } finally {
    loadingPromise = null;
  }
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
      setTimeout(() => reject(new Error("TIMEOUT")), 45000) // Aumentado para 45s no mobile
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
