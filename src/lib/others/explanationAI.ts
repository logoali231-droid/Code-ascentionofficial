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
  const currentMastery = userStats?.mastery || 50;
  const cognitiveProfile = profile?.cognitive || "Standard";

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

  const [
    rawMemory,
    rawCurriculumStats,
  ] = await Promise.all([
    course?.id
      ? getMemorySummary(course.id)
      : "",

    course?.id
      ? summarizeCurriculum(course.id)
      : "",
  ]);

  const compressedMemory = hardCap(
    rawMemory || "",
    1800,
  );

  const curriculumStats = hardCap(
    rawCurriculumStats || "",
    1600,
  );

  const compressedHistory = hardCap(
    serializeHistory(history, 6),
    1400,
  );



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
  // MODULE CONTEXT
  // =========================================

  const moduleContext = `
CURRENT MODULE:
${lesson?.moduleTitle || lesson?.module || "Unknown Module"}

MODULE SUMMARY:
${lesson?.moduleSummary || "No module summary available"}

MODULE DIFFICULTY:
${lesson?.difficulty || currentLevel}
`;

  // =========================================
  // LIGHTWEIGHT PROMPT
  // =========================================
  const lessonContent = hardCap(
    lesson?.content ||
    lesson?.explanation ||
    "",
    2200,
  );
  const prompt = `
You are an elite adaptive programming tutor operating inside the Code Ascension procedural education system.

Your mission:
Generate ONLY the explanation layer for the CURRENT lesson node.

DO NOT generate:
- complete courses
- giant tutorials
- excessive theory dumping
- repetitive summaries
- markdown books
- long introductions

Generate ONLY:
- focused conceptual explanation
- progressive intuition building
- concise technical guidance
- adaptive educational pacing

================================
COGNITIVE ADAPTATION LAYER
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
${currentLevel}

GLOBAL MASTERY:
${currentMastery}

================================
LONG TERM MEMORY
================================
${compressedMemory || "No memory snapshot available."}

================================
CURRICULUM STATE
================================
${curriculumStats || "Curriculum graph initializing."}

================================
MODULE CONTEXT
================================
${moduleContext}

================================
LESSON INPUT
================================
TITLE:
${lesson?.title || "Untitled"}

SUMMARY:
${hardCap(
    lesson?.summary ||
    lesson?.description ||
    "",
    600,
  )}

EXISTING CONTENT:
${lessonContent}

================================
RECENT SESSION HISTORY
================================
${compressedHistory}

================================
EXECUTION RULES
================================

- Respect the cognitive profile STRICTLY.
- Respect the user teaching style STRICTLY.
- Keep explanations compact and mobile-friendly.
- Prefer layered explanations over dense paragraphs.
- Start from intuition before syntax.
- Use examples only when necessary.
- Avoid repeating previous lesson information.
- Connect concepts to prior mastery when possible.
- If mastery is high, reduce beginner explanations.
- If mastery is low, increase scaffolding gradually.
- Maintain adaptive pacing.
- Keep token generation controlled.
- Avoid unnecessary verbosity.

================================
OUTPUT RULES
================================

Return ONLY valid JSON.

{
  "title": "Adaptive explanation title",
  "content": "Main explanation body",
  "analogy": "Short conceptual analogy",
  "keyTakeaway": "One sentence summary",
  "difficulty": ${lesson?.difficulty || currentLevel}
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
}
