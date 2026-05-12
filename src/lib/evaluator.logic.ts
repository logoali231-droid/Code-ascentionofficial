// src/lib/evaluator.logic.ts

export function normalize(text: any) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function compareAnswers(expected: string, received: string) {
  return normalize(expected) === normalize(received);
}

// Esta função substitui a 'evaluateCode' no Worker
export async function evaluateLogic(code: string, expected: string) {
  const isCorrect = compareAnswers(expected, code);
  return { correct: isCorrect };
}
