"use client";

import * as webllm from "@mlc-ai/web-llm";
import { get, save } from "@/lib/db";
import { playSound } from "./sounds";

// Configurações de modelo e memória
const SELECTED_MODEL = "Llama-3-8B-Instruct-v0.1-q4f16_1-MLC";

let engine: webllm.MLCEngine | null = null;
let isInitializing = false;

/**
 * Interface para monitorar o progresso do download/carregamento
 */
export interface InitProgress {
  progress: number;
  timeElapsed: number;
  text: string;
}

/**
 * Inicializa a Engine WebLLM com controle total de estado
 */
export async function initEngine(
  modelId: string = SELECTED_MODEL, 
  onProgress?: (progress: InitProgress) => void
) {
  if (engine) return engine;
  if (isInitializing) return null;

  isInitializing = true;

  try {
    console.log("Initializing WebLLM Engine...");
    
    // Configurações de baixa memória para dispositivos mobile
    const engineConfig: webllm.Config = {
      initProgressCallback: (p: any) => {
        if (onProgress) onProgress(p);
        console.log(`Loading: ${Math.round(p.progress * 100)}% - ${p.text}`);
      },
      logLevel: "INFO",
    };

    const newEngine = await webllm.CreateMLCEngine(modelId, engineConfig);
    
    engine = newEngine;
    
    // Marca no banco que a engine está pronta para o Navbar/UI
    const user = await get("user", "main");
    if (user) {
      await save("user", { ...user, engineReady: true }, "main");
    }

    return engine;
  } catch (error) {
    console.error("Failed to initialize WebLLM:", error);
    isInitializing = false;
    throw error;
  } finally {
    isInitializing = false;
  }
}

/**
 * Gera conteúdo com proteção contra travamentos (Race Strategy)
 */
export async function generate(prompt: string, temperature: number = 0.7) {
  if (!engine) {
    console.warn("Engine not initialized. Attempting auto-init...");
    await initEngine();
    if (!engine) throw new Error("AI_ENGINE_OFFLINE");
  }

  playSound("click", 0.2);

  // Fallback em caso de erro JSON ou Timeout
  const fallbackJson = {
    lessons: [{
      title: "Neural Link Recovery",
      explanation: "The connection to the core was unstable. System recovered via emergency protocol.",
      exercises: [{
        type: "mcq",
        question: "System check: Connection lost. What is the status?",
        options: ["Stable", "Glitched", "Offline", "Reconnecting"],
        answer: "Glitched",
        explanation: "The system is currently using local cache due to high VRAM usage."
      }]
    }]
  };

  try {
    // Configuração de Timeout (25s para Mobile)
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("GENERATION_TIMEOUT")), 25000)
    );

    const request = engine.chat.completions.create({
      messages: [
        { role: "system", content: "You are a Cyberpunk AI. Return ONLY JSON." },
        { role: "user", content: prompt }
      ],
      temperature: temperature,
      max_tokens: 1024,
      response_format: { type: "json_object" }
    });

    // Corrida entre a geração e o timeout
    const response: any = await Promise.race([request, timeout]);
    
    const content = response.choices[0].message.content;
    console.log("AI Response received");
    
    return content;

  } catch (err: any) {
    console.error("WebLLM Generation Error:", err);
    playSound("error", 0.4);

    // Se o erro for estouro de memória, forçamos o reset da engine
    if (err.message?.includes("out of memory") || err.message === "GENERATION_TIMEOUT") {
      console.error("Critical Memory/Time Failure. Purging Engine...");
      await unloadEngine();
    }

    return JSON.stringify(fallbackJson);
  }
}

/**
 * Libera memória (VRAM) explicitamente
 */
export async function unloadEngine() {
  if (engine) {
    await engine.unload();
    engine = null;
    
    const user = await get("user", "main");
    if (user) {
      await save("user", { ...user, engineReady: false }, "main");
    }
    console.log("WebLLM Engine purged from memory.");
  }
}

/**
 * Getter para estado da Engine
 */
export function getEngineInstance() {
  return engine;
}
