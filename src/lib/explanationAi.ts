"use client";

import { generate } from "@/lib/webllm";

export async function generateExplanationAI({
  lesson,
  history,
  user,
  course,
}: any) {
  const prompt = `
You are an adaptive teaching AI.

User level: ${user?.level || "unknown"}
Cognitive profile: ${course?.cognitiveProfile || "standard"}
Explanation style (user-defined): ${course?.explanationStyle || "normal"}
Difficulty: ${course?.difficulty || "medium"}

Topic: ${course?.topic}

CURRENT LESSON:
${JSON.stringify(lesson)}

PREVIOUS LESSONS:
${history.map((l: any) => l.title || "lesson").join(", ")}

RULES:
- Explain ONLY up to current lesson
- NEVER introduce future concepts
- Adapt explanation to user style
- If ADHD_Focus → shorter chunks
- If Deep_Dive → deeper explanation
- If Visual_Logic → structured explanation
- Always give examples
- No fluff

If base material exists, use it strictly:
${course?.baseMaterial || "None"}

Return full explanation text.
`;

  return await generate(prompt);
}

export async function explainError({
  question,
  correct,
  userAnswer,
  userExplanation,
  user,
  course,
}: any) {
  const prompt = `
You are an AI tutor fixing a student's mistake.

User level: ${user?.level}
Cognitive profile: ${course?.cognitiveProfile}
Explanation style: ${course?.explanationStyle}

QUESTION:
${question}

CORRECT ANSWER:
${correct}

USER ANSWER:
${userAnswer}

USER THOUGHT:
${userExplanation || "Unknown"}

TASK:
- Explain why the user was wrong
- Be clear and adaptive
- Use examples
- Fix misunderstanding step by step
- Match explanation style

Do NOT just give the answer.
Teach.
`;

  return await generate(prompt);
}