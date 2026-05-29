"use client";

import { db } from "./db";

export interface CognitiveProfileExport {
version: number;

exportedAt: number;

user: any;

courses: any[];
lessons: any[];

memory: any[];
curriculum: any[];

telemetry: any[];
explanations: any[];
mastery: any[];

metadata: {
appVersion: string;
deviceMemory?: number;
userAgent: string;
};
}

/* =========================================================
EXPORT PROFILE
========================================================= */

export async function exportCognitiveProfile(): Promise<Blob> {

const payload: CognitiveProfileExport = {
version: 1,


exportedAt: Date.now(),

user: await db.user.get("main"),

courses: await db.courses.toArray(),
lessons: await db.lessons.toArray(),

memory: await db.memory.toArray(),
curriculum: await db.curriculum.toArray(),

telemetry: await db.telemetry.toArray(),
explanations: await db.explanations.toArray(),

mastery: await db.table("mastery").toArray(),

metadata: {
  appVersion: "0.1-alpha",
  deviceMemory: (navigator as any)?.deviceMemory,
  userAgent: navigator.userAgent,
},


};

const json = JSON.stringify(payload);

return new Blob(
[json],
{ type: "application/json" }
);
}

/* =========================================================
IMPORT PROFILE
========================================================= */

export async function importCognitiveProfile(
file: File
) {

const text = await file.text();

const data: CognitiveProfileExport =
JSON.parse(text);

if (!data?.version) {
throw new Error("INVALID_PROFILE");
}

await db.transaction(
"rw",
[
db.user,
db.courses,
db.lessons,
db.memory,
db.curriculum,
db.telemetry,
db.explanations,
db.table("mastery"),
],
async () => {


  /* =========================
     CLEAN OLD STATE
  ========================= */

  await db.user.clear();

  await db.courses.clear();
  await db.lessons.clear();

  await db.memory.clear();
  await db.curriculum.clear();

  await db.telemetry.clear();
  await db.explanations.clear();

  await db.table("mastery").clear();

  /* =========================
     RESTORE STATE
  ========================= */

  if (data.user) {
    await db.user.put(data.user);
  }

  if (data.courses?.length) {
    await db.courses.bulkPut(data.courses);
  }

  if (data.lessons?.length) {
    await db.lessons.bulkPut(data.lessons);
  }

  if (data.memory?.length) {
    await db.memory.bulkPut(data.memory);
  }

  if (data.curriculum?.length) {
    await db.curriculum.bulkPut(data.curriculum);
  }

  if (data.telemetry?.length) {
    await db.telemetry.bulkPut(data.telemetry);
  }

  if (data.explanations?.length) {
    await db.explanations.bulkPut(data.explanations);
  }

  if (data.mastery?.length) {
    await db.table("mastery")
      .bulkPut(data.mastery);
  }
}


);

return true;
}
