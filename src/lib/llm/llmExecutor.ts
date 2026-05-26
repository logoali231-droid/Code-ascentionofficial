let worker: Worker | null = null;

function getWorker() {
  if (!worker) {
    worker = new Worker(
      new URL("../../workers/llmWorker.ts", import.meta.url),
      { type: "module" }
    );
  }
  return worker;
}

export async function runLLM(prompt: string, temperature = 0.7) {
  return new Promise((resolve, reject) => {
    const w = getWorker();

    let full = "";

    w.onmessage = (event) => {
      const { type, data, error } = event.data;

      if (type === "CHUNK") {
        full += data;
      }

      if (type === "DONE") {
        resolve(full);
      }

      if (type === "ERROR") {
        reject(error);
      }
    };

    w.postMessage({
      type: "GENERATE",
      payload: { prompt, temperature },
    });
  });
}
