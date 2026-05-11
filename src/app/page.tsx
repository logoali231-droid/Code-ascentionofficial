"use client";

import { useState, useEffect } from "react";
import { save, get } from "@/lib/db";
import { useRouter } from "next/navigation";

export default function Login() {
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkExisting() {
      // Verifica se o usuário já existe e já passou pela configuração inicial
      const existing = await get("user", "main");
      
      // Se já houver um registro completo, o useEffect termina e permite o login
      // Caso queira um auto-login futuro, a lógica entraria aqui.
      setLoading(false);
    }
    checkExisting();
  }, []);

  async function handleLogin() {
    if (!id.trim()) return;
    
    const existing = await get("user", "main");

    if (!existing) {
      // NOVO USUÁRIO:
      // Salva os dados básicos e envia para a Machine Lock para configurar a IA
      // Substituímos /onboarding por /machineLock
      await save("user", { id: "main", lock: id, xp: 0 });
      router.push("/machineLock"); 
    } else {
      // USUÁRIO EXISTENTE:
      if (existing.lock === id) {
        // Se a chave estiver correta, vai para o Hub Central
        router.push("/hub");
      } else {
        alert("NEURAL_LOCK_MISMATCH: Assinatura neural não reconhecida.");
      }
    }
  }

  if (loading) return (
    <div className="bg-slate-900 min-h-screen text-cyan-500 p-10 font-mono animate-pulse">
      &gt; SYNCHRONIZING_NEURAL_DATABASE...
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="card bg-slate-800 p-6 rounded-xl w-full max-w-sm shadow-lg border border-slate-700">
        <h1 className="text-lg mb-4 text-center text-white font-mono uppercase tracking-tighter">
          🔐 NEURAL_LOCK_v2.1
        </h1>

        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="Insira sua assinatura neural..."
          className="w-full p-3 rounded bg-slate-950 text-cyan-400 placeholder-slate-600 outline-none border border-slate-700 focus:border-cyan-500 transition-all font-mono"
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
        />

        <button
          onClick={handleLogin}
          disabled={id.length < 3}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all p-3 rounded text-white font-bold uppercase tracking-widest shadow-lg shadow-blue-900/20"
        >
          Acessar Sistema
        </button>
        
        <p className="text-[10px] text-slate-500 mt-4 text-center font-mono uppercase">
          Aviso: Acesso restrito a operadores autorizados.
        </p>
      </div>
    </div>
  );
}