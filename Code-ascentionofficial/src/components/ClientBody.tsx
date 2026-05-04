"use client";

import { useEffect, useState } from "react";
import { get } from "@/lib/db";

export default function ClientBody({ children }: any) {
  const [profile, setProfile] = useState("Standard");

  useEffect(() => {
    async function load() {
      const user = await get("user", "main");
      setProfile(user?.cognitiveProfile || "Standard");
    }
    load();
  }, []);

  return (
    <body data-profile={profile}>
      {children}
    </body>
  );
}

