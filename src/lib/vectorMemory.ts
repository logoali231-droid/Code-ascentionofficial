// src/lib/vectorMemory.ts

"use client";

import { get, save, getAll } from "./db";

/* =========================================================
   VECTOR MEMORY
   CODE ASCENT

   Lightweight local RAG system optimized for:
   - mobile
   - WebLLM
   - offline usage
   - low RAM devices

   Features:
   - fake embeddings
   - semantic-ish retrieval
   - importance weighting
   - memory decay
   - automatic cleanup
   - summarization-ready
========================================================= */

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

/* =========================================================
   CONFIG
========================================================= */

const MAX_MEMORIES = 120;

const MAX_MEMORY_AGE =
  1000 * 60 * 60 * 24 * 14; // 14 days

const MAX_TEXT_SIZE = 1400;

const MEMORY_STORE = "memory";

/* =========================================================
   TOKENIZATION
========================================================= */

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(
      (t) =>
        t.length > 2 &&
        !STOPWORDS.has(t)
    );
}

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
  "into",
  "each",
  "some",
  "very",
]);

/* =========================================================
   SIMILARITY
========================================================= */

function calculateSimilarity(
  a: string,
  b: string
) {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));

  const intersection =
    [...ta].filter((x) => tb.has(x))
      .length;

  const union = new Set([
    ...ta,
    ...tb,
  ]).size;

  if (union === 0) return 0;

  return intersection / union;
}

/* =========================================================
   SUMMARY
========================================================= */

function summarizeText(text: string) {
  if (text.length <= 240) {
    return text;
  }

  return (
    text.slice(0, 220) +
    "... [compressed]"
  );
}

/* =========================================================
   MEMORY DECAY
========================================================= */

function calculateDecay(
  memory: VectorMemoryEntry
) {
  const age =
    Date.now() - memory.timestamp;

  const ageFactor =
    Math.max(
      0,
      1 - age / MAX_MEMORY_AGE
    );

  const accessBoost =
    Math.min(
      memory.accessCount * 0.05,
      0.5
    );

  return (
    ageFactor *
    (memory.importance + accessBoost)
  );
}

/* =========================================================
   SAVE MEMORY
========================================================= */

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
}) {
  if (!text?.trim()) {
    return null;
  }

  const trimmed =
    text.slice(0, MAX_TEXT_SIZE);

  const entry: VectorMemoryEntry = {
    id: crypto.randomUUID(),

    text: trimmed,

    summary: summarizeText(trimmed),

    tags,

    concepts,

    importance:
      Math.max(
        0.1,
        Math.min(importance, 5)
      ),

    timestamp: Date.now(),

    lastAccessed: Date.now(),

    accessCount: 0,

    compressed:
      trimmed.length > 400,
  };

  await save(
    MEMORY_STORE,
    entry,
    entry.id
  );

  if (Math.random() < 0.15) {
    await cleanupVectorMemory();
  }

  return entry;
}

/* =========================================================
   RETRIEVAL
========================================================= */

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
}) {
  const all =
    (await getAll(
      MEMORY_STORE
    )) as VectorMemoryEntry[];

  if (!all?.length) {
    return [];
  }

  const ranked = all
    .map((memory) => {
      const semantic =
        calculateSimilarity(
          query,
          memory.text
        );

      const tagScore =
        memory.tags.filter((t) =>
          tags.includes(t)
        ).length * 0.2;

      const conceptScore =
        memory.concepts.filter((c) =>
          concepts.includes(c)
        ).length * 0.35;

      const decay =
        calculateDecay(memory);

      const score =
        semantic +
        tagScore +
        conceptScore +
        decay;

      return {
        memory,
        score,
      };
    })
    .filter((x) => x.score > 0.12)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  /* update access stats */

  for (const item of ranked) {
    await save(
      MEMORY_STORE,
      {
        ...item.memory,

        accessCount:
          item.memory.accessCount + 1,

        lastAccessed: Date.now(),
      },
      item.memory.id
    );
  }

  return ranked.map((x) => x.memory);
}

/* =========================================================
   MEMORY CONTEXT BUILDER
========================================================= */

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
}) {
  const memories =
    await retrieveRelevantMemories({
      query,
      tags,
      concepts,
      limit,
    });

  if (!memories.length) {
    return "";
  }

  return memories
    .map(
      (m, i) => `
MEMORY ${i + 1}:
${m.summary}

TAGS:
${m.tags.join(", ")}

CONCEPTS:
${m.concepts.join(", ")}
`
    )
    .join("\n");
}

/* =========================================================
   CLEANUP
========================================================= */

export async function cleanupVectorMemory() {
  const all =
    (await getAll(
      MEMORY_STORE
    )) as VectorMemoryEntry[];

  if (!all?.length) {
    return;
  }

  /* remove ancient memories */

  const valid = all.filter(
    (m) =>
      Date.now() - m.timestamp <
      MAX_MEMORY_AGE
  );

  /* rank by usefulness */

  const ranked = valid.sort(
    (a, b) =>
      calculateDecay(b) -
      calculateDecay(a)
  );

  /* keep only best */

  const kept = ranked.slice(
    0,
    MAX_MEMORIES
  );

  const keepIds = new Set(
    kept.map((m) => m.id)
  );

  for (const memory of all) {
    if (!keepIds.has(memory.id)) {
      try {
        const table = (await import(
          "./db"
        )).db.memory;

        await table.delete(memory.id);
      } catch {}
    }
  }

  console.log(
    `[VectorMemory] Cleanup complete. Kept ${kept.length} memories.`
  );
}

/* =========================================================
   HIGH VALUE MEMORY DETECTION
========================================================= */

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
}) {
  let score = 1;

  if (!success) {
    score += 1.5;
  }

  if (difficulty) {
    score += difficulty * 0.4;
  }

  if (repeatedFailures) {
    score += repeatedFailures * 0.5;
  }

  if (reinforcement) {
    score += 1;
  }

  return Math.min(score, 5);
}