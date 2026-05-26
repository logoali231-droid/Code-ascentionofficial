import { runLLM } from "@/lib/llm/llmExecutor";
import { buildMemoryContext } from "@/lib/others/vectorMemory";
import { getKnowledgeGraph, getReviewConcepts } from "@/lib/others/knowledgeGraph";
import { cleanAndParseCourseJSON } from "@/lib/others/safeParse";
import { validateCourse } from "@/lib/others/courseValidator";
import { getUserStrengthsAndWeaknesses } from "@/lib/others/userMemory";
import { getAdaptiveMetrics} from "@/lib/others/adaptive";
import { buildCoursePrompt} from "@/lib/others/aiPrompt"
self.onmessage = async (event) => {
  const { topic, style, level, difficulty, courseId } = event.data;

  try {
    // 🧠 contexto cognitivo
    const adaptive = await getAdaptiveMetrics(difficulty, topic);

    const graph = await getKnowledgeGraph(courseId || topic);

    const memory = await buildMemoryContext({
      query: topic,
      tags: [topic, level, adaptive.rawProfile],
      limit: 3,
    });

    // 🧠 prompt agora tem “estado mental do sistema”
    const prompt = buildCoursePrompt({
      topic,
      style,
      level,
      difficulty: adaptive.difficulty,
      graph,
      memory,
      cognitive: {
        profile: adaptive.rawProfile,
        routing: adaptive.routingStrategy,
        focusMode: adaptive.focusMode,
      },
    });

    const temperature =
      adaptive.routingStrategy === "HIGH_COMPUTATION_CLOUD"
        ? 0.9
        : adaptive.routingStrategy === "LOW_LATENCY_LOCAL"
        ? 0.35
        : 0.7;

    const full = await runLLM(prompt, temperature);

    const parsed = JSON.parse(full);

    if (!validateCourse(parsed)) {
      throw new Error("invalid course");
    }

    self.postMessage({
      type: "success",
      data: parsed,
      meta: {
        strategy: adaptive.routingStrategy,
        profile: adaptive.rawProfile,
      },
    });

  } catch (err) {
    self.postMessage({
      type: "error",
      error: String(err),
    });
  }
};
