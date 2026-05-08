import { GibberishHeuristics } from './gibberish-heuristics';
import { statisticalValidator } from './statististical-validator';

/**
 * ORQUESTRADOR FINAL: SISTEMA DE PONTUAÇÃO MULTICAMADA
 * Aplica as regras apenas para 'explanationStyle' e 'promptTheme'.
 */

export class GibberishDetector {
  private heuristics = new GibberishHeuristics();
  private statistics = new statisticalValidator();

  /**
   * Método principal que decide se a entrada deve ser bloqueada.
   * Implementa tolerância a erros de digitação e termos técnicos.
   */
  public isTotalGibberish(text: string, context: 'explanationStyle' | 'promptTheme' | 'lesson'): boolean {
    // Regra de exclusão: Não se aplica a lessons (lições)
    if (context === 'lesson') return false;

    const cleanText = text.trim();
    
    // 1. Hard Bypass para termos técnicos e curtos
    // Se o usuário escreveu algo como "js", "jr dev", "ts"
    const words = cleanText.split(/\s+/);
    const filteredWords = this.statistics.filterTechnicalTerms(words);
    
    if (filteredWords.length === 0) return false;

    // 2. Coleta de Scores
    const heuristicResult = this.heuristics.analyze(cleanText);
    const statisticalScore = this.statistics.getStatisticalScore(cleanText);

    // 3. Cálculo de Robustez (Weighted Score)
    // Damos peso maior para as heurísticas de teclado (fatores humanos físicos)
    // e usamos a estatística como agravante.
    let finalScore = (heuristicResult.score * 0.7) + (statisticalScore * 0.3);

    // 4. Ajuste por Comprimento (Tolerância a Erros de Digitação)
    // Erros em frases curtas (ex: "vlw mano") são perdoados.
    // Lixo em strings longas (ex: "asdfgjhklçpoiuytrewq") é punido severamente.
    if (cleanText.length > 15) {
        finalScore *= 1.2; // Aumenta o rigor para textos longos
    } else if (cleanText.length < 8) {
        finalScore *= 0.5; // Dá o benefício da dúvida para inputs pequenos
    }

    // DEBUG (Opcional): Console.log para calibragem durante dev
    // console.log(`[Anti-Spam] Score: ${finalScore.toFixed(2)}, Reasons:`, heuristicResult.reasons);

    return finalScore >= 1.0;
  }
}

// Singleton para fácil exportação
export const gibberishDetector = new GibberishDetector();