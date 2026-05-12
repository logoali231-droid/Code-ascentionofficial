import { evaluateCode } from "./evaluator"; // Exemplo de função pesada

self.onmessage = async (e) => {
  const { type, payload } = e.data;
  
  if (type === "EVALUATE_EXERCISE") {
    const result = await evaluateCode(payload.code, payload.tests);
    self.postMessage({ type: "EVAL_RESULT", result });
  }
};
