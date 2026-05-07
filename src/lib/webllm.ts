"use client";

import * as webllm from "@mlc-ai/web-llm";
import { get, save } from "@/lib/db";

let engine: any = null;
let loadingPromise: Promise<any> | null = null;



// 🧠 SSR-safe + detecção leve
function getDeviceTier() {
  if (typeof navigator === "undefined") return "high";

  const memory = (navigator as any).deviceMemory || 4;

  if (memory <= 6) return "mid"; // seu caso (M23)
  return "high";
}

// ⚙️ config adaptativa
function getConfig() {
  const tier = getDeviceTier();

  if (tier === "mid") {
    return {
      maxHistory: 4,
      maxTokens: 400,
    };
  }

  return {
    maxHistory: 8,
    maxTokens: 600,
  };
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
      });

      await save("user", {
        ...user,
        engineReady: true,
        model,
      });

      return engine;
    } catch (err) {
      engine = null;
      throw err;
    } finally {
      loadingPromise = null;
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

export async function generate(
  prompt: string,
  history: { role: string; content: string }[] = []
) {
  const eng = getEngine();
  const config = getConfig();

  const messages = [
    ...trimMessages(history, config.maxHistory),
    { role: "user", content: prompt },
  ];

  try {
    const res = await eng.chat.completions.create({
      messages,
      max_tokens: config.maxTokens,
      temperature: 0.7,
    });

    return res?.choices?.[0]?.message?.content || "";
  } catch (err) {
    console.error("Generation error:", err);
    throw err;
  }
}