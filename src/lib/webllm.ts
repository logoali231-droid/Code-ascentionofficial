import * as webllm from "@mlc-ai/web-llm";
import { get, save } from "@/lib/db";

let engine: any = null;

export async function initEngine(model: string, cb?: any) {
  if (engine && (await get("user", "main"))?.model === model) {
    return engine;
  }

  const user = await get("user", "main");

  if (user?.engineReady && user?.model === model) {
    console.log("Reusing cached engine...");
  }

  engine = await webllm.CreateMLCEngine(model, {
    initProgressCallback: cb,
  });

  await save("user", {
    ...user,
    engineReady: true,
    model,
  });

  return engine;
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