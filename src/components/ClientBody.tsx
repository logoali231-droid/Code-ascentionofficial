"use client";
import { useEffect, useState } from "react";
import { get, performStorageCleanup } from "@/lib/db";
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
      if (pathname === "/" || pathname === "/machineLock") return;

      const user = await get("user", "main");
      
      if (!user) {
        router.push("/machineLock");
      } else {
        // AQUI ESTÁ O USO VITAL: 
        // Se o usuário existir, pegamos o perfil dele do DB e aplicamos ao app
        if (user.profile) {
          setProfile(user.profile); 
        }
      }

      // 🎯 AUTO-CLEANUP DETERMINÍSTICO NO BOOT
      // Executa em background logo após o carregamento inicial do usuário
      performStorageCleanup().catch((err) =>
        console.error("[Boot Cleanup] Erro na rotina de manutenção:", err)
      );
    }
    
    
    
    load();
  }, [router, pathname]); // Adicione pathname aqui para re-verificar ao mudar de página

  useEffect(() => {
    document.body.setAttribute("data-profile", profile);
  }, [profile]);

  return <>{children}</>;
}
