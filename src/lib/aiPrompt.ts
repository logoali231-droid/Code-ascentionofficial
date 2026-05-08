// src/lib/aiprompt.ts
import { CognitiveProfile } from "@/types/core"; // Importando do seu central de tipos

/**
 * Retorna as instruções específicas para cada perfil cognitivo
 */
export function getCognitiveInstruction(profile: CognitiveProfile): string {
  switch (profile) {
    case "tdah":
      return "ADHD MODE: Use extremely short sentences...";
    case "Visual_Logic":
      return "VISUAL MODE: Use ASCII diagrams...";
    case "Deep_Dive":
      return "EXPERT MODE: Low-level details only...";
    default:
      return "STANDARD MODE: Balanced narrative...";
  }
}

/**
 * Constrói o prompt final respeitando as regras originais e a adaptação cognitiva
 */
export function buildCoursePrompt(config: any) {
  const cognitiveStyle = getCognitiveInstruction(config.cognitive || "Standard");

  return `
Create a programming course in JSON format.

TOPIC: ${config.topic}
LEVEL: ${config.level}
DIFFICULTY: ${config.difficulty}

LEARNING STYLE & COGNITIVE ADAPTATION:
${cognitiveStyle}
${config.stylePrompt || "Explain clearly following the tone above."}

${config.userBase ? `BASE MATERIAL (USE ONLY THIS):\n${config.userBase}` : ""}

RULES:
- Follow LEARNING STYLE strictly
- If base material exists, do not add external info
- Do not hallucinate
- Output ONLY valid JSON

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
