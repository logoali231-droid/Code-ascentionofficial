"use client";

import { SYSTEM_CONFIG, type Model } from "@/config/system";
import { save, get } from "./db";

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

let cachedSpecs: SystemSpecs | null = null;

/* =========================================================
   BENCHMARK ENGINE
========================================================= */
export async function runQuickBenchmark(engine: any): Promise<number> {
  const startTime = performance.now();
  const testPrompt = "Explique loop em 3 palavras.";

  try {
    await engine.chat.completions.create({
      messages: [{ role: "user", content: testPrompt }],
      max_tokens: 10,
    });
  } catch (err) {
    console.error(
      "%c[BENCHMARK] Falha ao executar teste de estresse da GPU.",
      "color: #ff0055",
      err,
    );
    return 0;
  }

  const endTime = performance.now();
  const durationSeconds = (endTime - startTime) / 1000;
  const tokensPerSecond = 10 / durationSeconds;

  const user = await get("user", "main");
  await save("user", {
    ...user,
    tokensPerSecond,
  });

  console.log(
    `%c[BENCHMARK] Desempenho local verificado: ${tokensPerSecond.toFixed(2)} t/s.`,
    "color: #00ffcc",
  );
  return tokensPerSecond;
}

/* =========================================================
   HEURISTICS HELPERS
========================================================= */
function getModelByTier(tier: "LOW" | "MID" | "HIGH"): Model {
  if (tier === "HIGH") return SYSTEM_CONFIG.AVAILABLE_MODELS[2] as Model;
  if (tier === "MID") return SYSTEM_CONFIG.AVAILABLE_MODELS[1] as Model;
  return SYSTEM_CONFIG.AVAILABLE_MODELS[0] as Model;
}

export async function unloadEngine(engine?: any): Promise<void> {
  try {
    if (engine && typeof engine.unload === "function") {
      console.log(
        "%c[MODEL:MANAGER] Descarregando engine para liberar VRAM...",
        "color: #ff9900",
      );
      await engine.unload();
    }
  } catch (err) {
    console.error(
      "%c[MODEL:MANAGER] Erro ao descarregar a engine:",
      "color: #ff0055",
      err,
    );
  }
}

/* =========================================================
   SYSTEM CAPABILITIES DETECTION
========================================================= */
export async function detectSystemCapabilities(): Promise<SystemSpecs> {
  if (cachedSpecs) return cachedSpecs;

  const nav = navigator as any;
  const memory = nav.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const webgpu = "gpu" in navigator;
  const sharedArrayBuffer = typeof SharedArrayBuffer !== "undefined";
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(nav.userAgent);

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
      console.warn(
        "%c[WEBGPU] Adapter gráfico indisponível.",
        "color: #ff0055",
      );
      throw new Error(
        "HARDWARE_INCOMPATIBLE: WebGPU detectado, mas falhou ao instanciar o Adapter gráfico.",
      );
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

    /* CORREÇÃO CRÍTICA MOBILE (Ex: Galaxy M23)
       Evita estouro térmico e quebra nos Shaders do driver gráfico limitando alocação a 1024MB */
  if (isMobile) {
  if (memory >= 4 && cores >= 6) {
    modelTier = "MID";
  } else {
    modelTier = "LOW";
  }

  gpuLimit = 1536;
    }

    if (memory <= 4 && modelTier === "HIGH") {
      modelTier = "MID";
    }
  } catch (err) {
    console.error(
      "%c[WEBGPU:DETECTION] Falha na análise de hardware externo:",
      "color: #ff0055",
      err,
    );
  }

  const recommended = getModelByTier(modelTier);

  console.log(
    "%c[SYSTEM:DETECTION] Perfil de hardware mapeado:",
    "color: #00ffcc",
    {
      memory,
      cores,
      gpuLimit,
      modelTier,
      webgpu,
      sharedArrayBuffer,
      recommended: recommended.name,
    },
  );

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
