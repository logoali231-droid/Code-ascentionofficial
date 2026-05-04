import * as webllm from "@mlc-ai/web-llm";

let engine: any = null;

export async function initEngine(model: string, cb?: any) {
  engine = await webllm.CreateMLCEngine(model, {
    initProgressCallback: cb,
  });
}

export function getEngine() {
  if (!engine) throw new Error("Engine not loaded");
  return engine;
}

export async function generate(prompt: string) {
  const eng = getEngine();

  const res = await eng.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
  });

  return res.choices[0].message.content;
}