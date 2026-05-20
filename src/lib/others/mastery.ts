"use client";

import { get, save } from "./db";

/* =========================================================
   TYPES
========================================================= */

export interface ConceptMastery {
  conceptId: string;

  mastery: number; // 0 -> 1

  attempts: number;

  successes: number;

  failures: number;

  lastReviewed: number;

  lastUpdated: number;

  confidence: number;
}

export interface MasteryMap {
  [conceptId: string]: ConceptMastery;
}

/* =========================================================
   CONFIG
========================================================= */

const STORAGE_KEY = "concept_mastery";

const MIN_MASTERY = 0;

const MAX_MASTERY = 1;

/**
 * forgetting curve
 */
const DECAY_PER_DAY = 0.015;

/**
 * how much success matters
 */
const SUCCESS_GAIN = 0.08;

/**
 * how much failure hurts
 */
const FAILURE_PENALTY = 0.12;

/**
 * minimum attempts before trusting mastery heavily
 */
const CONFIDENCE_DIVISOR = 12;

/* =========================================================
   INTERNAL
========================================================= */

function clamp(value: number, min = MIN_MASTERY, max = MAX_MASTERY) {
  return Math.max(min, Math.min(max, value));
}

function daysBetween(a: number, b: number) {
  return Math.abs(a - b) / 86400000;
}

/* =========================================================
   STORAGE
========================================================= */

export async function getMasteryMap(): Promise<MasteryMap> {
  const data = await get<MasteryMap>("memory", STORAGE_KEY);

  return data || {};
}

async function saveMasteryMap(map: MasteryMap) {
  await save("memory", map, STORAGE_KEY);
}

/* =========================================================
   GET SINGLE CONCEPT
========================================================= */

export async function getConceptMastery(
  conceptId: string,
): Promise<ConceptMastery> {
  const map = await getMasteryMap();

  return (
    map[conceptId] || {
      conceptId,

      mastery: 0,

      attempts: 0,

      successes: 0,

      failures: 0,

      lastReviewed: 0,

      lastUpdated: 0,

      confidence: 0,
    }
  );
}

/* =========================================================
   UPDATE
========================================================= */

export async function updateMastery({
  conceptId,
  success,
  weight = 1,
}: {
  conceptId: string;

  success: boolean;

  weight?: number;
}) {
  const map = await getMasteryMap();

  const current = await getConceptMastery(conceptId);

  const now = Date.now();

  /* =========================
     DECAY
  ========================= */

  let mastery = current.mastery;

  if (current.lastReviewed) {
    const elapsedDays = daysBetween(now, current.lastReviewed);

    mastery -= elapsedDays * DECAY_PER_DAY;
  }

  /* =========================
     UPDATE
  ========================= */

  if (success) {
    mastery += SUCCESS_GAIN * weight;
  } else {
    mastery -= FAILURE_PENALTY * weight;
  }

  mastery = clamp(mastery);

  const attempts = current.attempts + 1;

  const successes = current.successes + (success ? 1 : 0);

  const failures = current.failures + (success ? 0 : 1);

  /**
   * confidence grows slowly
   * prevents fake mastery spikes
   */

  const confidence = clamp(attempts / CONFIDENCE_DIVISOR);

  const updated: ConceptMastery = {
    conceptId,

    mastery,

    attempts,

    successes,

    failures,

    confidence,

    lastReviewed: now,

    lastUpdated: now,
  };

  map[conceptId] = updated;

  await saveMasteryMap(map);

  return updated;
}

/* =========================================================
   REVIEW LOGIC
========================================================= */

export function shouldReview(concept: ConceptMastery) {
  const now = Date.now();

  const days = daysBetween(now, concept.lastReviewed);

  /**
   * spaced repetition
   */

  if (concept.mastery < 0.4) {
    return true;
  }

  if (concept.mastery < 0.7 && days >= 3) {
    return true;
  }

  if (concept.mastery >= 0.7 && days >= 7) {
    return true;
  }

  return false;
}

/* =========================================================
   WEAK CONCEPTS
========================================================= */

export async function getWeakConcepts(limit = 5) {
  const map = await getMasteryMap();

  return Object.values(map)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, limit);
}

/* =========================================================
   STRONG CONCEPTS
========================================================= */

export async function getStrongConcepts(limit = 5) {
  const map = await getMasteryMap();

  return Object.values(map)
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, limit);
}

/* =========================================================
   REVIEW TARGETS
========================================================= */

export async function getReviewConcepts(limit = 5) {
  const map = await getMasteryMap();

  return Object.values(map)
    .filter(shouldReview)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, limit);
}

/* =========================================================
   GLOBAL MASTERY SCORE
========================================================= */

export async function getGlobalMastery() {
  const map = await getMasteryMap();

  const concepts = Object.values(map);

  if (!concepts.length) {
    return 0;
  }

  const total = concepts.reduce((acc, concept) => acc + concept.mastery, 0);

  return total / concepts.length;
}

/* =========================================================
   MASTERY LABEL
========================================================= */

export function getMasteryLabel(mastery: number) {
  if (mastery < 0.2) {
    return "Unknown";
  }

  if (mastery < 0.4) {
    return "Learning";
  }

  if (mastery < 0.6) {
    return "Familiar";
  }

  if (mastery < 0.8) {
    return "Proficient";
  }

  return "Mastered";
}
