"use client";

import { useEffect, useState } from "react";
import { get } from "@/lib/db";
import { useRouter } from "next/navigation";

export default function ClientBody({ children }: any) {
  const [profile, setProfile] = useState("Standard");
  const router = useRouter();

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

  // ✅ APPLY PROFILE TO REAL BODY
  useEffect(() => {
    document.body.setAttribute("data-profile", profile);
  }, [profile]);

  return <>{children}</>;
}