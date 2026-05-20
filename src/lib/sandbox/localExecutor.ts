import { IEngineExecutor } from "./types";
export class LocalExecutor implements IEngineExecutor {
  async execute(code: string, language: string, signal?: AbortSignal) {
    return runLocal(code, language, signal);
  }
}  }, `LocalExec-${lang}`);
}
