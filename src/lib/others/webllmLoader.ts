let cached: any = null;

export async function getWebLLM() {
  if (cached) return cached;

  cached = await import("./webllm");

  return cached;
}