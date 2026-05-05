import { addCoins } from "@/lib/economy";

/**
 * Normaliza uma string removendo espaços extras e caracteres especiais.
 * @param {string} s - A string a ser normalizada.
 * @returns {string} A string normalizada.
 */
function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[{}();]/g, "");
}

/**
 * Extrai palavras-chave relevantes de uma string.
 * @param {string} s - A string da qual extrair palavras-chave.
 * @returns {string[]} Array de palavras-chave.
 */
function extractKeywords(s: string) {
  return s
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
}

/**
 * Verifica se a intenção do usuário corresponde à esperada baseada em palavras-chave.
 * @param {string} user - A entrada do usuário.
 * @param {string} expected - A resposta esperada.
 * @returns {boolean} Verdadeiro se a intenção corresponder.
 */
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

/**
 * Verifica se o código do usuário tem estrutura básica de código.
 * @param {string} user - O código do usuário.
 * @returns {boolean} Verdadeiro se tiver estrutura básica.
 */
function basicCodeCheck(user: string) {
  return (
    user.includes("function") ||
    user.includes("=>") ||
    user.includes("return")
  );
}

/**
 * Avalia a resposta do usuário comparando com a correta.
 * @param {string} answer - A resposta do usuário.
 * @param {string} correct - A resposta correta.
 * @param {string} [type] - O tipo de exercício.
 * @returns {Promise<boolean>} Verdadeiro se a resposta estiver correta.
 */
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