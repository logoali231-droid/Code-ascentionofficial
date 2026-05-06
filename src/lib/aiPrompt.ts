/**
 * Constrói um prompt para gerar cursos adaptativos baseado nas entradas do usuário.
 * @param {object} input - Objeto contendo detalhes do usuário.
 * @param {string} input.topic - O tópico do curso.
 * @param {string} input.style - O estilo de explicação.
 * @param {string} input.level - O nível de habilidade do usuário.
 * @param {string} input.cognitive - O estilo cognitivo.
 * @param {string} [input.userBase] - Base de conhecimento opcional do usuário.
 * @returns {string} O prompt gerado para a IA.
 */
export function buildCoursePrompt(config: any) {
  return `
Create a programming course.

TOPIC: ${config.topic}
LEVEL: ${config.level}
DIFFICULTY: ${config.difficulty}

LEARNING STYLE:
${config.stylePrompt || "Explain clearly"}

${config.userBase ? `BASE MATERIAL:\n${config.userBase}` : ""}

RULES:
- Follow LEARNING STYLE strictly
- If base material exists, use ONLY it
- Do not hallucinate
- Return structured JSON

FORMAT:
{
  "lessons": [
    {
      "title": "...",
      "explanation": "...",
      "exercises": [...]
    }
  ]
}
`;
}