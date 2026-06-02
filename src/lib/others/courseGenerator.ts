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

  // O Governor agora encapsula a checagem e retorna o contrato de recursos

  // Opcional: Pegue as restrições pedagógicas baseadas no dispositivo

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
================================
USER ADAPTIVE PROFILE (MIND PALACE)
================================
STRENGTHS: ${userAnalysis.strengths.join(", ") || "None yet"}
WEAKNESSES: ${userAnalysis.weaknesses.join(", ") || "None yet"}
PEDAGOGICAL_REVIEW_TARGETS:
${graphReviewText}

GRAPH_PROGRESS:
Completed: ${graphStats.completed}
Unlocked: ${graphStats.unlocked}
Average Mastery: ${graphStats.avgMastery}
HISTORICAL_VECTOR_MEMORIES:
${vectorMemoryContext || "No previous historical memory found for this context."}

INSTRUCTION: 
1. If the user has weaknesses or review targets, prioritize starting or embedding tasks within the course structure to reinforce those specific concepts naturally.
2. If they master a topic (Strength), skip basic definitions in those sub-areas and move to complex implementation.
3. Incorporate advice or pacing references from the historical vector memories to maintain learning continuity.
`;

  const prompt = `
You are an elite adaptive curriculum architect operating inside the Code Ascension procedural learning system.

Your role:
Design a lightweight, progressive, cognitively adaptive course roadmap optimized for local on-device AI generation.

Your mission:
Generate ONLY the high-level curriculum structure.

DO NOT generate:
- lessons
- explanations
- exercises
- quizzes
- markdown tutorials
- giant text blocks
- implementation details
- nested learning trees

Generate ONLY:
- module progression
- conceptual dependency order
- adaptive difficulty scaling
- roadmap sequencing

${cognitiveFragments}
${adaptiveContext}

================================
USER PROFILE
================================
COGNITIVE_PROFILE:
${cognitive || "Standard"}

USER_LEVEL:
${level}

TARGET_DIFFICULTY:
${difficulty}/5

================================
COURSE CONFIG
================================
TOPIC:
${topic}

STYLE:
${style || "adaptive"}

================================
TEACHING STYLE
================================
${stylePrompt || "Explain clearly and progressively"}

================================
BASE MATERIAL
================================
${compressedMaterial || "none"}

================================
ADAPTIVE PEDAGOGICAL RULES
================================

GENERAL:
- Build a coherent learning progression.
- Respect prerequisite ordering strictly.
- Earlier modules must establish mental models first.
- Mid modules must introduce composition and abstraction.
- Late modules must focus on architecture, debugging, optimization, scaling, and real-world edge cases.

COGNITIVE ADAPTATION:
- ADHD / tdah profile:
  * smaller conceptual jumps
  * lower reading density
  * shorter progression loops
  * fast reward cadence
  * visual segmentation

- Deep_Dive profile:
  * lower-level internals
  * runtime mechanics
  * architecture reasoning
  * systems engineering depth
  * optimization-focused progression

- Visual_Logic profile:
  * dependency-oriented sequencing
  * conceptual grouping
  * architecture mapping
  * structural progression emphasis

USER EXPERTISE ADAPTATION:
- Beginner users:
  * prioritize foundations
  * avoid abstraction too early
  * focus on practical intuition

- Intermediate users:
  * reduce repetitive fundamentals
  * introduce composition patterns faster
  * increase implementation complexity

- Advanced users:
  * skip beginner explanations
  * prioritize systems thinking
  * focus on architecture, optimization, concurrency, debugging, scaling, and edge cases

================================
MODULE GENERATION RULES
================================
- Generate between 4 and 8 modules maximum.
- NEVER generate more than 8 modules.
- Modules must remain lightweight for mobile devices.
- Each module represents ONE major conceptual phase.
- Modules must increase difficulty progressively.
- Modules must remain flat and compact.

NEVER generate:
- nested lessons
- lesson arrays
- submodules
- giant summaries
- deep explanation text

================================
DIFFICULTY SCALING
================================
Difficulty progression model:

1 → foundations
2 → controlled application
3 → abstraction and composition
4 → architecture and systems thinking
5 → optimization, scaling, edge cases

================================
SUMMARY RULES
================================
- Keep summaries under 20 words.
- Use compact wording.
- Avoid verbose descriptions.

================================
OUTPUT FORMAT
================================
Return ONLY valid compact JSON.

{
  "title": "Course primary title",

  "description": "High-level adaptive roadmap overview",

  "tags": ["topic", "level"],

  "modules": [
    {
      "id": "module_1",

      "title": "Core Fundamentals",

      "summary": "Foundational concepts and mental models",

      "difficulty": 1,

      "generated": false,

      "completed": false,

      "locked": false
    }
  ]
}

================================
FINAL HARD RULES
================================
- Output ONLY JSON.
- Do not include markdown fences.
- Do not explain your reasoning.
- Stop generation immediately after the final JSON closing brace.
- Entire response must fit comfortably inside 300 tokens.
- If space becomes limited, shorten descriptions.
- Never leave JSON unfinished.
- Prioritize structural completion over detail.
`;

  try {
    const rawRes = await runtimeQueue.enqueue(
      async (_signal) => {
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
    await runLLM(
      prompt +
      "\nIMPORTANT: Use shorter output."
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
    console.error("Course Generation Failure Pipeline Exception:", error);
    return null;
  }
}

