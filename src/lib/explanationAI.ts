"use client";

import { generate } from "./webllm";
import { getUserProfile, getMemory } from "./userMemory";
import { buildPromptFragments, compressContext } from "./promptFragments";
import { enqueueGeneration } from "./generationQueue";
import { safeParse } from "./safeParse";
import { validateExplanation } from "./lessonValidator"; // Importando o validador que você criou

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
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, v]) => `${k}`)
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
${cognitiveFragments}
... (seu prompt original aqui) ...
RETURN JSON:
{
  "title": "",
  "content": "",
  "analogy": ""
}
`;

  try {
    const res = await enqueueGeneration(() => generate(prompt));
    
    // COLETOR NEURAL: Transforma stream em string
    let fullText = "";
    if (res) {
      if (typeof res === 'string') {
        fullText = res;
      } else {
        for await (const chunk of res) {
          const content = typeof chunk === 'string' ? chunk : (chunk as any).choices?.[0]?.delta?.content || "";
          fullText += content;
        }
      }
    }

    const parsed = safeParse(fullText);

    // Validação de Integridade
    if (!parsed || !validateExplanation(parsed)) {
      return {
        title: lesson?.title || "Explanation Sync",
        content: "Neural link unstable. Recalibrating pedagogical focus...",
        analogy: "A glitch in the matrix."
      };
    }

    return parsed;
  } catch (err) {
    console.error("Explanation failed", err);
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
