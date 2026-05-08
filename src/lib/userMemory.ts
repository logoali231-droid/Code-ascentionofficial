"use client";

import { get, save } from "./db";

const KEY = "main";

// 1. Atualizado para incluir history e campos necessários para o Adaptive
export type Memory = {
  topics: Record<string, number>;
  weaknesses: Record<string, number>;
  lastErrors: {
    topic: string;
    type: string;
    input: string;
    time: number;
  }[];
  history: {
    timestamp: number;
    success: boolean;
    attempts: number;
    topic: string;
    difficulty: number;
  }[];
};

const MAX_ERRORS = 20;
const MAX_HISTORY = 50; // Limite para não sobrecarregar o IndexedDB

export async function getMemory(): Promise<Memory> {
  const data = await get("memory", KEY);
  return (
    data || {
      topics: {},
      weaknesses: {},
      lastErrors: [],
      history: [], // Inicialização do array
    }
  );
}

export async function updateMemory({
  topic,
  correct,
  type,
  input,
  difficulty = 1, // Novo campo opcional
  attempts = 1    // Novo campo opcional
}: {
  topic: string;
  correct: boolean;
  type: string;
  input: string;
  difficulty?: number;
  attempts?: number;
}) {
  const mem = await getMemory();

  if (!mem.topics[topic]) mem.topics[topic] = 0;
  if (!mem.weaknesses[topic]) mem.weaknesses[topic] = 0;

  // 2. Registra no Histórico (Para Adaptive e Leveling)
  mem.history.push({
    timestamp: Date.now(),
    success: correct,
    attempts,
    topic,
    difficulty
  });

  if (mem.history.length > MAX_HISTORY) mem.history.shift();

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
    cognitive: user?.cognitive || "Standard",
  };
}