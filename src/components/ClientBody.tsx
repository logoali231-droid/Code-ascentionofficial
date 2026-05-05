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
      setProfile(user?.cognitive || "Standard");
      

setProfile(user?.cognitive || "Standard");

if (!user?.engineReady) {
  router.push("/machineLock");
}
    }
    load();
  }, []);

  return (
    <body data-profile={profile}>
      {children}
    </body>
  );
}

