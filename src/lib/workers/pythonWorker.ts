/**
 * Python WASM Worker - Code Ascension
 * Responsável por carregar o Pyodide e executar código Python real isoladamente.
 */

// Importa o Pyodide oficial via CDN para o escopo isolado do Worker
importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");

let pyodide: any = null;

async function iniciarPython() {
  // @ts-ignore
  pyodide = await loadPyodide();
}

const pythonPronto = iniciarPython();

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === "RUN_PYTHON") {
    try {
      await pythonPronto; // Garante que o ambiente carregou completamente
      
      // Executa o script Python do usuário e captura o retorno/print
      const resultado = await pyodide.runPythonAsync(payload.code);
      
      self.postMessage({
        type: "PYTHON_RESULT",
        output: String(resultado)
      });
    } catch (err: any) {
      self.postMessage({
        type: "PYTHON_ERROR",
        error: err.message
      });
    }
  }
};