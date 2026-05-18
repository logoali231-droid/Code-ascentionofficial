"use client";

import { save, getAll, db } from "./db";

export interface VectorMemoryEntry {
  id: string;
  text: string;
  summary: string;
  tags: string[];
  concepts: string[];
  importance: number;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
  compressed?: boolean;
}

const MAX_MEMORIES = 120;
const MAX_MEMORY_AGE = 1000 * 60 * 60 * 24 * 14; // 14 Dias
const MAX_TEXT_SIZE = 1400;
const MEMORY_STORE = "memory";

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "about",
  "have",
  "your",
  "will",
  "they",
  "them",
  "then",
  "what",
  "when",
  "where",
  "while",
  "which",
  "there",
  "their",
  "were",
  "been",
  "being",
  "using",
  "used",
  "each",
  "some",
  "very",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function calculateSimilarity(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  const intersection = [...ta].filter((x) => tb.has(x)).length;
  const union = new Set([...ta, ...tb]).size;
  return union === 0 ? 0 : intersection / union;
}

function summarizeText(text: string): string {
  if (text.length <= 240) return text;
  return text.slice(0, 220) + "... [compressed]";
}

function calculateDecay(memory: VectorMemoryEntry): number {
  const age = Date.now() - memory.timestamp;
  const ageFactor = Math.max(0, 1 - age / MAX_MEMORY_AGE);
  const accessBoost = Math.min(memory.accessCount * 0.05, 0.5);
  return ageFactor * (memory.importance + accessBoost);
}

export async function storeMemory({
  text,
  tags = [],
  concepts = [],
  importance = 1,
}: {
  text: string;
  tags?: string[];
  concepts?: string[];
  importance?: number;
}): Promise<VectorMemoryEntry | null> {
  if (!text?.trim()) return null;

  const trimmed = text.slice(0, MAX_TEXT_SIZE);
  const entry: VectorMemoryEntry = {
    id: crypto.randomUUID(),
    text: trimmed,
    summary: summarizeText(trimmed),
    tags,
    concepts,
    importance: Math.max(0.1, Math.min(importance, 5)),
    timestamp: Date.now(),
    lastAccessed: Date.now(),
    accessCount: 0,
    compressed: trimmed.length > 400,
  };

  await save(MEMORY_STORE, entry, entry.id);
  return entry;
}

export async function retrieveRelevantMemories({
  query,
  tags = [],
  concepts = [],
  limit = 5,
}: {
  query: string;
  tags?: string[];
  concepts?: string[];
  limit?: number;
}): Promise<VectorMemoryEntry[]> {
  const all = (await getAll(MEMORY_STORE)) as VectorMemoryEntry[];
  if (!all?.length) return [];

  const ranked = all
    .map((memory) => {
      const semantic = calculateSimilarity(query, memory.text);
      const tagScore = memory.tags.filter((t) => tags.includes(t)).length * 0.2;
      const conceptScore =
        memory.concepts.filter((c) => concepts.includes(c)).length * 0.35;
      const decay = calculateDecay(memory);
      const score = semantic + tagScore + conceptScore + decay;

      return { memory, score };
    })
    .filter((x) => x.score > 0.12)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  for (const item of ranked) {
    await save(
      MEMORY_STORE,
      {
        ...item.memory,
        accessCount: item.memory.accessCount + 1,
        lastAccessed: Date.now(),
      },
      item.memory.id,
    );
  }

  return ranked.map((x) => x.memory);
}

export async function buildMemoryContext({
  query,
  tags = [],
  concepts = [],
  limit = 4,
}: {
  query: string;
  tags?: string[];
  concepts?: string[];
  limit?: number;
}): Promise<string> {
  const memories = await retrieveRelevantMemories({
    query,
    tags,
    concepts,
    limit,
  });
  if (!memories.length) return "";

  return memories
    .map(
      (m, i) =>
        `\nMEMORY ${i + 1}:\n${m.summary}\n\nTAGS:\n${m.tags.join(", ")}\n\nCONCEPTS:\n${m.concepts.join(", ")}\n`,
    )
    .join("\n");
}

export async function cleanupVectorMemory(): Promise<void> {
  const all = (await getAll(MEMORY_STORE)) as VectorMemoryEntry[];
  if (!all?.length) return;

  const valid = all.filter((m) => Date.now() - m.timestamp < MAX_MEMORY_AGE);
  const ranked = valid.sort((a, b) => calculateDecay(b) - calculateDecay(a));
  const kept = ranked.slice(0, MAX_MEMORIES);
  const keepIds = new Set(kept.map((m) => m.id));

  for (const memory of all) {
    if (!keepIds.has(memory.id)) {
      try {
        await db.memory.delete(memory.id);
      } catch {}
    }
  }

  console.log(
    `%c[VECTOR-MEMORY] Limpeza concluída. Memórias preservadas: ${kept.length}.`,
    "color: #00ffcc",
  );
}

export function computeImportance({
  success,
  difficulty,
  repeatedFailures,
  reinforcement,
}: {
  success?: boolean;
  difficulty?: number;
  repeatedFailures?: number;
  reinforcement?: boolean;
}): number {
  let score = 1;
  if (!success) score += 1.5;
  if (difficulty) score += difficulty * 0.4;
  if (repeatedFailures) score += repeatedFailures * 0.5;
  if (reinforcement) score += 1;
  return Math.min(score, 5);
}
