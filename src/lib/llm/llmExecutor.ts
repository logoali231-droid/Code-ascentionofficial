"use client";

let worker: Worker | null = null;

let workerTimeout: ReturnType<typeof setTimeout> | null = null;

/* =========================================
   WORKER CLEANUP
========================================= */

function scheduleWorkerCleanup() {
  if (workerTimeout) {
    clearTimeout(workerTimeout);
  }

  workerTimeout = setTimeout(() => {
    if (worker) {
      console.log("[LLM] Cleaning idle worker...");

      worker.terminate();
      worker = null;
    }
  }, 45000); // 45s idle timeout
}

/* =========================================
   WORKER FACTORY
========================================= */

function getWorker() {
  if (!worker) {
    console.log("[LLM] Creating worker...");

    worker = new Worker(
      new URL("../../workers/llmWorker.ts", import.meta.url),
      {
        type: "module",
      },
    );
  }

  return worker;
}

/* =========================================
   MAIN EXECUTOR
========================================= */

export async function runLLM(
  prompt: string,
  temperature = 0.7,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const w = getWorker();

    // cancela cleanup enquanto worker está ativo
    if (workerTimeout) {
      clearTimeout(workerTimeout);
    }

    const chunks: string[] = [];

    w.onmessage = (event) => {
      const { type, data, error } = event.data;

      /* =========================
         STREAM CHUNK
      ========================= */

      if (type === "CHUNK") {
        if (typeof data === "string") {
          chunks.push(data);
        }

        // HARD SAFETY LIMIT
        if (chunks.length > 400) {
          console.warn("[LLM] Chunk safety limit reached.");

          scheduleWorkerCleanup();

          resolve(chunks.join(""));
        }
      }

      /* =========================
         DONE
      ========================= */

      if (type === "DONE") {
        const full = chunks.join("");

        scheduleWorkerCleanup();

        resolve(full);
      }

      /* =========================
         ERROR
      ========================= */

      if (type === "ERROR") {
        console.error("[LLM] Worker error:", error);

        scheduleWorkerCleanup();

        reject(error);
      }
    };

    /* =========================
       START GENERATION
    ========================= */

    w.postMessage({
      type: "GENERATE",
      payload: {
        prompt,
        temperature,
      },
    });
  });
}