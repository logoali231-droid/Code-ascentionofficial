"use client";

import { generate } from "./webllm";

export async function generateCourse({
  topic,
  style,
  level,
  difficulty,
  baseMaterial,
}: any) {
  const prompt = `
Create a programming course.

TOPIC: ${topic}
STYLE: ${style}
LEVEL: ${level}
DIFFICULTY: ${difficulty}

${baseMaterial ? `BASE MATERIAL:\n${baseMaterial}` : ""}

RULES:
- If base material exists, use ONLY it
- Do not invent unknown facts
- Create structured JSON

FORMAT:
{
  "lessons": [
    {
      "title": "...",
      "explanation": "...",
      "exercises": [
        {
          "type": "mcq | short | code",
          "question": "...",
          "answer": "...",
          "options": []
        }
      ]
    }
  ]
}

- Generate multiple lessons
- Each lesson must have 3-5 exercises
- Mix exercise types
`;

  const res = await generate(prompt);

  return JSON.parse(res);
}