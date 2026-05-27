importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");
import { evaluateLogic } from "../others/evaluator.logic";

let pyodide: any = null;
let isAborted = false;

// Inicialização Lazy
async function iniciarPython() {
  if (!pyodide) {
    // @ts-ignore
    pyodide = await loadPyodide();
  }
  return pyodide;
}

const pythonPronto = iniciarPython();

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  // Interceptor de Aborto Global
  if (type === "ABORT") {
    isAborted = true;
    return;
  }

  // Roteador de Tarefas
  switch (type) {
    case "RUN_PYTHON":
      await handlePython(payload);
      break;
    case "EVALUATE_EXERCISE":
      await handleLogic(payload);
      break;
  }
};

async function handlePython(payload: any) {
  isAborted = false;
  try {
    const engine = await pythonPronto;
    if (isAborted) return;
    
    const resultado = await engine.runPythonAsync(payload.code);
    self.postMessage({ type: "PYTHON_RESULT", output: String(resultado) });
  } catch (err: any) {
    self.postMessage({ type: "PYTHON_ERROR", error: err.message });
  }
}

async function handleLogic(payload: any) {
  isAborted = false;
  const startTime = performance.now();
  try {
    const result = await evaluateLogic(payload.code, payload.expected);
    if (isAborted) return;
    
    self.postMessage({ 
      type: "EVAL_RESULT", 
      result, 
      metadata: { duration: `${(performance.now() - startTime).toFixed(2)}ms` } 
    });
  } catch (err: any) {
    if (isAborted) return;
    self.postMessage({ type: "EVAL_ERROR", error: err.message });
  }
}