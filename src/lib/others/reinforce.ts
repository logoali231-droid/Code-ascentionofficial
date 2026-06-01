"use client";

import { getAdaptiveMetrics } from "./adaptive";
import {
  hardCap
} from "./contextSerializer";
import { get } from "./db";
import { runtimeQueue } from "./generationQueue";
import { buildPromptFragments } from "./promptFragments";
import { cleanAndParseCourseJSON } from "./safeParse";
import { getMemory, getUserProfile } from "./userMemory";
import { getWebLLM } from "./webllmLoader";
import {
  getConceptMastery,
} from "./mastery";
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
  const conceptId =
  error?.concept ||
  error?.topic ||
  topic;

const conceptData =
  await getConceptMastery(
    conceptId,
  );

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

  const budget =
  getReinforcementBudget(
    conceptData.mastery,
    conceptData.confidence,
  );

  // =========================================
  // MEMORY COMPRESSION
  // =========================================

 
 const compressedErrors =
  budget.errors > 0
    ? hardCap(
        recentErrors
          .slice(-2)
          .map(
            (e: any) =>
              `Q:${e?.question || ""}
A:${e?.userAnswer || ""}
C:${e?.correct || ""}`,
          )
          .join("\n\n"),
        budget.errors,
      )
    : "";

  const compressedWeaknesses =
  budget.weaknesses > 0
    ? hardCap(
        Object.entries(
          memory?.weaknesses || {},
        )
          .slice(0, 5)
          .map(
            ([key, value]) =>
              `${key}:${value}`,
          )
          .join("\n"),
        budget.weaknesses,
      )
    : "";

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
SYSTEM:
Repair one misconception.

Rules:
- Focus only on the failed concept.
- Keep explanation short.
- Respect cognitive profile.
- Return JSON only.

PROFILE:
${cognitiveProfile}

STYLE:
${teachingStyle}

COGNITIVE:
${cognitiveFragments}

MASTERY:
${Math.round(conceptData.mastery * 100)}%

ERROR:
${error?.userExplanation}

WEAKNESSES:
${compressedWeaknesses}

HISTORY:
${compressedErrors}

OUTPUT:

{
"type":"short|multiple_choice|code|logic",
"question":"",
"options":[],
"answer":"",
"explanation":"",
"hint":"",
"difficulty":${difficulty}
}
`;

  // =========================================
  // GENERATION
  // =========================================

try {
  const rawRes = await runtimeQueue.enqueue(async () => {
    const { generate } = await getWebLLM();

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
      const chunks: string[] = [];

      for await (const chunk of rawRes) {
        const content =
          typeof chunk === "string"
            ? chunk
            : (chunk as any)
                ?.choices?.[0]
                ?.delta?.content || "";

        if (!content) continue;

        chunks.push(content);

        if (chunks.length > 120) {
          break;
        }
      }

      fullResponse = chunks.join("");

      fullResponse = hardCap(
        fullResponse,
        5000,
      );
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

function getReinforcementBudget(
  mastery: number,
  confidence: number,
) {
  const trusted =
    confidence >= 0.5;

  if (trusted && mastery >= 0.85) {
    return {
      errors: 0,
      weaknesses: 0,
      reasoning: 200,
      mode: "mastered",
    };
  }

  if (trusted && mastery >= 0.65) {
    return {
      errors: 250,
      weaknesses: 150,
      reasoning: 300,
      mode: "familiar",
    };
  }

  return {
    errors: 600,
    weaknesses: 400,
    reasoning: 500,
    mode: "learning",
  };
}