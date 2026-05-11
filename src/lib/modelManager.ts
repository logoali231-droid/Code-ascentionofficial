// src/lib/modelManager.ts

export const AVAILABLE_MODELS = [
  { id: "Qwen2-0.5B-Instruct-q4f16_1-MLC", name: "Qwen 0.5B (Low Power)" },
  { id: "Llama-3-8B-Instruct-v0.1-q4f16_1-MLC", name: "Llama 3 8B (High Power)" }
];

export async function detectSystemCapabilities() {
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

    // 3. Define o modelo (Tier)
    // Se a GPU for menor que 600MB ou for mobile com pouca RAM, usa o modelo leve
    if (gpuLimit < 600 || (isMobile && ram < 6)) {
        return {
            modelTier: AVAILABLE_MODELS[0].id, // O modelo 0.5B
            gpuLimit
        };
    }

    return {
        modelTier: AVAILABLE_MODELS[1].id, // O modelo 8B
        gpuLimit
    };
}
