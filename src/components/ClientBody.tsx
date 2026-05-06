"use client";

import { useEffect, useState } from "react";
import { get } from "@/lib/db";
import { useRouter } from "next/navigation";

export default function ClientBody({ children }: any) {
  const [profile, setProfile] = useState("Standard");
  const router = useRouter();

  // 1. Registro do Service Worker para PWA
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("SW Registered!", reg))
          .catch((err) => console.log("SW Registration failed:", err));
      });
    }
  }, []);

  // 2. Lógica de Perfil e Redirecionamento
  useEffect(() => {
    async function load() {
      const user = await get("user", "main");
      if (!user) return;

      setProfile(user.cognitive || "Standard");

      const path = window.location.pathname;

      if (
        !user.engineReady &&
        path !== "/machineLock" &&
        !path.includes(".")
      ) {
        router.push("/machineLock");
      }
    }

    load();
  }, [router]);

  // 3. Aplicação do Perfil no Body
  useEffect(() => {
    document.body.setAttribute("data-profile", profile);
  }, [profile]);

  return <>{children}</>;
}