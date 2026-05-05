"use client";

import { generate } from "./webllm";
import { getUserProfile } from "./userMemory";
import { getMemory } from "./userMemory";

// 🔹 EXPLANATION NORMAL
export async function generateExplanationAI({
  lesson,
  history,
  course,
}: any) {
  const profile = await getUserProfile();
  const memory = await getMemory();

  const userErrors = memory.lastErrors || [];

  const recentLessons =
    history?.map((l: any) => l.title).join(", ") || "none";

  const weaknesses = Object.entries(memory.weaknesses || {})
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k)
    .join(", ");

  const prompt = `
User Level: ${profile.level}
Explanation Style: ${profile.explanationType}
User Cognitive Profile: ${profile.cognitive}

Course Context:
- Mode: ${course?.mode || "standard"}
- Difficulty: ${course?.difficulty || "auto"}
- Cognitive Target: ${course?.cognitiveProfile || "adaptive"}

Current Lesson:
${lesson.title}

Recent Lessons:
${recentLessons}

User Weaknesses:
${weaknesses || "none"}

Recent mistakes:
${JSON.stringify(userErrors.slice(0, 3))}

Rules:
- If level low → simple, short
- If TDAH → concise, structured
- If advanced → deeper explanation
- Focus on user's weaknesses
- Connect with recent lessons
- Avoid unnecessary verbosity
`;

  return await generate(prompt);
}

// 🔹 ERROR EXPLAIN
export async function explainError({
  question,
  correct,
  userAnswer,
  userExplanation,
  course,
}: any) {
  const profile = await getUserProfile();
  const memory = await getMemory();

  const relatedWeakness =
    Object.entries(memory.weaknesses || {})
      .sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || "unknown";

  const prompt = `
User made a mistake.

QUESTION:
${question}

USER ANSWER:
${userAnswer}

CORRECT:
${correct}

USER THOUGHT:
${userExplanation}

USER LEVEL:
${profile.level}

PROFILE:
${profile.cognitive}

STYLE:
${profile.explanationType}

LIKELY WEAK AREA:
${relatedWeakness}

TASK:
- Explain why it's wrong
- Fix the misunderstanding
- Connect to user's weak area
- Be clear and adaptive
`;

  return await generate(prompt);
}