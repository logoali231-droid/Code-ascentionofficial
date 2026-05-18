"use client";

import { exportUserMind } from "@/lib/memoryExport";
import { importUserMind } from "@/lib/memoryImport";
import { save, db, performStorageCleanup } from "@/lib/db";

export default function ProfilePage() {
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importUserMind(file);
        alert("NEURAL LINK RESTAURADO COM SUCESSO");
        window.location.reload(); // Recarrega para aplicar a nova consciência
      } catch (err) {
        console.error("Erro na restauração:", err);
        alert("FALHA NA SINCRONIZAÇÃO NEURAL");
      }
    }
  }

  async function handleReset() {
    if (
      !confirm("AVISO: ESTA AÇÃO IRÁ APAGAR SUA CONSCIÊNCIA ATUAL. CONTINUAR?")
    )
      return;

    try {
      // ⚠️ CRÍTICO: Limpeza de cache para evitar erros de cota (Samsung M23)
      await performStorageCleanup();

      // Reset do usuário usando o helper 'save' para preservar a estrutura do banco
      await save("main", { xp: 0, coins: 0, level: 1 });

      // Limpeza completa das tabelas de progresso e memória
      await Promise.all([
        db.courses.clear(),
        db.errors.clear(),
        db.memory.clear(),
      ]);

      window.location.reload();
    } catch (error) {
      console.error("Falha no reset do sistema:", error);
    }
  }

  return (
    <div className="p-6 space-y-6 bg-black min-h-screen font-mono text-[#00FF00]">
      <h1 className="text-2xl font-bold border-b border-[#00FF00] pb-2 uppercase tracking-tighter">
        Perfil do Operator // Configurações
      </h1>

      <div className="space-y-4">
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
            accept=".json"
            onChange={handleImport}
            className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:bg-[#00FF00] file:text-black hover:file:opacity-80 cursor-pointer"
          />
        </div>
      </div>

      <div className="pt-20">
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
