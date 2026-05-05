"use client";

import { get, save } from "./db";

const KEY = "main";

export type Memory = {
  topics: Record<string, number>;
  weaknesses: Record<string, number>;
  lastErrors: {
    topic: string;
    type: string;
    input: string;
    time: number;
  }[];
};

const MAX_ERRORS = 20;

export async function getMemory(): Promise<Memory> {
  return (
    (await get("memory", KEY)) || {
      topics: {},
      weaknesses: {},
      lastErrors: [],
    }
  );
}

export async function updateMemory({
  topic,
  correct,
  type,
  input,
}: {
  topic: string;
  correct: boolean;
  type: string;
  input: string;
}) {
  const mem = await getMemory();

  if (!mem.topics[topic]) mem.topics[topic] = 0;
  if (!mem.weaknesses[topic]) mem.weaknesses[topic] = 0;

  if (correct) {
    mem.topics[topic] += 1;
  } else {
    mem.weaknesses[topic] += 1;

    mem.lastErrors.push({
      topic,
      type,
      input,
      time: Date.now(),
    });

    // 🔥 LIMITE INTELIGENTE
    if (mem.lastErrors.length > MAX_ERRORS) {
      mem.lastErrors = mem.lastErrors
        .sort((a, b) => b.time - a.time)
        .slice(0, MAX_ERRORS);
    }
  }

  await save("memory", mem, KEY);
}

// 🔹 compatibilidade antiga (não quebra nada)
export async function updateUser(correct: boolean) {
  await updateMemory({
    topic: "general",
    correct,
    type: "legacy",
    input: "",
  });
}

export async function computeUserLevel() {
  const memory = await get("memory", KEY);

  if (!memory || !memory.history) return 1;

  const recent = memory.history.slice(-20);

  const accuracy =
    recent.filter((x: any) => x.correct).length / (recent.length || 1);

  const difficultyAvg =
    recent.reduce((acc: number, x: any) => acc + (x.difficulty || 1), 0) /
    (recent.length || 1);

  const level = Math.floor(accuracy * 5 + difficultyAvg);

  return Math.max(1, level);
}

export async function getUserProfile() {
  const user = await get("user", "main");
  const mem = await getMemory();

  const level = Object.values(mem.topics).reduce((a, b) => a + b, 0);

  return {
    level,
    explanationType: user?.style || "adaptive",
    cognitive: user?.cognitiveProfile || "Standard",
  };
}