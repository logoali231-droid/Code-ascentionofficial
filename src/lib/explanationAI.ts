"use client";

import { generate } from "./webllm";
import { getUserProfile, getMemory } from "./userMemory";
import { buildPromptFragments, compressContext } from "./promptFragments";
import { runtimeQueue } from "./generationQueue";
import { safeParse } from "./safeParse";
import { validateExplanation } from "./explanationValidator";
import { getMemorySummary } from "./contextMemory";
import { summarizeCurriculum } from "./curriculumState";
import { get } from "./db"; 


/* =========================================
   MAIN EXPLANATION GENERATOR
========================================= */
export async function generateExplanationAI({
  lesson,
  history,
  course,
}: any) {
  // ALTERADO: Busca paralela no banco para não travar a UI e carregar os dados reais de level e mastery
  const [profile, userStats] = await Promise.all([
    getUserProfile(),
    get("user", "main") // Busca os dados de XP/Level/Mastery gerenciados pela economia
  ]);

  // ADICIONADO: Declaração das variáveis que estavam gerando o erro de compilação
  const currentLevel = userStats?.level || 1;
  const currentMastery = userStats?.mastery || 50;

    // 1. ADICIONADO: Recupera o resumo de memória otimizado para o curso atual
  const compressedMemory = course?.id ? await getMemorySummary(course.id) : "";

  // 2. ADICIONADO: Recupera o estado atualizado em tempo real da árvore de maestria
  const curriculumStats = course?.id ? await summarizeCurriculum(course.id) : "";

  // Mantemos o histórico recente do chat comprimido para manter a coerência da sessão atual
  const compressedHistory = compressContext(JSON.stringify(history || []), 1200);

  const cognitiveFragments = buildPromptFragments({
    cognitive: profile?.cognitive || "Standard",
    difficulty: currentLevel,   // Alinhado com o economy
    mastery: currentMastery,     // Alinhado com a maestria global real do banco
    reinforcement: false,
  });
  // O estilo de ensino agora é uma fusão entre o pedido do perfil, estilo personalizado e o prompt do curso,
  //  garantindo que a voz seja consistente com as preferências do usuário e o contexto do curso.
  const teachingStyle = profile?.explanationStyle || profile?.customStyle || course?.stylePrompt || "Explain clearly";
  const cognitiveProfileName = profile?.cognitive || "Standard";

  
  const prompt = `
You are an elite adaptive programming tutor.
Your mission is to maximize understanding, retention, clarity, and intuition.

=================================
CORE ADAPTATION LAYER (READ FIRST)
=================================
${cognitiveFragments}

- COGNITIVE PROFILE DIRECTIVE: You must structure your text formatting, length, and content pacing strictly tailored to the "${cognitiveProfileName}" profile requirement above.
- TEACHING PERSONA DIRECTIVE: You must speak, explain, and contextualize using the following persona/style: "${teachingStyle}".

================================
COMPRESSED USER LONG-TERM MEMORY
================================
${compressedMemory || "No memory snapshot available yet."}

================================
REAL-TIME SKILL MASTERY TREE
================================
${curriculumStats || "Graph initializing."}

================================
CURRENT LESSON & SESSION CONTEXT
================================
TITLE: ${lesson?.title || "Unknown"}
EXPLANATION: ${lesson?.explanation || ""}
CONTENT: ${lesson?.content || ""}

COMPRESSED CHAT HISTORY: ${compressedHistory}

================================
CRITICAL EXECUTION RULES
================================
1. FUSE COGNITIVE + STYLE: You MUST merge the requested style ("${teachingStyle}") with the structural needs of the cognitive profile ("${cognitiveProfileName}"). For example, if the profile asks for short text blocks and aggressive dopamine hits (TDAH), write those fast blocks using the persona's voice and vocabulary.
2. Use the "COMPRESSED USER LONG-TERM MEMORY" and "REAL-TIME SKILL MASTERY TREE" to avoid topics the user is already failing at or to build connections with areas where they already have high mastery.
3. Avoid giant walls of text; strictly prefer layered explanations or structural pacing required by the profile.
4. Output MUST be purely a valid JSON object matching this schema:
{
  "title": "A custom title written in the persona style",
  "content": "The actual adapted explanation text body",
  "analogy": "A brilliant technical analogy matching the teaching style context"
}
`;

  try {
    const res = await runtimeQueue.enqueue(async () => {
  return generate(prompt);
}, 1);

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

  const teachingStyle = profile?.explanationStyle || profile?.customStyle || course?.stylePrompt || "Supportive and clear";
  const cognitiveProfileName = profile?.cognitive || "Standard";

  const prompt = `
You are an expert debugger and mentor.
The user made a mistake. Your task is to explain WHY the correct answer is right and why the user's logic might have tripped up.

=================================
ADAPTATION SPECS
=================================
${cognitiveFragments}
COGNITIVE STRUCTURE: ${cognitiveProfileName}
MENTOR TEACHING STYLE: ${teachingStyle}

=================================
ERROR DATA TRACE
=================================
QUESTION: ${question}
CORRECT ANSWER: ${correct}
USER'S ANSWER: ${userAnswer}
USER'S REASONING: ${userExplanation || "None provided"}
RELATED WEAKNESS: ${relatedWeakness}

=================================
CRITICAL OUTPUT RULES
=================================
1. Use the requested MENTOR TEACHING STYLE (${teachingStyle}) to write the response tokens. If the style is sarcastic, point out the error sarcastically. If it's motivational, cheer them up.
2. Respect the COGNITIVE STRUCTURE (${cognitiveProfileName}) limits (e.g. text density, formatting, bullet points).
3. Return ONLY a strict JSON block:
{
  "explanation": "Brief breakdown of the mistake written in your persona style",
  "fix": "How to think about this next time, formatted for the cognitive profile",
  "analogy": "A simple comparison matching the persona's vibe"
}
`;

  try {
    const res = await runtimeQueue.enqueue(async () => {
  return generate(prompt);
}, 1);

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