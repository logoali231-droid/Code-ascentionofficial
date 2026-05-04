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

  const prompt = `
Explain a lesson.

USER LEVEL: ${user.level}
COGNITIVE PROFILE: ${course.cognitiveProfile}
STYLE: ${course.explanationStyle}

LESSONS:
${history.map((l: any) => l.title).join(", ")}

CURRENT:
${lesson.title}

WEAKNESSES:
${JSON.stringify(mem.weaknesses)}

RULES:
- Do not skip ahead
- Adapt to user
- Be detailed
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
${course.cognitiveProfile}

STYLE:
${course.explanationStyle}

TASK:
- Explain why it's wrong
- Fix the misunderstanding
- Be clear
`;

  return await generate(prompt);
}