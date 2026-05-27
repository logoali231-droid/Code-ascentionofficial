"use client";

let worker: Worker | null = null;
let workerTimeout: ReturnType<typeof setTimeout> | null = null;

function getComputeWorker() {
  if (!worker) {
    console.log("[ComputeWorker] Spawning worker...");
    worker = new Worker(new URL("../workers/compute.worker.ts", import.meta.url), {
      type: "module",
    });
  }
  return worker;
}

function scheduleCleanup() {
  if (workerTimeout) clearTimeout(workerTimeout);
  workerTimeout = setTimeout(() => {
    if (worker) {
      console.log("[ComputeWorker] Cleaning idle worker...");
      worker.terminate();
      worker = null;
    }
  }, 60000); // 1 minuto de idle
}

export async function evaluate(code: string, expected: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const w = getComputeWorker();
    
    // Cancela o cleanup se estivermos usando
    if (workerTimeout) clearTimeout(workerTimeout);

    const handleMessage = (e: MessageEvent) => {
      const { type, result, error } = e.data;
      
      if (type === "EVAL_RESULT") {
        w.removeEventListener("message", handleMessage);
        scheduleCleanup();
        resolve(result);
      } else if (type === "EVAL_ERROR") {
        w.removeEventListener("message", handleMessage);
        scheduleCleanup();
        reject(new Error(error));
      }
    };

    w.addEventListener("message", handleMessage);
    w.postMessage({ type: "EVALUATE_EXERCISE", payload: { code, expected } });
  });
}
