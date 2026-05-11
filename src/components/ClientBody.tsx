"use client";
import { useEffect, useState } from "react";
import { get } from "@/lib/db";
import { useRouter, usePathname } from "next/navigation"; // Importe usePathname

export default function ClientBody({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState("Standard");
  const router = useRouter();
  const pathname = usePathname(); // Captura a rota atual

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("SW registered"))
          .catch((err) => console.log("SW registration failed", err));
      });
    }

    async function load() {
      // 1. Se o usuário já estiver na página de login ou machineLock, PARE aqui.
      // Isso evita o loop de redirecionamento enquanto ele digita.
      if (pathname === "/" || pathname === "/machineLock") {
        return;
      }

      const user = await get("user", "main");
      
      // 2. Só redireciona se NÃO houver usuário E ele estiver tentando 
      // acessar uma área restrita (como /hub ou /course)
      if (!user) {
        router.push("/machineLock");
      }
    }
    
    load();
  }, [router, pathname]); // Adicione pathname aqui para re-verificar ao mudar de página

  useEffect(() => {
    document.body.setAttribute("data-profile", profile);
  }, [profile]);

  return <>{children}</>;
}