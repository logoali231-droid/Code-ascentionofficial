// src/lib/aiPrompt.ts
import { CognitiveProfile } from "@/types/core";
import { getKnowledgeGraph } from "./knowledgeGraph"; // Assumindo exportação
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



export async function buildCoursePrompt(topic: string, learningState: string, courseId: string, profile: CognitiveProfile) {
  const graph = await getKnowledgeGraph(courseId);
  const cognitiveStyle = getCognitiveInstruction(profile); // <-- Chama a função aqui

  const priorityTopics = graph?.nodes
    .filter(node => (node.mastery || 0) < 0.4)
    .slice(0, 5) // <-- Evita estourar o contexto
    .map(node => node.id)
    .join(", ");

  const reinforcementContext = priorityTopics 
    ? `\n[SISTEMA_DE_REFORÇO]: Foco nas lacunas: ${priorityTopics}.`
    : "";

  return `
    ${cognitiveStyle} 
    [PERSONA]: Você é o mentor do sistema Code Ascension. Use tom Cyberpunk.
    [OBJETIVO]: Ministrar curso sobre ${topic}.
    [ESTADO_ATUAL]: ${learningState}
    ${reinforcementContext}
    
    DIRETRIZES:
    - Retorne APENAS o conteúdo da lição em formato JSON ou Markdown estruturado.
    - Mastery > 80% = Ignorar explicação detalhada.
    - Se houver lacunas em ${priorityTopics}, use analogias rápidas para revisá-los.
  `.trim();
}
