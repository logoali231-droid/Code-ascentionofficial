import { addCoins } from "@/lib/economy";

// limpa código
function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[{}();]/g, "");
}

// quebra em palavras relevantes
function extractKeywords(s: string) {
  return s
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
}

// verifica intenção
function matchesIntent(user: string, expected: string) {
  const userNorm = normalize(user);
  const keywords = extractKeywords(expected);

  let hits = 0;

  for (const k of keywords) {
    if (userNorm.includes(k)) hits++;
  }

  const ratio = hits / keywords.length;

  return ratio > 0.6; // tolerância
}

// heurísticas simples de código
function basicCodeCheck(user: string) {
  return (
    user.includes("function") ||
    user.includes("=>") ||
    user.includes("return")
  );
}

export async function evaluate(
  answer: string,
  correct: string,
  type?: string
) {
  let ok = false;

  if (type === "code") {
    const intent = matchesIntent(answer, correct);
    const structure = basicCodeCheck(answer);

    ok = intent && structure;
  } else {
    ok = matchesIntent(answer, correct);
  }

  if (ok) await addCoins(10);

  return ok;
}