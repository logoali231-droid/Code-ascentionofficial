import { generate } from "@/lib/webllm";
import { safeParse } from "./safeParse";

export async function generateReinforcement(error: any, course: any) {
  const prompt = `
Student failed this:

${error.question}

Correct concept:
${error.correct}

Generate ONE focused exercise to fix the mistake.

Return JSON:
{
 "type": "code",
 "question": "",
 "answer": ""
}

Adapt to:
Difficulty: ${error.difficulty}
Cognitive: ${course.profile}
`;

  const res = await generate(prompt);
  return safeParse(res);
}