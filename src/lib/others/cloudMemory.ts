"use client";

import { db } from "./db";

const API =
  process.env.NEXT_PUBLIC_CLOUD_MEMORY_API!;

/* =========================================================
   GOOGLE LOGIN
========================================================= */

export async function loginWithGoogle() {
  window.location.href =
    `${API}/auth/google`;
}

/* =========================================================
   EXPORT CLOUD
========================================================= */

export async function cloudExportMind() {

  const [user, courses, errors, memory] =
    await Promise.all([
      db.user.get("main"),
      db.courses.toArray(),
      db.errors.toArray(),
      db.memory.get("main"),
    ]);

  const payload = {
    version: "2.0",
    timestamp: Date.now(),
    payload: {
      user,
      courses,
      errors,
      memory,
    },
  };

  const res = await fetch(
    `${API}/memory/save`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    throw new Error("Cloud save failed");
  }

  alert("CONSCIÊNCIA SALVA NA NUVEM");
}

/* =========================================================
   IMPORT CLOUD
========================================================= */

export async function cloudImportMind() {

  const res = await fetch(
    `${API}/memory/load`,
    {
      credentials: "include",
    }
  );

  if (!res.ok) {
    throw new Error("Cloud load failed");
  }

  const data = await res.json();

  if (!data?.payload) {
    throw new Error("Invalid cloud memory");
  }

  const {
    user,
    courses,
    errors,
    memory,
  } = data.payload;

  if (user) {
    await db.user.put(user);
  }

  if (courses?.length) {
    await db.courses.bulkPut(courses);
  }

  if (errors?.length) {
    await db.errors.bulkPut(errors);
  }

  if (memory) {
    await db.memory.put(memory);
  }

  alert("CONSCIÊNCIA RESTAURADA");

  window.location.reload();
}