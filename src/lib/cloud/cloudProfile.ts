"use client";

import { createProfileSnapshot }
from "@/lib/others/memoryExport";

export async function uploadProfileToCloud() {

  const snapshot =
    await createProfileSnapshot();

  const res = await fetch(
    "/api/cloud/profile/upload",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(snapshot),
    }
  );

  if (!res.ok) {
    throw new Error(
      "UPLOAD_FAILED"
    );
  }

  return true;
}

export async function restoreProfileFromCloud() {

  const res = await fetch(
    "/api/cloud/profile/restore"
  );

  if (!res.ok) {
    throw new Error(
      "RESTORE_FAILED"
    );
  }

  return await res.json();
}