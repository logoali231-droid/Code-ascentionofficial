"use client";

import { generate } from "./webllm";

import {
  getUserProfile,
  getMemory,
} from "./userMemory";

import {
  buildPromptFragments,
  compressContext,
} from "./promptFragments"

import { enqueueGeneration } from "./generationQueue";

/* =========================================
   MAIN EXPLANATION GENERATOR
========================================= */

export async function generateExplanationAI({
  lesson,
  history,
  course,
}: any) {
  const profile =
    await getUserProfile();

  const memory =
    await getMemory();

  const userErrors =
    memory.lastErrors || [];

  const recentLessons =
    history
      ?.map((l: any) => l.title)
      .join(", ") || "none";

  const weaknesses =
    Object.entries(
      memory.weaknesses || {}
    )
      .sort(
        (a: any, b: any) =>
          b[1] - a[1]
      )
      .slice(0, 5)
      .map(([k, v]) => `${k}`)
      .join(", ");

  const compressedHistory =
    compressContext(
      JSON.stringify(history || []),
      1800
    );

  const compressedErrors =
    compressContext(
      JSON.stringify(
        userErrors.slice(-5)
      ),
      1000
    );

  const cognitiveFragments =
    buildPromptFragments({
      cognitive:
        profile?.cognitive ||
        "Standard",

      difficulty:
        profile?.level || 1,

      mastery: 50,

      reinforcement: false,
    });

  const prompt = `
You are an elite adaptive programming tutor.

Your mission:
maximize understanding,
retention,
clarity,
and intuition.

${cognitiveFragments}

================================
TEACHING STYLE
================================

${course?.stylePrompt || "Explain clearly"}

You MUST maintain the teaching style consistently,
BUT clarity and pedagogy ALWAYS come first.

================================
USER PROFILE
================================

LEVEL:
${profile?.level || 1}

COGNITIVE PROFILE:
${profile?.cognitive || "Standard"}

================================
CURRENT LESSON
================================

TITLE:
${lesson?.title || "Unknown"}

EXPLANATION:
${lesson?.explanation || ""}

CONTENT:
${lesson?.content || ""}

================================
LEARNING HISTORY
================================

RECENT LESSONS:
${recentLessons}

COMPRESSED HISTORY:
${compressedHistory}

================================
LEARNING WEAKNESSES
================================

WEAK TOPICS:
${weaknesses || "none"}

RECENT ERRORS:
${compressedErrors}

================================
RULES
================================

- Follow the TEACHING STYLE consistently
- Adapt pacing to the cognitive profile
- Avoid repetition
- Use practical intuition
- Explain WHY things work
- Keep explanations engaging
- Reinforce weak concepts subtly
- Avoid hallucinations
- Avoid giant walls of text
- Prefer layered explanations
- Use examples when useful

LEVEL ADAPTATION:

beginner:
- simple language
- avoid jargon
- focus on intuition

intermediate:
- moderate technical depth
- practical examples

advanced:
- precise terminology
- deeper mechanics
- edge cases
`;

const response =
  await enqueueGeneration(() =>
    generate(prompt)
  );

return response;
}

/* =========================================
   ERROR EXPLANATION
========================================= */

export async function explainError({
  question,
  correct,
  userAnswer,
  userExplanation,
  course,
}: any) {
  const profile =
    await getUserProfile();

  const memory =
    await getMemory();

  const relatedWeakness =
    Object.entries(
      memory.weaknesses || {}
    )
      .sort(
        (a: any, b: any) =>
          b[1] - a[1]
      )[0]?.[0] || "unknown";

  const cognitiveFragments =
    buildPromptFragments({
      cognitive:
        profile?.cognitive ||
        "Standard",

      difficulty:
        profile?.level || 1,

      mastery: 35,

      reinforcement: true,
    });

  const prompt = `
You are an adaptive programming mentor.

The user made a mistake.

Your goal:
repair understanding,
NOT shame the user.

${cognitiveFragments}

================================
TEACHING STYLE
================================

${course?.stylePrompt || "Explain clearly"}

Maintain the style consistently.

================================
QUESTION
================================

${question}

================================
USER ANSWER
================================

${userAnswer}

================================
CORRECT ANSWER
================================

${correct}

================================
USER REASONING
================================

${userExplanation || "none"}

================================
USER PROFILE
================================

LEVEL:
${profile?.level || 1}

COGNITIVE:
${profile?.cognitive || "Standard"}

================================
WEAK AREA
================================

${relatedWeakness}

================================
RULES
================================

- Explain WHY the answer is wrong
- Explain the misunderstanding
- Repair mental model
- Connect to weak area
- Be encouraging but honest
- Avoid robotic tone
- Avoid punishment language
- Keep clarity first
- Use examples if useful
- Reinforce fundamentals
`;

  const raw =
  await enqueueGeneration(() =>
    generate(prompt)
  );

return raw;
}