"use client";

import { save } from "./db";

export async function importMemory(file: File) {
  const text = await file.text();
  const data = JSON.parse(text);

  await save("memory", data, "main");
}