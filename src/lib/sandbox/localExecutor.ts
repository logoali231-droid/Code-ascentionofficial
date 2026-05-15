// localexecutor.ts
"use client";

import { SYSTEM_CONFIG } from "@/config/system";

export async function runLocal(
  code: string,
  lang: string
) {
  const logs: string[] = [];

  // Mapeia dinamicamente a memória alocada no config com fallback seguro para a genérica light
  const targetLang = lang.toLowerCase() as keyof typeof SYSTEM_CONFIG.LIMITS.LANGUAGES;
  const memoryLimit = SYSTEM_CONFIG.LIMITS.LANGUAGES[targetLang] || SYSTEM_CONFIG.LIMITS.memory_light;

  const customConsole = {
    log: (...args: any[]) =>
      logs.push(
        args.map(arg =>
          typeof arg === "object"
            ? JSON.stringify(arg, null, 2)
            : String(arg)
        ).join(" ")
      ),

    error: (...args: any[]) =>
      logs.push("[ERROR] " + args.join(" "))
  };

  try {
    // Injeta metadados de simulação do container local baseado nas constantes centralizadas
    console.log(`[Runtime Sandbox] Inicializando execução: Lang: ${lang} | AllocMem: ${memoryLimit} | MaxPIDs: ${SYSTEM_CONFIG.LIMITS.pidsLimit} | Timeout: ${SYSTEM_CONFIG.LIMITS.timeout}ms`);

    const run = new Function(
      "console",
      `"use strict"; ${code}`
    );

    run(customConsole);

    return {
      output: logs
    };
  } catch (err: any) {
    return {
      output: [],
      error: err.message
    };
  }
}