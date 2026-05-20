"use client";

import { runSandbox } from "./sandboxRunner";

import {
  ExecutionResult,
  Language
} from "./engines";

export async function executeCode(
  code: string,
  language: Language,
  signal?: AbortSignal,
): Promise<ExecutionResult> {
  return runSandbox(
    code,
    language,
    signal,
  );
}