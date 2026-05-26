"use client";

import { buildMemoryContext } from "./vectorMemory";
import { getKnowledgeGraph, getReviewConcepts } from "./knowledgeGraph";
import { cleanAndParseCourseJSON } from "./safeParse";
import { buildPromptFragments, compressContext } from "./promptFragments";
import { runtimeQueue } from "./generationQueue";
import { validateCourse } from "./courseValidator";
import { getUserStrengthsAndWeaknesses } from "./userMemory";
import { CognitiveProfile } from "@/types/core";
import { runLLM } from "../llm/llmExecutor";



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
  const cognitiveFragments = buildPromptFragments({
    cognitive: (cognitive || "Standard") as CognitiveProfile,
    difficulty: difficulty || 1,
    mastery: 50,
    reinforcement: false,
  });

  const compressedMaterial = baseMaterial
    ? compressContext(baseMaterial, 5000)
    : "";
  const userAnalysis = await getUserStrengthsAndWeaknesses();

  /* 1. KNOWLEDGE GRAPH PEDAGOGICAL HISTORY */
  let graphReviewText = "None yet";
  try {
    const graph = await getKnowledgeGraph(courseId || topic.toLowerCase());
    if (graph) {
      const reviewTargets = getReviewConcepts(graph);
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
PEDAGOGICAL_REVIEW_TARGETS: ${graphReviewText}
HISTORICAL_VECTOR_MEMORIES:
${vectorMemoryContext || "No previous historical memory found for this context."}

INSTRUCTION: 
1. If the user has weaknesses or review targets, prioritize starting or embedding tasks within the course structure to reinforce those specific concepts naturally.
2. If they master a topic (Strength), skip basic definitions in those sub-areas and move to complex implementation.
3. Incorporate advice or pacing references from the historical vector memories to maintain learning continuity.
`;

  const prompt = `
You are an elite curriculum architect.
Your mission: create a coherent, progressive, adaptive programming course structure.

${cognitiveFragments}
${adaptiveContext}

================================
COURSE CONFIG
================================
TOPIC: ${topic}
STYLE: ${style}
LEVEL: ${level}
DIFFICULTY: ${difficulty}/5

================================
TEACHING STYLE
================================
${stylePrompt || "Explain clearly and simply"}

================================
BASE MATERIAL
================================
${compressedMaterial || "none"}

================================
COURSE RULES
================================
- Scale complexity gradually across the timeline.
- ADHD / tdah profile: shorter modules, clearer visual segmentation chunks.
- Deep_Dive profile: deeper engineering theory and internal mechanics.
- Visual_Logic profile: intense pattern architecture, diagrams, and functional analogies.

================================
OUTPUT FORMAT
================================
Return ONLY valid JSON.
{
  "title": "Course primary title",
  "description": "Adaptive course syllabus overview mapping out modules",
  "tags": ["topic", "level"],
  "lessons": [
    { "title": "Module Lesson Title", "summary": "Granular lesson overview mapping dependencies", "difficulty": 1 }
  ]
}
`;

  try {
    const rawRes = await runLLM(prompt);

    const fullResponse = rawRes;

    const parsed = cleanAndParseCourseJSON(fullResponse);

    if (!parsed || !validateCourse(parsed)) {
      console.error(
        "Course validation failed. Redirecting to safe local fallback skeleton.",
      );
      return {
        title: `${topic} Course`,
        description: `Foundational guide for ${topic}.`,
        tags: [topic, level],
        lessons: [
          {
            title: `Introduction to ${topic}`,
            summary: `Foundations of ${topic}.`,
            difficulty: 1,
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
