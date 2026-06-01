"use client";

/* =========================================================
   CONCEPT CONSTRAINT ENGINE
   Prevents procedural drift
========================================================= */

export interface ConceptConstraint {
  concept: string;

  truths: string[];

  forbidden: string[];

  confidence: number;

  createdAt: number;
}

const dynamicConstraints = new Map<string, ConceptConstraint>();

const MAX_CONSTRAINTS = 100;
const MAX_TRUTHS = 5;
const MAX_FORBIDDEN = 5;

/* =========================================================
   EXTRACT FUNDAMENTAL TRUTHS
========================================================= */

export function buildDynamicConstraint(
  topic: string,
  concept: string,
  explanation: string,
): ConceptConstraint {
  const text = explanation.toLowerCase();

  const truths: string[] = [];

  const forbidden: string[] = [];

  /* -----------------------------------------
     SIMPLE HEURISTICS
  ----------------------------------------- */

  if (text.includes("scope")) {
    truths.push(`${concept} relates to scope`);
  }

  if (text.includes("memory")) {
    truths.push(`${concept} interacts with memory`);
  }

  if (text.includes("function")) {
    truths.push(`${concept} involves functions`);
  }

  /* -----------------------------------------
     DRIFT PREVENTION
  ----------------------------------------- */

  forbidden.push(
    `Do not describe ${concept} as unrelated to ${topic}`,
  );

  forbidden.push(
    `Avoid contradictory definitions of ${concept}`,
  );

  return {
    concept,
    truths,
    forbidden,
    confidence: 0.5,
    createdAt: Date.now(),
  };
}

/* =========================================================
   STORE CONSTRAINT
========================================================= */

export function registerConstraint(
  constraint: ConceptConstraint,
) {
  const existing = dynamicConstraints.get(
    constraint.concept,
  );

  /* -----------------------------------------
     MERGE EVOLUTION
  ----------------------------------------- */

  if (existing) {
    dynamicConstraints.set(constraint.concept, {
      ...existing,

      truths: [
        ...new Set([
          ...existing.truths,
          ...constraint.truths,
        ]),
      ].slice(-MAX_TRUTHS),

      forbidden: [
        ...new Set([
          ...existing.forbidden,
          ...constraint.forbidden,
        ]),
      ].slice(-MAX_FORBIDDEN),

      confidence: Math.min(
        existing.confidence + 0.05,
        1,
      ),
    });

    return;
  }

  /* -----------------------------------------
     MEMORY LIMIT
  ----------------------------------------- */

  if (dynamicConstraints.size >= MAX_CONSTRAINTS) {
    const oldestKey =
      dynamicConstraints.keys().next().value;

    if (oldestKey) {
      dynamicConstraints.delete(oldestKey);
    }
  }

  dynamicConstraints.set(
    constraint.concept,
    constraint,
  );
}

/* =========================================================
   GET CONSTRAINT
========================================================= */

export function getConstraint(
  concept: string,
) {
  return dynamicConstraints.get(concept);
}

/* =========================================================
   BUILD PROMPT CONSTRAINTS
========================================================= */

export function buildConstraintPrompt(
  concept: string,
) {
  const constraint =
    dynamicConstraints.get(concept);

  if (!constraint) {
    return "";
  }

  const truths = constraint.truths
    .slice(-3)
    .join("\n- ");

  const forbidden = constraint.forbidden
    .slice(-3)
    .join("\n- ");

  return `
CONCEPT STABILITY RULES

CORE TRUTHS:
- ${truths}

FORBIDDEN DRIFT:
- ${forbidden}
`.trim();
}