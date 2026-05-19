"use client";

import {
  WorkspaceFile,
} from "@/lib/sandbox/workspace/types";

interface Props {
  activeFile:
    | WorkspaceFile
    | null;
}

export default function EditorTabs({
  activeFile,
}: Props) {
  return (
    <div
      className="
      h-10
      flex
      items-center
      border-b
      border-zinc-800
      bg-zinc-900
    "
    >
      {activeFile && (
        <div
          className="
          px-4
          h-full
          flex
          items-center
          border-r
          border-zinc-800
          bg-zinc-950
          text-sm
        "
        >
          {activeFile.path}
        </div>
      )}
    </div>
  );
}