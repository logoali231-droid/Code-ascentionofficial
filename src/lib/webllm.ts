"use client";
import * as webllm from "@mlc-ai/web-llm";
import { get, save } from "@/lib/db";
import { playSound } from "./sounds";

let engine: any = null;
let loadingPromise: Promise<any> | null = null;

// 🧠 SSR-safe + detecção leve
function getDeviceTier() {
  if (typeof navigator === "undefined") return "high";
  const memory = (navigator as any).deviceMemory || 4;
  if (memory <= 6) return "mid"; // Devices como Galaxy M23
  return "high";
}

// ⚙️ config adaptativa
function getConfig() {
  const tier = getDeviceTier();
  if (tier === "mid") {
    return { maxHistory: 4, maxTokens: 400 };
  }
  return { maxHistory: 8, maxTokens: 600 };
}

export async function initEngine(model: string, cb?: any) {
  const user = await get("user", "main");
  
  // 🔁 troca de modelo
  if (engine && user?.model !== model) {
    engine = null;
  }
  if (engine) return engine;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      engine = await webllm.CreateMLCEngine(model, {
        initProgressCallback: cb,
        logLevel: "INFO",
      });
    } catch (e) {
      console.error("Falha ao inicializar WebLLM", e);
    }
  })();
  return loadingPromise;
}

export function getEngine() {
  if (!engine) {
    throw new Error("Engine not loaded. Call initEngine first.");
  }
  return engine;
}

export function resetEngine() {
  engine = null;
  loadingPromise = null;
}

// ✂️ histórico controlado
function trimMessages(messages: any[], max: number) {
  return messages.slice(-max);
}

// Adicionado: Timeout e Fallback
export async function generate(prompt: string, timeoutMs: number = 25000) {
  const eng = getEngine();
  const config = getConfig();
  playSound("click", 0.2);

  try {
    const generationPromise = eng.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      max_tokens: config.maxTokens,
      temperature: 0.7,
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout: A IA demorou demais para responder.")), timeoutMs)
    );

    const res: any = await Promise.race([generationPromise, timeoutPromise]);
    return res.choices[0].message.content;

  } catch (err) {
    console.error("Erro no WebLLM:", err);
    playSound("error", 0.4);
    
    // Força reinicialização em caso de falha grave de VRAM
    resetEngine(); 
    
    // Retorno gracioso para não quebrar o parse JSON
    return JSON.stringify({
      error: true,
      name: "Glitched Relic",
      description: "A conexão neural falhou temporariamente.",
      effect: "cosmetic",
      price: 0
    });
  }
}
