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
  // 🔥 user prompt continua soberano
  const userStyle =
    plan.course?.stylePrompt?.trim() ||
    "Explain clearly and progressively";

  return `
You are an adaptive programming tutor operating inside the Code Ascension procedural learning runtime.

Your role:
Generate ONE atomic adaptive lesson for the current concept.

DO NOT generate:
- entire modules
- future concepts
- giant tutorials
- multiple lessons
- giant markdown articles

================================
COURSE
================================
${plan.course.topic}

================================
CURRENT MODULE
================================
TITLE:
${plan.module?.title}

SUMMARY:
${plan.module?.summary}

MODULE DIFFICULTY:
${plan.moduleDifficulty}

================================
CURRENT CONCEPT
================================
${plan.conceptTitle}

CONCEPT DIFFICULTY:
${plan.conceptDifficulty}

================================
KNOWLEDGE GRAPH STATUS
================================
TOTAL NODES:
${plan.graphStats?.totalNodes || 0}

COMPLETED:
${plan.graphStats?.completed || 0}

UNLOCKED:
${plan.graphStats?.unlocked || 0}

AVERAGE MASTERY:
${plan.graphStats?.avgMastery || 0}

================================
USER PROFILE
================================
COGNITIVE PROFILE:
${plan.profile?.cognitive || "Standard"}

USER LEVEL:
${plan.course?.level || "Beginner"}

================================
USER TEACHING STYLE
================================
${userStyle}

IMPORTANT:
The user's custom teaching style has priority.
Adapt structure and pacing around it.
Do not override the requested teaching style.

================================
COGNITIVE FRAGMENTS
================================
${plan.promptFragments}

================================
REVIEW CONTEXT
================================
${plan.reviewText}

================================
MEMORY CONTEXT
================================
${plan.memoryContext || "No relevant memory."}

================================
LONG TERM LEARNING SUMMARY
================================
${plan.memorySummary || "No summary."}

================================
CONCEPT STABILITY
================================
${plan.constraintPrompt || ""}
================================
RECENT HISTORY
================================
${plan.compressedHistory}

================================
LESSON RULES
================================
- Generate ONLY ONE lesson.
- Keep progression atomic.
- Focus on conceptual intuition first.
- Then explain syntax mechanics.
- Then provide one practical example.

- Avoid giant text walls.
- Break information into small chunks.
- Use progressive pacing.
- Avoid discussing future modules.

- Respect the user's cognitive profile.
- Respect the user's requested teaching style.

================================
OUTPUT RULES
================================
- Output ONLY JSON.
- No markdown fences.
- No explanations outside JSON.

================================
RETURN JSON
================================
{
  "title": "Short engaging concept title",

  "explanation": "Compact adaptive conceptual explanation with markdown support",

  "content": "One practical example or code snippet"
}

================================
FINAL HARD RULES
================================
- Stop generation immediately after final JSON brace.
- Never generate multiple lessons.
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
}): string {
  const userStyle =
    plan.course?.stylePrompt?.trim() ||
    "Explain clearly";

  return `
You are generating ONE adaptive exercise for the current concept.

================================
COURSE
================================
${plan.course.topic}

================================
MODULE
================================
${plan.module?.title}

================================
CURRENT CONCEPT
================================
${plan.conceptTitle}

================================
LESSON TITLE
================================
${explanation?.title}

================================
LESSON EXPLANATION
================================
${explanation?.explanation}

================================
DIFFICULTY
================================
${plan.conceptDifficulty}

================================
USER STYLE
================================
${userStyle}

================================
COGNITIVE FRAGMENTS
================================
${plan.promptFragments}

================================
EXERCISE RULES
================================
- Generate ONLY ONE exercise.
- Exercise must target ONLY the current concept.
- Do not reference future concepts.
- Do not reference future modules.
- Avoid trick questions.
- Focus on functional progression.

Exercise types:
- "mcq"
- "ordering"
- "code"

================================
EXPECTED ANSWER RULES
================================
- IF type is "mcq" or "ordering":
  DO NOT include expectedAnswer.

- IF type is "code":
  You MUST include expectedAnswer.

================================
OUTPUT RULES
================================
- Output ONLY JSON.
- No markdown fences.
- No explanations outside JSON.

================================
RETURN JSON
================================
{
  "id": "${crypto.randomUUID()}",

  "type": "mcq | code | ordering",

  "question": "Clear problem statement",

  "options": ["Option A", "Option B"],

  "answer": "Correct answer",

  "explanation": "Compact pedagogical correction",

  "expectedAnswer": {
    "codeTemplate": "Starter code",

    "solutionExample": "Reference implementation",

    "mandatoryTokens": [
      "function",
      "return"
    ],

    "allowedVariations": [
      "Alternative naming",
      "Equivalent syntax"
    ]
  }
}

================================
FINAL HARD RULES
================================
- Stop generation immediately after final JSON brace.
- Never generate multiple exercises.
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