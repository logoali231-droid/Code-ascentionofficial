"use client";

export async function runLocal(
  code: string,
  lang: string
) {
  const logs: string[] = [];

  const customConsole = {
    log: (...args: any[]) =>
      logs.push(
        args.map(arg =>
          typeof arg === "object"
            ? JSON.stringify(arg, null, 2)
            : String(arg)
        ).join(" ")
      ),

    error: (...args: any[]) =>
      logs.push("[ERROR] " + args.join(" "))
  };

  try {
    const run = new Function(
      "console",
      `"use strict"; ${code}`
    );

    run(customConsole);

    return {
      output: logs
    };
  } catch (err: any) {
    return {
      output: [],
      error: err.message
    };
  }
}