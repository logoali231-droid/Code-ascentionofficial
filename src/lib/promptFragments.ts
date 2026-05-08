import { CognitiveProfile } from "@/types/core";

/* =========================
   PEDAGOGY RULES
========================= */

export const pedagogyRules = `
You are an elite adaptive AI tutor.

Rules:

- Teach progressively
- Never jump difficulty abruptly
- Introduce one hard concept at a time
- Reinforce before escalating
- Use examples before abstraction
- Keep explanations coherent and cumulative
- Avoid repeating identical structures
- Prefer practical understanding over theory dumping
- Encourage pattern recognition
- Avoid robotic phrasing
`;

/* =========================
   ANTI AI-SOUP RULES
========================= */

export const antiSoupRules = `
Avoid generic AI-generated phrasing.

Do NOT:
- overexplain obvious things
- use repetitive encouragement
- generate empty motivational text
- repeat sentence structures
- repeat examples excessively
- use vague wording

Keep outputs concise, sharp and meaningful.
`;

/* =========================
   EXERCISE RULES
========================= */

export const exerciseRules = `
Exercise rules:

- Exercises must directly test the lesson
- Avoid trick questions
- Avoid ambiguous answers
- Increase complexity gradually
- Prefer applied reasoning
- Keep code exercises realistic
- Never generate impossible exercises
- Never require hidden knowledge
`;

/* =========================
   THEORY RULES
========================= */

export const theoryRules = `
Theory generation rules:

- Explain like a real tutor
- Use practical analogies carefully
- Avoid giant text walls
- Use formatting naturally
- Focus on intuition first
- Then mechanics
- Then edge cases
`;

/* =========================
   REINFORCEMENT RULES
========================= */

export const reinforcementRules = `
Reinforcement mode:

- Focus on weak areas
- Simplify explanations
- Use smaller steps
- Increase clarity
- Rebuild confidence
- Avoid punishing tone
- Prioritize understanding over speed
`;

/* =========================
   COGNITIVE PROFILE
========================= */

export function getCognitiveRules(
  profile?: CognitiveProfile
) {
  switch (profile) {
    case "tdah":
      return `
- Keep responses shorter
- Use bullet points frequently
- Reduce visual clutter
- Keep pacing fast
- Avoid giant paragraphs
- Use clear focus blocks
`;

    case "Visual_Logic":
      return `
- Prefer structured reasoning
- Use diagrams in text form
- Use step-by-step explanations
- Highlight logical relations
- Use visual hierarchy
`;

    case "Deep_Dive":
      return `
- Allow deeper explanations
- Explore internal mechanics
- Explain WHY things work
- Include edge cases
- Include technical depth
`;

    default:
      return `
- Keep balanced pacing
- Keep explanations accessible
- Avoid excessive complexity
`;
  }
}

/* =========================
   DIFFICULTY SCALING
========================= */

export function getDifficultyRules(
  difficulty: number
) {
  if (difficulty <= 1) {
    return `
- Beginner level
- Use simpler vocabulary
- Use guided reasoning
- Avoid advanced abstractions
`;
  }

  if (difficulty <= 3) {
    return `
- Intermediate level
- Encourage independent reasoning
- Reduce handholding
- Introduce moderate complexity
`;
  }

  return `
- Advanced level
- Expect deeper understanding
- Use realistic scenarios
- Increase analytical difficulty
- Require synthesis of concepts
`;
}

/* =========================
   MASTERY RULES
========================= */

export function getMasteryRules(
  mastery: number
) {
  if (mastery < 30) {
    return `
- User struggles with this topic
- Slow pacing
- More examples
- More guidance
`;
  }

  if (mastery < 70) {
    return `
- User partially understands topic
- Moderate pacing
- Encourage active recall
`;
  }

  return `
- User understands topic well
- Increase challenge
- Reduce repetition
- Introduce variations
`;
}

/* =========================
   MEMORY COMPRESSION
========================= */

export function compressContext(
  text: string,
  max = 1200
) {
  if (text.length <= max) {
    return text;
  }

  return (
    text.slice(0, max) +
    "\n...[context compressed]"
  );
}

/* =========================
   FINAL PROMPT BUILDER
========================= */

export function buildPromptFragments({
  cognitive,
  difficulty,
  mastery,
  reinforcement,
}: {
  cognitive?: CognitiveProfile;

  difficulty?: number;

  mastery?: number;

  reinforcement?: boolean;
}) {
  return `
${pedagogyRules}

${antiSoupRules}

${exerciseRules}

${theoryRules}

${reinforcement ? reinforcementRules : ""}

${getCognitiveRules(cognitive)}

${getDifficultyRules(difficulty || 1)}

${getMasteryRules(mastery || 0)}
`;
}

// ADD THIS TO:
// src/lib/promptFragments.ts

/* =========================================================
   LIGHTWEIGHT FRAGMENTS
   Used by lessonGenerator
========================================================= */



/* =========================================================
   COGNITIVE FRAGMENT
========================================================= */

export function buildCognitiveFragment(
  profile?: CognitiveProfile
) {
  switch (profile) {
    case "tdah":
      return `
COGNITIVE MODE: ADHD_FOCUS

RULES:
- Keep explanations short
- Use concise sections
- Avoid giant paragraphs
- One core idea at a time
- Fast pacing
- Clear visual structure
`;
    case "Visual_Logic":
      return `
COGNITIVE MODE: VISUAL_LOGIC

RULES:
- Prefer structured reasoning
- Use hierarchy
- Explain relationships clearly
- Use step-by-step logic
- Emphasize patterns
`;
    case "Deep_Dive":
      return `
COGNITIVE MODE: DEEP_DIVE

RULES:
- Explore internal mechanics
- Explain WHY things work
- Include edge cases
- Allow deeper reasoning
- Technical precision encouraged
`;
    default:
      return `
COGNITIVE MODE: STANDARD

RULES:
- Balanced pacing
- Moderate detail
- Clear explanations
- Avoid unnecessary complexity
`;
  }
}

/* =========================================================
   DIFFICULTY FRAGMENT
========================================================= */

export function buildDifficultyFragment(
  difficulty: number = 1
) {
  if (difficulty <= 1) {
    return `
DIFFICULTY: BEGINNER

RULES:
- Use simple language
- Guided reasoning
- Avoid advanced abstractions
- Focus on intuition first
`;
  }

  if (difficulty <= 3) {
    return `
DIFFICULTY: INTERMEDIATE

RULES:
- Moderate complexity
- Encourage independent reasoning
- Introduce abstraction gradually
`;
  }

  return `
DIFFICULTY: ADVANCED

RULES:
- Technical precision
- Complex reasoning allowed
- Use realistic coding scenarios
- Require synthesis of concepts
`;
}

/* =========================================================
   STYLE FRAGMENT
========================================================= */

export function buildStyleFragment(
  stylePrompt?: string
) {
  return `
LEARNING STYLE:
${stylePrompt || "Explain clearly and naturally"}

IMPORTANT:
Follow the learning style STRICTLY.
`;
}

/* =========================================================
   HISTORY COMPRESSION
========================================================= */

export function compressHistory(
  history: any[] = [],
  maxEntries: number = 6
) {
  if (!history?.length) {
    return "No previous lessons.";
  }

  return history
    .slice(-maxEntries)
    .map((lesson, index) => {
      return `
${index + 1}. ${lesson?.title || "Untitled"}

Summary:
${String(
  lesson?.explanation || ""
).slice(0, 180)}
`;
    })
    .join("\n");
}