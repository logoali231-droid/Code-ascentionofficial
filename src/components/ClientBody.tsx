"use client";
import { useEffect, useState } from "react";
import { get } from "@/lib/db";
import { useRouter } from "next/navigation";

export default function ClientBody({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState("Standard");
  const router = useRouter();

  useEffect(() => {
    // Registro do Service Worker para PWA
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("SW registered"))
          .catch((err) => console.log("SW registration failed", err));
      });
    }

    async function load() {
      const user = await get("user", "main");
      if (!user) {
        router.push("/machineLock");
      }
    }
    load();
  }, [router]);

  useEffect(() => {
    document.body.setAttribute("data-profile", profile);
  }, [profile]);

  return <>{children}</>;
}