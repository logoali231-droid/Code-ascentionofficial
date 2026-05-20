import { SandboxResult } from "./types";
export interface IEngineExecutor {
  execute(
    code: string,
    language: string,
    signal?: AbortSignal
  ): Promise<SandboxResult>;
}
