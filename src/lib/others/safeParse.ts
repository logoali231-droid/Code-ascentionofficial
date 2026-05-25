// Adicione ou atualize esta função utilitária em src/lib/others/safeParse.ts ou diretamente no streamer
export function cleanAndParseCourseJSON(rawText: string): any | null {
  let cleanText = rawText.trim();

  // 1. Limpa blocos de código Markdown gerados frequentemente por LLMs locais
  if (cleanText.includes("```json")) {
    cleanText = cleanText.split("```json")[1].split("```")[0];
  } else if (cleanText.includes("```")) {
    cleanText = cleanText.split("```")[1].split("```")[0];
  }

  // 2. Localiza cirurgicamente a primeira chave de abertura e a última de fechamento
  const firstBracket = cleanText.indexOf("{");
  const lastBracket = cleanText.lastIndexOf("}");

  if (firstBracket !== -1 && lastBracket !== -1) {
    cleanText = cleanText.substring(firstBracket, lastBracket + 1);
  }

  try {
    return JSON.parse(cleanText);
  } catch (error) {
    console.error("[NEURAL:PARSE:ERROR] Falha crítica ao processar a estrutura do curso:", error);
    return null;
  }
}