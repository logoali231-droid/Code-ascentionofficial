export function normalize(text: any) {

  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\r/g, "")
    .replace(/\t/g, "  ")
    .replace(/\s+/g, " ");
}

export async function evaluateLogic(received: any, expected: any): Promise<boolean> {
  try {
    // 1. Sanitização básica de tipos
    const valReceived = String(received || "").trim();
    const valExpected = String(expected || "").trim();

    // 2. Se for vazio, já invalida
    if (!valReceived && valExpected) return false;

    // 3. Heurística para detectar se é código ou texto simples
    // Se contiver caracteres típicos de sintaxe, usa compareCode
    const isCode = /[{}[\];()]/.test(valExpected) || valExpected.length > 50;

    if (isCode) {
      return compareCode(valExpected, valReceived);
    }

    // 4. Fallback para comparação de texto normalizado
    return compareAnswers(valExpected, valReceived);
    
  } catch (error) {
    console.error("[Evaluator Logic] Falha crítica na avaliação:", error);
    // Em caso de erro interno, retornamos false por segurança
    return false;
  }
}

export function compareAnswers(
  expected: string,
  received: string
) {
  return (
    normalize(expected) ===
    normalize(received)
  );
}

/* =========================================================
   CODE COMPARISON
========================================================= */

export function compareCode(
  expected: string,
  received: string,
  language?: string
) {

  const cleanExpected =
    normalizeCode(expected);

  const cleanReceived =
    normalizeCode(received);

  /* Exact */
  if (
    cleanExpected === cleanReceived
  ) {
    return true;
  }

  /* Partial containment */
  if (
    cleanReceived.includes(cleanExpected)
  ) {
    return true;
  }

  /* Fallback heuristic */
  const expectedTokens =
    tokenize(cleanExpected);

  const receivedTokens =
    tokenize(cleanReceived);

  const overlap =
    expectedTokens.filter(
      t => receivedTokens.includes(t)
    ).length;

  const ratio =
    overlap /
    Math.max(
      expectedTokens.length,
      1
    );

  /* Flexible threshold */
  return ratio >= 0.72;
}

/* =========================================================
   HELPERS
========================================================= */

function normalizeCode(code: string) {

  return String(code || "")
    .toLowerCase()
    .replace(/\/\/.*$/gm, "")
    .replace(/#.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/[;]+/g, ";")
    .trim();
}

function tokenize(code: string) {

  return code
    .split(/[^a-z0-9_]+/gi)
    .filter(Boolean);
}