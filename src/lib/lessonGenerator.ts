import { generate } from "./webllm";
import { safeParse } from "./safeParse";
import { buildCoursePrompt } from "./aiPrompt";

export async function generateLessons(config: any) {
  const prompt = buildCoursePrompt(config);

  const raw = await generate(prompt);

  const parsed = safeParse(raw);
  if (!parsed) throw new Error("AI returned invalid JSON");
  return parsed;
}