"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/others/supabase";


import { exportUserMind } from "@/lib/others/memoryExport";
import { importUserMind } from "@/lib/others/memoryImport";
import { save, db, get, performStorageCleanup } from "@/lib/others/db";
import {
  cloudExportMind,
  cloudImportMind,
} from "@/lib/others/cloudMemory";

/* ============================================================================
   COMPONENT: BANNED TERMS MANAGER
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

    const updated = [...bannedTerms, cleaned];
    setBannedTerms(updated);
    setNewTerm("");

    const user = (await get("user", "main")) || {};
    user.customBanned = updated;

    await save("user", user, "main");
  }

  async function handleRemoveTerm(term: string) {
    const updated = bannedTerms.filter((t) => t !== term);
    setBannedTerms(updated);

    const user = (await get("user", "main")) || {};
    user.customBanned = updated;

    await save("user", user, "main");
  }

  return (
    <div className="p-4 bg-slate-900/20 border border-[#00FF00]/30 rounded font-mono w-full">
      <h3 className="text-[#00FF00] text-xs font-bold uppercase mb-2">
        ☣️ Anti-Cortex Word Filter
      </h3>

      <div className="flex gap-2 mb-4">
        <input
          value={newTerm}
          onChange={(e) => setNewTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddTerm()}
          className="flex-1 bg-slate-950 border border-slate-800 text-xs p-2 rounded text-white"
          placeholder="Ex: innerHTML, var..."
        />

        <button
          onClick={handleAddTerm}
          className="border border-[#00FF00] text-[#00FF00] px-4 text-xs font-bold"
        >
          EXEC
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {bannedTerms.map((term) => (
          <span
            key={term}
            className="bg-slate-950 border border-red-500 text-red-400 text-[11px] px-2 py-1 rounded"
          >
            {term}
            <button onClick={() => handleRemoveTerm(term)}> ✕ </button>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   PAGE
============================================================================ */

async function login() {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });
}

async function logout() {
  await supabase.auth.signOut();
}

export default function ProfilePage() {
const [session, setSession] = useState<any>(null);

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session);
  });

  const { data: listener } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setSession(session);
    }
  );

  return () => listener.subscription.unsubscribe();
}, []);

  async function handleReset() {
    if (!confirm("Apagar toda a consciência?")) return;

    try {
      await performStorageCleanup();

      await Promise.all([
        db.table("courses").clear(),
        db.table("errors").clear(),
        db.table("memory").clear(),
        db.table("curriculum").clear(),
        db.table("user").clear(),
      ]);

      await save("user", {
        xp: 0,
        coins: 0,
        level: 1,
        customBanned: [],
      }, "main");

      window.location.replace("/profile");
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="p-6 space-y-6 bg-black min-h-screen text-[#00FF00] font-mono">

      <h1 className="text-2xl border-b border-[#00FF00] pb-2">
        Perfil do Operator
      </h1>

      <BannedTermsManager />

      <div className="space-y-4">

        <button onClick={exportUserMind}>
          Exportar Memória
        </button>

        <input
          type="file"
          accept=".caiprofile,.json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importUserMind(file);
          }}
        />

      </div>

      <div className="space-y-3">

        {!session ? (
          <button onClick={login}>
            Entrar com Google
          </button>
        ) : (
          <>
            <p>LOGADO: {session.user?.email}</p>

            <button onClick={cloudExportMind}>
              Upload Cloud
            </button>

            <button onClick={cloudImportMind}>
              Restore Cloud
            </button>

            <button onClick={() => logout()}>
              Logout
            </button>
          </>
        )}

      </div>

      <button
        onClick={handleReset}
        className="bg-red-600 text-white p-4 w-full"
      >
        RESET TOTAL
      </button>

    </div>
  );
}