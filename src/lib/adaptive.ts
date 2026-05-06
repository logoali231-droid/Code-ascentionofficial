"use client";

import { getMemory } from "./userMemory";

export async function getAdaptiveDifficulty(
  base: number,
  topic: string,
  user: any
) {
  const memory = await getMemory();

  let difficulty = base;

  // 🎯 topic-specific errors (much smarter)
  const sameTopicErrors = memory.lastErrors.filter(
    (e: any) => e.topic === topic
  ).length;

  if (sameTopicErrors >= 3) difficulty -= 1;
  if (sameTopicErrors >= 6) difficulty -= 2;

  // 📈 skill growth
  const xp = user?.xp || 0;
  if (xp > 300) difficulty += 1;
  if (xp > 800) difficulty += 1;

  // 🧠 cognitive tuning
  if (user?.cognitive === "ADHD_Focus") difficulty -= 1;
  if (user?.cognitive === "Deep_Dive") difficulty += 1;

  return Math.max(1, Math.min(5, difficulty));
}