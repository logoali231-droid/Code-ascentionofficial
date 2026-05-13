"use client";

import { ENGINE_MAP } from "./engines";

import { runLocal } from "./localExecutor";
import { runRemote } from "./remoteExecutor";
import { runNeural } from "./neuralExecutor";
import { runWasm } from "./wasmExecutor";

import {
  Language,
  SandboxResult
} from "./types";

export async function executeSandboxCode(
  code: string,
  language: Language
): Promise<SandboxResult> {

  const engine = ENGINE_MAP[language];

  switch (engine) {

    case "local":
      return await runLocal(code, language) as SandboxResult;

    case "remote":
      return await runRemote(code, language) as SandboxResult;

    case "wasm":
      return await runWasm(code, language) as SandboxResult;

    case "neural":
      return await runNeural(code, language) as SandboxResult;

    default:
      return {
        output: [],
        error: "Unknown engine"
      };
  }
}