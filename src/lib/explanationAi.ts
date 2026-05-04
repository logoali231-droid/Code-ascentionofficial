import { generate } from "./webllm";

export async function generateExplanation(input: {
  topic: string;
  lessonTitles: string[];
  style: string;
  level: string;
  cognitive: string;
}) {
  const prompt = `
You are an adaptive teacher.

Explain the following lessons progressively.

Lessons:
${input.lessonTitles.join(", ")}

User style:
${input.style}

Skill:
${input.level}

Cognitive:
${input.cognitive}

RULES:
- Follow style EXACTLY
- No length limit (be detailed)
- Build understanding step by step
- DO NOT jump ahead
- DO NOT summarize too much

Return plain text only.
`;

  return await generate(prompt);
}