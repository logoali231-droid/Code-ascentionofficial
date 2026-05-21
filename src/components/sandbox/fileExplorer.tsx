"use client";

import { saveAs } from 'file-saver';

import {
  exportWorkspace,
} from "@/lib/sandbox/workspace/workspaceExporter";
import { useEffect, useState } from "react";

import {
  workspaceManager,
} from "@/lib/sandbox/workspace/workspaceManager";

import {
  WorkspaceFile,
} from "@/lib/sandbox/workspace/types";

interface Props {
  

  onFileSelect?: (
    file: WorkspaceFile
  ) => void;
}

export default function FileExplorer({
  onFileSelect,
}: Props) {
  
  const [workspaceId, setWorkspaceId] = useState<string>("");

  
  const [files, setFiles] =
    useState<WorkspaceFile[]>([]);

  const [activeFile, setActiveFile] =
    useState<string | null>(null);
  
  useEffect(() => {
  refreshFiles();
  // Captura o ID do workspace atual quando o componente monta
  const currentWorkspace = workspaceManager.getWorkspace();
  if (currentWorkspace) {
    setWorkspaceId(currentWorkspace.id);
  }
}, []);

  function refreshFiles() {
    const workspace =
      workspaceManager.getWorkspace();

    if (!workspace) {
      return;
    }

    setFiles(workspace.files);

    setActiveFile(
      workspaceManager.getActiveFile()
    );
  }

  async function handleCreateFile() {
    const name = prompt(
      "File path"
    );

    if (!name) {
      return;
    }

    await workspaceManager.createFile(
      name,
      ""
    );

    refreshFiles();
  }

  async function handleSelectFile(
    file: WorkspaceFile
  ) {
    workspaceManager.setActiveFile(
      file.path
    );

    setActiveFile(file.path);

    onFileSelect?.(file);
  }

  async function handleDeleteFile(
    path: string
  ) {
    const confirmed =
      confirm(
        `Delete ${path}?`
      );

    if (!confirmed) {
      return;
    }

    await workspaceManager.deleteFile(
      path
    );

    refreshFiles();
  }

  return (
    <div
  className="
    flex
    items-center
    justify-between
    px-3
    py-2
    border-b
    border-zinc-800
  "
>
  <span
    className="
      text-xs
      uppercase
      tracking-wider
      text-zinc-400
    "
  >
    Explorer
  </span>

  <div className="flex items-center gap-2">
    <button 
  onClick={async () => {
    try {
      const blob = await exportWorkspace(workspaceId);
      saveAs(blob, `workspace-${workspaceId}.zip`);
    } catch (e) {
      console.error("Falha ao exportar:", e);
    }
  }}
  className="text-xs px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600"
>
  Export
</button>

    <button
      onClick={handleCreateFile}
      className="
        text-xs
        px-2
        py-1
        rounded
        bg-zinc-800
        hover:bg-zinc-700
      "
    >
      +
    </button>
  </div>
</div>
  );
}
