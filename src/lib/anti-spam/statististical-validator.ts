

export class StatisticalValidator { // Convenção: Primeira letra maiúscula para classes
  private readonly TECH_EXCEPTIONS = new Set([
    'js', 'ts', 'jr', 'sr', 'db', 'sql', 'cpp', 'css', 'html', 'jsx', 'tsx',
    'aws', 'api', 'json', 'yaml', 'xml', 'git', 'ssh', 'ssl', 'http',
    'ui', 'ux', 'ai', 'ml', 'ds', 'cs', 'it', 'iot' 
  ]);


  public filterTechnicalTerms(words: string[]): string[] {
    return words.filter(word => !this.TECH_EXCEPTIONS.has(word.toLowerCase()));
  }
  /**
   * NOVO: Método que o handleNext está procurando.
   * Retorna true se o texto for considerado spam/gibberish.
   */
  public isLowEntropy(text: string): boolean {
    if (!text || text.trim().length < 3) return true;
    
    const score = this.getStatisticalScore(text);
    // Se o score de estranheza for alto (> 0.8), consideramos spam
    return score > 0.8;
  }

  public getStatisticalScore(text: string): number {
    const cleanText = text.toLowerCase().replace(/[^a-z]/g, '');
    if (cleanText.length < 5) return 0;

    let strangeness = 0;

    const unlikelyBigrams = /q[^ueaion]|j[qxkz]|g[qj]|v[qj]|w[qj]|x[qzj]|z[qj]|[^aeiouy]{5,}/g;
    const matches = cleanText.match(unlikelyBigrams);
    
    if (matches) {
      strangeness += (matches.length * 0.4);
    }

    const entropy = this.calculateShannonEntropy(cleanText);
    
    if (entropy > 4.8) strangeness += 0.5;
    if (entropy < 1.5 && cleanText.length > 10) strangeness += 0.7;

    return strangeness;
  }

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

// Exportamos uma instância constante para ser usada como "statisticalValidator.isLowEntropy"
export const statisticalValidator = new StatisticalValidator();