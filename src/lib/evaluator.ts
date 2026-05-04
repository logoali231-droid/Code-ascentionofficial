import { addCoins } from "@/lib/economy";

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function similarity(a: string, b: string) {
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
  const ok = score > 0.7;

  if (ok) await addCoins(10);

  return ok;
}