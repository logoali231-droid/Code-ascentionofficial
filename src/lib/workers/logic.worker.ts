import { evaluateLogic } from "../evaluator.logic";

/**
 * Logic Worker - Code Ascension
 * Responsável por executar testes de código sem travar a UI.
 * Adicionado suporte a cancelamento ativo por ciclo de vida.
 */

let isAborted = false;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  // Intercepta sinal de aborto enviado pela Runtime Queue
  if (type === "ABORT") {
    console.log(
      "[Logic Worker] Comando de aborto recebido. Interrompendo pipeline de testes...",
    );
    isAborted = true;
    return;
  }

  if (type === "EVALUATE_EXERCISE") {
    isAborted = false; // Reseta o estado para a nova execução
    const startTime = performance.now();

    try {
      // Verificação de segurança pré-execução
      if (isAborted)
        throw new DOMException("Evaluation aborted.", "AbortError");

      // Executa a lógica de avaliação
      const result = await evaluateLogic(payload.code, payload.expected);

      // Verificação pós-execução (caso tenha sido abortado durante o processamento do evaluator)
      if (isAborted) {
        console.warn(
          "[Logic Worker] Resultado descartado: Usuário trocou de contexto.",
        );
        return;
      }

      const duration = performance.now() - startTime;

      self.postMessage({
        type: "EVAL_RESULT",
        result,
        metadata: { duration: `${duration.toFixed(2)}ms` },
      });
    } catch (err) {
      if (isAborted) return; // Ignora erros colaterais de interrupção abrupta

      console.error("[Logic Worker] Erro na execução do código:");
      const errorMessage = err instanceof Error ? err.message : String(err);

      self.postMessage({
        type: "EVAL_ERROR",
        error: errorMessage,
      });
    }
  }
};
