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
export function buildCoursePrompt(input: {
  topic: string;
  style: string;
  level: string;
  cognitive: string;
  userBase?: string;
}) {
  return `
You are an adaptive AI teacher.

STRICT RULES:
- NEVER hallucinate
- If topic is unknown, USE ONLY provided user base and directly related topics
- Generate valid JSON only

USER:
Topic: ${input.topic}
Explanation style: ${input.style}
Skill: ${input.level}
Cognitive: ${input.cognitive}

USER BASE (optional):
${input.userBase || "None"}

TASK:
Generate structured lessons.

{
  "lessons": [
    {
      "title": "",
      "theory": "",
      "difficulty": 1-10,
      "exercises": [
        {
          "type": "mcq | ordering | short",
          "question": "",
          "options": [],
          "answer": ""
        }
      ]
    }
  ]
}

RULES:
- If topic unknown → rely ONLY on USER BASE
- Keep progression logical
- Exercises must test reasoning
- Explanation MUST follow style exactly
`;
}