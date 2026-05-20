"use client";

import { SandboxWorkspace } from "./types";

export interface WorkspaceManifest {
  id: string;

  name: string;

  version: number;

  runtime:
    | "local"
    | "remote"
    | "neural";

  language: string;

  entrypoint: string;

  createdAt: number;

  updatedAt: number;

  files: {
    path: string;
    size: number;
    updatedAt: number;
    language: string;
  }[];

  sandbox: {
    engine: string;
    websocket: boolean;
    workerIsolation: boolean;
    filesystem: "opfs";
  };

  telemetry: {
    enabled: boolean;
    sampled: boolean;
  };
}

export function generateManifest(
  workspace: SandboxWorkspace
): WorkspaceManifest {
  return {
    id: workspace.id,

    name: workspace.name,

    version: workspace.version,

    runtime: workspace.runtime,

    language: workspace.language,

    entrypoint:
      workspace.entrypoint,

    createdAt:
      workspace.createdAt,

    updatedAt:
      workspace.updatedAt,

    files:
      workspace.files.map(
        (file) => ({
          path: file.path,

          size:
            file.content.length,

          updatedAt:
            file.updatedAt,

          language:
            file.language,
        })
      ),

    sandbox: {
      engine:
        workspace.runtime,

      websocket: true,

      workerIsolation: true,

      filesystem: "opfs",
    },

    telemetry: {
      enabled: true,

      sampled: true,
    },
  };
}