import { generate } from "../webllm";

export async function runLLM(prompt: string, temperature = 0.7) {
  const stream = await generate(prompt, temperature);

  let full = "";

  for await (const chunk of stream) {
    const text =
      typeof chunk === "string"
        ? chunk
        : (chunk as any)?.choices?.[0]?.delta?.content || "";

    full += text;
  }

  return full;
}
