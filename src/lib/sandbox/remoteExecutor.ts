export class RemoteExecutor implements IEngineExecutor {
  async execute(code: string, language: string, signal?: AbortSignal) {
    return runRemote(code, language, signal);
  }
}
