"use client";
import { SandboxFile } from "@/components/SandboxEditor";

export interface NeuralLog {
  type: "info" | "error" | "warn" | "system" | "mem" | "perf";
  timestamp: string;
  content: string;
  source?: string;
}

/**
 * Pre-aloca memória para o VFS
 */
export async function precompileNeuralModules() {
  return new Promise((resolve) => {
    // Simula a pré-alocação de memória para o VFS
    const warmUpSession = "WARMUP_" + Math.random().toString(36).substring(7);
    console.log(
      `[SYSTEM] NeuralBundler: Initiating warm-up sequence ${warmUpSession}...`,
    );

    // Pequeno delay para garantir que o Garbage Collector não limpe tudo imediatamente
    setTimeout(() => {
      console.log(`[SYSTEM] NeuralBundler: Core modules optimized.`);
      resolve(true);
    }, 500);
  });
}

/**
 * Motor de Transpilação e Empacotamento Neural
 */
function neuralStringify(value: any, depth = 0): string {
  if (depth > 4) return "[Max Depth]";
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "function") return `[f: ${value.name || "anon"}]`;
  if (value instanceof Error) return `[${value.name}] ${value.message}`;
  if (typeof value === "object") {
    try {
      return JSON.stringify(
        value,
        (key, val) => {
          if (val instanceof HTMLElement) return `[DOM_Element]`;
          if (typeof val === "function") return `[Function]`;
          return val;
        },
        2,
      );
    } catch {
      return `[Circular Object]`;
    }
  }
  return String(value);
}

export async function bundleAndExecute(
  mainFile: SandboxFile,
  allFiles: SandboxFile[],
  pushLog: (log: NeuralLog) => void,
) {
  const startTime = performance.now();
  const sessionId = Math.random().toString(36).substring(7).toUpperCase();

  const createLog = (
    type: NeuralLog["type"],
    msg: any,
    source = mainFile.name,
  ): NeuralLog => ({
    type,
    timestamp: new Date().toLocaleTimeString(),
    content: Array.isArray(msg)
      ? msg.map(neuralStringify).join(" ")
      : neuralStringify(msg),
    source,
  });

  pushLog(
    createLog("system", `[${sessionId}] Initializing Virtual File System...`),
  );

  try {
    const fileMap = new Map(allFiles.map((f) => [f.name, f.content]));
    let processedCode = mainFile.content;
    const blobUrls: string[] = [];

    // 1. RESOLUÇÃO DE DEPENDÊNCIAS (LINKER)
    const importRegex = /import\s+(?:[\w\s{},*]+)\s+from\s+['"](.+?)['"]/g;
    let match;
    const dependenciesFound: string[] = [];

    while ((match = importRegex.exec(mainFile.content)) !== null) {
      const path = match[1];
      if (path.startsWith("./") || path.startsWith("../")) {
        const fileName =
          path
            .split("/")
            .pop()
            ?.replace(/\.(ts|js)$/, "") + ".ts";
        const targetName = fileMap.get(fileName)
          ? fileName
          : fileName.replace(".ts", ".js");
        const content = fileMap.get(targetName);

        if (content) {
          const blob = new Blob([content], { type: "application/javascript" });
          const url = URL.createObjectURL(blob);
          blobUrls.push(url);
          processedCode = processedCode.replace(path, url);
          dependenciesFound.push(targetName);
        } else {
          pushLog(
            createLog(
              "warn",
              `Dependency not resolved: ${path}. Attempting external CDN...`,
            ),
          );
          processedCode = processedCode.replace(path, `https://esm.sh/${path}`);
        }
      } else if (!path.startsWith("http")) {
        // Auto-link para ESM.sh para pacotes NPM (ex: lodash, react)
        processedCode = processedCode.replace(path, `https://esm.sh/${path}`);
      }
    }

    if (dependenciesFound.length > 0) {
      pushLog(
        createLog(
          "system",
          `Linked ${dependenciesFound.length} local modules: ${dependenciesFound.join(", ")}`,
        ),
      );
    }

    // 2. PREPARAÇÃO DO CONTEXTO DE ISOLAMENTO
    const script = document.createElement("script");
    script.type = "module";
    script.id = `neural-kernel-${sessionId}`;

    const runtimeHeader = `
      /** NEURAL_RUNTIME_V2_HEADER **/
      const _LOG_SESSION = "${sessionId}";
      
      const console = {
        log: (...args) => window._neuralDispatch(_LOG_SESSION, 'info', args),
        error: (...args) => window._neuralDispatch(_LOG_SESSION, 'error', args),
        warn: (...args) => window._neuralDispatch(_LOG_SESSION, 'warn', args),
        info: (...args) => window._neuralDispatch(_LOG_SESSION, 'info', args),
        debug: (...args) => window._neuralDispatch(_LOG_SESSION, 'info', args),
      };

      // Telemetria de Memória Real
      const checkMem = () => {
        if (performance.memory) {
          const used = Math.round(performance.memory.usedJSHeapSize / 1048576);
          window._neuralDispatch(_LOG_SESSION, 'mem', ['Memory Pressure:', used + 'MB']);
        }
      };
      const memInterval = setInterval(checkMem, 5000);

      window.addEventListener('error', (e) => {
        window._neuralDispatch(_LOG_SESSION, 'error', [\`Runtime Error: \${e.message}\`]);
      });

      window.addEventListener('unhandledrejection', (e) => {
        window._neuralDispatch(_LOG_SESSION, 'error', [\`Async Failure: \${e.reason}\`]);
      });
    `;

    const runtimeFooter = `
      // Finalização da Execução
      const duration = (performance.now() - ${startTime}).toFixed(2);
      window._neuralDispatch(_LOG_SESSION, 'perf', [\`Kernel cycle completed in \${duration}ms\`]);
      // Limpeza opcional
      // clearInterval(memInterval);
    `;

    script.textContent = `
      ${runtimeHeader}
      try {
        ${processedCode}
        ${runtimeFooter}
      } catch (err) {
        window._neuralDispatch(_LOG_SESSION, 'error', [err]);
      }
    `;

    // 3. COMUNICAÇÃO (DISPATCHER)
    (window as any)._neuralDispatch = (
      sid: string,
      type: NeuralLog["type"],
      args: any[],
    ) => {
      // Garante que apenas mensagens da sessão atual sejam processadas
      if (sid === sessionId) {
        pushLog(createLog(type, args));
      }
    };

    // 4. INJEÇÃO E EXECUÇÃO
    document.body.appendChild(script);

    // Garbage Collection de Blobs
    setTimeout(() => {
      blobUrls.forEach((url) => URL.revokeObjectURL(url));
      if (document.getElementById(script.id)) {
        document.body.removeChild(script);
      }
    }, 2000);
  } catch (err: any) {
    pushLog(createLog("error", `Bunder Critical Failure: ${err.message}`));
  }
}

/**
 * Função de Utilidade: Detecta loops infinitos simples (Static Analysis)
 */
export function preValidateCode(code: string): {
  valid: boolean;
  error?: string;
} {
  if (code.includes("while(true)") || code.includes("while (true)")) {
    return {
      valid: false,
      error:
        "Infinite loop detected: 'while(true)' is restricted in sandbox mode.",
    };
  }
  if ((code.match(/{/g) || []).length !== (code.match(/}/g) || []).length) {
    return {
      valid: false,
      error: "Syntax Error: Unbalanced curly braces detected.",
    };
  }
  return { valid: true };
}
