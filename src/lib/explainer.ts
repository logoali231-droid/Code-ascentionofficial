import { generate } from "@/lib/webllm";

export async function explainError(error: any, course: any) {
  const prompt = `
You are a tutor.

Student goal:
${error.question}

Expected:
${error.correct}

Student answer:
${error.userAnswer}

Student thinks:
${error.userExplanation}

Explain:
- what they misunderstood
- correct concept
- simple explanation

Adapt to:
Cognitive profile: ${course.profile}
Style: ${course.style}
`;

  return await generate(prompt);
}