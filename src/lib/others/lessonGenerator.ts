"use client";

import {
  serializeHistory,
  hardCap,
} from "./contextSerializer";

import {
  getKnowledgeGraph,
  getNextConcept,
  getReviewConcepts,
  getGraphStats,
} from "./knowledgeGraph";

import {
  getMemorySummary,
} from "./contextMemory";

import {
  buildConstraintPrompt,
} from "./conceptConstraints";

import { buildPromptFragments } from "./promptFragments";
import { compressContext } from "./contextMemory";
import { getUserProfile } from "./userMemory";
import { buildMemoryContext } from "./vectorMemory";

import { CognitiveProfile } from "@/types/core";

import { eventBus, EventType } from "./eventBus";

/* =========================================================
   TYPES
========================================================= */

export interface LessonPlan {
  module: any;
  moduleIndex: number;
  moduleDifficulty: number;

  conceptTitle: string;
  conceptId: string;
  conceptDifficulty: number;

  shouldReview: boolean;

  compressedHistory: string;

  memoryContext: string;

  promptFragments: string;

  reviewText: string;

  memorySummary: string;

  constraintPrompt: string;

  graphStats: any;

  course: any;

  profile: any;
}

/* =========================================================
   HELPERS
========================================================= */

function resolveActiveModule(course: any) {
  const modules = course?.modules || [];

  // primeiro módulo incompleto
  const active =
    modules.find((m: any) => !m.completed) ||
    modules[0];

  return active;
}

function resolveModuleIndex(
  course: any,
  moduleId: string
) {
  const index =
    course?.modules?.findIndex(
      (m: any) => m.id === moduleId
    );

  return index >= 0
    ? index
    : 0;
}

/* =========================================================
   GENERATE LESSON PLAN
========================================================= */

export async function generateLessonPlan(params: {
  course: any;
  history?: any[];
}): Promise<LessonPlan> {
  const { course, history = [] } = params;

  /* =====================================================
     USER PROFILE
  ===================================================== */

  const profile = await getUserProfile();

  /* =====================================================
     ACTIVE MODULE
  ===================================================== */

  const activeModule = resolveActiveModule(course);

  const moduleIndex = resolveModuleIndex(
    course,
    activeModule?.id,
  );

  const moduleDifficulty =
    activeModule?.difficulty ||
    course?.difficulty ||
    1;

  /* =====================================================
     KNOWLEDGE GRAPH
  ===================================================== */

  const graph = course?.id
    ? await getKnowledgeGraph(course.id)
    : null;

  const graphStats = graph
    ? getGraphStats(graph)
    : null;

  const memorySummary =
    await getMemorySummary(course.id);

  const nextConcept = graph
    ? getNextConcept(
      graph,
      activeModule?.id,
    )
    : null;

  const reviewTargets = graph
    ? getReviewConcepts(graph)
    : [];

  /* =====================================================
     CONCEPT STATE
  ===================================================== */

  const conceptTitle =
    nextConcept?.title ||
    activeModule?.title ||
    "Core Fundamentals";

  const constraintPrompt =
    buildConstraintPrompt(conceptTitle);

  const conceptId =
    nextConcept?.id ||
    activeModule?.id ||
    "core_fundamentals";

  const conceptDifficulty =
    nextConcept?.difficulty ||
    moduleDifficulty;

  /* =====================================================
     HISTORY COMPRESSION
  ===================================================== */

  const compressedHistory =
    compressContext(
      serializeHistory(history),
      400,
    );

  /* =====================================================
     MEMORY CONTEXT
  ===================================================== */

  const rawMemoryContext =
    await buildMemoryContext({
      query: `${course.topic}\n${conceptTitle}`,

      tags: [
        course.topic,
        course.level,
      ],

      concepts: [conceptTitle],

      limit: 3,
    });

  const memoryContext = hardCap(
    rawMemoryContext || "",
    1800,
  );

  /* =====================================================
     REVIEW ENGINE
  ===================================================== */

  const shouldReview =
    reviewTargets.length >= 3;

  const reviewText = shouldReview
    ? `
REVIEW TARGETS:
${reviewTargets
      .slice(0, 3)
      .map(
        (r) =>
          `${r.title} (${r.mastery})`,
      )
      .join(", ")}

IMPORTANT:
Reinforce weak concepts naturally.
`
    : "";

  /* =====================================================
     COGNITIVE FRAGMENTS
  ===================================================== */

  const promptFragments =
    buildPromptFragments({
      cognitive:
        (
          profile?.cognitive ||
          "Standard"
        ) as CognitiveProfile,

      difficulty:
        conceptDifficulty,

      mastery:
        nextConcept?.mastery || 0,

      reinforcement:
        shouldReview,
    });

  /* =====================================================
     FINAL PLAN
  ===================================================== */

  return {
    module: activeModule,
    moduleIndex,
    moduleDifficulty,
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
    memorySummary,
    constraintPrompt,
    graphStats,
  };
}

