"use client";

import * as webllm from "@mlc-ai/web-llm";
import { get, save } from "@/lib/db";
import { playSound } from "./sounds";
// Importamos a função de detecção e a lista de modelos
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
const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
const SAFE_MAX_TOKENS = isMobile ? 512 : 1024;

/* =========================================================
   INIT ENGINE
========================================================= */
// ... suas importações anteriores

export async function initEngine(
  modelId?: string,
  onProgress?: (p: any) => void
) {
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
    // AJUSTE PARA O M23: Forçamos o WebLLM a trabalhar com buffers menores
    loadingPromise = webllm.CreateMLCEngine(
      selectedModelId, 
      {
        initProgressCallback: onProgress,
        logLevel: "INFO",
        // Adicionamos a configuração de hardware específica abaixo:
        appConfig: {
          kvCacheConfig: {
            // Reduzimos o cache para não estourar os 512MB da GPU do M23
            maxNumSteps: isMobile ? 128 : 256, 
          }
        },
        // Forçamos o limite de memória para o que o M23 aceita sem erro
        requiredCapabilities: {
          maxStorageBufferBindingSize: 536870912, // 512MB exatos
        }
      }
    );

    engine = await loadingPromise;
    // ... resto do seu código de recovery e save
/* =========================================================
   GET ENGINE & UNLOAD (Sem alterações necessárias)
========================================================= */
export function getEngine() { return engine; }

export async function unloadEngine() {
  try {
    if (engine) { await engine.unload(); }
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
    // Agora o initEngine() decide o modelo sozinho se estiver vazio
    const currentEngine = await initEngine(); 

    if (!currentEngine) { throw new Error("AI_OFFLINE"); }

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), 30000)
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
