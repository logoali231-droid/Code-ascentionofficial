"use client";

interface Props {
  activeFile?: string;

  isRunning: boolean;

  onRun: () => void;
}

export default function SandboxStatusBar({
  activeFile,
  isRunning,
  onRun,
}: Props) {
  return (
    <div
      className="
      h-8
      bg-zinc-900
      border-t
      border-zinc-800
      flex
      items-center
      justify-between
      px-3
      text-xs
    "
    >
      <div>
        {activeFile ||
          "No file selected"}
      </div>

      <button
        onClick={onRun}
        disabled={isRunning}
        className="
          px-3
          py-1
          rounded
          bg-blue-600
          hover:bg-blue-500
          disabled:opacity-50
        "
      >
        {isRunning
          ? "Running..."
          : "Run"}
      </button>
    </div>
  );
}