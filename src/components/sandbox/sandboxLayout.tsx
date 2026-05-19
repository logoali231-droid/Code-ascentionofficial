"use client";

import { useEffect, useState } from "react";
import FileExplorer from "./fileExplorer";
import EditorTabs from "./EditorTabs";
import SandboxTerminal from "./SandboxTerminal";
import SandboxStatusBar from "./SandboxStatusBar";

import {
  WorkspaceFile,
} from "@/lib/sandbox/workspace/types";

import {
  workspaceManager,
} from "@/lib/sandbox/workspace/workspaceManager";

import {
  runWorkspaceFile,
} from "@/lib/sandbox/workspace/workspaceRuntimeBridge";

interface Props {
  editor: React.ReactNode;
}

export default function SandboxLayout({
  editor,
}: Props) {
  const [
    activeFile,
    setActiveFile,
  ] = useState<WorkspaceFile | null>(
    null
  );

  const [
    logs,
    setLogs,
  ] = useState<string[]>([]);

  const [
    isRunning,
    setIsRunning,
  ] = useState(false);

  async function handleRun() {
    if (!activeFile) {
      return;
    }

    setIsRunning(true);

    setLogs((prev) => [
      ...prev,
      `[SYSTEM] Running ${activeFile.path}`,
    ]);

    try {
      const result =
        await runWorkspaceFile(
          activeFile.path
        );

      if (result.output) {
        setLogs((prev) => [
          ...prev,
          ...result.output,
        ]);
      }

      if (result.error) {
        setLogs((prev) => [
          ...prev,
          `[ERROR] ${result.error}`,
        ]);
      }
    } catch (err: any) {
      setLogs((prev) => [
        ...prev,
        `[CRASH] ${err.message}`,
      ]);
    } finally {
      setIsRunning(false);
    }
  }

  useEffect(() => {
    const workspace =
      workspaceManager.getWorkspace();

    if (!workspace) {
      return;
    }

    if (workspace.files.length > 0) {
      setActiveFile(
        workspace.files[0]
      );
    }
  }, []);

  return (
    <div
      className="
      h-screen
      w-screen
      flex
      bg-zinc-950
      text-zinc-100
      overflow-hidden
    "
    >
      {/* Explorer */}
      <div
        className="
        w-64
        border-r
        border-zinc-800
      "
      >
        <FileExplorer
          onFileSelect={
            setActiveFile
          }
        />
      </div>

      {/* Main */}
      <div
        className="
        flex-1
        flex
        flex-col
      "
      >
        <EditorTabs
          activeFile={activeFile}
        />

        <div className="flex-1">
          {editor}
        </div>

        <SandboxTerminal
          logs={logs}
        />

        <SandboxStatusBar
          activeFile={
            activeFile?.path
          }
          isRunning={isRunning}
          onRun={handleRun}
        />
      </div>
    </div>
  );
}