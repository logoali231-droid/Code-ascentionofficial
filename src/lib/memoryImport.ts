"use client";

import { save } from "./db";

export async function importMemory(file: File) {
  const text = await file.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch (e) {
    console.warn("Failed to parse imported memory file", e);
    throw new Error("Imported file is not valid JSON");
  }

  await save("memory", data, "main");
}