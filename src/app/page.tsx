"use client";

import { useState, useEffect } from "react";
import { save, get } from "@/lib/db";
import { useRouter } from "next/navigation";

export default function Login() {
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(true); // Trava inicial
  const router = useRouter();

  useEffect(() => {
    async function checkExisting() {
      // Só redireciona automaticamente se REALMENTE houver um usuário completo
      const existing = await get("user", "main");
      if (existing && existing.lock) {
        // Se já existe, não fazemos nada, deixamos o usuário digitar a chave
      }
      setLoading(false);
    }
    checkExisting();
  }, []);

  async function handleLogin() {
    if (!id.trim()) return; // Impede envio vazio
    
    const existing = await get("user", "main");

    if (!existing) {
      // Primeiro acesso: Salva e vai para onboarding
      await save("user", { id: "main", lock: id, xp: 0 });
      router.push("/onboarding");
    } else {
      // Validação de Chave Neural
      if (existing.lock === id) {
        router.push("/hub"); // Vá para o Hub, não direto para o download
      } else {
        alert("Neural Lock mismatch: Chave incorreta.");
      }
    }
  }

  if (loading) return <div className="bg-slate-900 min-h-screen text-cyan-500 p-10">SYNCHRONIZING...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="card bg-slate-800 p-6 rounded-xl w-full max-w-sm shadow-lg border border-slate-700">
        <h1 className="text-lg mb-4 text-center text-white font-mono">
          🔐 NEURAL_LOCK_INTERFACE
        </h1>

        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="Insira sua assinatura neural..."
          className="w-full p-3 rounded bg-slate-950 text-cyan-400 placeholder-slate-600 outline-none border border-slate-700 focus:border-cyan-500 transition-all"
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />

        <button
          onClick={handleLogin}
          disabled={id.length < 3}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all p-3 rounded text-white font-bold uppercase tracking-widest"
        >
          Acessar Sistema
        </button>
      </div>
    </div>
  );
}