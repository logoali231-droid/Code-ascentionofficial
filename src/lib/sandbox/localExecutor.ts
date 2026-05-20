"use client";

import { SandboxResult } from "./types";

export async function runLocal(
  code: string,
  language: string,
  signal?: AbortSignal,
): Promise<SandboxResult> {
  if (signal?.aborted) {
    return { output: [], error: "Aborted" };
  }

  try {
    const logs: string[] = [];

    const fn = new Function(
      "console",
      "'use strict';" + code,
    );

    fn({
      log: (...args: any[]) => logs.push(args.join(" ")),
      error: (...args: any[]) => logs.push("[ERROR] " + args.join(" ")),
    });

    return { output: logs };
  } catch (e: any) {
    return { output: [], error: e.message };
  }
}