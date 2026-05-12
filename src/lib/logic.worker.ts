import { evaluateLogic } from "./evaluator.logic";

/**
 * Logic Worker - Code Ascension
 * Responsável por executar testes de código sem travar a UI.
 */
self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;
  
  if (type === "EVALUATE_EXERCISE") {
    const startTime = performance.now();
    
    try {
      // Executa a lógica de avaliação
      const result = await evaluateLogic(payload.code, payload.expected);
      
      const duration = performance.now() - startTime;
      
      self.postMessage({ 
        type: "EVAL_RESULT", 
        result,
        metadata: { duration: `${duration.toFixed(2)}ms` }
      });

    } catch (err) {
      console.error("[Logic Worker] Erro na execução do código:");
      
      // Correção para TypeScript 'unknown' na Vercel
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      self.postMessage({ 
        type: "EVAL_ERROR", 
        error: errorMessage 
      });
    }
  }
};
