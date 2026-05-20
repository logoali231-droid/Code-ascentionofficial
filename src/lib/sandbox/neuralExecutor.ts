import { IEngineExecutor } from "./types";
export class NeuralExecutor implements IEngineExecutor {
  async execute(code: string, language: string, signal?: AbortSignal) {
    return runNeural(code, language, signal);
  }
}
