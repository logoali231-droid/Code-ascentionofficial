export interface IEngineExecutor {
  execute(
    code: string,
    language: string,
    signal?: AbortSignal
  ): Promise<SandboxResult>;
}