/* =========================================================
   EXPLANATION PROMPT
========================================================= */

export function buildExplanationPrompt(
  plan: LessonPlan
): string {

const userStyle =
  plan.course?.stylePrompt?.trim() ||
  "clear progressive teaching";

return `
You are Code Ascension adaptive tutor.

Generate ONE atomic lesson for ONE concept.

Your goal:
Teach the current concept efficiently.

Never generate:
- full courses
- future concepts
- multiple lessons
- huge tutorials
- unrelated information


COURSE:
${plan.course.topic}

MODULE:
${plan.module?.title}

MODULE SUMMARY:
${plan.module?.summary}

CURRENT CONCEPT:
${plan.conceptTitle}

DIFFICULTY:
${plan.conceptDifficulty}/5


USER PROFILE:
Level:
${plan.course?.level || "Beginner"}

Cognitive:
${plan.profile?.cognitive || "Standard"}


TEACHING STYLE:
${userStyle}


ADAPTIVE RULES:
${plan.promptFragments}


REVIEW:
${plan.reviewText || "No review required."}


MEMORY:
${plan.memoryContext || "None"}


RECENT HISTORY:
${plan.compressedHistory || "None"}


LESSON STRUCTURE:

1. Explain the idea intuitively.
2. Explain the important mechanics.
3. Show ONE practical example.


LIMITS:
- Keep explanation compact.
- Use short paragraphs.
- Avoid unnecessary theory.
- Focus only on current concept.


OUTPUT ONLY JSON:

{
"title": "short lesson title",
"explanation": "concept explanation",
"content": "one example or code snippet"
}


FINAL RULES:
- No markdown fences.
- No text outside JSON.
- Stop after final }.
`;
}
/* =========================================================
   EXERCISE PROMPT
========================================================= */

export function buildExercisePrompt({
  plan,
  explanation,
}: {
  plan: LessonPlan;
  explanation: any;
}) {

return `
You are generating ONE adaptive programming exercise.

Create an exercise only about the current concept.

COURSE:
${plan.course.topic}

CONCEPT:
${plan.conceptTitle}

LESSON:
${explanation?.title}


DIFFICULTY:
${plan.conceptDifficulty}/5


RULES:

- One exercise only.
- No future concepts.
- No trick questions.
- Prefer practical learning.


Exercise type:
Choose one:
mcq
code
ordering


OUTPUT ONLY JSON:

{
"id":"exercise_1",
"type":"mcq",
"question":"problem statement",
"options":["A","B","C","D"],
"answer":"correct answer",
"explanation":"short correction"
}


IF type is code:
add:
"expectedAnswer":"reference solution"


FINAL:
- No markdown.
- No explanations outside JSON.
- Stop after }.
`;
}
/* =========================================================
   COMPLETE LESSON PLAN
========================================================= */

export async function completeLessonPlan(
  plan: LessonPlan
): Promise<void> {
  if (
    plan?.course?.id &&
    plan?.conceptId
  ) {
    const traceId =
      eventBus.generateTraceId();

    eventBus.emit({
      type: EventType.EXERCISE_PASSED,

      source: "lessonGenerator.ts",

      traceId,

      payload: {
        xpEarned: 0,

        coinsEarned: 0,

        conceptId: plan.conceptId,

        moduleId: plan.module?.id,

        automatedSync: true,
      },
    });
  }
}
