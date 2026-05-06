"use client";

import { generate } from "./webllm";
import { getAdaptiveDifficulty } from "./adaptive";
import { getMemory } from "./userMemory";
import { get } from "./db";


export async function generateReinforcement(error: any, course: any) {

  const baseDifficulty = error.difficulty || 1;

  const user = await get("user", "main");
  const memory = await getMemory();

  const difficulty = await getAdaptiveDifficulty(
    baseDifficulty,
    error.question,
    user,
    memory
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
COGNITIVE MODE:
${user?.cognitive}
- ADHD_Focus → short questions, 1 concept only
- Deep_Dive → multi-step problems
- Visual_Logic → pattern recognition, examples
- Standard → balanced
- beginner → no jargon, simple examples
- intermediate → moderate abstraction
- advanced → use technical language
- NEVER exceed user level
`;

  const res = await generate(prompt);
  return JSON.parse(res);
}