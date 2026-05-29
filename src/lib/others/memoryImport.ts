"use client";

import { db } from "./db";

function validateMemory(data: any) {

  if (!data) return false;

  if (typeof data !== "object")
    return false;

  if (!data.payload)
    return false;

  const size =
    JSON.stringify(data).length;

  // 25MB safety
  if (size > 25_000_000)
    return false;

  return true;
}

export async function importUserMind(
  file: File
) {

  const text =
    await file.text();

  let data: any = null;

  try {
    data = JSON.parse(text);

  } catch (e) {

    console.warn(
      "Failed parsing profile",
      e
    );

    throw new Error(
      "INVALID_PROFILE"
    );
  }

  if (!validateMemory(data)) {
    throw new Error(
      "CORRUPTED_PROFILE"
    );
  }

  const p = data.payload;

  await db.transaction(
    "rw",
    [
      db.user,
      db.courses,
      db.lessons,
      db.errors,
      db.memory,
      db.curriculum,
      db.telemetry,
      db.explanations,
      db.daily,
      db.shop,
    ],

    async () => {

      // clear old profile first

      await Promise.all([
        db.user.clear(),
        db.courses.clear(),
        db.lessons.clear(),
        db.errors.clear(),
        db.memory.clear(),
        db.curriculum.clear(),
        db.telemetry.clear(),
        db.explanations.clear(),
        db.daily.clear(),
        db.shop.clear(),
      ]);

      // restore snapshot

      if (p.user?.length)
        await db.user.bulkPut(p.user);

      if (p.courses?.length)
        await db.courses.bulkPut(p.courses);

      if (p.lessons?.length)
        await db.lessons.bulkPut(p.lessons);

      if (p.errors?.length)
        await db.errors.bulkPut(p.errors);

      if (p.memory?.length)
        await db.memory.bulkPut(p.memory);

      if (p.curriculum?.length)
        await db.curriculum.bulkPut(p.curriculum);

      if (p.telemetry?.length)
        await db.telemetry.bulkPut(p.telemetry);

      if (p.explanations?.length)
        await db.explanations.bulkPut(p.explanations);

      if (p.daily?.length)
        await db.daily.bulkPut(p.daily);

      if (p.shop?.length)
        await db.shop.bulkPut(p.shop);
    }
  );
}