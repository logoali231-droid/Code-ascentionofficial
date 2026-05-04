"use client";

export function getLevelTitle(user: any) {
  const xp = user?.xp || 0;
  const errors = user?.errors || 0;

  if (xp < 50) return "Noob";
  if (xp < 150) return "Apprentice";

  if (errors > xp * 0.5) return "Overconfident";

  if (xp > 300 && errors < xp * 0.2) return "Precise";

  return "Kernel";
}