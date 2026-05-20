"use client";

import { runSandbox } from "./sandboxRunner";

import {
  Language,
  ExecutionResult,
} from "./types";

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