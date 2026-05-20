"use client";

import { computeFileHash, computeRootHash } from "./cryptoUtils";
import {
  SandboxWorkspace,
} from "./types";

import {
  generateManifest,
} from "./workspaceManifest";




// Em src/lib/sandbox/workspace/workspaceSnapshot.ts
export interface WorkspaceSnapshot {
  manifest: {
    rootHash: string;
    timestamp: number;
    signature?: string;
  };
  files: {
    path: string;
    hash: string; 
    updatedAt: number;
  }[];
  exportedAt: number;
}
export async function createWorkspaceSnapshot(
  workspace: SandboxWorkspace
): Promise<WorkspaceSnapshot> {
const filesWithHash = await Promise.all(workspace.files.map(async (file) => ({
    path: file.path,
    hash: await computeFileHash(file.content), // Função utilitária sugerida anteriormente
    updatedAt: file.updatedAt,
  })));

  // 2. Cálculo do Root Hash (Exemplo simplificado de Merkle Root)
  const rootHash = await computeRootHash(filesWithHash.map(f => f.hash));

  return {
    manifest: {
      rootHash,
      timestamp: Date.now(),
    },
    files: filesWithHash,
    exportedAt: Date.now(),
  };
}