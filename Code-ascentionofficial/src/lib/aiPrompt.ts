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
- If topic is unknown, USE ONLY provided user base
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