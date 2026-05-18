"use client";

import {
  getKnowledgeGraph,
  getNextConcept,
  updateConceptMastery,
  getReviewConcepts,
} from "./knowledgeGraph";
import { buildPromptFragments } from "./promptFragments";
import { compressContext } from "./contextMemory";
import { getUserProfile } from "./userMemory";
import { buildMemoryContext } from "./vectorMemory";

export interface LessonPlan {
  conceptTitle: string;
  conceptId: string;
  conceptDifficulty: number;
  shouldReview: boolean;
  compressedHistory: string;
  memoryContext: string;
  promptFragments: string;
  reviewText: string;
  course: any;
  profile: any;
}

/* =========================================================
   LESSON DIRECTOR
========================================================= */
export async function generateLessonPlan(params: {
  course: any;
  history?: any[];
}): Promise<LessonPlan> {
  const { course, history = [] } = params;
  const profile = await getUserProfile();

  /* KNOWLEDGE GRAPH VALIDATION */
  const graph = await getKnowledgeGraph(course.id);
  const nextConcept = graph ? getNextConcept(graph) : null;
  const reviewTargets = graph ? getReviewConcepts(graph) : [];

  /* CONCEPT RESOLUTION */
  const conceptTitle = nextConcept?.title || "Core Fundamentals";
  const conceptId = nextConcept?.id || "core_fundamentals";
  const conceptDifficulty = nextConcept?.difficulty || course.difficulty || 1;

  /* SLIDING WINDOW HISTORY COMPRESSION */
  const compressedHistory = compressContext(history, 400);

  /* VECTOR RAG EMBEDDING CONTEXT */
  const memoryContext = await buildMemoryContext({
    query: `\n${course.topic}\n${conceptTitle}\n${compressedHistory}\n`,
    tags: [course.topic, course.level],
    concepts: [conceptTitle],
    limit: 4,
  });

  /* REVIEW TARGET DETECTION */
  const shouldReview = reviewTargets.length >= 3;
  const reviewText = shouldReview
    ? `\nREVIEW TARGETS:\n${reviewTargets.slice(0, 3).map((r) => `${r.title} (${r.mastery})`).join(", ")}\n\nIMPORTANT:\nReinforce weak concepts naturally.\n`
    : "";

  /* COGNITIVE BLOCK FRAGMENTS */
  const promptFragments = buildPromptFragments({
    cognitive: profile?.cognitive,
    difficulty: conceptDifficulty,
    mastery: nextConcept?.mastery || 0,
    reinforcement: shouldReview,
  });

  return {
    conceptTitle,
    conceptId,
    conceptDifficulty,
    shouldReview,
    compressedHistory,
    memoryContext,
    promptFragments,
    reviewText,
    course,
    profile,
  };
}

/* =========================================================
   EXPLANATION PROMPT (THEORY FEED)
========================================================= */
export function buildExplanationPrompt(plan: LessonPlan): string {
  return `
You are an adaptive programming tutor working inside Code Ascension local PWA interface.

COURSE:
${plan.course.topic}
CURRENT CONCEPT:
${plan.conceptTitle}
USER LEVEL:
${plan.course.level}
DIFFICULTY:
${plan.conceptDifficulty}
LEARNING STYLE:
${plan.course?.stylePrompt || "Explain clearly and progressively"}

${plan.promptFragments}
${plan.reviewText}

RELEVANT MEMORY:
${plan.memoryContext || "No relevant memory."}

RECENT HISTORY:
${plan.compressedHistory}

TASK:
Generate ONLY the lesson explanation.

RULES:
- Avoid giant text walls. Break content into progressive atomic chunks.
- Focus on conceptual intuition first, then target specific syntax mechanics.
- CRITICAL: Use cyberpunk color scheme hex codes (e.g., #00ffcc for active neon ciano, #ff0055 for failure/deletions) for any code blocks UI mentions or terminal log mockups.

RETURN JSON:
{
  "title": "A short, engaging title for this concept",
  "explanation": "The core conceptual explanation (markdown supported)",
  "content": "Practical examples or code snippets to illustrate the concept"
}
`;
}

/* =========================================================
   EXERCISE PROMPT (WITH OPTIONAL SHARD CONDITIONAL)
========================================================= */
export function buildExercisePrompt({
  plan,
  explanation,
  index,
}: {
  plan: LessonPlan;
  explanation: any;
  index: number;
}): string {
  return `
You are generating ONE adaptive exercise for the active topic.

COURSE:
${plan.course.topic}
CONCEPT:
${plan.conceptTitle}
LESSON TITLE:
${explanation?.title}
LESSON EXPLANATION:
${explanation?.explanation}
DIFFICULTY:
${plan.conceptDifficulty}
LEARNING STYLE:
${plan.course?.stylePrompt || "Explain clearly"}

${plan.promptFragments}

RULES:
- Generate ONLY ONE exercise matching the requested schema.
- Type can be: "mcq" (Multiple Choice Question), "ordering" (Rearrange code blocks), or "code" (Write full snippet/function inside a non-sandbox code block).
- Avoid trick questions, focus purely on functional progression.

CRITICAL CONDITION FOR "expectedAnswer":
- IF "type" is "mcq" or "ordering": DO NOT include the "expectedAnswer" block in the JSON response under any circumstance.
- IF "type" is "code": You MUST strictly include the "expectedAnswer" shard object below. This metadata acts as a temporary blueprint file read by the Evaluator AI engine to check semantic intent, accepting syntax variations, alternative variable names, and code structures.

RETURN JSON SPECIFICATION:
{
  "id": "${crypto.randomUUID()}",
  "type": "mcq | code | ordering",
  "question": "Clear problem statement outlining goals and code constraints",
  "options": ["Option A", "Option B"], // Keep empty if type is "code"
  "answer": "Correct option index string for MCQ/Ordering, or mandatory assertion keyword for code",
  "explanation": "Pedagogical correction explanation formatted to user's style preference",
  
  // CONDITIONAL FIELD: Only include if type === "code"
  "expectedAnswer": {
    "codeTemplate": "Initial skeleton code function signature exposed in the editor view",
    "solutionExample": "The optimal target solution code snippet",
    "mandatoryTokens": ["function", "return"],
    "allowedVariations": [
      "Alternative variable naming or equivalent short arrow syntax expressions",
      "Inversion of conditional check logic blocks"
    ]
  }
}
`;
}

/* =========================================================
   GRAPH SUCCESS UPDATE
========================================================= */
export async function completeLessonPlan(plan: LessonPlan): Promise<void> {
  if (plan?.course?.id && plan?.conceptId) {
    await updateConceptMastery(plan.course.id, plan.conceptId, true);
  }
}
