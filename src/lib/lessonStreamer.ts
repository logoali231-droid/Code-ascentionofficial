// src/lib/lessonStreamer.ts

"use client";

import { generate } from "./webllm";

import { safeParse } from "./safeParse";

import {
  buildCognitiveFragment,
  buildDifficultyFragment,
  buildStyleFragment,
} from "./promptFragments";

import { buildMemoryContext } from "./vectorMemory";

import { getUserProfile } from "./userMemory";

/* =========================================================
   LESSON STREAMER
   CODE ASCENT

   PURPOSE:
   Generate lessons incrementally.

   OLD FLOW:
   giant prompt ->
   giant response ->
   freeze mobile

   NEW FLOW:
   explanation ->
   exercise ->
   next exercise

   BENEFITS:
   - lower VRAM spikes
   - faster first render
   - less WebLLM choking
   - smoother UX on M23/mobile
========================================================= */

export interface StreamedLesson {
  title: string;

  explanation: string;

  content: string;

  exercises: any[];
}

/* =========================================================
   GENERATE EXPLANATION FIRST
========================================================= */

export async function generateLessonCore({
  course,
  concept,
  difficulty,
  history = [],
}: any) {
  const profile =
    await getUserProfile();

  const cognitive =
    buildCognitiveFragment(
      profile?.cognitive
    );

  const style =
    buildStyleFragment(
      course?.stylePrompt
    );

  const difficultyRules =
    buildDifficultyFragment(
      difficulty
    );

  const memory =
    await buildMemoryContext({
      query: `
${course.topic}
${concept}
`,
      tags: [course.topic],
      concepts: [concept],
      limit: 3,
    });

  const prompt = `
You are generating the CORE of a programming lesson.

TOPIC:
${course.topic}

CONCEPT:
${concept}

LEVEL:
${course.level}

${style}

${cognitive}

${difficultyRules}

RELEVANT MEMORY:
${memory || "None"}

RULES:
- Generate ONLY explanation/content
- NO exercises
- Keep concise
- Mobile-friendly
- Avoid giant text walls
- Preserve progression continuity

RETURN JSON:

{
  "title": "",
  "explanation": "",
  "content": ""
}
`;

  const raw =
    await generate(prompt);

  const parsed =
    safeParse(raw);

  if (!parsed) {
    return {
      title: concept,
      explanation:
        "Review the core logic carefully.",
      content:
        "Practice the concept progressively.",
    };
  }

  return parsed;
}

/* =========================================================
   GENERATE SINGLE EXERCISE
========================================================= */

export async function generateExercise({
  lesson,
  course,
  concept,
  index = 0,
  difficulty = 1,
}: any) {
  const profile =
    await getUserProfile();

  const cognitive =
    buildCognitiveFragment(
      profile?.cognitive
    );

  const style =
    buildStyleFragment(
      course?.stylePrompt
    );

  const difficultyRules =
    buildDifficultyFragment(
      difficulty
    );

  const prompt = `
You are generating ONE exercise for a programming RPG lesson.

COURSE:
${course.topic}

CONCEPT:
${concept}

LESSON TITLE:
${lesson.title}

LESSON SUMMARY:
${lesson.explanation}

EXERCISE NUMBER:
${index + 1}

${style}

${cognitive}

${difficultyRules}

RULES:
- Generate ONLY ONE exercise
- Avoid repeating prior exercises
- Match lesson difficulty
- Prefer practical logic
- Keep concise
- Mobile-friendly
- No giant explanations

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

  const raw =
    await generate(prompt);

  const parsed =
    safeParse(raw);

  if (!parsed) {
    return {
      id: crypto.randomUUID(),

      type: "mcq",

      question:
        `What best describes ${concept}?`,

      options: [
        "A programming concept",
        "A browser",
        "A database",
        "A compiler",
      ],

      answer:
        "A programming concept",

      explanation:
        "This concept belongs to programming fundamentals.",
    };
  }

  return {
    ...parsed,

    id:
      parsed.id ||
      crypto.randomUUID(),
  };
}

/* =========================================================
   FULL STREAMED LESSON
========================================================= */

export async function streamLesson({
  course,
  concept,
  difficulty = 1,
  exerciseCount = 3,
  onExercise,
}: {
  course: any;

  concept: string;

  difficulty?: number;

  exerciseCount?: number;

  onExercise?: (
    exercise: any,
    index: number
  ) => void;
}) {
  /* -----------------------------------------
     STEP 1:
     Generate lesson core
  ----------------------------------------- */

  const lesson =
    await generateLessonCore({
      course,
      concept,
      difficulty,
    });

  const exercises: any[] = [];

  /* -----------------------------------------
     STEP 2:
     Generate exercises progressively
  ----------------------------------------- */

  for (
    let i = 0;
    i < exerciseCount;
    i++
  ) {
    const exercise =
      await generateExercise({
        lesson,
        course,
        concept,
        index: i,
        difficulty,
      });

    exercises.push(exercise);

    /* -------------------------------------
       LIVE CALLBACK
       allows UI progressive rendering
    ------------------------------------- */

    if (onExercise) {
      onExercise(exercise, i);
    }

    /* -------------------------------------
       tiny cooldown
       helps mobile thermals
    ------------------------------------- */

    await sleep(80);
  }

  return {
    ...lesson,
    exercises,
  } as StreamedLesson;
}

/* =========================================================
   MOBILE SAFE SLEEP
========================================================= */

function sleep(ms: number) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}