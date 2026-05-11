export interface Model {
  id: string;
  name: string;
}

export interface SystemSpecs {
  modelTier: string;
  gpuLimit: number;
  recommended: Model; // Essencial para o setSelectedModel(specs.recommended.id)
}

export const AVAILABLE_MODELS: Model[] = [
  { 
    id: "Phi-3-mini-4k-instruct-q4f16_1-MLC", 
    name: "Phi 3.5 Mini (Ideal for Code)" 
  },
  { 
    id: "Qwen2-0.5B-Instruct-q4f16_1-MLC", 
    name: "Qwen 0.5B (Low Power)" 
  },
  { 
    id: "Llama-3-8B-Instruct-v0.1-q4f16_1-MLC", 
    name: "Llama 3 8B (High Power)" 
  }
];

export async function detectSystemCapabilities(): Promise<SystemSpecs> {
  const nav = navigator as any; // Bypass para WebGPU no Vercel
  
  let gpuLimit = 512; // Padrão para mobile
  let modelTier = "LOW";

  try {
    if (nav.gpu) {
      const adapter = await nav.gpu.requestAdapter();
      if (adapter) {
        // Lógica de detecção de hardware aqui
        gpuLimit = 2048; 
        modelTier = "HIGH";
      }
    }
  } catch (err) {
    console.error("WebGPU não detectado, usando fallback", err);
  }

  // Define o Phi 3.5 como recomendado por padrão para o seu caso de uso
  const recommended = AVAILABLE_MODELS[0]; 

  return {
    modelTier,
    gpuLimit,
    recommended
  };
}
