"use client";

import { get, save } from "@/lib/db";

export type TopicNode = {
  topic: string;

  mastery: number;
  confidence: number;

  seen: boolean;

  reinforced: number;

  difficulty: number;

  prerequisites: string[];

  lastSeen: number;
};

export type CurriculumState = {
  courseId: string;

  updatedAt: number;

  map: Record<string, TopicNode>;
};

const STORE = "curriculum";

function normalizeTopic(topic: string) {
  return topic.trim().toLowerCase();
}

/**
 * Obtém estado curricular completo do curso
 */
export async function getCurriculumState(
  courseId: string
): Promise<CurriculumState> {
  const existing = await get(STORE, courseId);

  if (existing) return existing;

  const empty: CurriculumState = {
    courseId,
    updatedAt: Date.now(),
    map: {},
  };

  await save(STORE, empty);

  return empty;
}

/**
 * Garante existência de tópico
 */
export async function ensureTopic(
  courseId: string,
  topic: string,
  prerequisites: string[] = []
) {
  const state = await getCurriculumState(courseId);

  const key = normalizeTopic(topic);

  if (!state.map[key]) {
    state.map[key] = {
      topic,

      mastery: 0,
      confidence: 0,

      seen: false,

      reinforced: 0,

      difficulty: 1,

      prerequisites,

      lastSeen: Date.now(),
    };

    state.updatedAt = Date.now();

    await save(STORE, state);
  }

  return state.map[key];
}

/**
 * Marca tópico como visto
 */
export async function markTopicSeen(
  courseId: string,
  topic: string
) {
  const state = await getCurriculumState(courseId);

  const key = normalizeTopic(topic);

  if (!state.map[key]) {
    await ensureTopic(courseId, topic);
  }

  state.map[key].seen = true;
  state.map[key].lastSeen = Date.now();

  state.updatedAt = Date.now();

  await save(STORE, state);
}

/**
 * Atualiza mastery
 */
export async function updateMastery(
  courseId: string,
  topic: string,
  delta: number
) {
  const state = await getCurriculumState(courseId);

  const key = normalizeTopic(topic);

  if (!state.map[key]) {
    await ensureTopic(courseId, topic);
  }

  const node = state.map[key];

  node.mastery += delta;

  if (node.mastery < 0) node.mastery = 0;
  if (node.mastery > 100) node.mastery = 100;

  node.lastSeen = Date.now();

  // difficulty escalona junto
  node.difficulty = Math.max(
    1,
    Math.floor(node.mastery / 20)
  );

  state.updatedAt = Date.now();

  await save(STORE, state);

  return node.mastery;
}

/**
 * Atualiza confiança
 */
export async function updateConfidence(
  courseId: string,
  topic: string,
  delta: number
) {
  const state = await getCurriculumState(courseId);

  const key = normalizeTopic(topic);

  if (!state.map[key]) {
    await ensureTopic(courseId, topic);
  }

  const node = state.map[key];

  node.confidence += delta;

  if (node.confidence < 0) node.confidence = 0;
  if (node.confidence > 100) node.confidence = 100;

  node.lastSeen = Date.now();

  state.updatedAt = Date.now();

  await save(STORE, state);

  return node.confidence;
}

/**
 * Marca reforço
 */
export async function reinforceTopic(
  courseId: string,
  topic: string
) {
  const state = await getCurriculumState(courseId);

  const key = normalizeTopic(topic);

  if (!state.map[key]) {
    await ensureTopic(courseId, topic);
  }

  state.map[key].reinforced += 1;

  state.map[key].lastSeen = Date.now();

  state.updatedAt = Date.now();

  await save(STORE, state);
}

/**
 * Obtém tópicos fracos
 */
export async function getWeakTopics(
  courseId: string
) {
  const state = await getCurriculumState(courseId);

  return Object.values(state.map)
    .filter(
      (t) =>
        t.mastery < 50 ||
        t.confidence < 40
    )
    .sort(
      (a, b) =>
        a.mastery +
        a.confidence -
        (b.mastery + b.confidence)
    );
}

/**
 * Obtém próximos tópicos ideais
 */
export async function getSuggestedTopics(
  courseId: string
) {
  const state = await getCurriculumState(courseId);

  return Object.values(state.map)
    .sort((a, b) => {
      const scoreA =
        a.mastery +
        a.confidence -
        a.reinforced * 5;

      const scoreB =
        b.mastery +
        b.confidence -
        b.reinforced * 5;

      return scoreA - scoreB;
    })
    .slice(0, 5);
}

/**
 * Compressão simples da memória curricular
 */
export async function summarizeCurriculum(
  courseId: string
) {
  const state = await getCurriculumState(courseId);

  const summary = Object.values(state.map)
    .map((t) => {
      return `${t.topic}: mastery ${t.mastery}/100, confidence ${t.confidence}/100`;
    })
    .join("\n");

  return summary;
}