"use client";

import { generate } from "./webllm";
import { safeParse } from "./safeParse";
import { buildPromptFragments } from "./promptFragments";
import { buildMemoryContext } from "./vectorMemory";
import { getUserProfile } from "./userMemory";
import { runtimeQueue } from "./generationQueue";
import { save } from "./db"; // Adicionado para persistência fragmentada

import {
  buildDynamicConstraint,
  registerConstraint,
  buildConstraintPrompt,
} from "./conceptConstraints";

import { validateLesson } from "./lessonValidator";

export interface StreamedLesson {
  title: string;
  explanation: string;
  content: string;
  exercises: any[];
}

/* =========================================================
   FALLBACK LESSON
========================================================= */
function buildFallbackLesson(concept: string) {
  return {
    title: concept,
    explanation: "Review the core logic carefully.",
    content: "Practice the concept progressively.",
  };
}

/* =========================================================
   FALLBACK EXERCISE
========================================================= */
function buildFallbackExercise(concept: string) {
  return {
    id: crypto.randomUUID(),
    type: "mcq",
    question: `What best describes ${concept}?`,
    options: ["A programming concept", "A browser", "A database", "A compiler"],
    answer: "A programming concept",
    explanation: "This concept belongs to programming fundamentals.",
  };
}

/* =========================================================
   GENERATE EXPLANATION FIRST
========================================================= */
export async function generateLessonCore({ course, concept, difficulty }: any) {
  const profile = await getUserProfile();

  const promptFragments = buildPromptFragments({
    cognitive: profile?.cognitive,
    difficulty,
    mastery: 50,
    reinforcement: false,
  });

  const memory = await buildMemoryContext({
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

LEARNING STYLE:
${course?.stylePrompt || "Explain clearly and progressively"}

${promptFragments}

${buildConstraintPrompt(concept)}

RELEVANT MEMORY:
${memory || "None"}

RULES:
- Generate ONLY explanation/content
- NO exercises
- Keep concise
- Mobile-friendly
- Avoid giant text walls
- Preserve progression continuity
- Be detailed but concise
- Maintain conceptual correctness
- Adapt naturally to learner level

RETURN JSON:

{
  "title": "",
  "explanation": "",
  "content": ""
}
`;

  try {
    const rawRes = await runtimeQueue.enqueue(
      async (_signal) => {
        return generate(prompt);
      },
      1,
    );

    let raw = "";
    if (rawRes) {
      if (typeof rawRes === "string") {
        raw = rawRes;
      } else {
        for await (const chunk of rawRes) {
          const content =
            typeof chunk === "string"
              ? chunk
              : (chunk as any).choices?.[0]?.delta?.content || "";
          raw += content;
        }
      }
    }

    const parsed = safeParse(raw);

    if (!parsed) {
      return buildFallbackLesson(concept);
    }

    if (!validateLesson(parsed)) {
      return buildFallbackLesson(concept);
    }

    const constraint = buildDynamicConstraint(
      course.topic,
      concept,
      parsed.explanation || "",
    );

    registerConstraint(constraint);

    return parsed;
  } catch (error) {
    console.warn("Exercise generation failed", error);
    throw new Error("AI generation failed");
  }
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
  const profile = await getUserProfile();

  const promptFragments = buildPromptFragments({
    cognitive: profile?.cognitive,
    difficulty,
    mastery: 50,
    reinforcement: false,
  });

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

LEARNING STYLE:
${course?.stylePrompt || "Explain clearly"}

${promptFragments}

${buildConstraintPrompt(concept)}

RULES:
- Generate ONLY ONE exercise
- Avoid repeating prior exercises
- Match lesson difficulty
- Prefer practical logic
- Keep concise
- Mobile-friendly
- No giant explanations
- Preserve conceptual consistency

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

  try {
    const rawRes = await runtimeQueue.enqueue(
      async (_signal) => {
        return generate(prompt);
      },
      1,
    );

    let raw = "";
    if (rawRes) {
      if (typeof rawRes === "string") {
        raw = rawRes;
      } else {
        for await (const chunk of rawRes) {
          const content =
            typeof chunk === "string"
              ? chunk
              : (chunk as any).choices?.[0]?.delta?.content || "";
          raw += content;
        }
      }
    }

    const parsed = safeParse(raw);

    if (!parsed) {
      return buildFallbackExercise(concept);
    }

    return {
      ...parsed,
      id: parsed.id || crypto.randomUUID(),
    };
  } catch (error) {
    console.warn("Exercise generation failed", error);
    return buildFallbackExercise(concept);
  }
}

/* =========================================================
   FULL STREAMED LESSON (ADAPTADO COM SALVAMENTO FRAGMENTADO)
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
  onExercise?: (exercise: any, index: number) => void;
}) {
  /* -----------------------------------------
     STEP 1: Generate lesson core
  ----------------------------------------- */
  const lesson = await generateLessonCore({
    course,
    concept,
    difficulty,
  });

  const exercises: any[] = [];

  /* -----------------------------------------
     STEP 2: Generate exercises progressively
  ----------------------------------------- */
  for (let i = 0; i < exerciseCount; i++) {
    const exercise = await generateExercise({
      lesson,
      course,
      concept,
      index: i,
      difficulty,
    });

    exercises.push(exercise);

    if (onExercise) {
      onExercise(exercise, i);
    }

    await sleep(80);
  }

  const finalLessonData: StreamedLesson = {
    ...lesson,
    exercises,
  };

  /* -----------------------------------------
     CORREÇÃO DE PERSISTÊNCIA RELACIONAL
  ----------------------------------------- */
  // 1. Salva a lição de forma independente na tabela de lições, ligada por courseId
  const lessonRecordId = `lesson_${course.id}_${Date.now()}`;
  await save("lessons", {
    courseId: course.id,
    content: finalLessonData,
  }, lessonRecordId);

  // 2. Atualiza apenas os metadados rasos do curso atual, sem carregar arrays de lições
  await save("courses", {
    ...course,
    currentLesson: (course.currentLesson || 0) + 1
  }, course.id);

  return finalLessonData;
}

/* =========================================================
   MOBILE SAFE SLEEP
========================================================= */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
