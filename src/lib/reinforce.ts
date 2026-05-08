"use client";

import { generate } from "./webllm";
import { getAdaptiveMetrics } from "./adaptive";
import { getMemory } from "./userMemory";
import { get } from "./db";
import { safeParse } from "./safeParse";

export async function generateReinforcement(error: any, course: any) {
  const baseDifficulty = error.difficulty || 1;

  const user = await get("user", "main");
  const memory = await getMemory();
  const topic = course?.topic || "programming";
  const level = course?.level || "beginner";

  // 🎯 Sincronizado com getAdaptiveMetrics
  // Agora desestruturamos para pegar apenas a 'difficulty' para o prompt
  const metrics = await getAdaptiveMetrics();
  
  const difficulty = metrics.difficulty;

  const recentErrors = memory.lastErrors?.slice(-5) || [];

  // 🧠 detect repetition
  const sameTopicErrors = memory.lastErrors.filter(
    (e: any) => e.topic === topic
  ).length;

  const struggling = sameTopicErrors >= 3;

  const prompt = `
You are an adaptive programming tutor.

TASK:
Create ONE reinforcement exercise to fix a specific mistake.

CONTEXT:
- Topic: ${topic}
- User Level: ${level}
- Cognitive Mode: ${user?.cognitive}
- Target Difficulty: ${difficulty}

LEARNING STYLE:
${course?.stylePrompt || "Explain clearly"}

ORIGINAL QUESTION:
${error.question}

USER WRONG ANSWER:
${error.userAnswer}

CORRECT ANSWER:
${error.correct}

WEAKNESSES:
${JSON.stringify(memory.weaknesses)}

RECENT ERRORS:
${JSON.stringify(recentErrors)}

STATE:
- User is ${struggling ? "STRUGGLING" : "LEARNING"}

RULES:
- Return ONLY valid JSON
- Do NOT include explanations outside JSON
- Focus ONLY on the mistake
- Do NOT introduce new concepts
- If unsure, return a simpler version of the same concept

DIFFICULTY RULES:
- If STRUGGLING → make it easier and simpler
- Otherwise → match TARGET DIFFICULTY

COGNITIVE RULES:
- ADHD_Focus → short, 1 concept, minimal text
- Deep_Dive → multi-step reasoning
- Visual_Logic → patterns, examples
- Standard → balanced

LEVEL RULES:
- beginner → no jargon
- intermediate → moderate abstraction
- advanced → technical depth
- NEVER exceed user level

OUTPUT FORMAT:
{
  "type": "short | multiple_choice | code | logic",
  "question": "...",
  "options": ["..."] (only if multiple_choice),
  "answer": "...",
  "explanation": "short explanation"
}
`;

  const res = await generate(prompt);
  const parsed = safeParse(res);

  if (parsed) return parsed;

  // 🛟 fallback
  return {
    type: "short",
    question: `Let's try again: ${error.question}`,
    answer: error.correct || "",
    explanation: "Retry focusing on the correct concept.",
  };
}