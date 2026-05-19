"use client";

import { getWorkspaceRoot } from "./workspaceFS";

export async function calculateWorkspaceSize(
  projectId: string,
) {
  const root = await getWorkspaceRoot(projectId);

  let total = 0;

  for await (const [, handle] of root.entries()) {
    if (handle.kind === "file") {
      const file = await handle.getFile();
      total += file.size;
    }
  }

  return total;
}