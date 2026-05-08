"use client";
import * as webllm from "@mlc-ai/web-llm";
import { get, save } from "@/lib/db";
import { playSound } from "./sounds";
import { AVAILABLE_MODELS } from "./modelManager";



let engine: webllm.MLCEngine | null = null;
let isInitializing = false;

export async function initEngine(modelId: string = AVAILABLE_MODELS[0].id, onProgress?: (p: any) => void) {
  if (engine || isInitializing) return engine;
  isInitializing = true;
  try {
    const config: webllm.MLCEngineConfig = { initProgressCallback: onProgress, logLevel: "INFO" };
    engine = await webllm.CreateMLCEngine(modelId, config);
    const user = await get("user", "main");
    if (user) await save("user", { ...user, engineReady: true, model: modelId }, "main");
    return engine;
  } finally {
    isInitializing = false;
  }
}

export async function generate(prompt: string, temperature: number = 0.7) {
  if (!engine) {
    await initEngine();
    if (!engine) throw new Error("AI_OFFLINE");
  }

  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), 30000));
    const request = engine.chat.completions.create({
      messages: [
        { role: "system", content: "You are a Cyberpunk AI. Return ONLY JSON." },
        { role: "user", content: prompt }
      ],
      temperature,
      response_format: { type: "json_object" }
    });

    const response: any = await Promise.race([request, timeout]);
    return response.choices[0].message.content;
  } catch (err: any) {
    console.error("WebLLM Error:", err);
    playSound("error", 0.4);
    if (err.message === "TIMEOUT") await engine.unload();
    return JSON.stringify({ error: "System Glitch" });
  }
}
