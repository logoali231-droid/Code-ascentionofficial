"use client";

import { generate } from "./webllm";
import { safeParse } from "./safeParse";

/**
 * Gera um curso de programação baseado nos parâmetros fornecidos.
 * @param {object} params - Parâmetros para geração do curso.
 * @param {string} params.topic - O tópico do curso.
 * @param {string} params.style - O estilo do curso.
 * @param {string} params.level - O nível do curso.
 * @param {number} params.difficulty - A dificuldade do curso.
 * @param {string} [params.baseMaterial] - Material base opcional.
 * @returns {Promise<object>} O curso gerado em formato JSON.
 */
export async function generateCourse({
  topic,
  style,
  level,
  difficulty,
  baseMaterial,
  stylePrompt
}: any) {
const prompt = `
Create a programming course.

TOPIC: ${topic}
STYLE: ${style}
LEVEL: ${level}
DIFFICULTY: ${difficulty}

LEARNING STYLE:
${stylePrompt || "Explain clearly and simply"}

${baseMaterial ? `BASE MATERIAL:\n${baseMaterial}` : ""}

RULES:
- Follow the LEARNING STYLE strictly
- If base material exists, use ONLY it
- Do not invent unknown facts
- Create structured JSON
`;

  const res = await generate(prompt);
  const parsed = safeParse(res);
  return parsed || {};
}