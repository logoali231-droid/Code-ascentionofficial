// Adicione o import do tipo oficial para garantir compatibilidade
import { ModelRecord } from "@mlc-ai/web-llm";

export interface Model extends ModelRecord {
  name: string;
  sizeMb: number;
}

export const AVAILABLE_MODELS: Model[] = [
  { 
    model_id: "Phi-3.5-mini-instruct-q4f16_1-MLC", 
    model: "https://huggingface.co/mlc-ai/Phi-3.5-mini-instruct-q4f16_1-MLC",
    model_lib: "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/Phi-3.5-mini-instruct/Phi-3.5-mini-instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm",
    name: "Phi 3.5 Mini (Logic & Code)",
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
  model: "https://huggingface.co",
  model_lib: "https://githubusercontent.com",
  name: "Phi 4 Mini (High Intelligence)",
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
    console.error("Erro WebGPU:", err);
  }

const recommended = AVAILABLE_MODELS[0]; 

return {
  modelTier: recommended.model_id, // Usar o model_id em vez de "HIGH/LOW" facilita o initEngine
  gpuLimit,
  recommended
};
}
