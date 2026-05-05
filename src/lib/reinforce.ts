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

COURSE CONTEXT:
- Topic: ${topic}
- Level: ${level}
- Lesson: ${currentLesson?.title || "unknown"}

TARGET DIFFICULTY: ${difficulty}

QUESTION:
${error.question}

USER WRONG ANSWER:
${error.userAnswer}

CORRECT ANSWER:
${error.correct}

RULES:
- Focus on the mistake
- Stay inside the COURSE CONTEXT
- Do NOT introduce unrelated concepts
- Match difficulty to TARGET DIFFICULTY
- Slightly harder if user improving
- Return JSON
`;

  const res = await generate(prompt);
  return JSON.parse(res);
}