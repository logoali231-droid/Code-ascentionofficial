"use client";

import { supabase } from "./supabase";
import { db } from "./db";
import { getSession } from "next-auth/react";

export async function cloudExportMind() {
  const session = await getSession();

  if (!session?.user?.email) {
    alert("LOGIN NECESSÁRIO");
    return;
  }

  const [user, courses, memory, errors] = await Promise.all([
    db.user.get("main"),
    db.courses.toArray(),
    db.memory.toArray(),
    db.errors.toArray(),
  ]);

  const payload = {
    user,
    courses,
    memory,
    errors,
    exportedAt: Date.now(),
  };

  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: session.user.email,
      data: payload,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error(error);
    alert("FALHA CLOUD SAVE");
    return;
  }

  alert("CONSCIÊNCIA SALVA");
}

export async function cloudImportMind() {
  const session = await getSession();

  if (!session?.user?.email) {
    alert("LOGIN NECESSÁRIO");
    return;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.email)
    .single();

  if (error || !data) {
    alert("NENHUM BACKUP");
    return;
  }

  const payload = data.data;

  if (payload.user)
    await db.user.put(payload.user);

  if (payload.courses)
    await db.courses.bulkPut(payload.courses);

  if (payload.memory)
    await db.memory.bulkPut(payload.memory);

  if (payload.errors)
    await db.errors.bulkPut(payload.errors);

  alert("CONSCIÊNCIA RESTAURADA");

  window.location.reload();
}