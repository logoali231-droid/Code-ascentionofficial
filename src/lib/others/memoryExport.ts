"use client";

import { db } from "./db";

export async function exportUserMind() {

  const [
    user,
    courses,
    lessons,
    errors,
    memory,
    curriculum,
    telemetry,
    explanations,
    daily,
    shop,
  ] = await Promise.all([

    db.user.toArray(),
    db.courses.toArray(),
    db.lessons.toArray(),
    db.errors.toArray(),
    db.memory.toArray(),
    db.curriculum.toArray(),
    db.telemetry.toArray(),
    db.explanations.toArray(),
    db.daily.toArray(),
    db.shop.toArray(),
  ]);

  const backupData = {
    version: "2.0",
    exportedAt: Date.now(),

    payload: {
      user,
      courses,
      lessons,
      errors,
      memory,
      curriculum,
      telemetry,
      explanations,
      daily,
      shop,
    },
  };

  const blob = new Blob(
    [JSON.stringify(backupData)],
    {
      type: "application/json",
    }
  );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement("a");

  a.href = url;

  a.download =
    `codeascension-profile-${Date.now()}.caiprofile`;

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

export async function createProfileSnapshot() {

  const [
    user,
    courses,
    lessons,
    errors,
    memory,
    curriculum,
    telemetry,
    explanations,
    daily,
    shop,
  ] = await Promise.all([

    db.user.toArray(),
    db.courses.toArray(),
    db.lessons.toArray(),
    db.errors.toArray(),
    db.memory.toArray(),
    db.curriculum.toArray(),
    db.telemetry.toArray(),
    db.explanations.toArray(),
    db.daily.toArray(),
    db.shop.toArray(),
  ]);

  return {
    version: "2.0",
    exportedAt: Date.now(),

    payload: {
      user,
      courses,
      lessons,
      errors,
      memory,
      curriculum,
      telemetry,
      explanations,
      daily,
      shop,
    },
  };
}