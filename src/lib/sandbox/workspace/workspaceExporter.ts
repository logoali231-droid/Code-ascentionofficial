"use client";

import JSZip from "jszip";

import { saveAs } from "file-saver";


import {
  workspaceManager,
} from "./workspaceManager";

import {
  createWorkspaceSnapshot,
} from "./workspaceSnapshot";

// workspaceExporter.ts

export async function exportWorkspace(workspaceId: string): Promise<Blob> {
  const workspace = workspaceManager.getWorkspace(); // Verifique se precisa filtrar pelo ID aqui

  if (!workspace) {
    throw new Error("Workspace not loaded");
  }

  const zip = new JSZip();
  const snapshot = await createWorkspaceSnapshot(workspace);

  zip.file("workspace.json", JSON.stringify(snapshot.manifest, null, 2));

  for (const fileSnapshot of snapshot.files) {
    // Busca o conteúdo real do workspace original, não do snapshot
    const originalFile = workspace.files.find(f => f.path === fileSnapshot.path);
    if (originalFile) {
        zip.file(fileSnapshot.path, originalFile.content);
    }
  }

  zip.file(".ascension-meta.json", JSON.stringify({
    exportedAt: Date.now(),
    runtime: workspace.runtime,
    language: workspace.language,
  }, null, 2));

  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}