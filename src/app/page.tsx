"use client";

import { useState } from "react";
import { save, get } from "@/lib/db";
import { useRouter } from "next/navigation";

export default function Login() {
  const [id, setId] = useState("");
  const router = useRouter();

  async function handleLogin() {
    
    const existing = await get("user", "main");

    if (!existing) {
      await save("user", { id: "main", lock: id });
      router.push("/onboarding");
    } else {
      if (existing.lock === id) {
        router.push("/machine_lock");
      } else {
        alert("Neural Lock mismatch");
      }
    }
  }

  return (
  <div className="min-h-screen flex items-center justify-center bg-slate-900">
    <div className="card bg-slate-800 p-6 rounded-xl w-full max-w-sm shadow-lg">

      <h1 className="text-lg mb-4 text-center text-white">
        🔐 Neural Lock
      </h1>

      <input
        value={id}
        onChange={(e) => setId(e.target.value)}
        placeholder="Enter your key..."
        className="w-full p-3 rounded bg-slate-700 text-white placeholder-gray-400 outline-none"
      />

      <button
        onClick={handleLogin}
        className="w-full mt-4 bg-blue-600 hover:bg-blue-500 transition-all p-3 rounded text-white"
      >
        Enter
      </button>

    </div>
  </div>
);
}