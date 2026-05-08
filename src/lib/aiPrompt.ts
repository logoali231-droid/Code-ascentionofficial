// src/lib/aiPrompt.ts
import { CognitiveProfile } from "@/types/core";

/**
 * Retorna as instruções específicas para cada perfil cognitivo.
 * Ajustado para os tipos exatos do core.ts.
 */
export function getCognitiveInstruction(profile: CognitiveProfile): string {
  switch (profile) {
    case "tdah":
      return "ADHD MODE: Use extremely short sentences, frequent breaks, and bold key terms. Never more than 2 sentences per paragraph.";
    case "Visual_Logic":
      return "VISUAL MODE: Use ASCII diagrams or structured lists to explain spatial relationships and logic flow.";
    case "Deep_Dive":
      return "EXPERT MODE: Focus on low-level details, memory management, and performance implications. Assume high prior knowledge.";
    default:
      return "STANDARD MODE: Balanced narrative with clear examples and steady progression.";
  }
}

/**
 * Constrói o prompt final respeitando as regras originais e a adaptação cognitiva.
 * Adicionada lógica para continuidade (isExtension).
 */
export function buildCoursePrompt(config: any) {
  const cognitiveStyle = getCognitiveInstruction(config.cognitive || "Standard");

  // Lógica de continuidade para evitar repetição de conteúdo
  const continuityContext = config.isExtension 
    ? `CONTINUATION: This is a follow-up. The last topic covered was "${config.lastTopic}". 
       Generate ${config.count || 3} NEW subsequent lessons that follow this sequence naturally.`
    : `START: This is the beginning of the course. Generate the first set of lessons.`;

  return `
Create a programming course in JSON format.

TOPIC: ${config.topic}
LEVEL: ${config.level}
DIFFICULTY: ${config.difficulty}

${continuityContext}

LEARNING STYLE & COGNITIVE ADAPTATION:
${cognitiveStyle}
${config.stylePrompt || "Explain clearly following the tone above."}

${config.userBase ? `BASE MATERIAL (USE ONLY THIS):\n${config.userBase}` : ""}

RULES:
- Follow LEARNING STYLE strictly.
- If base material exists, do not add external info.
- Do not hallucinate.
- Output ONLY valid JSON.
- Ensure lessons flow logically from the last topic.

FORMAT:
{
  "lessons": [
    {
      "title": "...",
      "explanation": "...",
      "exercises": [
        { "type": "mcq", "question": "...", "options": ["..."], "answer": "..." }
      ]
    }
  ]
}
`;
}