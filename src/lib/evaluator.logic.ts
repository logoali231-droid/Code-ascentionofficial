/* =========================================================
   CORE LOGIC & DISPATCHER
========================================================= */

/**
 * Avalia se a resposta recebida é logicamente equivalente à esperada.
 * Detecta automaticamente se o contexto é código ou texto.
 */
import { GibberishDetector } from "@/lib/anti-spam/gibberish-detector";
import { get } from "./db";

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

export async function evaluateLogic(received: any, expected: any, customThreshold?: number): Promise<boolean> {
  try {
    const valReceived = String(received || "").trim();
    const valExpected = String(expected || "").trim();
    
    let calculatedThreshold = typeof customThreshold === "number" && !isNaN(customThreshold) ? customThreshold : 0.72;
try {
      // Descobre dinamicamente qual o curso ativo lendo o último registro de histórico salvo na memória global "main"
      const rawMemory = await get("memory", "main");
      const lastHistoryItem = rawMemory?.history?.slice(-1)[0];
      
      // Se achar o item recente, monta a chave exata registrada pelo LearningStateEngine automaticamente (independente se for c, rust, java, etc.)
      const currentCourseId = lastHistoryItem?.courseId || "javascript"; 
      const activeState = await get("memory", `pedagogical_state_${currentCourseId.toLowerCase().trim()}`);

      if (activeState) {
        if (activeState.struggleLevel > 0.6 || activeState.cognitiveLoad > 0.7) {
          calculatedThreshold = Math.max(0.62, calculatedThreshold - 0.08); // Concede leniência inteligente para evitar desistência por cansaço
        } else if (activeState.pacing === "accelerated") {
          calculatedThreshold = Math.min(0.85, calculatedThreshold + 0.05); // Enrijece o rigor lógico para usuários de alto rendimento
        }
      }
    } catch (e) {
      // Silencia falhas de busca periférica mantendo o threshold base seguro
    }

    if (!valReceived && valExpected) return false;

    const isCode = /[{}[\];()]/.test(valExpected) || valExpected.length > 50;

    if (isCode) {
      return compareCode(valExpected, valReceived, calculatedThreshold);
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

export function compareCode(expected: string, received: string, customThreshold: number = 0.72) {
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

  // HARD FLOOR SEGURO: Mesmo que os bônus reduzam o threshold, ele NUNCA cai abaixo de 0.62
  const finalThreshold = Math.max(0.62, customThreshold);

  return ratio >= finalThreshold;
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
