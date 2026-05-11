"use client";

import * as webllm from "@mlc-ai/web-llm";

// =========================================================
// 1. SUPPORTED MODELS & QUANTIZATION (TIERS)
// =========================================================
export const MODEL_TIERS = {

  MID: {
  id: "Phi-3.5-mini-instruct-q4f16_1-MLC", // Ideal para o M23 (6GB RAM)
    name: "Phi-3 Mini (Q4)",
    minRam: 4,
    sizeMb: 2300,
    type: "mid"
  },
  LOW: {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",// Fallback ultra-leve
    name: "TinyLlama 1.1B (Q4)",
    minRam: 2,
    sizeMb: 650,
    type: "low"
  },
  HIGH: {
    id: "Llama-3.1-8B-Instruct-q4f16_1-MLC",
    name: "Llama 3 8B (Q4)",
    minRam: 8,
    sizeMb: 4500,
    type: "high"
  }
};

export const AVAILABLE_MODELS = [
  MODEL_TIERS.MID,
  MODEL_TIERS.LOW,
  MODEL_TIERS.HIGH,
];

// =========================================================
// 2. RAM DETECTION & FALLBACK (M23 SAFE)
// =========================================================
export function detectSystemCapabilities() {
  // navigator.deviceMemory retorna a RAM em GB (Aproximado: 2, 4, 6, 8)
  const ram = (navigator as any).deviceMemory || 4;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  let recommended = MODEL_TIERS.LOW;

  // Lógica de recomendação para evitar crash no M23
  if (ram >= 8 && !isMobile) {
    recommended = MODEL_TIERS.HIGH;
  } else if (ram >= 4) {
    recommended = MODEL_TIERS.MID; // M23 cai aqui
  }

  return {
    ram,
    isMobile,
    recommended,
    isM23Profile: isMobile && ram <= 6
  };
}

// =========================================================
// 3. CACHE CONTROL
// =========================================================
export async function isModelCached(modelId: string): Promise<boolean> {
  try {
    // Verifica se os arquivos do modelo já estão no IndexedDB/Cache
    return await webllm.hasModelInCache(modelId);
  } catch (e) {
    console.warn("[ModelManager] Falha ao verificar cache:", e);
    return false;
  }
}

export async function clearModelCache() {
  console.log("[ModelManager] Iniciando limpeza de modelos antigos...");
  try {
    const cacheNames = await caches.keys();
    let cleared = false;
    for (const name of cacheNames) {
      if (name.includes('webllm')) {
        await caches.delete(name);
        cleared = true;
      }
    }
    return cleared;
  } catch (e) {
    console.error("[ModelManager] Erro ao limpar cache:", e);
    return false;
  }
}

// =========================================================
// 4. DOWNLOAD MANAGER & PRELOAD
// =========================================================
export async function preloadModel(
  modelId: string,
  onProgress: (
    progress: number,
    text: string
  ) => void
): Promise<boolean> {
  try {
    await webllm.CreateMLCEngine(
      modelId,
      {
        initProgressCallback: (
          report
        ) => {
          const percentage =
            Math.round(
              report.progress * 100
            );

          onProgress(
            percentage,
            report.text
          );
        },

        logLevel: "WARN",
      }
    );

    return true;
  } catch (e) {
    console.error(
      "[ModelManager] preload fail",
      e
    );

    return false;
  }
}
