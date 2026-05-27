"use client";

import { generate } from "./webllm";
import { getAdaptiveMetrics } from "./adaptive";
import { getMemory, getUserProfile } from "./userMemory";
import { get } from "./db";
import { cleanAndParseCourseJSON } from "./safeParse";
import { buildPromptFragments, compressContext } from "./promptFragments";
import { runtimeQueue } from "./generationQueue";

/* =========================================
   GENERATE REINFORCEMENT
========================================= */

export async function generateReinforcement(
  error: any,
  course: any,
  signal?: AbortSignal,
) {
  // =========================================
  // USER STATE
  // =========================================

  const [user, profile, memory, metrics] = await Promise.all([
    get("user", "main"),
    getUserProfile(),
    getMemory(),
    getAdaptiveMetrics(),
  ]);

  // =========================================
  // CORE STATE
  // =========================================

  const topic = course?.topic || "programming";

  const level = course?.level || "beginner";

  const cognitiveProfile =
    profile?.cognitive ||
    user?.cognitive ||
    "Standard";

  const teachingStyle =
    profile?.explanationStyle ||
    profile?.customStyle ||
    course?.stylePrompt ||
    "Explain clearly and progressively";

  // =========================================
  // DIFFICULTY ENGINE
  // =========================================

  const baseDifficulty = error?.difficulty || 1;

  let difficulty = Math.round(
    ((metrics?.difficulty || 1) + baseDifficulty) / 2,
  );

  const recentErrors = memory?.lastErrors?.slice(-5) || [];

  const sameTopicErrors =
    memory?.lastErrors?.filter(
      (e: any) => e.topic === topic,
    )?.length || 0;

  const struggling = sameTopicErrors >= 3;

  if (struggling) {
    difficulty = Math.max(1, difficulty - 1);
  }

  difficulty = Math.min(5, Math.max(1, difficulty));

  // =========================================
  // MEMORY COMPRESSION
  // =========================================

  const compressedErrors = compressContext(
    JSON.stringify(recentErrors),
    700,
  );

  const compressedWeaknesses = compressContext(
    JSON.stringify(memory?.weaknesses || {}),
    500,
  );

  // =========================================
  // COGNITIVE FRAGMENTS
  // =========================================

  const cognitiveFragments = buildPromptFragments({
    cognitive: cognitiveProfile,
    difficulty,
    mastery: struggling ? 30 : 65,
    reinforcement: true,
  });

  // =========================================
  // MODULE CONTEXT
  // =========================================

  const moduleContext = `
CURRENT MODULE:
${error?.moduleTitle || "Unknown Module"}

MODULE DIFFICULTY:
${error?.difficulty || difficulty}

ACTIVE CONCEPT:
${error?.concept || error?.topic || topic}
`;

  // =========================================
  // LIGHTWEIGHT PROMPT
  // =========================================

  const prompt = `
You are an adaptive reinforcement engine operating inside the Code Ascension procedural learning architecture.

Your mission:
Repair ONE specific misunderstanding efficiently.

DO NOT generate:
- full lessons
- giant explanations
- long tutorials
- excessive theory
- unrelated concepts
- motivational speeches

Generate ONLY:
- focused reinforcement
- conceptual repair
- minimal corrective guidance
- adaptive retry challenge

================================
COGNITIVE ADAPTATION
================================

${cognitiveFragments}

COGNITIVE PROFILE:
${cognitiveProfile}

TEACHING STYLE:
${teachingStyle}

================================
USER STATE
================================

LEVEL:
${level}

STRUGGLING:
${struggling ? "true" : "false"}

TARGET DIFFICULTY:
${difficulty}

================================
MODULE CONTEXT
================================

${moduleContext}

================================
ERROR TRACE
================================

ORIGINAL QUESTION:
${error?.question || ""}

USER ANSWER:
${error?.userAnswer || ""}

CORRECT ANSWER:
${error?.correct || ""}

USER EXPLANATION:
${error?.userExplanation || "None"}

================================
WEAKNESS MEMORY
================================

${compressedWeaknesses || "None"}

================================
RECENT ERROR HISTORY
================================

${compressedErrors || "None"}

================================
EXECUTION RULES
================================

- Focus ONLY on the failed concept.
- Keep generation lightweight.
- Keep explanations compact.
- Avoid repeating the original question excessively.
- Avoid introducing new abstraction layers.
- Repair the mental model progressively.
- Maintain continuity with previous mistakes.
- Respect the cognitive profile strictly.
- Respect the teaching style strictly.
- Prefer clarity over depth.
- Keep output mobile-friendly.
- Keep token generation controlled.

================================
DIFFICULTY RULES
================================

If STRUGGLING:
- simplify wording
- isolate one concept
- reduce abstraction
- reduce cognitive load
- use smaller reasoning steps

Otherwise:
- encourage active reasoning
- maintain adaptive challenge
- avoid trivial answers

================================
OUTPUT RULES
================================

Return ONLY valid JSON.

{
  "type": "short | multiple_choice | code | logic",

  "question": "Reinforcement challenge",

  "options": [],

  "answer": "Correct answer",

  "explanation": "Short conceptual repair explanation",

  "hint": "Tiny optional guidance",

  "difficulty": ${difficulty}
}
`;

  // =========================================
  // GENERATION
  // =========================================

  try {
    const rawRes = await runtimeQueue.enqueue(async () => {
      return generate(
        prompt,
        struggling ? 0.45 : 0.6,
        undefined,
        signal,
      );
    }, 1);

    let fullResponse = "";

    if (rawRes) {
      if (typeof rawRes === "string") {
        fullResponse = rawRes;
      } else {
        for await (const chunk of rawRes) {
          const content =
            typeof chunk === "string"
              ? chunk
              : (chunk as any).choices?.[0]?.delta?.content || "";

          fullResponse += content;

          // HARD TOKEN GUARD
          if (fullResponse.length > 5000) {
            break;
          }
        }
      }
    }

    const parsed =
      cleanAndParseCourseJSON(fullResponse);

    if (parsed) {
      return parsed;
    }
  } catch (error) {
    console.error(
      "Reinforcement Generation Failure:",
      error,
    );
  }

  // =========================================
  // FALLBACK
  // =========================================

  return {
    type: "short",

    question: `Retry carefully:\n${error?.question || ""}`,

    options: [],

    answer: error?.correct || "",

    explanation: struggling
      ? "Focus on one core concept at a time."
      : "Retry using the correct reasoning path.",

    hint: struggling
      ? "Break the problem into smaller steps."
      : "Look carefully at the logic flow.",

    difficulty,
  };
}