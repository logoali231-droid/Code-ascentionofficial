"use client";

import * as webllm from "@mlc-ai/web-llm";
import { get, save } from "@/lib/db";
import { playSound } from "./sounds";

export const AVAILABLE_MODELS = [
  { id: "Llama-3-8B-Instruct-v0.1-q4f16_1-MLC", name: "Llama 3 8B (Fast)", size: "4.5GB", vram: "High" },
  { id: "Phi-3-mini-4k-instruct-q4f16_1-MLC", name: "Phi-3 Mini", size: "2.3GB", vram: "Mid" },
  { id: "gemma-2b-it-q4f16_1-MLC", name: "Gemma 2B", size: "1.6GB", vram: "Low" }
];

const DEFAULT_MODEL = AVAILABLE_MODELS[0].id;
let engine: webllm.MLCEngine | null = null;
let isInitializing = false;

export interface InitProgress {
  progress: number;
  timeElapsed: number;
  text: string;
}

export async function initEngine(
  modelId: string = DEFAULT_MODEL, 
  onProgress?: (progress: InitProgress) => void
) {
  if (engine) return engine;
  if (isInitializing) return null;
  isInitializing = true;

  try {
    const engineConfig: webllm.Config = {
      initProgressCallback: (p: any) => { if (onProgress) onProgress(p); },
      logLevel: "INFO",
    };
    const newEngine = await webllm.CreateMLCEngine(modelId, engineConfig);
    engine = newEngine;
    const user = await get("user", "main");
    if (user) await save("user", { ...user, engineReady: true, model: modelId }, "main");
    return engine;
  } catch (error) {
    isInitializing = false;
    throw error;
  } finally {
    isInitializing = false;
  }
}

export async function generate(prompt: string, temperature: number = 0.7) {
  if (!engine) {
    await initEngine();
    if (!engine) throw new Error("AI_OFFLINE");
  }

  const fallbackJson = {
    lessons: [{
      title: "Connection Glitch",
      explanation: "Neural link unstable.",
      exercises: [{
        type: "mcq",
        question: "Status?",
        options: ["Glitched"],
        answer: "Glitched",
        explanation: "Reconnecting..."
      }]
    }]
  };

  try {
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("TIMEOUT")), 30000)
    );

    const request = engine.chat.completions.create({
      messages: [
        { role: "system", content: "Cyberpunk AI. Return ONLY JSON." },
        { role: "user", content: prompt }
      ],
      temperature,
      max_tokens: 1024,
      response_format: { type: "json_object" }
    });

    const response: any = await Promise.race([request, timeout]);
    return response.choices[0].message.content;
  } catch (err) {
    console.error("Gen Error:", err);
    return JSON.stringify(fallbackJson);
  }
}

export async function unloadEngine() {
  if (engine) {
    await engine.unload();
    engine = null;
    const user = await get("user", "main");
    if (user) await save("user", { ...user, engineReady: false }, "main");
  }
}

export function getEngineInstance() {
  return engine;
}      temperature: temperature,
      max_tokens: 1512, // Aumentado levemente para cursos mais longos
      response_format: { type: "json_object" }
    });

    const response: any = await Promise.race([request, timeout]);
    const content = response.choices[0].message.content;
    
    return content;

  } catch (err: any) {
    console.error("WebLLM Generation Error:", err);
    playSound("error", 0.4);

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
}    // Corrida entre a geração e o timeout
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
