"use client";

import { useState } from "react";
import { initEngine } from "@/lib/webllm";
import { Cpu } from "lucide-react";
import { useRouter } from "next/navigation";

const models = [
  { 
    id: "Phi-3.5-mini-instruct-q4f16_1-MLC", 
    name: "Phi-3.5-mini", 
    desc: "Melhor para lógica (Recomendado para o M23)" 
  },
  { 
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC", 
    name: "Llama-3.2-1B", 
    desc: "O mais leve e rápido" 
  },
  { 
    id: "gemma-2-2b-it-q4f16_1-MLC", 
    name: "Gemma-2-2B", 
    desc: "Boa escrita criativa" 
  }
];

export default function MachineLock() {
  // Alterado para usar o ID como valor de referência
  const [selectedId, setSelectedId] = useState(models[0].id); 
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function start() {
    if (loading) return; // Evita iniciar dois downloads ao mesmo tempo
    setLoading(true);

    try {
      // Agora passamos o ID técnico correto para a biblioteca
      await initEngine(selectedId, (p: any) => {
        setProgress(Math.floor(p.progress * 100));
      });

      router.push("/hub");
    } catch (err) {
      console.error("Erro ao baixar modelo:", err);
      setLoading(false);
      alert("Erro ao baixar o modelo. Verifique sua conexão ou memória.");
    }
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Cpu size={20} /> AI Engine
      </h1>

      <div className="space-y-3">
        {models.map((m) => (
          <div
            key={m.id}
            onClick={() => !loading && setSelectedId(m.id)}
            className={`p-3 rounded-xl border cursor-pointer transition-colors ${
              selectedId === m.id
                ? "border-blue-500 bg-slate-800"
                : "border-slate-700 hover:border-slate-500"
            } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <h3 className="font-semibold">{m.name}</h3>
            <p className="text-sm text-slate-400">{m.desc}</p>
          </div>
        ))}
      </div>

      <button
        onClick={start}
        disabled={loading}
        className={`mt-4 w-full py-3 rounded-xl font-bold transition-all ${
          loading 
            ? "bg-slate-700 cursor-not-allowed" 
            : "bg-blue-600 hover:bg-blue-500 active:scale-95"
        }`}
      >
        {loading ? `Downloading ${progress}%...` : "Download Engine"}
      </button>

      {loading && (
        <div className="mt-4">
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-xs mt-2 text-slate-400">
            Isso pode demorar alguns minutos dependendo da sua internet.
          </p>
        </div>
      )}
    </div>
  );
}