export interface Model {
  id: string;
  name: string;
  sizeMb: number; // Adicionado para corrigir o erro da linha 101
}

export interface SystemSpecs {
  modelTier: string;
  gpuLimit: number;
  recommended: Model;
}

export const AVAILABLE_MODELS: Model[] = [
  { 
    id: "Phi-3.5-mini-instruct-q4f16_1-MLC", 
    name: "Phi 3.5 Mini (Logic & Code)",
    sizeMb: 2200 // Aproximadamente 2.2GB
  },
  { 
    id: "Qwen2-0.5B-Instruct-q4f16_1-MLC", 
    name: "Qwen 0.5B (Low Power)",
    sizeMb: 350 
  },
  { 
    id: "Llama-3-8B-Instruct-v0.1-q4f16_1-MLC", 
    name: "Llama 3 8B (High Power)",
    sizeMb: 4700
  }
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
    modelTier,
    gpuLimit,
    recommended
  };
}
