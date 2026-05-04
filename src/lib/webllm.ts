import * as webllm from "@mlc-ai/web-llm";

let engine: webllm.MLCEngine | null = null;

export async function initEngine(model: string, onProgress?: any) {
  engine = await webllm.CreateMLCEngine(model, {
    initProgressCallback: onProgress,
  });
  return engine;
}

export function getEngine() {
  if (!engine) throw new Error("Engine not initialized");
  return engine;
}

export async function generate(prompt: string) {
  const eng = getEngine();

  const res = await eng.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
  });

  return res.choices[0].message.content;
}