"use client";

import JSZip from "jszip";
import { writeProjectFile } from "./workspaceFS";

export async function importProject(
  file: File,
  projectId: string,
) {
  const zip = await JSZip.loadAsync(file);

  for (const [name, entry] of Object.entries(zip.files)) {
    if (!entry.dir) {
      const content = await entry.async("string");

      await writeProjectFile(
        projectId,
        name,
        content,
      );
    }
  }
}