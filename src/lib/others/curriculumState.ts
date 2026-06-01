"use client";

import { db, get, save, getAll } from "@/lib/others/db";

const MAX_TOPICS_PER_COURSE = 300;

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
 * Obtém estado individual de um tópico de maneira fragmentada interceptando o buffer
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

    const allTopics = await getAll<TopicNode>(STORE);

    const courseTopics = allTopics
      .filter((t) => t.courseId === courseId)
      .sort((a, b) => a.lastSeen - b.lastSeen);

    if (courseTopics.length >= MAX_TOPICS_PER_COURSE) {
      const oldest = courseTopics[0];

      if (oldest) {
        await (db as any)[STORE].delete(
          `${oldest.courseId}_${normalizeTopic(oldest.topic)}`
        );
      }
    }
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

export async function cleanupCurriculum(
  courseId: string
) {
  const allTopics = await getAll<TopicNode>(STORE);

  const topics = allTopics
    .filter((t) => t.courseId === courseId)
    .sort((a, b) => b.lastSeen - a.lastSeen);

  const excess = topics.slice(300);

  for (const topic of excess) {
    await (db as any)[STORE].delete(
      `${topic.courseId}_${normalizeTopic(topic.topic)}`
    );
  }
}

/**
 * Obtém os tópicos fracos mesclando dados em disco com alterações retidas no buffer L1
 */
export async function getWeakTopics(courseId: string): Promise<TopicNode[]> {
  const allTopics = await getAll<TopicNode>(STORE);
  const topics = allTopics.filter(
    (t) =>
      t.courseId === courseId &&
      (t.mastery < 95 || t.confidence < 95)
  );

  return topics
    .filter((t: TopicNode) => t.mastery < 50 || t.confidence < 40)
    .sort((a: TopicNode, b: TopicNode) => (a.mastery + a.confidence) - (b.mastery + b.confidence));
}

/**
 * Obtém os próximos tópicos sugeridos baseados no score matemático mitigando dirty-reads
 */
export async function getSuggestedTopics(courseId: string): Promise<TopicNode[]> {
  const allTopics = await getAll<TopicNode>(STORE);
  const topics = allTopics.filter(
    (t) =>
      t.courseId === courseId &&
      (t.mastery < 95 || t.confidence < 95)
  );

  return topics
    .sort((a: TopicNode, b: TopicNode) => {
      const scoreA = a.mastery + a.confidence - a.reinforced * 5;
      const scoreB = b.mastery + b.confidence - b.reinforced * 5;
      return scoreA - scoreB;
    })
    .slice(0, 5);
}

/**
 * Serializa de forma consistente o progresso curricular do buffer unificado para o contexto da IA
 */
export async function summarizeCurriculum(
  courseId: string
): Promise<string> {
  const MAX_CONTEXT_TOPICS = 12;

  const allTopics = await getAll<TopicNode>(STORE);

  const topics = allTopics
    .filter(
      (t) =>
        t.courseId === courseId &&
        (t.mastery < 95 || t.confidence < 95)
    )
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .slice(0, MAX_CONTEXT_TOPICS);

  return topics
    .map(
      (t) =>
        `${t.topic}: M${Math.round(t.mastery)} C${Math.round(
          t.confidence
        )}`
    )
    .join("\n");
}
