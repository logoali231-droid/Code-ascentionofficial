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

import {
  buildMemoryContext,
} from "./vectorMemory";

/* =========================================================
   TYPES
========================================================= */

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

export async function generateLessonPlan(
  params: any
): Promise<LessonPlan> {
  const {
    course,
    history = [],
  } = params;

  const profile =
    await getUserProfile();

  /* =====================================================
     KNOWLEDGE GRAPH
  ===================================================== */

  const graph =
    await getKnowledgeGraph(
      course.id
    );

  const nextConcept =
    graph
      ? getNextConcept(graph)
      : null;

  const reviewTargets =
    graph
      ? getReviewConcepts(graph)
      : [];

  /* =====================================================
     CONCEPT
  ===================================================== */

  const conceptTitle =
    nextConcept?.title ||
    "Core Fundamentals";

  const conceptId =
    nextConcept?.id ||
    "core_fundamentals";

  const conceptDifficulty =
    nextConcept?.difficulty ||
    course.difficulty ||
    1;

  /* =====================================================
     HISTORY
  ===================================================== */

  const compressedHistory = compressContext(history, 1536);

  /* =====================================================
     MEMORY CONTEXT
  ===================================================== */

  const memoryContext =
    await buildMemoryContext({
      query: `
${course.topic}
${conceptTitle}
${compressedHistory}
`,

      tags: [
        course.topic,
        course.level,
      ],

      concepts: [
        conceptTitle,
      ],

      limit: 4,
    });

  /* =====================================================
     REVIEW
  ===================================================== */

  const shouldReview =
    reviewTargets.length >= 3;

  const reviewText =
    shouldReview
      ? `
REVIEW TARGETS:
${reviewTargets
  .slice(0, 3)
  .map(
    (r) =>
      `${r.title} (${r.mastery})`
  )
  .join(", ")}

IMPORTANT:
Reinforce weak concepts naturally.
`
      : "";

  /* =====================================================
     PROMPT FRAGMENTS
  ===================================================== */

  const promptFragments =
    buildPromptFragments({
      cognitive:
        profile?.cognitive,

      difficulty:
        conceptDifficulty,

      mastery:
        nextConcept?.mastery || 0,

      reinforcement:
        shouldReview,
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
   EXPLANATION PROMPT
========================================================= */

export function buildExplanationPrompt(
  plan: LessonPlan
) {
  // Nota: O uso de "use client" deve ser verificado se este arquivo 
  // importar hooks do React, conforme diretrizes do projeto.
  
  return `
You are an adaptive programming tutor.

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
- Avoid giant text walls
- Keep pacing adaptive
- Focus on intuition first
- Then mechanics
- Use practical examples
- Respect cognitive profile
- Respect learning style
- Keep continuity with previous lessons
- IMPORTANT: Use cyberpunk color scheme (hex codes) for any UI mentions or examples.

RETURN JSON:

{
  "title": "A short, engaging title for this concept",
  "explanation": "The core conceptual explanation (markdown supported)",
  "content": "Practical examples or code snippets to illustrate the concept"
}
`;
}

/* =========================================================
   EXERCISE PROMPT
========================================================= */

export function buildExercisePrompt({
  plan,
  explanation,
  index,
}: {
  plan: LessonPlan;

  explanation: any;

  index: number;
}) {
  return `
You are generating ONE adaptive exercise.

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
- Generate ONLY ONE exercise
- Match the lesson difficulty
- Avoid repetition
- Avoid trick questions
- Keep coherent progression
- Practical coding focus
- Respect cognitive profile

RETURN JSON:

{
  "id": "",
  "type": "mcq | code | ordering",
  "question": "",
  "options": [],
  "answer": "",
  "explanation": ""
}
`;
}

/* =========================================================
   GRAPH SUCCESS UPDATE
========================================================= */

export async function completeLessonPlan(
  plan: LessonPlan
) {
  if (
    plan?.course?.id &&
    plan?.conceptId
  ) {
    await updateConceptMastery(
      plan.course.id,
      plan.conceptId,
      true
    );
  }
}