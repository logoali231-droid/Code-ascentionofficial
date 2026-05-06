"use client";

import { generate } from "./webllm";
import { getAdaptiveDifficulty } from "./adaptive";


export async function generateReinforcement(error: any, course: any) {

  const baseDifficulty = error.difficulty || 1;

  const difficulty = await getAdaptiveDifficulty(
    baseDifficulty,
    error.question
  );

  const topic = course?.topic || "programming";
  const level = course?.level || "beginner";


  const currentLesson =
  course?.lessons?.[course?.currentLesson || 0];
  const prompt = `
Create a new exercise based on a mistake.

LEARNING STYLE:
${course?.stylePrompt || "Clear explanation"}

COGNITIVE MODE:
${course?.cognitive || "standard"}

TARGET DIFFICULTY: ${difficulty}

QUESTION:
${error.question}

USER WRONG ANSWER:
${error.userAnswer}

CORRECT ANSWER:
${error.correct}

LEVEL:
${course?.level || "beginner"}

RULES:
- Follow LEARNING STYLE
- Focus on the mistake
- Match difficulty
- Return JSON
- If ADHD_Focus → short, direct, quick feedback
- If Deep_Dive → more complex, multi-step
- If Visual_Logic → include structured/code-based thinking
`;

  const res = await generate(prompt);
  return JSON.parse(res);
}