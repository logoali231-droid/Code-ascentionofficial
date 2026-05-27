export function cleanAndParseCourseJSON(rawText: string): any | null {
  try {
    // 1. Tenta o parse direto e limpo primeiro
    return JSON.parse(rawText.trim());
  } catch (e) {
    // 2. Extração Heurística Absoluta (Ignora todo o ruído/markdown)
    console.warn("[PARSE:HEURISTIC] Falha no parse direto. Isolando blocos estruturais...");
    
    // Procura do primeiro '{' até o último '}' 
    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const cleanJSON = rawText.substring(firstBrace, lastBrace + 1);
      
      // Limpeza de escaping problemático comum em modelos menores
      const sanitizedJSON = cleanJSON
        .replace(/\n/g, "")
        .replace(/\r/g, "")
        .replace(/\t/g, " ");

      try {
        return JSON.parse(sanitizedJSON);
      } catch (innerError) {
        console.error("[NEURAL:PARSE:ERROR] Estrutura extraída corrompida:", innerError);
        return null;
      }
    }
    
    console.error("[NEURAL:PARSE:ERROR] Delimitadores JSON não encontrados.");
    return null;
  }
}