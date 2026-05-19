"use client";

import { useEffect, useState, useRef } from "react";
import { get, performStorageCleanup } from "@/lib/db";
import { useRouter, usePathname } from "next/navigation";

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState("Standard");

  // 🌱 SUSTENTABILIDADE STATE
  const [trees, setTrees] = useState(0);
  const [co2, setCo2] = useState(0);

  const router = useRouter();
  const pathname = usePathname();

  // 🧠 refs para tracking contínuo (não re-renderiza a cada ação)
  const sessionStart = useRef(Date.now());
  const tokensRef = useRef(0);
  const actionsRef = useRef(0);
  const dataMBRef = useRef(0);

  // =========================================================
  // SW + USER LOAD
  // =========================================================
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then(() => console.log("SW registered"))
          .catch((err) => console.log("SW registration failed", err));
      });
    }

    async function load() {
      if (pathname === "/" || pathname === "/machineLock") return;

      const user = await get("user", "main");

      if (!user) {
        router.push("/machineLock");
        return;
      }

      if (user.profile) {
        setProfile(user.profile);
      }

      performStorageCleanup().catch((err) =>
        console.error("[Boot Cleanup] Error:", err)
      );
    }

    load();
  }, [router, pathname]);

  // =========================================================
  // PROFILE APPLY
  // =========================================================
  useEffect(() => {
    document.body.setAttribute("data-profile", profile);
  }, [profile]);

  // =========================================================
  // 🌱 SUSTAINABILITY ENGINE (REAL TIME ESTIMATION)
  // =========================================================
  useEffect(() => {
    const interval = setInterval(() => {
      const sessionMinutes =
        (Date.now() - sessionStart.current) / 60000;

      const hours = sessionMinutes / 60;

      // 🔋 energia do dispositivo (~2W mobile médio)
      const E_device = (2 / 1000) * hours;

      // 🧠 inferência LLM
      const E_inference = tokensRef.current * 0.0000005;

      // 🌐 rede
      const E_network = dataMBRef.current * 0.0000002;

      const E_total = E_device + E_inference + E_network;

      // 🌍 CO₂ (kg)
      const CO2 = E_total * 0.4;

      // 🌳 árvores equivalentes
      const trees = CO2 / 21;

      setCo2(CO2);
      setTrees(trees);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // =========================================================
  // 🌱 HUD FIXO (UI)
  // =========================================================
  return (
    <>
      {children}

      <div
        className="
          fixed bottom-3 right-3 z-50
          bg-black/60 text-green-300
          px-3 py-2 rounded-xl
          text-xs flex items-center gap-2
          backdrop-blur-md border border-green-500/20
        "
      >
        🌱
        <span>{trees.toFixed(6)}</span>
        <span className="opacity-60">trees</span>
      </div>
    </>
  );
}
