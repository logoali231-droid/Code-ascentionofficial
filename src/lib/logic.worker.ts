
import { evaluateLogic } from "./evaluator.logic";

self.onmessage = async (e) => {
  const { type, payload } = e.data;
  
  if (type === "EVALUATE_EXERCISE") {
    // payload.tests aqui deve conter o resultado esperado (expected)
    const result = await evaluateLogic(payload.code, payload.expected);
    self.postMessage({ type: "EVAL_RESULT", result });
  }
};
