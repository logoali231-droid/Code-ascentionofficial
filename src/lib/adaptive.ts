"use client";

import { getMemory } from "./userMemory";

/**
 * Ajusta a dificuldade adaptativa baseada na memória do usuário para um tópico específico.
 * @param {number} base - A dificuldade base inicial.
 * @param {string} topic - O tópico para o qual ajustar a dificuldade.
 * @returns {Promise<number>} A dificuldade ajustada, limitada entre 1 e 5.
 */
export async function getAdaptiveDifficulty(
  base: number,
  question: string,
  user: any,
  memory: any
) {
  let difficulty = base;

  // 🔻 if user struggling → reduce
  const recentErrors = memory.lastErrors?.length || 0;
  if (recentErrors > 3) difficulty -= 1;

  // 🔺 if user strong → increase
  const xp = user?.xp || 0;
  if (xp > 300) difficulty += 1;

  // 🧠 cognitive tweak
  if (user?.cognitive === "ADHD_Focus") {
    difficulty = Math.max(1, difficulty - 1);
  }

  return Math.max(1, Math.min(5, difficulty));
}