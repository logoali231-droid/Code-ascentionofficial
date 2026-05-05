"use client";

import { generate } from "./webllm";
import { getMemory } from "./userMemory";

// 🔹 EXPLANATION NORMAL
export async function generateExplanationAI({
  lesson,
  history,
  user,
  course,
}: any) {
  const mem = await getMemory();

  const userErrors = mem.lastErrors || [];

  const recentLessons =
    history?.map((l: any) => l.title).join(", ") || "none";

  const weaknesses = Object.entries(mem.weaknesses || {})
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k)
    .join(", ");

  const prompt = `
User Level: ${user.level}
Explanation Style: ${user.explanationType}
User Cognitive Profile: ${user.cognitive || "standard"}

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

// 🔹 ERROR EXPLAIN (🔥 faltava isso)
export async function explainError({
  question,
  correct,
  userAnswer,
  userExplanation,
  user,
  course,
}: any) {
  const mem = await getMemory();

  const relatedWeakness =
    Object.entries(mem.weaknesses || {})
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
${user.level}

PROFILE:
${course?.cognitiveProfile}

STYLE:
${course?.explanationStyle}

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