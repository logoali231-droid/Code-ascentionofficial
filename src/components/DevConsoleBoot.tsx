"use client";

import { useEffect } from "react";

import { initDevConsole } from "@/lib/devConsole";

export default function DevConsoleBoot() {
  useEffect(() => {
    initDevConsole();
  }, []);

  return null;
}
