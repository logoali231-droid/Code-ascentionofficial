"use client";

/* =========================================================
   CODE ASCENT - GENERATION QUEUE
   PURPOSE: Prevent parallel WebLLM generations.
========================================================= */

type Task<T> = () => Promise<T>;

/* =========================================================
   GLOBAL QUEUE
========================================================= */
let queue: Promise<any> = Promise.resolve();

/* =========================================================
   ENQUEUE
========================================================= */
export function enqueueGeneration<T>(task: Task<T>): Promise<T> {
  const result = queue.then(() => task());

  /* KEEP QUEUE ALIVE: Se uma falha ocorrer, a fila não trava */
  queue = result.catch(() => null);

  return result;
}