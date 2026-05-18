interface GibberishResult {
  isGibberish: boolean;
  score: number;
  reasons: string[];
}

export class GibberishHeuristics {
  private readonly THRESHOLD = 1.0; // Limite para considerar lixo

  /**
   * Analisa se o texto é gibberish usando heurísticas de teclado e fonética.
   */
  public analyze(text: string): GibberishResult {
    const cleanText = text.trim().toLowerCase();
    let score = 0;
    const reasons: string[] = [];

    // 1. FAST PASS: Entradas muito curtas são ignoradas
    if (cleanText.length < 4)
      return { isGibberish: false, score: 0, reasons: [] };

    // 2. DETECÇÃO DE SEQUÊNCIAS LINEARES (QWERTY/DVORAK-ISH)
    // Padrões de deslizar o dedo ou bater a mão no teclado
    const keyboardPatterns = [
      "asdfgh",
      "sdfghj",
      "dfghjk",
      "ghjkl",
      "qwerty",
      "ytrewq",
      "zxcvbn",
      "mnbvcz",
      "123456",
      "qazwsx",
      "plmokn",
    ];

    for (const pattern of keyboardPatterns) {
      if (cleanText.includes(pattern)) {
        score += 0.8;
        reasons.push(`Keyboard pattern detected: ${pattern}`);
      }
    }

    // 3. ANÁLISE DE PALAVRAS (CLUSTERS E RATIOS)
    const words = cleanText.split(/\s+/);
    let wordIssues = 0;

    for (const word of words) {
      if (word.length <= 3) continue;

      // A. Clusters de Consoantes (Incomum em PT-BR/EN)
      // Ex: "rtghpq"
      if (/[bcdfghjklmnpqrstvwxyz]{5,}/.test(word)) {
        wordIssues += 0.5;
        reasons.push(`Consonant cluster in: ${word}`);
      }

      // B. Clusters de Vogais (Ex: "aeiouy")
      if (/[aeiouáéíóúãõâêîôû]{5,}/.test(word)) {
        wordIssues += 0.4;
        reasons.push(`Vowel cluster in: ${word}`);
      }

      // C. Repetição de Caracteres (Ex: "aaaaaa" ou "ababab")
      if (/(.)\1{3,}/.test(word) || /(..+?)\1{2,}/.test(word)) {
        wordIssues += 0.6;
        reasons.push(`Repetitive pattern in: ${word}`);
      }
    }

    // Normaliza o erro das palavras pelo total de palavras
    score += wordIssues / Math.max(words.length, 1);

    return {
      isGibberish: score >= this.THRESHOLD,
      score,
      reasons,
    };
  }
}
