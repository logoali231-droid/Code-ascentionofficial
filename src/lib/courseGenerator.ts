"use client";

import { generate } from "./webllm";
import { safeParse } from "./safeParse";
import { buildPromptFragments, compressContext } from "./promptFragments";
import { enqueueGeneration } from "./generationQueue";
import { validateCourse } from "./courseValidator"; // Mude de validateCourseStructure para validateCourse

export async function generateCourse({
  topic,
  style,
  level,
  difficulty,
  baseMaterial,
  stylePrompt,
  cognitive,
}: any) {
  const cognitiveFragments = buildPromptFragments({
    cognitive: cognitive || "Standard",
    difficulty: difficulty || 1,
    mastery: 50,
    reinforcement: false,
  });

  const compressedMaterial = baseMaterial ? compressContext(baseMaterial, 5000) : "";

  const prompt = `
You are an elite curriculum architect.
Your mission: create a coherent, progressive, adaptive programming course.

${cognitiveFragments}

================================
COURSE CONFIG
================================
TOPIC: ${topic}
STYLE: ${style}
LEVEL: ${level}
DIFFICULTY: ${difficulty}/5

================================
TEACHING STYLE
================================
${stylePrompt || "Explain clearly and simply"}

================================
BASE MATERIAL
================================
${compressedMaterial || "none"}

================================
COURSE RULES
================================
- Scale complexity gradually
- ADHD / tdah: shorter modules, clearer segmentation
- Deep_Dive: deeper theory, mechanics
- Visual_Logic: patterns, analogies
- beginner: fundamentals first | advanced: optimization, edge cases

================================
OUTPUT FORMAT
================================
Return ONLY valid JSON.
{
  "title": "",
  "description": "",
  "tags": [],
  "lessons": [
    { "title": "", "summary": "", "difficulty": 1 }
  ]
}
`;

  try {
    // 1. Correct variable name 'prompt' used here
    const rawRes = await enqueueGeneration(async () => {
      return generate(prompt); 
    });

    let fullResponse = "";
    
    // 2. Ensure we check 'rawRes' (the result from the queue)
    if (rawRes) {
      if (typeof rawRes === 'string') {
        fullResponse = rawRes;
      } else {
        // 3. Iterate through the stream (rawRes)
        for await (const chunk of rawRes) {
          const content = typeof chunk === 'string' 
            ? chunk 
            : (chunk as any).choices?.[0]?.delta?.content || "";
          fullResponse += content;
        }
      }
    }

    // 4. Parse the final concatenated string
    const parsed = safeParse(fullResponse);
    
    // ... rest of your validation logic
    // Validação com o seu validateCourseStructure
    if (!parsed || !validateCourse(parsed)) {
      console.error("Course validation failed. Using fallback.");
      return {
        title: `${topic} Course`,
        description: `Foundational guide for ${topic}.`,
        tags: [topic, level],
        lessons: [
          { title: `Introduction to ${topic}`, summary: `Foundations of ${topic}.`, difficulty: 1 }
        ],
      };
    }

    return parsed;
  } catch (error) {
    console.error("Course Generation Failure:", error);
    return null;
  }
}
