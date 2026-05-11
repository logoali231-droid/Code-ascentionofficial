"use client"; // Deve ser a primeira linha absoluta

import * as webllm from "@mlc-ai/web-llm";
import { playSound } from "./sounds";
import { AVAILABLE_MODELS, detectSystemCapabilities } from "./modelManager";

/* =========================================================
   SINGLETONS & STATE
   ========================================================= */
let engine: webllm.MLCEngine | null = null;
let loadingPromise: Promise<webllm.MLCEngine> | null = null;
let currentModel: string | null = null;
let generationLock = false;
let generationId = 0;

/* =========================================================
   HARD MEMORY SAFE MODE (M23 OPTIMIZED)
   ========================================================= */
const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad/i.test(navigator.userAgent);

// No M23, 512MB causa erro {}. 400MB é o ponto de estabilidade.
const GPU_MEMORY_LIMIT = 400; 

/* =========================================================
   INIT ENGINE
   ========================================================= */
export async function initEngine(modelId?: string, onProgress?: (p: any) => void) {
    let selectedModelId = modelId;

    if (!selectedModelId) {
        const { modelTier } = await detectSystemCapabilities();
        selectedModelId = modelTier;
    }

    // Se já estiver rodando o modelo certo, não faz nada
    if (engine && currentModel === selectedModelId) {
        return engine;
    }

    // Evita múltiplas inicializações simultâneas
    if (loadingPromise) {
        return loadingPromise;
    }

    loadingPromise = (async () => {
        try {
            // Limpeza preventiva para liberar VRAM no mobile
            if (engine) {
                await engine.unload();
                engine = null;
            }

            console.log(`[SYSTEM] Iniciando CreateMLCEngine para: ${selectedModelId}`);

            const config: webllm.AppConfig = {
                // CORREÇÃO CRITICAL: Injetar a lista resolve o erro .find()
                model_list: AVAILABLE_MODELS, 
                low_resource_config: {
                    // Força o limite de memória para evitar o erro {}
                    max_storage_buffer_size_ratio: 0.15, 
                    device_buffer_max_size: GPU_MEMORY_LIMIT * 1024 * 1024,
                }
            };

            const chatOpts: webllm.ChatOptions = {
                // Janela de contexto reduzida para estabilidade no M23
                context_window_size: isMobile ? 1536 : 2048,
            };

            // Chamada correta via namespace webllm para evitar erro de build
            engine = await webllm.CreateMLCEngine(selectedModelId as string, {
                appConfig: config,
                chatConfig: chatOpts,
                initProgressCallback: onProgress,
            });

            currentModel = selectedModelId as string;
            return engine;

        } catch (error: any) {
            loadingPromise = null;
            // Extrai a mensagem real para o seu console mobile não mostrar {}
            const errorMsg = error?.message || JSON.stringify(error) || "Erro de Hardware/WebGPU";
            console.error("[ERROR] Engine Init Failed:", errorMsg);
            throw new Error(errorMsg);
        }
    })();

    return loadingPromise;
}

/* =========================================================
   UNLOAD ENGINE
   ========================================================= */
export async function unloadEngine() {
    try {
        if (engine) {
            await engine.unload();
        }
    } catch (err) {
        console.warn("[WebLLM Unload Error]", err);
    } finally {
        engine = null;
        loadingPromise = null;
        currentModel = null;
    }
}

/* =========================================================
   GENERATE
   ========================================================= */
export async function generate(prompt: string, temperature: number = 0.7) {
    if (generationLock) return;
    
    generationLock = true;
    const myGenerationId = ++generationId;

    try {
        const currentEngine = await initEngine();
        
        const chunks = await currentEngine.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            temperature: temperature,
            stream: true,
        });

        return chunks;

    } catch (err: any) {
        console.error("[WebLLM Generate Error]", err);
        playSound("error", 0.4);
        throw err;
    } finally {
        generationLock = false;
    }
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
