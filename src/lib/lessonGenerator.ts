"use client";

import { generate } from "@/lib/webllm";

import {
  buildPromptFragments,
  compressContext,
} from "@/lib/promptFragments";

import {
  getCurriculumState,
  getWeakTopics,
} from "@/lib/curriculumState";

import { getUser } from "@/lib/db";

import { safeParse } from "@/lib/safeParse";

/* =========================
   GENERATE LESSON
========================= */

export async function generateLesson({
  courseId,
  topic,
  previousLessons = [],
  reinforcement = false,
}: {
  courseId: string;

  topic: string;

  previousLessons?: any[];

  reinforcement?: boolean;
}) {
  const user = await getUser();

  const curriculum =
    await getCurriculumState(courseId);

  const weakTopics =
    await getWeakTopics(courseId);

  const currentTopic =
    curriculum.map[
      topic.toLowerCase()
    ];

  const mastery =
    currentTopic?.mastery || 0;

  const difficulty =
    currentTopic?.difficulty || 1;

  const compressedHistory =
    compressContext(
      JSON.stringify(
        previousLessons.slice(-3)
      ),
      1500
    );

  const weakSummary =
    weakTopics
      .slice(0, 5)
      .map(
        (t) =>
          `${t.topic} (${t.mastery})`
      )
      .join(", ");

  const systemFragments =
    buildPromptFragments({
      cognitive: user?.cognitive,
      difficulty,
      mastery,
      reinforcement,
    });

  const prompt = `
${systemFragments}

COURSE ID:
${courseId}

CURRENT TOPIC:
${topic}

CURRENT MASTERY:
${mastery}/100

CURRENT DIFFICULTY:
${difficulty}/5

WEAK TOPICS:
${weakSummary || "none"}

PREVIOUS LESSON CONTEXT:
${compressedHistory}

Generate ONE procedural lesson.

The lesson must:
- feel connected to previous lessons
- maintain continuity
- avoid repetition
- adapt to mastery
- adapt to cognitive profile
- include practical intuition
- include progressively harder exercises

Output STRICT JSON:

{
  "title": "",
  "explanation": "",
  "content": "",
  "exercises": [
    {
      "id": "",
      "type": "mcq",
      "question": "",
      "options": [],
      "answer": "",
      "explanation": ""
    }
  ]
}
`;

  const raw = await generate(prompt);

  const parsed = safeParse(raw);

  if (!parsed) {
    return fallbackLesson(topic);
  }

  return {
    id:
      "lesson_" +
      Date.now(),

    title:
      parsed.title ||
      `Lesson about ${topic}`,

    explanation:
      parsed.explanation ||
      "No explanation generated.",

    content:
      parsed.content || "",

    exercises:
      parsed.exercises || [],

    completed: false,
  };
}

/* =========================
   FALLBACK
========================= */

function fallbackLesson(
  topic: string
) {
  return {
    id:
      "fallback_" +
      Date.now(),

    title:
      `Introduction to ${topic}`,

    explanation:
      `Basic explanation about ${topic}.`,

    content:
      `Generated fallback lesson for ${topic}.`,

    exercises: [
      {
        id: "fallback_ex",

        type: "mcq",

        question:
          `What best describes ${topic}?`,

        options: [
          "Concept",
          "Tool",
          "Language",
          "Framework",
        ],

        answer: "Concept",

        explanation:
          "Fallback explanation.",
      },
    ],

    completed: false,
  };
}