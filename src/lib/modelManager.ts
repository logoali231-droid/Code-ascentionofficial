import { ModelRecord } from "@mlc-ai/web-llm";

export interface Model extends ModelRecord {
  name: string;
  sizeMb: number;
}

// Interface exportada para resolver o erro "Cannot find name 'SystemSpecs'"
export interface SystemSpecs {
  modelTier: string;
  gpuLimit: number;
  recommended: Model;
}

export const AVAILABLE_MODELS: Model[] = [
  { 
    model_id: "Phi-3.5-mini-instruct-q4f16_1-MLC-1k", 
    model: "https://huggingface.co/mlc-ai/Phi-3.5-mini-instruct-q4f16_1-MLC",
    // O link que o DeepSeek recomendou:
    model_lib: "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/webgpu/Phi-3.5-mini-instruct-q4f16_1-ctx1k_cs1k-webgpu.wasm",
    name: "Phi 3.5 Mini (Low Resource)",
    sizeMb: 2200 
  },

  { 
    model_id: "Qwen2-0.5B-Instruct-q4f16_1-MLC", 
    model: "https://huggingface.co/mlc-ai/Qwen2-0.5B-Instruct-q4f16_1-MLC",
    model_lib: "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/Qwen2-0.5B-Instruct/Qwen2-0.5B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm",
    name: "Qwen 0.5B (Low Power)",
    sizeMb: 350 
  },
  { 
    model_id: "Phi-4-mini-instruct-q4f16_1-MLC", 
    model: "https://huggingface.co/mlc-ai/Phi-4-mini-instruct-q4f16_1-MLC",
    model_lib: "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/Phi-4-mini-instruct/Phi-4-mini-instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm",
    name: "Phi 4 Mini (Extreme Power)",
    sizeMb: 2450 
  },
];

export async function detectSystemCapabilities(): Promise<SystemSpecs> {
  const nav = navigator as any; 
  
  let gpuLimit = 512;
  let modelTier = "LOW";

  try {
    if (nav.gpu) {
      const adapter = await nav.gpu.requestAdapter();
      if (adapter) {
        gpuLimit = 2048; 
        modelTier = "HIGH";
      }
    }
  } catch (err) {
    console.error("Erro ao detectar WebGPU:", err);
  }

  // LÓGICA DE RECOMENDAÇÃO:
  // Se for HIGH (WebGPU ativa), recomenda o Phi 3.5 (AVAILABLE_MODELS[0])
  // Se for LOW, recomenda o Qwen 0.5B (AVAILABLE_MODELS[1])
  // O Phi 4 fica na lista, mas NUNCA é recomendado automaticamente para evitar travar o M23.
  const recommended = modelTier === "HIGH" ? AVAILABLE_MODELS[0] : AVAILABLE_MODELS[1]; 

  return {
    modelTier,
    gpuLimit,
    recommended
  };
}
