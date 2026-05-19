"use client";

interface Props {
  logs: string[];
}

export default function SandboxTerminal({
  logs,
}: Props) {
  return (
    <div
      className="
      h-48
      bg-black
      border-t
      border-zinc-800
      overflow-y-auto
      font-mono
      text-xs
      p-3
    "
    >
      {logs.map(
        (log, index) => (
          <div
            key={index}
            className="
              text-zinc-300
              mb-1
            "
          >
            {log}
          </div>
        )
      )}
    </div>
  );
}