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
    <div>
      <input onChange={(e) => setId(e.target.value)} />
      <button onClick={handleLogin}>Enter</button>
    </div>
  );
}