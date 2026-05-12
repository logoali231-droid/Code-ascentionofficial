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

            // Configuração básica para garantir compatibilidade de tipos no build
            const config: webllm.AppConfig = {
                model_list: AVAILABLE_MODELS,
            };

            // Reduzir o contexto é a única forma garantida de não estourar a RAM do M23
            // sem depender de propriedades de cache que variam entre versões da lib
            const chatOpts: any = {
                context_window_size: isMobile ? 1024 : 2048,
            };

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
