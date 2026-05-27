let sandboxWorkerInstance: Worker | null = null;
let computeWorkerInstance: Worker | null = null;

export const getSandboxWorker = () => {
  if (!sandboxWorkerInstance) {
    sandboxWorkerInstance = new Worker(new URL('./sandbox.worker.ts', import.meta.url));
  }
  return sandboxWorkerInstance;
};

export const getComputeWorker = () => {
  if (!computeWorkerInstance) {
    computeWorkerInstance = new Worker(new URL('./compute.worker.ts', import.meta.url));
  }
  return computeWorkerInstance;
};

// Função para encerrar ao fechar a aba (LifeCycle Cleanup)
export const terminateAllWorkers = () => {
  sandboxWorkerInstance?.terminate();
  computeWorkerInstance?.terminate();
  sandboxWorkerInstance = null;
  computeWorkerInstance = null;
};