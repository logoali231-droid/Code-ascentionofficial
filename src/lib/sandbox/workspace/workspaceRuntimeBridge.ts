"use client";

import {
  workspaceManager,
} from "./workspaceManager";

import {
  executeSandboxCode,
} from "../sandboxRunner";

export async function runWorkspace() {
  const workspace =
    workspaceManager.getWorkspace();

  if (!workspace) {
    throw new Error(
      "Workspace not loaded"
    );
  }

  const entry =
    workspace.files.find(
      (f) =>
        f.path ===
        workspace.entrypoint
    );

  if (!entry) {
    throw new Error(
      "Entrypoint not found"
    );
  }

  return await executeSandboxCode(
    entry.content,
    workspace.language
  );
}

export async function runWorkspaceFile(
  path: string
) {
  const workspace =
    workspaceManager.getWorkspace();

  if (!workspace) {
    throw new Error(
      "Workspace not loaded"
    );
  }

  const file =
    workspace.files.find(
      (f) => f.path === path
    );

  if (!file) {
    throw new Error(
      "File not found"
    );
  }

  return await executeSandboxCode(
    file.content,
    file.language as any
  );
}