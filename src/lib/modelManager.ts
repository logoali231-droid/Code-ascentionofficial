

export const AVAILABLE_MODELS = [
  { id: "Qwen2-0.5B-Instruct-q4f16_1-MLC", name: "Qwen 0.5B (Low Power)", sizeMb: 350 },
  { id: "Llama-3-8B-Instruct-v0.1-q4f16_1-MLC", name: "Llama 3 8B (High Power)", sizeMb: 4500 }
];

// Definimos uma Interface para o TypeScript saber exatamente o que esperar
export interface SystemSpecs {
  modelTier: string;
  gpuLimit: number;
  recommended: typeof AVAILABLE_MODELS[0];
}

export async function detectSystemCapabilities(): Promise<SystemSpecs> {
    // 1. Verifica RAM aproximada
    const ram = (navigator as any).deviceMemory || 4;
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    
    let gpuLimit = 1024; // Padrão 1GB

    // 2. Verifica limites REAIS da GPU (WebGPU)
    try {
        if (navigator.gpu) {
            const adapter = await navigator.gpu.requestAdapter();
            if (adapter) {
                // Converte bytes para MB
                gpuLimit = adapter.limits.maxStorageBufferBindingSize / (1024 * 1024);
                console.log(`[System] GPU Limit detected: ${gpuLimit}MB`);
            }
        }
    } catch (e) {
        console.warn("[System] Could not detect WebGPU limits, using fallback.");
    }

    // Lógica de recomendação
    const isLowEnd = gpuLimit < 600 || (isMobile && ram < 6);
    const recommendedModel = isLowEnd ? AVAILABLE_MODELS[0] : AVAILABLE_MODELS[1];

    // O retorno agora contém o campo 'recommended' que o seu componente busca
    return {
        modelTier: recommendedModel.id === AVAILABLE_MODELS[0].id ? "LOW" : "HIGH",
        gpuLimit,
        recommended: recommendedModel
    };
}
