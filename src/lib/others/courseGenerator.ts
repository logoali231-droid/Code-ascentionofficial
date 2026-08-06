"use client";

import { HardwareGovernor } from "@/lib/governor/hardwareGovernor";
import { buildMemoryContext } from "./vectorMemory";
import { getGraphStats, getKnowledgeGraph, getReviewConcepts } from "./knowledgeGraph";
import { cleanAndParseCourseJSON } from "./safeParse";
import { buildPromptFragments, compressContext } from "./promptFragments";
import { runtimeQueue } from "./generationQueue";
import { validateCourse } from "./courseValidator";
import { getUserStrengthsAndWeaknesses } from "./userMemory";
import { CognitiveProfile } from "@/types/core";
import { runLLM } from "@/lib/llm/llmExecutor";
import { CourseSchema } from "../ai/contracts/aiContract";



export async function generateCourse({
  topic,
  style,
  level,
  difficulty,
  baseMaterial,
  stylePrompt,
  cognitive,
  courseId,
}: {
  topic: string;
  style: string;
  level: string;
  difficulty: number;
  baseMaterial?: string;
  stylePrompt?: string;
  cognitive?: string;
  courseId?: string;
}): Promise<any> {
  const normalizedTopic = topic?.trim();

  if (!normalizedTopic) {
    throw new Error(
      "[COURSE] Empty topic rejected."
    );
  }
  const { maxContextSize, isMobile } = HardwareGovernor.getLimits();
  const limits = HardwareGovernor.getLimits();
  const pedagogicalConstraints = HardwareGovernor.getPedagogicalConstraints(limits.tier);

  const constraints = HardwareGovernor.getPedagogicalConstraints(limits.tier);

  const cognitiveFragments = buildPromptFragments({
    cognitive: (cognitive || "Standard") as CognitiveProfile,
    difficulty: difficulty || 1,
    mastery: 50,
    reinforcement: false,
    customConstraints: pedagogicalConstraints,
    isMobile: limits.isMobile // Mantenha isso se o buildPromptFragments ainda precisar do booleano
  });

  

  const compressedMaterial = baseMaterial
    ? compressContext(baseMaterial, maxContextSize)
    : "";
  const userAnalysis = await getUserStrengthsAndWeaknesses();

  /* 1. KNOWLEDGE GRAPH PEDAGOGICAL HISTORY */
  let graphReviewText = "None yet";

  let graphStats = {
    totalNodes: 0,
    completed: 0,
    unlocked: 0,
    avgMastery: 0,
  };

  try {
    const graph = await getKnowledgeGraph(courseId || topic.toLowerCase());
    if (graph) {
      const reviewTargets = getReviewConcepts(graph);

      graphStats = getGraphStats(graph);

      if (reviewTargets.length > 0) {
        graphReviewText = reviewTargets
          .map((r) => `${r.title} (Mastery: ${r.mastery})`)
          .join(", ");
      }
    }
  } catch (e) {
    console.error("Failed to fetch graph review concepts", e);
  }

  /* 2. HISTORICAL VECTOR MEMORY RETRIEVAL */
  const vectorMemoryContext = await buildMemoryContext({
    query: `Course creation for topic: ${topic}. User weaknesses: ${userAnalysis.weaknesses.join(", ")}`,
    tags: [topic.toLowerCase(), level],
    limit: 3,
  });

	

const adaptiveContext = `
USER PROFILE:
Strengths: ${userAnalysis.strengths.join(", ") || "none"}
Weaknesses: ${userAnalysis.weaknesses.join(", ") || "none"}

Review targets:
${graphReviewText}

Progress:
Completed: ${graphStats.completed}
Mastery: ${graphStats.avgMastery}

Memory:
${vectorMemoryContext || "none"}

Adaptation:
- Reinforce weaknesses.
- Skip mastered basics.
- Preserve learning continuity.
`;

const prompt = `
You are the Code Ascension curriculum architect.

Generate ONLY a course roadmap.

Your output is NOT a lesson.
Do NOT create explanations, exercises, quizzes, examples, or tutorials.

Create a compact learning structure:
- course title
- course description
- tags
- 4 to 8 modules

Each module represents one learning phase.

INPUT:

Topic:
${topic}

Level:
${level}

Difficulty:
${difficulty}/5

Cognitive profile:
${cognitive || "Standard"}

Teaching style:
${style || "adaptive"}

Adaptive context:
${adaptiveContext}

Course requirements:

- Modules must progress from simple to complex.
- Difficulty must increase gradually.
- Beginner: prioritize foundations.
- Intermediate: reduce repetition.
- Advanced: focus on architecture and optimization.

Difficulty scale:
1 = foundations
2 = practical usage
3 = abstraction
4 = architecture
5 = optimization

Module rules:
- Keep modules flat.
- No lessons.
- No nested arrays.
- Summary maximum 15 words.
- Difficulty integer from 1 to 5.

Return ONLY valid JSON.

Schema:

${JSON.stringify(CourseSchema, null, 2)}

Hard rules:
- No markdown.
- No comments.
- No extra keys.
- Stop immediately after the final }.
- Prioritize valid JSON over detail.
`;
console.log(
  "[COURSE PROMPT SIZE]",
  prompt.length
);

  try {
    const rawRes = await runtimeQueue.enqueue(
      async (_signal) => {
		  console.log(
  "[FINAL PROMPT LENGTH]",
  prompt.length
);
        return await runLLM(prompt);
      },
      1 // Prioridade 1 (Alta) para geração do curso
    );

    // ✅ FIX 1: garantir tipo seguro
    const fullResponse =
      typeof rawRes === "string"
        ? rawRes
        : JSON.stringify(rawRes);
    const trimmed = fullResponse.trim();

    if (
      trimmed.startsWith("{") &&
      !trimmed.endsWith("}")
    ) {
      console.warn(
        "[COURSE] Incomplete JSON received."
      );
    }

    let parsed =
      cleanAndParseCourseJSON(fullResponse);

    if (!parsed) {
      console.warn(
        "[COURSE] First parse failed. Retrying."
      );

      const retryResponse =
        await runtimeQueue.enqueue(
          async (_signal) => {
						console.log("[COURSE PROMPT SIZE]", prompt.length);
            return await runLLM(
              prompt +
              "\nIMPORTANT: Use shorter output."
            );
          },
          1
        );

      parsed =
        cleanAndParseCourseJSON(retryResponse);
    }

    if (!parsed || !validateCourse(parsed)) {
      console.error(
        "Course validation failed. Redirecting to safe local fallback skeleton.",
      );
      return {
        title: `${topic} Course`,
        description: `Foundational guide for ${topic}.`,
        tags: [topic, level],
        modules: [
          {
            id: `module_${Date.now()}`,
            title: `Introduction to ${topic}`,
            summary: `Foundations of ${topic}.`,
            difficulty: 1,
            generated: false,
            completed: false,
            locked: false
          },
        ],
      };
    }

    return parsed;
  } catch (error) {
  console.error(
    "Course Generation Failure Pipeline Exception:",
    error
  );

  return {
    title: `${topic} Course`,
    description: `Foundational guide for ${topic}.`,
    tags: [topic, level],
    modules: [
      {
        id: `module_${Date.now()}`,
        title: `Introduction to ${topic}`,
        summary: `Foundations of ${topic}.`,
        difficulty: 1,
        generated: false,
        completed: false,
        locked: false,
      },
    ],
  };
}
}

