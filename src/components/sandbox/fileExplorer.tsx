"use client";

import { saveAs } from "file-saver";
import { useEffect, useState } from "react";

import { exportWorkspace } from "@/lib/sandbox/workspace/workspaceExporter";
import { workspaceManager } from "@/lib/sandbox/workspace/workspaceManager";
import { WorkspaceFile } from "@/lib/sandbox/workspace/types";

interface Props {
  onFileSelect?: (file: WorkspaceFile) => void;
}

export default function FileExplorer({ onFileSelect }: Props) {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string>("");

  useEffect(() => {
    refreshFiles();

    const workspace = workspaceManager.getWorkspace();

    if (workspace) {
      setWorkspaceId(workspace.id);
    }
  }, []);

  function refreshFiles() {
    const workspace = workspaceManager.getWorkspace();

    if (!workspace) {
      setFiles([]);
      setActiveFile(null);
      return;
    }

    setFiles([...workspace.files]);
    setActiveFile(workspaceManager.getActiveFile());
    setWorkspaceId(workspace.id);
  }

  async function handleCreateFile() {
    const name = prompt("File path");

    if (!name?.trim()) {
      return;
    }

    try {
      await workspaceManager.createFile(name.trim(), "");

      refreshFiles();
    } catch (error) {
      console.error("Falha ao criar arquivo:", error);
    }
  }

  function handleSelectFile(file: WorkspaceFile) {
    workspaceManager.setActiveFile(file.path);

    setActiveFile(file.path);

    onFileSelect?.(file);
  }

  async function handleDeleteFile(path: string) {
    const confirmed = confirm(`Delete ${path}?`);

    if (!confirmed) {
      return;
    }

    try {
      await workspaceManager.deleteFile(path);

      if (workspaceManager.getActiveFile() === path) {
        setActiveFile(null);
      }

      refreshFiles();
    } catch (error) {
      console.error("Falha ao excluir arquivo:", error);
    }
  }

  async function handleExportWorkspace() {
    if (!workspaceId) {
      return;
    }

    try {
      const blob = await exportWorkspace(workspaceId);

      saveAs(blob, `workspace-${workspaceId}.zip`);
    } catch (error) {
      console.error("Falha ao exportar workspace:", error);
    }
  }

  return (
    <aside className="flex h-full w-full flex-col bg-zinc-950">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
          Explorer
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCreateFile}
            title="New File"
            className="rounded px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            +
          </button>

          <button
            type="button"
            onClick={handleExportWorkspace}
            disabled={!workspaceId}
            title="Export Workspace"
            className="rounded px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            ↓
          </button>
        </div>
      </div>

      {/* FILE LIST */}
      <div className="flex-1 overflow-y-auto py-1">
        {files.length === 0 ? (
          <div className="px-3 py-4 text-xs text-zinc-600">No files</div>
        ) : (
          files.map((file) => {
            const isActive = activeFile === file.path;

            return (
              <div
                key={file.path}
                className={`
                  group flex items-center
                  border-l-2
                  ${
                    isActive
                      ? "border-blue-500 bg-zinc-800 text-white"
                      : "border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  }
                `}
              >
                <button
                  type="button"
                  onClick={() => handleSelectFile(file)}
                  className="flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left text-sm"
                  title={file.path}
                >
                  <span className="shrink-0 text-xs">
                    {getFileIcon(file.path)}
                  </span>

                  <span className="truncate">{file.path}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteFile(file.path)}
                  title={`Delete ${file.path}`}
                  className="mr-1 hidden rounded px-1.5 py-0.5 text-xs text-zinc-600 hover:bg-red-950 hover:text-red-400 group-hover:block"
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

function getFileIcon(path: string) {
  const lower = path.toLowerCase();

  if (lower.endsWith(".tsx")) return "⚛";
  if (lower.endsWith(".ts")) return "TS";
  if (lower.endsWith(".jsx")) return "⚛";
  if (lower.endsWith(".js")) return "JS";
  if (lower.endsWith(".json")) return "{}";
  if (lower.endsWith(".css")) return "#";
  if (lower.endsWith(".html")) return "◇";
  if (lower.endsWith(".py")) return "🐍";
  if (lower.endsWith(".rs")) return "🦀";
  if (lower.endsWith(".cpp")) return "C++";
  if (lower.endsWith(".md")) return "M";

  return "📄";
}
