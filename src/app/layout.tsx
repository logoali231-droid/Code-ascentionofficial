'use client'

import Navbar from "@/components/Navbar";
import "../styles/globals.css";import "./globals.css";
import { useEffect, useState } from "react";
import { get } from "@/lib/db";


export const metadata = {
  title: "Code Ascent",
  description: "Adaptive AI learning",
  manifest: "/manifest.json",
};



export default function RootLayout({ children }: any) {
  const [profile, setProfile] = useState("Standard");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const user = await get("user", "main");
    setProfile(user?.cognitiveProfile || "Standard");
  }

  return (
    <html>
      <body data-profile={profile}>
        {children}
        <Navbar />
      </body>
    </html>
  );
}