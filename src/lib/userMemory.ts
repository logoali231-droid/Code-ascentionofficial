export type Memory = {
  skillScore: number;
  xp: number;
  level: number;
};

export function updateMemory(mem: Memory, correct: boolean): Memory {
  const delta = correct ? 5 : -3;

  const newScore = Math.max(0, mem.skillScore + delta);

  return {
    ...mem,
    skillScore: newScore,
    xp: mem.xp + (correct ? 10 : 2),
    level: Math.floor(mem.xp / 100),
  };
}