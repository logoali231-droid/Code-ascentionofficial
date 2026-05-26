import { generate } from "./webllm";
import { buildMemoryContext } from "./vectorMemory";
import { getKnowledgeGraph } from "./knowledgeGraph";
import { validateCourse } from "./courseValidator";

self.onmessage = async (event) => {
  const { topic, style, level, difficulty, courseId } = event.data;

  try {
    const graph = await getKnowledgeGraph(courseId || topic);

    const memory = await buildMemoryContext({
      query: topic,
      tags: [topic, level],
      limit: 3,
    });

    const prompt = buildCoursePrompt({
      topic,
      style,
      level,
      difficulty,
      graph,
      memory,
    });

    const stream = await generate(prompt);

    let full = "";
    for await (const chunk of stream) {
      full += chunk;
    }

    const parsed = JSON.parse(full);

    if (!validateCourse(parsed)) {
      throw new Error("invalid course");
    }

    self.postMessage({
      type: "success",
      data: parsed,
    });

  } catch (err) {
    self.postMessage({
      type: "error",
      error: String(err),
    });
  }
};
