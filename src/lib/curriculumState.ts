"use client";

import { db, get, save } from "@/lib/db";

export type TopicNode = {
  courseId: string; // Acoplado para viabilizar indexação e queries relacionais no Dexie
  topic: string;
  mastery: number;
  confidence: number;
  seen: boolean;
  reinforced: number;
  difficulty: number;
  prerequisites: string[];
  lastSeen: number;
};

const STORE = "curriculum";

function normalizeTopic(topic: string): string {
  return topic.trim().toLowerCase();
}

/**
 * Obtém estado individual de um tópico de maneira fragmentada
 */
export async function getTopicState(courseId: string, topic: string): Promise<TopicNode | null> {
  const key = `${courseId}_${normalizeTopic(topic)}`;
  return await get<TopicNode>(STORE, key);
}

/**
 * Garante a existência do nó do tópico de maneira fragmentada
 */
export async function ensureTopic(
  courseId: string,
  topic: string,
  prerequisites: string[] = []
): Promise<TopicNode> {
  const key = `${courseId}_${normalizeTopic(topic)}`;
  let node = await getTopicState(courseId, topic);
  
  if (!node) {
    node = {
      courseId,
      topic,
      mastery: 0,
      confidence: 0,
      seen: false,
      reinforced: 0,
      difficulty: 1,
      prerequisites,
      lastSeen: Date.now()
    };
    await save(STORE, node, key);
  }
  return node;
}

/**
 * Marca tópico como visto
 */
export async function markTopicSeen(courseId: string, topic: string): Promise<void> {
  const node = await ensureTopic(courseId, topic);
  const key = `${courseId}_${normalizeTopic(topic)}`;

  node.seen = true;
  node.lastSeen = Date.now();

  await save(STORE, node, key);
}

/**
 * Atualiza o nível de maestria (mastery) de forma atômica
 */
export async function updateMastery(courseId: string, topic: string, delta: number): Promise<number> {
  const node = await ensureTopic(courseId, topic);
  const key = `${courseId}_${normalizeTopic(topic)}`;

  node.mastery += delta;
  if (node.mastery < 0) node.mastery = 0;
  if (node.mastery > 100) node.mastery = 100;

  node.lastSeen = Date.now();
  node.difficulty = Math.max(1, Math.floor(node.mastery / 20));

  await save(STORE, node, key);
  return node.mastery;
}

/**
 * Atualiza o nível de confiança de forma atômica
 */
export async function updateConfidence(courseId: string, topic: string, delta: number): Promise<number> {
  const node = await ensureTopic(courseId, topic);
  const key = `${courseId}_${normalizeTopic(topic)}`;

  node.confidence += delta;
  if (node.confidence < 0) node.confidence = 0;
  if (node.confidence > 100) node.confidence = 100;

  node.lastSeen = Date.now();

  await save(STORE, node, key);
  return node.confidence;
}

/**
 * Incrementa o contador de reforço do tópico
 */
export async function reinforceTopic(courseId: string, topic: string): Promise<void> {
  const node = await ensureTopic(courseId, topic);
  const key = `${courseId}_${normalizeTopic(topic)}`;

  node.reinforced += 1;
  node.lastSeen = Date.now();

  await save(STORE, node, key);
}

/**
 * Obtém os tópicos fracos usando queries indexadas do Dexie (.where)
 */
export async function getWeakTopics(courseId: string): Promise<TopicNode[]> {
  const topics = await db.table(STORE).where("courseId").equals(courseId).toArray();

  return topics
    .filter((t: TopicNode) => t.mastery < 50 || t.confidence < 40)
    .sort((a: TopicNode, b: TopicNode) => (a.mastery + a.confidence) - (b.mastery + b.confidence));
}

/**
 * Obtém os próximos tópicos sugeridos baseados no score matemático
 */
export async function getSuggestedTopics(courseId: string): Promise<TopicNode[]> {
  const topics = await db.table(STORE).where("courseId").equals(courseId).toArray();

  return topics
    .sort((a: TopicNode, b: TopicNode) => {
      const scoreA = a.mastery + a.confidence - a.reinforced * 5;
      const scoreB = b.mastery + b.confidence - b.reinforced * 5;
      return scoreA - scoreB;
    })
    .slice(0, 5);
}

/**
 * Serializa de forma simples a memória do progresso curricular para contexto de IA
 */
export async function summarizeCurriculum(courseId: string): Promise<string> {
  const topics = await db.table(STORE).where("courseId").equals(courseId).toArray();

  return topics
    .map((t: TopicNode) => `${t.topic}: mastery ${t.mastery}/100, confidence ${t.confidence}/100`)
    .join("\n");
}
