/* =========================================================
   CORE LOGIC & DISPATCHER
========================================================= */

/**
 * Avalia se a resposta recebida é logicamente equivalente à esperada.
 * Detecta automaticamente se o contexto é código ou texto.
 */
// No avaliador de exercícios
import { GibberishDetector } from "@/lib/anti-spam/gibberish-detector";

const detector = new GibberishDetector();

export function validateInput(userInput: string) {
    if (detector.isGibberish(userInput)) {
        return { 
            isValid: false, 
            error: "Input detectado como ruído neural. Digite um código válido." 
        };
    }
    // ... restante da lógica de avaliação
}

export async function evaluateLogic(received: any, expected: any): Promise<boolean> {
  try {
    const valReceived = String(received || "").trim();
    const valExpected = String(expected || "").trim();

    // Se o input estiver vazio mas era esperado algo, invalida
    if (!valReceived && valExpected) return false;

    // Heurística de Detecção: Programação vs Texto Livre
    // Busca por tokens de controle ou extensões longas de código
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

  // 1. Comparação Exata (Pós-Normalização)
  if (cleanExpected === cleanReceived) return true;

  // 2. Contenção Parcial
  // Se o que o usuário escreveu contém a lógica core esperada
  if (cleanReceived.includes(cleanExpected)) return true;

  // 3. Análise de Tokenização (Algoritmo de Sobreposição)
  const expectedTokens = tokenize(cleanExpected);
  const receivedTokens = tokenize(cleanReceived);

  if (expectedTokens.length === 0) return false;

  const overlap = expectedTokens.filter(t => 
    receivedTokens.includes(t)
  ).length;

  const ratio = overlap / expectedTokens.length;

  // Limiar de 72% de similaridade de tokens permite variações de nomes 
  // de variáveis ou pequenos erros de digitação em comandos secundários
  return ratio >= 0.72;
}

/* =========================================================
   HELPERS
========================================================= */

function normalizeCode(code: string) {
  return String(code || "")
    .toLowerCase()
    // Remove comentários (//, #, /* */)
    .replace(/\/\/.*$/gm, "")
    .replace(/#.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // Colapsa espaços e normaliza terminadores
    .replace(/\s+/g, " ")
    .replace(/[;]+/g, ";")
    .trim();
}

function tokenize(code: string) {
  // Extrai apenas palavras, números e underscores, ignorando símbolos
  return code
    .split(/[^a-z0-9_]+/gi)
    .filter(Boolean);
}
