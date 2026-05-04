"use client";

import { get, save } from "./db";

export type Memory = {
  topics: Record<string, number>;
  weaknesses: Record<string, number>;
  lastErrors: {
    topic: string;
    type: string;
    input: string;
  }[];
};

const KEY = "memory";

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
}: any) {
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
    });

    if (mem.lastErrors.length > 10) {
      mem.lastErrors.shift();
    }
  }

  await save("memory", mem, KEY);
}

// 🔹 compatibilidade com código antigo
export async function updateUser(correct: boolean) {
  await updateMemory({
    topic: "general",
    correct,
    type: "unknown",
    input: "",
  });
}