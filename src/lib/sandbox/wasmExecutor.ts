"use client";

export async function runWasm(
  code: string,
  language: string
) {
  return {
    output: [
      `[WASM] Runtime initialized for ${language}`
    ]
  };
}