"use client";

import {
  SandboxWorkspace,
} from "./types";

import {
  generateManifest,
} from "./workspaceManifest";

export interface WorkspaceSnapshot {
  manifest: any;

  files: {
    path: string;
    content: string;
    language: string;
    updatedAt: number;
  }[];

  exportedAt: number;
}

export async function createWorkspaceSnapshot(
  workspace: SandboxWorkspace
): Promise<WorkspaceSnapshot> {
  return {
    manifest:
      generateManifest(
        workspace
      ),

    files:
      workspace.files.map(
        (file) => ({
          path: file.path,

          content:
            file.content,

          language:
            file.language,

          updatedAt:
            file.updatedAt,
        })
      ),

    exportedAt:
      Date.now(),
  };
}