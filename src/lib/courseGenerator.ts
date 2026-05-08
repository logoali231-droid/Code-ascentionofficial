"use client";

import { generate } from "./webllm";

import { safeParse } from "./safeParse";

import {
  buildPromptFragments,
  compressContext,
} from "./promptFragments";

/**
 * =========================================
 * GENERATE COURSE
 * =========================================
 */

export async function generateCourse({
  topic,
  style,
  level,
  difficulty,
  baseMaterial,
  stylePrompt,
  cognitive,
}: any) {
  /*
    Cognitive adaptation fragments
  */

  const cognitiveFragments =
    buildPromptFragments({
      cognitive:
        cognitive || "Standard",

      difficulty:
        difficulty || 1,

      mastery: 50,

      reinforcement: false,
    });

  /*
    Compress huge base materials
    to avoid context explosion
  */

  const compressedMaterial =
    baseMaterial
      ? compressContext(
          baseMaterial,
          5000
        )
      : "";

  /*
    Prompt
  */

  const prompt = `
You are an elite curriculum architect.

Your mission:
create a coherent,
progressive,
adaptive programming course.

${cognitiveFragments}

================================
COURSE CONFIG
================================

TOPIC:
${topic}

STYLE:
${style}

LEVEL:
${level}

DIFFICULTY:
${difficulty}/5

================================
TEACHING STYLE
================================

${stylePrompt || "Explain clearly and simply"}

You MUST maintain this teaching style
consistently across the curriculum.

================================
BASE MATERIAL
================================

${
  compressedMaterial
    ? compressedMaterial
    : "none"
}

IMPORTANT:
If BASE MATERIAL exists:
- prioritize it heavily
- stay aligned with it
- avoid contradicting it
- avoid hallucinating external facts

================================
COURSE RULES
================================

The course must:
- feel progressive
- avoid random ordering
- start from foundations
- scale complexity gradually
- adapt to the user level
- avoid giant difficulty spikes
- include practical learning
- encourage intuition
- reinforce fundamentals naturally

================================
COGNITIVE ADAPTATION
================================

ADHD / tdah:
- shorter modules
- clearer segmentation
- immediate practice
- low cognitive overload

Deep_Dive:
- deeper theory
- internal mechanics
- conceptual rigor

Visual_Logic:
- patterns
- analogies
- visual reasoning

Standard:
- balanced structure

================================
LEVEL RULES
================================

beginner:
- fundamentals first
- simple terminology
- guided progression

intermediate:
- practical abstraction
- architecture concepts

advanced:
- optimization
- internals
- edge cases

================================
OUTPUT FORMAT
================================

Return ONLY valid JSON.

{
  "title": "",

  "description": "",

  "tags": [],

  "lessons": [
    {
      "title": "",
      "summary": "",
      "difficulty": 1
    }
  ]
}
`;

  const res =
    await generate(prompt);

  const parsed =
    safeParse(res);

  /*
    Fallback
  */

  if (!parsed) {
    return {
      title:
        `${topic} Course`,

      description:
        `Generated course for ${topic}.`,

      tags: [
        topic,
        level,
      ],

      lessons: [
        {
          title:
            `Introduction to ${topic}`,

          summary:
            `Basic foundations of ${topic}.`,

          difficulty: 1,
        },
      ],
    };
  }

  return parsed;
}