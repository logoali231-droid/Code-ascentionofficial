"use client";

import { generate } from "./webllm";

import { getAdaptiveMetrics } from "./adaptive";

import { getMemory } from "./userMemory";

import { get } from "./db";

import { safeParse } from "./safeParse";

import {
  buildPromptFragments,
  compressContext,
} from "./promptFragments";
import { enqueueGeneration } from "./generationQueue";

/* =========================================
   GENERATE REINFORCEMENT
========================================= */

export async function generateReinforcement(
  error: any,
  course: any
) {
  const baseDifficulty =
    error?.difficulty || 1;

  const user =
    await get("user", "main");

  const memory =
    await getMemory();

  const topic =
    course?.topic ||
    "programming";

  const level =
    course?.level ||
    "beginner";

  /* =========================================
     ADAPTIVE METRICS
  ========================================= */

  const metrics =
    await getAdaptiveMetrics();

  /*
    FINAL DIFFICULTY:
    mistura:
    - adaptive system
    - error difficulty
    - struggling state
  */

  let difficulty =
    Math.round(
      (
        metrics.difficulty +
        baseDifficulty
      ) / 2
    );

  const recentErrors =
    memory.lastErrors?.slice(-5) || [];

  const sameTopicErrors =
    memory.lastErrors.filter(
      (e: any) =>
        e.topic === topic
    ).length;

  const struggling =
    sameTopicErrors >= 3;

  /*
    se struggling:
    reduz dificuldade REALMENTE
  */

  if (struggling) {
    difficulty = Math.max(
      1,
      difficulty - 1
    );
  }

  /*
    clamp
  */

  difficulty = Math.min(
    5,
    Math.max(1, difficulty)
  );

  /* =========================================
     PROMPT FRAGMENTS
  ========================================= */

  const cognitiveFragments =
    buildPromptFragments({
      cognitive:
        user?.cognitive ||
        "Standard",

      difficulty,

      mastery:
        struggling ? 30 : 65,

      reinforcement: true,
    });

  const compressedErrors =
    compressContext(
      JSON.stringify(
        recentErrors
      ),
      1200
    );

  const compressedWeaknesses =
    compressContext(
      JSON.stringify(
        memory.weaknesses || {}
      ),
      1000
    );

  /* =========================================
     PROMPT
  ========================================= */

  const prompt = `
You are an elite adaptive programming tutor.

Your mission:
repair understanding,
not just test memory.

${cognitiveFragments}

================================
TASK
================================

Create ONE reinforcement exercise
focused ONLY on the user's mistake.

================================
COURSE CONTEXT
================================

TOPIC:
${topic}

USER LEVEL:
${level}

COGNITIVE PROFILE:
${user?.cognitive || "Standard"}

STYLE:
${course?.stylePrompt || "Explain clearly"}

================================
ERROR CONTEXT
================================

ORIGINAL QUESTION:
${error.question}

USER WRONG ANSWER:
${error.userAnswer}

CORRECT ANSWER:
${error.correct}

================================
ADAPTIVE STATE
================================

BASE ERROR DIFFICULTY:
${baseDifficulty}

ADAPTIVE SYSTEM DIFFICULTY:
${metrics.difficulty}

FINAL TARGET DIFFICULTY:
${difficulty}

USER STATE:
${struggling ? "STRUGGLING" : "LEARNING"}

================================
WEAKNESSES
================================

${compressedWeaknesses}

================================
RECENT ERRORS
================================

${compressedErrors}

================================
RULES
================================

- Return ONLY valid JSON
- No markdown
- No explanations outside JSON
- Focus ONLY on the mistake
- Avoid introducing unrelated concepts
- Repair the misunderstanding
- Reinforce mental model
- Keep continuity with previous mistakes

================================
STYLE RULES
================================

Maintain the teaching style consistently,
BUT clarity comes first.

================================
DIFFICULTY RULES
================================

If user is STRUGGLING:
- simplify wording
- reduce abstraction
- isolate ONE concept
- reduce cognitive load

Otherwise:
- match FINAL TARGET DIFFICULTY
- encourage active reasoning

================================
COGNITIVE RULES
================================

ADHD / tdah:
- short blocks
- minimal text
- fast feedback
- one concept only

Deep_Dive:
- deeper reasoning
- conceptual understanding

Visual_Logic:
- patterns
- examples
- comparisons

Standard:
- balanced pacing

================================
LEVEL RULES
================================

beginner:
- avoid jargon
- practical intuition

intermediate:
- moderate abstraction

advanced:
- technical precision

NEVER exceed user level.

================================
OUTPUT FORMAT
================================

{
  "type": "short | multiple_choice | code | logic",

  "question": "...",

  "options": ["..."],

  "answer": "...",

  "explanation": "short explanation"
}
`;

  const rawRes = await enqueueGeneration(async () => {
    return generate(prompt);
  });
  
  

  // 2. Coletor Neural: Converte Stream/Undefined para String
  let res = "";
  if (rawRes) {
    if (typeof rawRes === 'string') {
      res = rawRes;
    } else {
      // Consome o stream do WebLLM para o Samsung M23 não travar
      for await (const chunk of rawRes) {
        const content = typeof chunk === 'string' 
          ? chunk 
          : (chunk as any).choices?.[0]?.delta?.content || "";
        res += content;
      }
    }
  }

  // 3. Agora o 'res' é garantidamente uma string para o safeParse
  const parsed = safeParse(res);

  if (parsed) {
    return parsed;
  }

  /* =========================================
     FALLBACK (Permanece igual...)
  ========================================= */

  if (parsed) {
    return parsed;
  }

  /* =========================================
     FALLBACK
  ========================================= */

  return {
    type: "short",

    question:
      `Let's retry carefully:\n${error.question}`,

    answer:
      error.correct || "",

    explanation:
      struggling
        ? "Focus on the core concept only."
        : "Retry focusing on the correct reasoning.",
  };
}
