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

TARGET DIFFICULTY: ${difficulty}

QUESTION:
${error.question}

USER WRONG ANSWER:
${error.userAnswer}

CORRECT ANSWER:
${error.correct}

RULES:
- Follow LEARNING STYLE
- Focus on the mistake
- Match difficulty
- Return JSON
`;

  const res = await generate(prompt);
  return JSON.parse(res);
}