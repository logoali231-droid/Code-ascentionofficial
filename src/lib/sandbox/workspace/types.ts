 import { Language } from "@/lib/sandbox/types";

export interface WorkspaceFile {
  id: string;

  path: string;

  name: string;

  type: "file" | "directory";

  parent?: string;

  content: string;

  language: string;

  updatedAt: number;

  createdAt: number;

  size?: number;
}

export interface SandboxWorkspace {
    id: string;

    name: string;

    runtime: "local" | "remote";

    language: Language;

    entrypoint: string;

    files: WorkspaceFile[];

    createdAt: number;

    updatedAt: number;

    version: number;
}