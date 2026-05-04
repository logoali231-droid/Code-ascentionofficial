import { addCoins } from "./economy";

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();
}

export async function evaluate(answer: string, correct: string) {
  const a = normalize(answer);
  const c = normalize(correct);

  const isCorrect =
    a === c ||
    a.includes(c) ||
    c.includes(a);

  if (isCorrect) {
    await addCoins(10);
  } else {
    await addCoins(2);
  }

  return isCorrect;
}