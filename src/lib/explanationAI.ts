"use client";

import { generate } from "./webllm";
import { getUserProfile, getMemory } from "./userMemory";
import { buildPromptFragments, compressContext } from "./promptFragments";
import { enqueueGeneration } from "./generationQueue";
import { safeParse } from "./safeParse";
import { validateExplanation } from "./explanationValidator";

/* =========================================
   MAIN EXPLANATION GENERATOR
========================================= */

export async function generateExplanationAI({
  lesson,
  history,
  course,
}: any) {
  const profile = await getUserProfile();
  const memory = await getMemory();
  const userErrors = memory.lastErrors || [];

  const recentLessons = history?.map((l: any) => l.title).join(", ") || "none";

  const weaknesses = Object.entries(memory.weaknesses || {})
    .sort((a: any, b: any) => (b[1] as number) - (a[1] as number))
    .slice(0, 5)
    .map(([k]) => `${k}`)
    .join(", ");

  const compressedHistory = compressContext(JSON.stringify(history || []), 1800);
  const compressedErrors = compressContext(JSON.stringify(userErrors.slice(-5)), 1000);

  const cognitiveFragments = buildPromptFragments({
    cognitive: profile?.cognitive || "Standard",
    difficulty: profile?.level || 1,
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

LEVEL: ${profile?.level || 1}
COGNITIVE PROFILE: ${profile?.cognitive || "Standard"}

================================
CURRENT LESSON
================================

TITLE: ${lesson?.title || "Unknown"}
EXPLANATION: ${lesson?.explanation || ""}
CONTENT: ${lesson?.content || ""}

================================
LEARNING HISTORY
================================

RECENT LESSONS: ${recentLessons}
COMPRESSED HISTORY: ${compressedHistory}

================================
LEARNING WEAKNESSES
================================

WEAK TOPICS: ${weaknesses || "none"}
RECENT ERRORS: ${compressedErrors}

================================
RULES
================================
- Follow the TEACHING STYLE consistently
- Adapt pacing to the cognitive profile
- Use practical intuition; explain WHY things work
- Avoid giant walls of text; prefer layered explanations
- Return ONLY valid JSON: { "title": "", "content": "", "analogy": "" }
`;

  try {
    // FIX: Wrapped in async to satisfy the Promise return type requirement
    const res = await enqueueGeneration(async () => {
      return generate(prompt);
    });
    
    let fullResponse = "";
    if (res) {
      if (typeof res === 'string') {
        fullResponse = res;
      } else {
        for await (const chunk of res) {
          const content = typeof chunk === 'string' 
            ? chunk 
            : (chunk as any).choices?.[0]?.delta?.content || "";
          fullResponse += content;
        }
      }
    }

    const parsed = safeParse(fullResponse);

    if (!parsed || !validateExplanation(parsed)) {
      console.warn("Explanation validation failed or parse error.");
      return {
        title: lesson?.title || "Explanation",
        content: lesson?.explanation || "Neural link stable, but content refinement failed.",
        analogy: "A temporary glitch in the data stream."
      };
    }

    return parsed;
  } catch (error) {
    console.error("AI Explanation Error:", error);
    return null;
  }
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
  const profile = await getUserProfile();
  const memory = await getMemory();

  const relatedWeakness = Object.entries(memory.weaknesses || {})
    .sort((a: any, b: any) => (b[1] as number) - (a[1] as number))[0]?.[0] || "unknown";

  const cognitiveFragments = buildPromptFragments({
    cognitive: profile?.cognitive || "Standard",
    difficulty: profile?.level || 1,
    mastery: 35,
    reinforcement: true,
  });

  const prompt = `
You are an expert debugger and mentor.
The user made a mistake. Explain WHY the correct answer is right and why the user's logic might have tripped up.

${cognitiveFragments}

QUESTION: ${question}
CORRECT ANSWER: ${correct}
USER'S ANSWER: ${userAnswer}
USER'S REASONING: ${userExplanation || "None provided"}
RELATED WEAKNESS: ${relatedWeakness}

STYLE: ${course?.stylePrompt || "Supportive and clear"}

Return ONLY JSON:
{
  "explanation": "Brief breakdown of the mistake",
  "fix": "How to think about this next time",
  "analogy": "A simple comparison"
}
`;

  try {
    // FIX: Wrapped in async to satisfy the Promise return type requirement
    const res = await enqueueGeneration(async () => {
      return generate(prompt);
    });
    
    let fullResponse = "";
    if (res) {
      if (typeof res === 'string') {
        fullResponse = res;
      } else {
        for await (const chunk of res) {
          const content = typeof chunk === 'string' 
            ? chunk 
            : (chunk as any).choices?.[0]?.delta?.content || "";
          fullResponse += content;
        }
      }
    }

    return safeParse(fullResponse);
  } catch (error) {
    console.error("Error Explanation Failure:", error);
    return null;
  }
}
