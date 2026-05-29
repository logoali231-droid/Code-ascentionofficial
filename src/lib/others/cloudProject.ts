"use client";

import JSZip from "jszip";
import { supabase } from "./supabase";
import { getSession } from "next-auth/react";
import { getWorkspaceRoot } from "../sandbox/workspace/workspaceFS";

async function zipProject(projectId: string) {
  const root = await getWorkspaceRoot(projectId);

  const zip = new JSZip();

  for await (const [name, handle] of root.entries()) {

    if (handle.kind !== "file") continue;

    const file = await handle.getFile();

    const text = await file.text();

    zip.file(name, text);
  }

  return await zip.generateAsync({
    type: "blob",
  });
}

export async function uploadProjectCloud(
  projectId: string
) {
  const session = await getSession();

  if (!session?.user?.email) {
    throw new Error("NOT_AUTHENTICATED");
  }

  const zipBlob = await zipProject(projectId);

  const path =
    `${session.user.email}/${projectId}.zip`;

  const { error } = await supabase.storage
    .from("projects")
    .upload(path, zipBlob, {
      upsert: true,
    });

  if (error) {
    console.error(error);
    throw error;
  }

  return true;
}

export async function restoreProjectCloud(
  projectId: string
) {
  const session = await getSession();

  if (!session?.user?.email) {
    throw new Error("NOT_AUTHENTICATED");
  }

  const path =
    `${session.user.email}/${projectId}.zip`;

  const { data, error } = await supabase.storage
    .from("projects")
    .download(path);

  if (error || !data) {
    throw new Error("PROJECT_NOT_FOUND");
  }

  return new File(
    [data],
    `${projectId}.zip`,
    {
      type: "application/zip",
    }
  );
}