import { runLLM } from "@/lib/llm/llmExecutor";
import {
  generateLessonPlan,
  buildExplanationPrompt,
} from "@/lib/others/lessonGenerator";
import { getAdaptiveMetrics } from "@/lib/others/adaptive";
 
self.onmessage = async (event) => {
  const { course, history } = event.data;

  try {
    const adaptive = await getAdaptiveMetrics(
      course.difficulty,
      course.topic
    );

    const plan = await generateLessonPlan({
      course,
      history,
    });

    const prompt = buildExplanationPrompt(plan);

    const temperature =
      adaptive.routingStrategy === "HIGH_COMPUTATION_CLOUD"
        ? 0.85
        : adaptive.routingStrategy === "LOW_LATENCY_LOCAL"
        ? 0.4
        : 0.65;

    const full = await runLLM(prompt, temperature);

    self.postMessage({
      type: "lesson",
      data: full,
      meta: {
        strategy: adaptive.routingStrategy,
        difficulty: adaptive.difficulty,
      },
    });

  } catch (err) {
    self.postMessage({
      type: "error",
      error: String(err),
    });
  }
};
