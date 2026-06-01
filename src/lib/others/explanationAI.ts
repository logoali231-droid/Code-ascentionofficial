"use client";

import { getMemorySummary } from "./contextMemory";
import { hardCap, serializeHistory } from "./contextSerializer";
import { summarizeCurriculum } from "./curriculumState";
import { get } from "./db";
import { validateExplanation } from "./explanationValidator";
import { runtimeQueue } from "./generationQueue";
import { buildPromptFragments } from "./promptFragments";
import { cleanAndParseCourseJSON } from "./safeParse";
import { getMemory, getUserProfile } from "./userMemory";
import { getWebLLM } from "./webllmLoader";
import {
  getConceptMastery,
} from "./mastery";

function getExplanationBudget(
  mastery: number,
  confidence: number,
) {
  const trusted =
    confidence >= 0.5;

  if (trusted && mastery >= 0.85) {
    return {
      memory: 0,
      history: 0,
      content: 500,
      mode: "expert",
    };
  }

  if (trusted && mastery >= 0.65) {
    return {
      memory: 300,
      history: 300,
      content: 700,
      mode: "intermediate",
    };
  }

  return {
    memory: 800,
    history: 600,
    content: 1200,
    mode: "learning",
  };
}

/* =========================================
   MAIN EXPLANATION GENERATOR
========================================= */



