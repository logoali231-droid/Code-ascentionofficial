"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { get, save } from "@/lib/others/db";

import { performStorageCleanup } from "@/lib/others/db";

export default function LoginPage() {
  const [id, setId] = useState("");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const router = useRouter();

  useEffect(() => {
    async function bootstrap() {
      try {
        await performStorageCleanup();
        const existing = await get("user", "main");

        // Futuro auto-login pode entrar aqui
        console.log("[LOGIN] Existing user:", !!existing);
      } catch (err) {
        console.error("[LOGIN BOOT ERROR]", err);
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, []);

  async function handleLogin() {
    const trimmed = id.trim();

    if (trimmed.length < 3) {
      setError("Assinatura neural inválida.");

      return;
    }

    try {
      setError("");

      const existing = await get("user", "main");

      // NOVO USUÁRIO
      if (!existing) {
        await save("user", {
          id: "main",
          lock: trimmed,
          xp: 0,
          createdAt: Date.now(),
        });

        console.log("[LOGIN] New user created");

        router.push("/machineLock");

        return;
      }

      // USUÁRIO EXISTENTE
      if (existing.lock === trimmed) {
        console.log("[LOGIN] Access granted");

        router.push("/hub");

        return;
      }

      setError("NEURAL_LOCK_MISMATCH");
    } catch (err) {
      console.error("[LOGIN ERROR]", err);

      setError("Falha ao acessar núcleo local.");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="font-mono text-cyan-400 animate-pulse tracking-widest text-sm">
          &gt; SYNCHRONIZING_NEURAL_DATABASE...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-linear-to-b from-slate-950 to-slate-900 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-cyan-900/40 bg-slate-900/90 backdrop-blur p-6 shadow-2xl shadow-cyan-950/20">
        <div className="mb-6">
          <h1 className="text-center text-xl font-black tracking-[0.25em] text-cyan-400 font-mono">
            CODE ASCENSION
          </h1>

          <p className="mt-2 text-center text-xs text-slate-500 font-mono uppercase">
            Neural access gateway
          </p>
        </div>

        <div className="space-y-3">
          <input
            value={id}
            onChange={(e) => {
              setId(e.target.value);

              if (error) {
                setError("");
              }
            }}
            placeholder="Insira sua assinatura neural..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-cyan-400 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 font-mono"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleLogin();
              }
            }}
          />

          {error && (
            <div className="rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs text-red-400 font-mono">
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={id.trim().length < 3}
            className="w-full rounded-xl bg-cyan-600 px-4 py-3 font-black uppercase tracking-[0.2em] text-white transition-all hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Inicializar
          </button>
        </div>

        <div className="mt-6 border-t border-slate-800 pt-4">
          <p className="text-center text-[10px] uppercase tracking-widest text-slate-600 font-mono leading-relaxed">
            Local-first AI system
            <br />
            Offline neural learning core
          </p>
        </div>
      </div>
    </main>
  );
}
