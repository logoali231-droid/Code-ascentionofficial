/* =========================================================
   CORE LOGIC & DISPATCHER
========================================================= */

/**
 * Avalia se a resposta recebida é logicamente equivalente à esperada.
 * Detecta automaticamente se o contexto é código ou texto.
 */
import { GibberishDetector } from "@/lib/anti-spam/gibberish-detector";

const detector = new GibberishDetector();

export function validateInput(userInput: string) {
  // CORREÇÃO: Nome do método alterado para isTotalGibberish e adição do contexto 'lesson'
  if (detector.isTotalGibberish(userInput, 'lesson')) {
    return {
      isValid: false,
      error: "Input detectado como ruído neural. Digite um código válido."
    };
  }

  return { isValid: true };
}

export async function evaluateLogic(received: any, expected: any): Promise<boolean> {
  try {
    const valReceived = String(received || "").trim();
    const valExpected = String(expected || "").trim();

    if (!valReceived && valExpected) return false;

    const isCode = /[{}[\];()]/.test(valExpected) || valExpected.length > 50;

    if (isCode) {
      return compareCode(valExpected, valReceived);
    }

    return compareAnswers(valExpected, valReceived);

  } catch (error) {
    console.error("[Evaluator Logic] Failure in evaluation pipe:", error);
    return false;
  }
}

/* =========================================================
   TEXT COMPARISON
========================================================= */

export function normalize(text: any) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\r/g, "")
    .replace(/\t/g, "  ")
    .replace(/\s+/g, " ");
}

export function compareAnswers(expected: string, received: string) {
  return normalize(expected) === normalize(received);
}

/* =========================================================
   CODE COMPARISON (HARDCORE FLEXIBLE)
========================================================= */

export function compareCode(expected: string, received: string) {
  const cleanExpected = normalizeCode(expected);
  const cleanReceived = normalizeCode(received);

  if (cleanExpected === cleanReceived) return true;

  if (cleanReceived.includes(cleanExpected)) return true;

  const expectedTokens = tokenize(cleanExpected);
  const receivedTokens = tokenize(cleanReceived);

  if (expectedTokens.length === 0) return false;

  const overlap = expectedTokens.filter(t =>
    receivedTokens.includes(t)
  ).length;

  const ratio = overlap / expectedTokens.length;

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

