import { generate } from "./webllm";
import { buildCoursePrompt } from "./aiPrompt";

export async function generateLessons(config: any) {
  const prompt = buildCoursePrompt(config);

  const raw = await generate(prompt);

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("AI returned invalid JSON");
  }
}