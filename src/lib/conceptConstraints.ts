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

const dynamicConstraints =
  new Map<string, ConceptConstraint>();

/* =========================================================
   EXTRACT FUNDAMENTAL TRUTHS
========================================================= */

export function buildDynamicConstraint(
  topic: string,
  concept: string,
  explanation: string
): ConceptConstraint {
  const text =
    explanation.toLowerCase();

  const truths: string[] = [];

  const forbidden: string[] = [];

  /* -----------------------------------------
     SIMPLE HEURISTICS
  ----------------------------------------- */

  if (
    text.includes("scope")
  ) {
    truths.push(
      `${concept} relates to scope`
    );
  }

  if (
    text.includes("memory")
  ) {
    truths.push(
      `${concept} interacts with memory`
    );
  }

  if (
    text.includes("function")
  ) {
    truths.push(
      `${concept} involves functions`
    );
  }

  /* -----------------------------------------
     DRIFT PREVENTION
  ----------------------------------------- */

  forbidden.push(
    `Do not describe ${concept} as unrelated to ${topic}`
  );

  forbidden.push(
    `Avoid contradictory definitions of ${concept}`
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
  constraint: ConceptConstraint
) {
  const existing =
    dynamicConstraints.get(
      constraint.concept
    );

  /* -----------------------------------------
     MERGE EVOLUTION
  ----------------------------------------- */

  if (existing) {
    dynamicConstraints.set(
      constraint.concept,
      {
        ...existing,

        truths: [
          ...new Set([
            ...existing.truths,
            ...constraint.truths,
          ]),
        ],

        forbidden: [
          ...new Set([
            ...existing.forbidden,
            ...constraint.forbidden,
          ]),
        ],

        confidence:
          Math.min(
            existing.confidence + 0.05,
            1
          ),
      }
    );

    return;
  }

  dynamicConstraints.set(
    constraint.concept,
    constraint
  );
}

/* =========================================================
   GET CONSTRAINT
========================================================= */

export function getConstraint(
  concept: string
) {
  return dynamicConstraints.get(
    concept
  );
}

/* =========================================================
   BUILD PROMPT CONSTRAINTS
========================================================= */

export function buildConstraintPrompt(
  concept: string
) {
  const constraint =
    dynamicConstraints.get(
      concept
    );

  if (!constraint) {
    return "";
  }

  return `
CONCEPT STABILITY RULES:

CORE TRUTHS:
${constraint.truths
  .map((t) => `- ${t}`)
  .join("\n")}

FORBIDDEN DRIFT:
${constraint.forbidden
  .map((f) => `- ${f}`)
  .join("\n")}

IMPORTANT:
Preserve conceptual consistency while remaining adaptive and creative.
`;
}