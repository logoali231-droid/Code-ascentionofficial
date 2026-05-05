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
  topic: string
) {
  const mem = await getMemory();

  const skill = mem.topics[topic] || 0;
  const weak = mem.weaknesses[topic] || 0;

  const delta = skill - weak;

  let difficulty = base;

  if (delta > 3) difficulty += 1;
  if (delta > 8) difficulty += 1;

  if (delta < -2) difficulty -= 1;
  if (delta < -5) difficulty -= 1;

  return Math.max(1, Math.min(5, difficulty));
}