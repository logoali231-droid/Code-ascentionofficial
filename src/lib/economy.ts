import { addCoins } from "./economy";

function similarity(a: string, b: string) {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, "");

  const A = normalize(a);
  const B = normalize(b);

  if (A === B) return 1;

  let matches = 0;

  for (let i = 0; i < Math.min(A.length, B.length); i++) {
    if (A[i] === B[i]) matches++;
  }

  return matches / Math.max(A.length, B.length);
}

export async function evaluate(answer: string, correct: string) {
  const score = similarity(answer, correct);

  const isCorrect = score > 0.7;

  if (isCorrect) {
    await addCoins(10);
  }

  return isCorrect;
}