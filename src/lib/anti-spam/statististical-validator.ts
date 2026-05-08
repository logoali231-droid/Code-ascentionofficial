

export class statisticalValidator {
  // Lista de exceções técnicas comuns que parecem gibberish mas não são
private readonly TECH_EXCEPTIONS = new Set([
  'js', 'ts', 'jr', 'sr', 'db', 'sql', 'cpp', 'css', 'html', 'jsx', 'tsx',
  'aws', 'api', 'json', 'yaml', 'xml', 'git', 'ssh', 'ssl', 'http',
  'ui', 'ux', 'ai', 'ml', 'ds', 'cs', 'it', 'iot' 
]);


  /**
   * Calcula a "Estranheza" do texto.
   * Textos humanos, mesmo com erros, seguem certas transições de letras.
   */
  public getStatisticalScore(text: string): number {
    const cleanText = text.toLowerCase().replace(/[^a-z]/g, '');
    if (cleanText.length < 5) return 0;

    let strangeness = 0;

    // 1. Verificação de Bigramas Improváveis
    // Certas combinações de letras são quase impossíveis em idiomas latinos/anglo
    // Ex: "qz", "jx", "wq", "vf", "kg" (em sequência longa)
    const unlikelyBigrams = /q[^ueaion]|j[qxkz]|g[qj]|v[qj]|w[qj]|x[qzj]|z[qj]|[^aeiouy]{5,}/g;
    const matches = cleanText.match(unlikelyBigrams);
    
    if (matches) {
      strangeness += (matches.length * 0.4);
    }

    // 2. Entropia de Shannon (Complexidade da Informação)
    const entropy = this.calculateShannonEntropy(cleanText);
    
    // Entropia muito alta (> 4.8) indica que quase não há repetição de padrões,
    // o que é típico de strings aleatórias (ex: "8fh392cnls").
    if (entropy > 4.8) strangeness += 0.5;
    
    // Entropia muito baixa (< 1.5) indica repetição excessiva (ex: "aaaaaaaa")
    if (entropy < 1.5 && cleanText.length > 10) strangeness += 0.7;

    return strangeness;
  }

  /**
   * Filtra palavras que são jargões técnicos para não penalizar o usuário.
   */
  public filterTechnicalTerms(words: string[]): string[] {
    return words.filter(word => !this.TECH_EXCEPTIONS.has(word.toLowerCase()));
  }

  /**
   * Shannon Entropy: Mede a desordem dos caracteres.
   */
  private calculateShannonEntropy(str: string): number {
    const frequencies: Record<string, number> = {};
    for (const char of str) {
      frequencies[char] = (frequencies[char] || 0) + 1;
    }

    return Object.values(frequencies).reduce((acc, freq) => {
      const p = freq / str.length;
      return acc - p * Math.log2(p);
    }, 0);
  }
}