import { get, save } from "./db";

export type Memory = {
  xp: number;
  level: number;
  skillScore: number;
};

function calcLevel(xp: number) {
  return Math.floor(xp / 100);
}

function getRank(level: number) {
  if (level < 3) return "Noob";
  if (level < 6) return "Chipset";
  return "Kernel";
}

export async function updateUser(correct: boolean) {
  const user = await get("user", "main");

  const xp = (user?.xp || 0) + (correct ? 10 : 2);
  const skillScore = Math.max(0, (user?.skillScore || 0) + (correct ? 5 : -2));

  const level = calcLevel(xp);

  await save("user", {
    ...user,
    xp,
    level,
    skillScore,
    rank: getRank(level),
  });

  return { xp, level, rank: getRank(level) };
}