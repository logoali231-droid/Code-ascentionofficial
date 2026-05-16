// modelManager.ts
"use client";

import { ModelRecord } from "@mlc-ai/web-llm";
import { save, get } from "./db";
import { SYSTEM_CONFIG, Model } from "@/config/system";

/* =========================================================
   BENCHMARK
========================================================= */

export async function runQuickBenchmark(engine: any): Promise<number> {
  const startTime = performance.now();

  const testPrompt = "Explique loop em 3 palavras.";

  await engine.chat.completions.create({
    messages: [
      {
        role: "user",
        content: testPrompt,
      },
    ],
    max_tokens: 10,
  });

  const endTime = performance.now();
  const durationSeconds = (endTime - startTime) / 1000;
  const tokensPerSecond = 10 / durationSeconds;

  const user = await get("user", "main");

  await save("user", {
    ...user,
    tokensPerSecond,
  });

  return tokensPerSecond;
}

/* =========================================================
   TYPES
========================================================= */

export interface SystemSpecs {
  modelTier: "LOW" | "MID" | "HIGH";
  gpuLimit: number;
  recommended: Model;
  memory: number;
  webgpu: boolean;
  sharedArrayBuffer: boolean;
  ramGB: number;
  isMobile: boolean;
}

/* =========================================================
   HELPERS
========================================================= */

function getModelByTier(tier: "LOW" | "MID" | "HIGH"): Model {
  switch (tier) {
    case "HIGH":
      return SYSTEM_CONFIG.AVAILABLE_MODELS[2] as Model;
    case "MID":
      return SYSTEM_CONFIG.AVAILABLE_MODELS[1] as Model;
    default:
      return SYSTEM_CONFIG.AVAILABLE_MODELS[0] as Model;
  }
}

/* =========================================================
   ENGINE MANAGEMENT
========================================================= */

export async function unloadEngine(engine?: any): Promise<void> {
  try {
    if (engine && typeof engine.unload === "function") {
      console.log("[Model Manager] Descarregando engine para liberar VRAM...");
      await engine.unload();
    }
  } catch (err) {
    console.error("[Model Manager] Erro ao descarregar a engine:", err);
  }
}

/* =========================================================
   CACHE SYSTEM DETECTION
========================================================= */

let cachedSpecs: SystemSpecs | null = null;

/* =========================================================
   SYSTEM DETECTION
========================================================= */

export async function detectSystemCapabilities(): Promise<SystemSpecs> {
  if (cachedSpecs) return cachedSpecs;

  const nav = navigator as any;
  const memory = nav.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const webgpu = "gpu" in navigator;
  const sharedArrayBuffer = typeof SharedArrayBuffer !== "undefined";
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  let gpuLimit = 512;
  let modelTier: "LOW" | "MID" | "HIGH" = "LOW";

  try {
    if (!webgpu) {
      cachedSpecs = {
        modelTier: "LOW",
        gpuLimit,
        recommended: SYSTEM_CONFIG.AVAILABLE_MODELS[0] as Model,
        memory,
        webgpu,
        sharedArrayBuffer,
        ramGB: memory,
        isMobile,
      };
      return cachedSpecs;
    }

    const adapter = await nav.gpu.requestAdapter();

    if (!adapter) {
      console.warn("[WebGPU] Adapter indisponível no ambiente atual.");
      // Lançamos um erro padronizado para a UI interceptar, em vez de mascarar o estado
      throw new Error("HARDWARE_INCOMPATIBLE: WebGPU detectado no navegador, mas falhou ao instanciar o Adapter gráfico.");
    }

    gpuLimit = 2048;

    if (memory <= 3 || cores <= 4 || !sharedArrayBuffer) {
      modelTier = "LOW";
    } else if (memory >= 4 && cores >= 6) {
      modelTier = "MID";
    }

    if (memory >= 8 && cores >= 8) {
      modelTier = "HIGH";
      gpuLimit = 4096;
    }

    // CORREÇÃO CRÍTICA: Se for mobile, nunca use HIGH. 
    // O Shader do M23 não aguenta a complexidade do Phi 3.5
    if (isMobile) {
      modelTier = memory > 4 ? "MID" : "LOW";
      gpuLimit = 1024; // Reduz pressão na VRAM
    }

    if (memory <= 4 && modelTier === "HIGH") {
      modelTier = "MID";
    }
  } catch (err) {
    console.error("[WebGPU Detection Error]", err);
  }

  const recommended = getModelByTier(modelTier);

  console.log("[System Detection]", {
    memory,
    cores,
    gpuLimit,
    modelTier,
    webgpu,
    sharedArrayBuffer,
    recommended: recommended.name,
  });

  cachedSpecs = {
    modelTier,
    gpuLimit,
    recommended,
    memory,
    webgpu,
    sharedArrayBuffer,
    ramGB: memory,
    isMobile,
  };

  return cachedSpecs;
}