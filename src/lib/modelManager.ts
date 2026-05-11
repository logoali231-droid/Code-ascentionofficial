// src/lib/modelManager.ts

export const AVAILABLE_MODELS = [
  { id: "Qwen2-0.5B-Instruct-q4f16_1-MLC", name: "Qwen 0.5B (Low Power)", sizeMb: 350 },
  { id: "Llama-3-8B-Instruct-v0.1-q4f16_1-MLC", name: "Llama 3 8B (High Power)", sizeMb: 4500 }
];

export interface SystemSpecs {
  modelTier: string;
  gpuLimit: number;
  recommended: typeof AVAILABLE_MODELS[0];
}

export async function detectSystemCapabilities(): Promise<SystemSpecs> {
    const ram = (navigator as any).deviceMemory || 4;
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    
    let gpuLimit = 1024; 

    try {
        // A CORREÇÃO: Forçamos o navigator para 'any' para acessar a propriedade .gpu 
        // que o TS ainda não conhece nativamente
        const nav = navigator as any;
        
        if (nav.gpu) {
            const adapter = await nav.gpu.requestAdapter();
            if (adapter) {
                // Converte bytes para MB
                gpuLimit = adapter.limits.maxStorageBufferBindingSize / (1024 * 1024);
                console.log(`[System] GPU Limit detected: ${gpuLimit}MB`);
            }
        }
    } catch (e) {
        console.warn("[System] Could not detect WebGPU limits, using fallback.");
    }

    const isLowEnd = gpuLimit < 600 || (isMobile && ram < 6);
    const recommendedModel = isLowEnd ? AVAILABLE_MODELS[0] : AVAILABLE_MODELS[1];

    return {
        modelTier: isLowEnd ? "LOW" : "HIGH",
        gpuLimit,
        recommended: recommendedModel
    };
}
