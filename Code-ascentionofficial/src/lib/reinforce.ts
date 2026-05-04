"use client";

import { generate } from "./webllm";

export async function generateReinforcement(error: any, course: any) {
  const prompt = `
Create a new exercise based on a mistake.

QUESTION:
${error.question}

USER WRONG ANSWER:
${error.userAnswer}

CORRECT ANSWER:
${error.correct}

PROFILE:
${course.cognitiveProfile}

STYLE:
${course.explanationStyle}

RULES:
- Focus on the mistake
- Slightly increase difficulty
- Generate ONE exercise
- Return JSON
`;

  const res = await generate(prompt);
  return JSON.parse(res);
}