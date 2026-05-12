"use client";

import * as webllm from "@mlc-ai/web-llm";
import { playSound } from "./sounds";
import { AVAILABLE_MODELS, detectSystemCapabilities } from "./modelManager";

let engine: webllm.MLCEngine | null = null;
let loadingPromise: Promise<webllm.MLCEngine> | null = null;
let currentModel: string | null = null;
let generationLock = false;
let generationId = 0;

const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad/i.test(navigator.userAgent);

/* =========================================================
   INIT ENGINE (M23 OPTIMIZED)
   ========================================================= */
export async function initEngine(modelId?: string, onProgress?: (p: any) => void) {
    let selectedModelId = modelId;

    if (!selectedModelId) {
        const { recommended } = await detectSystemCapabilities();
        selectedModelId = recommended.model_id;
    }

    if (engine && currentModel === selectedModelId) {
        return engine;
    }

    if (loadingPromise) {
        return loadingPromise;
    }

    loadingPromise = (async () => {
        try {
            if (engine) {
                await engine.unload();
                engine = null;
            }

            console.log(`[SYSTEM] Iniciando MLCEngine para: ${selectedModelId}`);

            // Configuração compatível com a versão atual do WebLLM
            const config: webllm.AppConfig = {
                model_list: AVAILABLE_MODELS,
            };

            const chatOpts: webllm.ChatOptions = {
                // Reduzir o contexto é a forma mais eficaz de economizar RAM no M23
                context_window_size: isMobile ? 1024 : 2048,
                // Configuração de baixo recurso movida para o KV Cache
                kv_cache_config: {
                    capacity_num_blocks: isMobile ? 16 : 32,
                }
            };

            // No WebLLM moderno, passamos as listas dentro do InitProgressCallback ou via AppConfig
            engine = await webllm.CreateMLCEngine(selectedModelId as string, {
                appConfig: config,
                chatConfig: chatOpts,
                initProgressCallback: onProgress,
            });

            currentModel = selectedModelId as string;
            return engine;

        } catch (error: any) {
            loadingPromise = null;
            const errorMsg = error?.message || "Erro de Hardware/WebGPU";
            console.error("[ERROR] Engine Init Failed:", errorMsg);
            throw new Error(errorMsg);
        }
    })();

    return loadingPromise;
}

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
};

import * as webllm from "@mlc-ai/web-llm";
import { playSound } from "./sounds";
import { AVAILABLE_MODELS, detectSystemCapabilities } from "./modelManager";

let engine: webllm.MLCEngine | null = null;
let loadingPromise: Promise<webllm.MLCEngine> | null = null;
let currentModel: string | null = null;
let generationLock = false;
let generationId = 0;

const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad/i.test(navigator.userAgent);

/* =========================================================
   INIT ENGINE (M23 OPTIMIZED)
   ========================================================= */
export async function initEngine(modelId?: string, onProgress?: (p: any) => void) {
    let selectedModelId = modelId;

    if (!selectedModelId) {
        const { recommended } = await detectSystemCapabilities();
        selectedModelId = recommended.model_id;
    }

    if (engine && currentModel === selectedModelId) {
        return engine;
    }

    if (loadingPromise) {
        return loadingPromise;
    }

    loadingPromise = (async () => {
        try {
            if (engine) {
                await engine.unload();
                engine = null;
            }

            console.log(`[SYSTEM] Iniciando MLCEngine para: ${selectedModelId}`);

            // Configuração compatível com a versão atual do WebLLM
            const config: webllm.AppConfig = {
                model_list: AVAILABLE_MODELS,
            };

            const chatOpts: webllm.ChatOptions = {
                // Reduzir o contexto é a forma mais eficaz de economizar RAM no M23
                context_window_size: isMobile ? 1024 : 2048,
                // Configuração de baixo recurso movida para o KV Cache
                kv_cache_config: {
                    capacity_num_blocks: isMobile ? 16 : 32,
                }
            };

            // No WebLLM moderno, passamos as listas dentro do InitProgressCallback ou via AppConfig
            engine = await webllm.CreateMLCEngine(selectedModelId as string, {
                appConfig: config,
                chatConfig: chatOpts,
                initProgressCallback: onProgress,
            });

            currentModel = selectedModelId as string;
            return engine;

        } catch (error: any) {
            loadingPromise = null;
            const errorMsg = error?.message || "Erro de Hardware/WebGPU";
            console.error("[ERROR] Engine Init Failed:", errorMsg);
            throw new Error(errorMsg);
        }
    })();

    return loadingPromise;
}

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
