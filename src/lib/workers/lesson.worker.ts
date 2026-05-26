import { generate } from "./webllm";
import { buildLessonPlan } from "./LessonGenerator";

self.onmessage = async (event) => {
  const { course, history } = event.data;

  try {
    const plan = await buildLessonPlan({ course, history });

    const prompt = buildExplanationPrompt(plan);

    const stream = await generate(prompt);

    let full = "";
    for await (const chunk of stream) {
      full += chunk;
    }

    self.postMessage({
      type: "lesson",
      data: full,
    });

  } catch (err) {
    self.postMessage({
      type: "error",
      error: String(err),
    });
  }
};
