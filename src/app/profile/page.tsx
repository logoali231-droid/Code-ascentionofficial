"use client";

import { useState, useEffect } from "react";
import { exportUserMind } from "@/lib/others/memoryExport";
import { importUserMind } from "@/lib/others/memoryImport";
import { save, db, get, performStorageCleanup } from "@/lib/others/db";
import {
  loginWithGoogle,
  cloudExportMind,
  cloudImportMind,
} from "src/lib/others/cloudMemory";
import { signIn, signOut, useSession } from "next-auth/react";

/* ============================================================================
   COMPONENT: BANNED TERMS MANAGER (Anti-Cortex Filter)
============================================================================ */
function BannedTermsManager() {
  const [bannedTerms, setBannedTerms] = useState<string[]>([]);
  const [newTerm, setNewTerm] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const user = await get("user", "main");
      if (user?.customBanned) {
        setBannedTerms(user.customBanned);
      }
    }
    loadProfile();
  }, []);

  async function handleAddTerm() {
    if (!newTerm.trim()) return;

    const cleaned = newTerm.trim().toLowerCase();
    if (bannedTerms.includes(cleaned)) return;

    const updatedTerms = [...bannedTerms, cleaned];
    setBannedTerms(updatedTerms);
    setNewTerm("");

    const user = (await get("user", "main")) || {};
    user.customBanned = updatedTerms;
    await save("user", user, "main");
  }

  async function handleRemoveTerm(termToRemove: string) {
    const updatedTerms = bannedTerms.filter((t) => t !== termToRemove);
    setBannedTerms(updatedTerms);

    const user = (await get("user", "main")) || {};
    user.customBanned = updatedTerms;
    await save("user", user, "main");
  }

  return (
    <div className="p-4 bg-slate-900/20 border border-[#00FF00]/30 rounded font-mono w-full">
      <h3 className="text-[#00FF00] text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
        <span>☣️</span> Anti-Cortex Word Filter
      </h3>
      <p className="text-[10px] text-slate-400 mb-4 uppercase">
        Bane termos específicos das gerações de IA da sua mentoria.
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTerm}
          onChange={(e) => setNewTerm(e.target.value)}
          placeholder="Ex: innerHTML, var, etc..."
          className="flex-1 bg-slate-950 border border-slate-800 focus:border-[#FF0000] text-xs p-2 rounded text-white outline-none transition-all"
          onKeyDown={(e) => e.key === "Enter" && handleAddTerm()}
        />
        <button
          onClick={handleAddTerm}
          className="bg-slate-950 border border-[#00FF00]/50 hover:bg-[#00FF00] hover:text-black text-[#00FF00] text-xs px-4 rounded font-bold transition-all"
        >
          EXEC
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
        {bannedTerms.map((term) => (
          <span
            key={term}
            className="inline-flex items-center gap-1.5 bg-slate-950 border border-[#FF0000]/40 text-[#FF0000] text-[11px] px-2 py-0.5 rounded"
          >
            {term}
            <button
              onClick={() => handleRemoveTerm(term)}
              className="hover:text-white font-bold text-[10px] ml-1"
            >
              ✕
            </button>
          </span>
        ))}
        {bannedTerms.length === 0 && (
          <div className="text-[10px] text-slate-600 italic uppercase p-2 border border-dashed border-slate-900 w-full text-center rounded">
            No active blocklist filters.
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   MAIN PAGE: PROFILE PAGE
============================================================================ */
export default function ProfilePage() {

  const { data: session } = useSession();
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importUserMind(file);
        alert("NEURAL LINK RESTAURADO COM SUCESSO");
        window.location.reload();
      } catch (err) {
        console.error("Erro na restauração:", err);
        alert("FALHA NA SINCRONIZAÇÃO NEURAL");
      }
    }
  }

  async function handleReset() {
    if (!confirm("AVISO: ESTA AÇÃO IRÁ APAGAR SUA CONSCIÊNCIA ATUAL. CONTINUAR?")) return;

    try {
      await performStorageCleanup();

      // 1. Limpa o disco primeiro de forma síncrona/atómica
      await Promise.all([
        db.table("courses").clear(),
        db.table("errors").clear(),
        db.table("memory").clear(),
        db.table("curriculum").clear(),
        db.table("user").clear()
      ]);

      // 2. Grava o estado inicial limpo diretamente, sobrepondo o buffer
      await save("user", { xp: 0, coins: 0, level: 1, customBanned: [] }, "main");

      // 3. Força o hard-reload para limpar os timers pendentes do debounce em RAM
      window.location.replace("/profile");
    } catch (error) {
      console.error("Falha no reset do sistema:", error);
    }
  }

  return (
    <div className="p-6 space-y-6 bg-black min-h-screen font-mono text-[#00FF00]">
      <h1 className="text-2xl font-bold border-b border-[#00FF00] pb-2 uppercase tracking-tighter">
        Perfil do Operator // Configurações
      </h1>

      {/* CORE ADAPTATION FILTER */}
      <div className="space-y-2">
        <h2 className="text-sm uppercase opacity-70">
          Filtros Cognitivos Dinâmicos
        </h2>
        <BannedTermsManager />
      </div>

      <div className="space-y-4 pt-4">
        <h2 className="text-sm uppercase opacity-70">
          Backup de Consciência (External Save)
        </h2>

        {/* EXPORT */}
        <button
          onClick={() => exportUserMind()}
          className="w-full border border-[#00FF00] text-[#00FF00] hover:bg-[#00FF00] hover:text-black p-4 rounded transition-all font-bold uppercase"
        >
          Exportar Memória (.JSON)
        </button>

        {/* IMPORT */}
        <div className="relative border border-dashed border-slate-800 p-4 rounded bg-slate-900/30">
          <label className="block text-[10px] text-slate-500 mb-2 uppercase">
            Restaurar Neural Link
          </label>
          <input
            type="file"
            accept=".caiprofile,.json" onChange={handleImport}
            className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:bg-[#00FF00] file:text-black hover:file:opacity-80 cursor-pointer"
          />
        </div>
      </div>

      {/* GOOGLE LOGIN */}
      <div className="space-y-3 border border-slate-800 p-4 rounded bg-slate-900/30">

        <h2 className="text-sm uppercase opacity-70">
          Neural Identity Sync
        </h2>

        {!session ? (
          <button
            onClick={() => signIn("google")}
            className="w-full border border-white text-white hover:bg-white hover:text-black p-4 rounded transition-all font-bold uppercase"
          >
            Entrar com Google
          </button>
        ) : (
          <>
            <div className="text-xs text-slate-400">
              Conectado como:
              <div className="text-[#00FF00] mt-1">
                {session.user?.email}
              </div>
            </div>

            <button
              onClick={cloudExportMind}
              className="w-full border border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-black p-4 rounded transition-all font-bold uppercase"
            >
              Salvar Consciência na Nuvem
            </button>

            <button
              onClick={cloudImportMind}
              className="w-full border border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-black p-4 rounded transition-all font-bold uppercase"
            >
              Restaurar da Nuvem
            </button>

            <button
              onClick={() => signOut()}
              className="w-full border border-red-500 text-red-400 hover:bg-red-500 hover:text-black p-4 rounded transition-all font-bold uppercase"
            >
              Sair
            </button>
          </>
        )}
      </div>

      <div className="pt-10">
        <p className="text-[10px] text-[#FF0000] mb-2 uppercase text-center animate-pulse">
          Cuidado: Operação Irreversível
        </p>
        <button
          onClick={handleReset}
          className="w-full bg-[#FF0000] text-white font-bold p-4 rounded shadow-[0_0_20px_rgba(255,0,0,0.3)] hover:shadow-[0_0_30px_rgba(255,0,0,0.5)] transition-all uppercase"
        >
          Deletar Toda a Experiência
        </button>
      </div>
    </div>
  );
}
