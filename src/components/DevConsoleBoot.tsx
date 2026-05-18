"use client";

import { useEffect } from "react";

const loadDevConsole = async () => {
  const mod = await import("@/lib/devConsole");
  return mod.initDevConsole;
};
export default function DevConsoleBoot() {
  useEffect(() => {
    loadDevConsole()
      .then((fn) => fn())
      .catch(console.error);
  }, []);

  return null;
}
