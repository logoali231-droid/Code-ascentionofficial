"use client";

import { useState } from "react";
import { initEngine } from "@/lib/webllm";
import { Cpu } from "lucide-react";
import { useRouter } from "next/navigation";

const models = [
  { name: "Phi-3.5-mini", desc: "Best for coding" },
  { name: "Llama-3.2-1B", desc: "Fast & light" },
  { name: "Gemma-2-2B", desc: "Balanced" },
];

export default function MachineLock() {
  const [selected, setSelected] = useState(models[0].name);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function start() {
    setLoading(true);

    await initEngine(selected, (p: any) => {
      setProgress(Math.floor(p.progress * 100));
    });

    router.push("/hub");
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Cpu size={20} /> AI Engine
      </h1>

      <div className="space-y-3">
        {models.map((m) => (
          <div
            key={m.name}
            onClick={() => setSelected(m.name)}
            className={`p-3 rounded-xl border cursor-pointer ${
              selected === m.name
                ? "border-blue-500 bg-slate-800"
                : "border-slate-700"
            }`}
          >
            <h3 className="font-semibold">{m.name}</h3>
            <p className="text-sm text-slate-400">{m.desc}</p>
          </div>
        ))}
      </div>

      <button
        onClick={start}
        className="mt-4 w-full bg-blue-600 py-2 rounded-xl"
      >
        {loading ? "Downloading..." : "Download Engine"}
      </button>

      {loading && (
        <div className="mt-4">
          <div className="h-2 bg-slate-700 rounded">
            <div
              className="h-2 bg-blue-500 rounded"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm mt-1">{progress}%</p>
        </div>
      )}
    </div>
  );
}