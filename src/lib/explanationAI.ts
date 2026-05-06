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
You are an adaptive programming tutor.

You MUST strictly follow the user's learning style.

LEARNING STYLE:
${course?.stylePrompt || "Explain clearly"}

USER LEVEL:
${profile.level}

LESSON:
${lesson.title}

CONTENT:
${lesson.explanation}

HISTORY:
${JSON.stringify(history)}

WEAKNESSES:
${JSON.stringify(memory.weaknesses)}

RECENT ERRORS:
${JSON.stringify(memory.lastErrors.slice(-5))}
RULES:
- Follow LEARNING STYLE strictly
- Adapt explanation tone, depth, and examples
- Avoid hallucination
- beginner → simple language, no jargon
- intermediate → moderate detail
- advanced → precise, technical
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

LEARNING STYLE:
${course?.stylePrompt || "Explain clearly"}

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