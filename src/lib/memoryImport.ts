"use client";

import { save } from "./db";

function validateMemory(data: any) {
  if (!data) return false;

  if (typeof data !== "object")
    return false;

  // evita arrays gigantes
  const size =
    JSON.stringify(data).length;

  if (size > 2_000_000) {
    return false;
  }

  return true;
}

export async function importMemory(
  file: File
) {
  const text = await file.text();

  let data: any = null;

  try {
    data = JSON.parse(text);
  } catch (e) {
    console.warn(
      "Failed to parse imported memory file",
      e
    );

    throw new Error(
      "Imported file is not valid JSON"
    );
  }

  // ✅ validation layer
  if (!validateMemory(data)) {
    throw new Error(
      "Invalid memory structure"
    );
  }

  await save(
    "memory",
    data,
    "main"
  );
}