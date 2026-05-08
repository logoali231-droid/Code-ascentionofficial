"use client";

import * as webllm from "@mlc-ai/web-llm";

// =========================================================
// 1. SUPPORTED MODELS & QUANTIZATION (TIERS)
// =========================================================
export const MODEL_TIERS = {
  HIGH: {
    id: "Llama-3-8B-Instruct-q4f16_1-MLC",
    name: "Llama 3 8B (Q4)",
    minRam: 8,
    sizeMb: 4500,
    type: "high"
  },
  MID: {
    id: "Phi-3-mini-4k-instruct-q4f16_1-MLC", // Perfeito para mobile intermediário
    name: "Phi-3 Mini (Q4)",
    minRam: 4,
    sizeMb: 2300,
    type: "mid"
  },
  LOW: {
    id: "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC", // Salva-vidas para aparelhos fracos
    name: "TinyLlama 1.1B (Q4)",
    minRam: 2,
    sizeMb: 650,
    type: "low"
  }
};

export const AVAILABLE_MODELS = Object.values(MODEL_TIERS);

// =========================================================
// 2. RAM DETECTION & FALLBACK (M23 SAFE)
// =========================================================
export function detectSystemCapabilities() {
  // navigator.deviceMemory retorna a RAM em GB (Aproximado: 2, 4, 6, 8)
  // Alguns navegadores (Safari) não suportam, então o fallback seguro é 4GB.
  const ram = (navigator as any).deviceMemory || 4;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  let recommended = MODEL_TIERS.LOW;

  if (ram >= 8 && !isMobile) {
    recommended = MODEL_TIERS.HIGH;
  } else if (ram >= 4) {
    recommended = MODEL_TIERS.MID;
  }

  return {
    ram,
    isMobile,
    recommended,
    isM23Profile: isMobile && ram <= 6 // Identifica aparelhos com risco de crash
  };
}

// =========================================================
// 3. CACHE CONTROL
// =========================================================
export async function isModelCached(modelId: string): Promise<boolean> {
  try {
    return await webllm.hasModelInCache(modelId);
  } catch (e) {
    console.warn("[ModelManager] Falha ao verificar cache:", e);
    return false;
  }
}

export async function clearModelCache() {
  console.log("[ModelManager] Iniciando purga do cache...");
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
// Permite baixar o modelo em background sem instanciar na memória RAM
export async function preloadModel(
  modelId: string,
  onProgress: (progress: number, text: string) => void
): Promise<boolean> {
  try {
    const engine = new webllm.MLCEngine();
    engine.setInitProgressCallback((report: webllm.InitProgressReport) => {
      const percentage = Math.round(report.progress * 100);
      onProgress(percentage, report.text);
    });

    // Baixa os pesos para o IndexedDB do navegador
    await engine.reload(modelId);
    
    // Descarrega da VRAM (memória ativa), mas os arquivos continuam offline no Cache!
    await engine.unload(); 
    return true;
  } catch (e) {
    console.error("[ModelManager] Falha crítica no preload:", e);
    return false;
  }
}