"use client";

import * as webllm from "@mlc-ai/web-llm";
import { get, save } from "@/lib/db";

let engine: any = null;
let loadingPromise: Promise<any> | null = null;

// 🧠 Detecta nível do dispositivo com segurança (SSR-safe)
function getDeviceTier() {
  if (typeof navigator === "undefined") return "high";

  const ua = navigator.userAgent;
  const memory = (navigator as any).deviceMemory || 4;

  if (/Android/i.test(ua) && memory <= 6) {
    return "low"; // tipo Galaxy M23
  }

  return "high"; // tipo topo de linha / PC
}

// ⚙️ Config por dispositivo
function getConfig() {
  const tier = getDeviceTier();

  if (tier === "low") {
    return {
      maxHistory: 3,
      maxTokens: 180,
      contextWindow: 2048,
    };
  }

  return {
    maxHistory: 8,
    maxTokens: 600,
    contextWindow: 4096,
  };
}

export async function initEngine(model: string, cb?: any) {
  const user = await get("user", "main");

  // 🔁 se mudou modelo, reseta engine
  if (engine && user?.model !== model) {
    engine = null;
  }

  if (engine) return engine;
  if (loadingPromise) return loadingPromise;

  const config = getConfig();

  loadingPromise = (async () => {
    try {
      engine = await webllm.CreateMLCEngine(model, {
        initProgressCallback: cb,

        // 🧠 opcional (nem todo modelo respeita)
        appConfig: {
          context_window_size: config.contextWindow,
        },
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

// 🔄 reset manual (útil pra troca de modelo)
export function resetEngine() {
  engine = null;
  loadingPromise = null;
}

// ✂️ limita histórico
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