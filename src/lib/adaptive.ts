"use client";

import { getMemory } from "./userMemory";

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