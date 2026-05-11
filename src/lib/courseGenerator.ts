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

  // ... dentro da generateCourse (Substitua a partir da linha 'const res = ...')

  // 1. Inicia a geração
  const res = await generate(prompt);

  // 2. O COLETOR: Garante que tudo vire string antes do parse
  let fullResponse = "";

  if (res) {
    if (typeof res === 'string') {
      fullResponse = res;
    } else {
      // Se for Stream (AsyncIterable), esvazia a torneira no balde
      for await (const chunk of res) {
        const content = typeof chunk === 'string' 
          ? chunk 
          : (chunk as any).choices?.[0]?.delta?.content || "";
        fullResponse += content;
      }
    }
  }

  // 3. O PARSE: Agora o safeParse recebe uma string garantida (mesmo que vazia)
  const parsed = safeParse(fullResponse);

  
    
  
  
    

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
