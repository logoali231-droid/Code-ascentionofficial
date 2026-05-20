"use client";

import { useEffect, useState, useRef } from "react";
import { get, performStorageCleanup } from "@/lib/others/db";
import { useRouter, usePathname } from "next/navigation";

const ECO_KEY = "eco_telemetry_v1";

function loadEcoState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ECO_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveEcoState(state: any) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ECO_KEY, JSON.stringify(state));
  } catch {}
}

export default function ClientBody({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState("Standard");

  // 🌱 UI STATE
  const [trees, setTrees] = useState(0);
  const [co2, setCo2] = useState(0);

  const router = useRouter();
  const pathname = usePathname();

  // =========================================================
  // 🌱 LOAD PERSISTED ECO STATE
  // =========================================================
  const saved = loadEcoState();

  const sessionStart = useRef(Date.now());

  const tokensRef = useRef(saved?.tokens ?? 0);
  const dataMBRef = useRef(saved?.dataMB ?? 0);
  const initEnergyRef = useRef(saved?.initEnergy ?? 0);

  // =========================================================
  // SW + USER LOAD
  // =========================================================
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .catch((err) =>
            console.log("SW registration failed", err)
          );
      });
    }

    async function load() {
      if (pathname === "/" || pathname === "/machineLock") return;

      const user = await get("user", "main");

      if (!user) {
        router.push("/machineLock");
        return;
      }

      if (user.profile) setProfile(user.profile);

      performStorageCleanup().catch(() => {});
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
  // 🌱 SUSTAINABILITY ENGINE
  // =========================================================
  useEffect(() => {
    const interval = setInterval(() => {
      const hours =
        (Date.now() - sessionStart.current) / 3_600_000;

      // 💤 idle baseline
      const E_device = (2 / 1000) * hours;

      // 🧠 compute
      const E_inference = tokensRef.current * 5e-7;

      // 🌐 network
      const E_network = dataMBRef.current * 2e-7;

      // ⚡ total session
      const E_session =
        E_device + E_inference + E_network + initEnergyRef.current;

      // 🌍 CO2
      const CO2 = E_session * 0.4;

      // 🌳 trees equivalence
      const TREES = CO2 / 21;

      setCo2(CO2);
      setTrees(TREES);

      // 💾 persist state (EVITA RESET NO REFRESH)
      saveEcoState({
        tokens: tokensRef.current,
        dataMB: dataMBRef.current,
        initEnergy: initEnergyRef.current,
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // =========================================================
  // 🌱 HUD FIXO
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
