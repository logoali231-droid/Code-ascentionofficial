import { getEngine } from "./compilerRouter";
import { runLocal } from "./localExecutor";
import { runWasm } from "./wasmExecutor";
import { runRemote } from "./remoteExecutor";
import { runNeural } from "./neuralExecutor";
import { Language, SandboxResult } from "./types";

export async function executeCode(
  code: string,
  language: Language,
  signal?: AbortSignal,
): Promise<SandboxResult> {
  const engine = getEngine(language);

  switch (engine) {
    case "local":
      return runLocal(code, language, signal);

    case "wasm":
      return runWasm(code, language, signal);

    case "remote":
      return runRemote(code, language, signal);

    case "neural":
    default:
      return runNeural(code, language, signal);
  }
}