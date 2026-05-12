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

export async function initEngine(modelId?: string, onProgress?: (p: any) => void) {
    let selectedModelId = modelId;

    if (!selectedModelId) {
        const specs = await detectSystemCapabilities();
        selectedModelId = specs.recommended.model_id;
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

            // Unificando as configurações em um objeto 'any' para o TS não reclamar das propriedades
            // mas o WebLLM receber o que precisa.
            const engineConfig: any = {
                appConfig: {
                    model_list: AVAILABLE_MODELS,
                },
                chatOpts: {
                    context_window_size: isMobile ? 1024 : 2048,
                },
                initProgressCallback: onProgress,
            };

            // Chamada direta com o objeto de configuração unificado
            engine = await webllm.CreateMLCEngine(selectedModelId as string, engineConfig);

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
    generationId++;

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