export async function generateExplanationAI(
  { lesson, history, course }: any,
  signal?: AbortSignal,
) {
  // =========================================
  // PARALLEL USER STATE LOAD
  // =========================================

  const [profile, userStats] = await Promise.all([
    getUserProfile(),
    get("user", "main"),
  ]);

  // =========================================
  // REAL USER STATE
  // =========================================

  const currentLevel = userStats?.level || 1;
  const conceptId =
    lesson?.concept ||
    lesson?.slug ||
    lesson?.title ||
    "unknown";

  const conceptData =
    await getConceptMastery(
      conceptId,
    );

  const conceptMastery =
    conceptData.mastery;

  const conceptConfidence =
    conceptData.confidence;
  const currentMastery = userStats?.mastery || 50;
  const cognitiveProfile = profile?.cognitive || "Standard";

  const budget =
    getExplanationBudget(
      conceptMastery,
      conceptConfidence,
    );

  // =========================================
  // USER-CONTROLLED STYLE LAYER
  // =========================================

  const teachingStyle =
    profile?.explanationStyle ||
    profile?.customStyle ||
    course?.stylePrompt ||
    "Explain clearly and progressively";

  // =========================================
  // MEMORY SYSTEMS
  // =========================================

  const rawMemory =
    course?.id
      ? await getMemorySummary(course.id)
      : "";
  const compressedMemory =
    budget.memory > 0
      ? hardCap(
        rawMemory || "",
        budget.memory,
      )
      : "";


  const compressedHistory =
    budget.history > 0
      ? hardCap(
        serializeHistory(history, 3),
        budget.history,
      )
      : "";



  // =========================================
  // ADAPTIVE COGNITIVE FRAGMENTS
  // =========================================

  const cognitiveFragments = buildPromptFragments({
    cognitive: cognitiveProfile,
    difficulty: currentLevel,
    mastery: currentMastery,
    reinforcement: false,
  });
  // =========================================
  // LIGHTWEIGHT PROMPT
  // =========================================
  const lessonContent = hardCap(
    lesson?.content ||
    lesson?.explanation ||
    "",
    budget.content,
  );
  const prompt = `
SYSTEM:
Adaptive programming tutor.

Task:
Generate ONLY a concise explanation for the current lesson.

Rules:
- Respect cognitive profile.
- Respect teaching style.
- Intuition before syntax.
- Compact explanations.
- Avoid repetition.
- Avoid long tutorials.
- Connect with prior knowledge when useful.
- Mobile-friendly.
- Return JSON only.

PROFILE:
${cognitiveProfile}

STYLE:
${teachingStyle}

USER:
lvl=${currentLevel}
mastery=${currentMastery}

COGNITIVE:
${cognitiveFragments}

MEMORY:
${compressedMemory || "none"}

LESSON:
title=${lesson?.title || "Untitled"}

summary=${hardCap(
    lesson?.summary ||
    lesson?.description ||
    "",
    400,
  )
    }

module=${lesson?.moduleTitle ||
    lesson?.module ||
    "Unknown"
    }

difficulty=${lesson?.difficulty ||
    currentLevel
    }

CONTENT:

${lessonContent}

HISTORY:
${compressedHistory || "No recent history."}

OUTPUT:

{
  "title": string,
  "content": string,
  "analogy": string,
  "keyTakeaway": string,
  "difficulty": number
}
`;

  try {
    const res = await runtimeQueue.enqueue(async () => {
      const { generate } = await getWebLLM();

      return generate(
        prompt,
        0.65,
        undefined,
        signal,
      );
    }, 1);

    let fullResponse = "";

    if (res) {
      if (typeof res === "string") {
        fullResponse = res;
      } else {
        const chunks: string[] = [];

        for await (const chunk of res) {
          const content =
            typeof chunk === "string"
              ? chunk
              : (chunk as any)
                ?.choices?.[0]
                ?.delta?.content || "";

          if (!content) continue;

          chunks.push(content);

          // MOBILE SAFE LIMIT
          if (chunks.length > 180) {
            break;
          }
        }

        fullResponse = chunks.join("");

        // FINAL HARD CAP
        fullResponse = hardCap(
          fullResponse,
          8000,
        );
      }
    }

    const parsed =
      cleanAndParseCourseJSON(fullResponse);

    if (
      !parsed ||
      !(await validateExplanation(parsed))
    ) {
      console.warn(
        "Explanation validation failed."
      );

      return {
        title:
          lesson?.title || "Explanation",

        content:
          lesson?.content ||
          lesson?.summary ||
          "Adaptive explanation fallback activated.",

        analogy:
          "The neural bridge partially stabilized.",

        keyTakeaway:
          "Focus on the core concept first.",

        difficulty:
          lesson?.difficulty || currentLevel,
      };
    }

    return parsed;

  } catch (error) {
    console.error(
      "AI Explanation Error:",
      error,
    );

    return {
      title:
        lesson?.title ||
        "Explanation Failure",

      content:
        "The explanation pipeline encountered instability.",

      analogy:
        "Like a compiler losing its syntax tree mid-build.",

      keyTakeaway:
        "Retry generation with lighter context.",

      difficulty:
        lesson?.difficulty ||
        currentLevel,
    };
  }

  /* =========================================
     ERROR EXPLANATION
  ========================================= */


}
export async function explainError(
  { question, correct, userAnswer, userExplanation, course }: any,
  signal?: AbortSignal,
) {
  const [profile, memory] =
    await Promise.all([
      getUserProfile(),
      getMemory(),
    ]);



  const relatedWeakness =
    Object.entries(memory?.weaknesses || {}).sort(
      (a: any, b: any) => (b[1] as number) - (a[1] as number),
    )[0]?.[0] || "unknown";

  const cognitiveProfile = profile?.cognitive || "Standard";

  const cognitiveFragments = buildPromptFragments({
    cognitive: cognitiveProfile,
    difficulty: profile?.level || 1,
    mastery: 35,
    reinforcement: true,
  });

  const teachingStyle =
    profile?.explanationStyle ||
    profile?.customStyle ||
    course?.stylePrompt ||
    "Supportive and clear";

  const prompt = `
You are an adaptive debugging mentor.

Your mission:
Explain the reasoning mistake clearly and efficiently.

DO NOT:
- generate giant lectures
- shame the user
- generate unnecessary theory
- repeat the question excessively

Generate ONLY:
- concise mistake analysis
- corrected reasoning path
- conceptual repair guidance

================================
COGNITIVE PROFILE
================================
${cognitiveFragments}

PROFILE:
${cognitiveProfile}

STYLE:
${teachingStyle}

================================
ERROR TRACE
================================
QUESTION:
${question}

CORRECT ANSWER:
${correct}

USER ANSWER:
${userAnswer}

USER REASONING:
${userExplanation || "None provided"}

RELATED WEAKNESS:
${relatedWeakness}

================================
EXECUTION RULES
================================

- Respect the user's cognitive profile.
- Respect the user's preferred teaching style.
- Keep explanation concise.
- Focus on WHY the mistake happened.
- Rebuild the mental model progressively.
- Avoid aggressive wording.
- Keep formatting lightweight.

================================
OUTPUT
================================

Return ONLY valid JSON.

{
  "explanation": "Why the mistake happened",
  "fix": "Correct reasoning path",
  "analogy": "Short conceptual comparison",
  "keyTakeaway": "One-line correction insight"
}
`;

  try {
    const res = await runtimeQueue.enqueue(async () => {
      const { generate } = await getWebLLM();

      return generate(
        prompt,
        0.65,
        undefined,
        signal,
      );
    }, 1);

    let fullResponse = "";

    if (res) {
      if (typeof res === "string") {
        fullResponse = res;
      } else {
        const chunks: string[] = [];

        for await (const chunk of res) {
          const content =
            typeof chunk === "string"
              ? chunk
              : (chunk as any)
                ?.choices?.[0]
                ?.delta?.content || "";

          if (!content) continue;

          chunks.push(content);

          // MOBILE SAFE LIMIT
          if (chunks.length > 180) {
            break;
          }
        }

        fullResponse = chunks.join("");

        // FINAL HARD CAP
        fullResponse = hardCap(
          fullResponse,
          8000,
        );
      }
    }

    const parsed =
      cleanAndParseCourseJSON(fullResponse);

    if (
      !parsed ||
      !(await validateExplanation(parsed))
    ) {
      console.warn(
        "Explanation validation failed."
      );

      return {
        explanation:
          "The reasoning path diverged from the core concept.",

        fix:
          "Re-evaluate the logic step by step using the correct conceptual model.",

        analogy:
          "Like debugging a function with one incorrect condition branch.",

        keyTakeaway:
          "Focus on the reasoning structure before the final answer.",
      };
    }

    return parsed;

  } catch (error) {
    console.error(
      "AI Explanation Error:",
      error,
    );

    return {
      explanation:
        "The reasoning path diverged from the core concept.",

      fix:
        "Re-evaluate the logic step by step using the correct conceptual model.",

      analogy:
        "Like debugging a function with one incorrect condition branch.",

      keyTakeaway:
        "Focus on the reasoning structure before the final answer.",
    };
  }
}
