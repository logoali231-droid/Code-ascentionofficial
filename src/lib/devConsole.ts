"use client";

declare global {
  interface Window {
    __DEV_LOGS__?: string[];
    __DEV_CONSOLE_READY__?: boolean;
  }
}

const MAX_LOGS = 300; // Aumentado para rastreio longo
const STORAGE_KEY = "code_ascention_debug_logs";

/* =========================================================
   STRINGIFY (Proteção contra Loops e Objetos Complexos)
========================================================= */
function stringify(value: any): string {
  try {
    if (typeof value === "string") return value;
    if (value instanceof Error) {
      return `[ERROR] ${value.name}: ${value.message}\nStack: ${value.stack}`;
    }
    if (typeof DOMException !== "undefined" && value instanceof DOMException) {
      return `[DOM_EXCEPTION] ${value.name}: ${value.message}`;
    }
    if (typeof value === "object" && value !== null) {
      const parsed: any = {};
      Object.getOwnPropertyNames(value).forEach((key) => {
        try {
          const val = (value as any)[key];
          parsed[key] = (typeof val === 'object' && val !== null) ? '[Object/Deep]' : val;
        } catch (e) {
          parsed[key] = "[Unreadable]";
        }
      });
      return JSON.stringify(parsed, null, 2);
    }
    return String(value);
  } catch (err) {
    return `[STRINGIFY_FAILED] ${String(err)}`;
  }
}

/* =========================================================
   PERSISTENCE (Síncrona e Robusta)
========================================================= */
function saveLogsToStorage(logs: string[]) {
  try {
    // Usamos JSON.stringify direto para garantir que o estado atual seja gravado
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    if (logs.length > 20) {
      // Se falhar (ex: quota cheia), removemos metade e tentamos de novo
      saveLogsToStorage(logs.slice(Math.floor(logs.length / 2)));
    }
  }
}

function loadLogsFromStorage(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

/* =========================================================
   UPDATE OVERLAY
========================================================= */
function updateOverlay() {
  if (typeof window === "undefined") return;
  const overlay = document.getElementById("__DEV_OVERLAY_CONTENT__");
  if (!overlay) return;

  overlay.textContent = (window.__DEV_LOGS__ || [])
    .slice()
    .reverse()
    .join("\n\n");
}

/* =========================================================
   ADD LOG (Imediato)
========================================================= */
function addLog(type: string, ...args: any[]) {
  if (typeof window === "undefined") return;

  if (!window.__DEV_LOGS__) {
    window.__DEV_LOGS__ = loadLogsFromStorage();
  }

  const timestamp = new Date().toLocaleTimeString();
  const content = args.map((x) => stringify(x)).join(" ");
  const line = `[${timestamp}] [${type}] ${content}`;

  window.__DEV_LOGS__.push(line);

  if (window.__DEV_LOGS__.length > MAX_LOGS) {
    window.__DEV_LOGS__.shift();
  }

  // Persistência imediata: se o app crashar no segundo seguinte, o log já está no disco
  saveLogsToStorage(window.__DEV_LOGS__);
  updateOverlay();
}

/* =========================================================
   UI GENERATION
========================================================= */
function createUI() {
  if (document.getElementById("__DEV_CONTAINER__")) return;

  const container = document.createElement("div");
  container.id = "__DEV_CONTAINER__";

  const button = document.createElement("button");
  button.id = "__DEV_BUTTON__";
  button.innerHTML = "🐞";
  Object.assign(button.style, {
    position: "fixed", bottom: "16px", right: "16px",
    width: "58px", height: "58px", borderRadius: "999px",
    border: "none", background: "#111", color: "#00ff88",
    fontSize: "24px", zIndex: "9999999",
    boxShadow: "0 4px 15px rgba(0,0,0,0.5)", cursor: "pointer"
  });

  const overlay = document.createElement("div");
  overlay.id = "__DEV_OVERLAY__";
  Object.assign(overlay.style, {
    position: "fixed", left: "0", right: "0", bottom: "0",
    height: "70vh", background: "#050505", color: "#00ff88",
    zIndex: "9999998", display: "none", flexDirection: "column",
    borderTop: "2px solid #333", fontFamily: "'Courier New', monospace"
  });

  const toolbar = document.createElement("div");
  Object.assign(toolbar.style, {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px", background: "#111", borderBottom: "1px solid #222"
  });

  const title = document.createElement("b");
  title.innerText = "CODE_ASCENSION_LOGS";
  
  const actions = document.createElement("div");
  const clearBtn = document.createElement("button");
  clearBtn.innerText = "CLEAR";
  Object.assign(clearBtn.style, {
    background: "transparent", color: "#ff9900", border: "1px solid #ff9900",
    marginRight: "10px", padding: "5px 10px", borderRadius: "4px"
  });

  const closeBtn = document.createElement("button");
  closeBtn.innerText = "✕";
  Object.assign(closeBtn.style, {
    background: "#cc0000", color: "#fff", border: "none",
    padding: "5px 12px", borderRadius: "4px"
  });

  actions.appendChild(clearBtn);
  actions.appendChild(closeBtn);
  toolbar.appendChild(title);
  toolbar.appendChild(actions);

  const content = document.createElement("pre");
  content.id = "__DEV_OVERLAY_CONTENT__";
  Object.assign(content.style, {
    flex: "1", overflowY: "auto", padding: "15px",
    fontSize: "11px", whiteSpace: "pre-wrap", margin: "0", lineHeight: "1.4"
  });

  overlay.appendChild(toolbar);
  overlay.appendChild(content);
  container.appendChild(overlay);
  container.appendChild(button);
  document.body.appendChild(container);

  button.onclick = () => {
    const isHidden = overlay.style.display === "none";
    overlay.style.display = isHidden ? "flex" : "none";
    if (isHidden) updateOverlay();
  };

  closeBtn.onclick = () => overlay.style.display = "none";
  clearBtn.onclick = () => {
    window.__DEV_LOGS__ = [];
    localStorage.removeItem(STORAGE_KEY);
    updateOverlay();
  };
}

/* =========================================================
   INIT
========================================================= */
export function initDevConsole() {
  if (typeof window === "undefined" || window.__DEV_CONSOLE_READY__) return;
  window.__DEV_CONSOLE_READY__ = true;

  const start = async () => {
    const previousLogs = loadLogsFromStorage();
    window.__DEV_LOGS__ = previousLogs;

    createUI();

    if (previousLogs.length > 0) {
      addLog("RECOVERY", "--- SESSÃO ANTERIOR RECUPERADA ---");
    }

    addLog("SYSTEM", "Rastreador de Memória Iniciado 🔍");

    /* MONITOR DE MEMÓRIA AGRESSIVO (Essencial para Aw Snap) */
    const monitorMemory = () => {
      const perf = (performance as any).memory;
      if (perf) {
        const used = Math.round(perf.usedJSHeapSize / 1024 / 1024);
        const limit = Math.round(perf.jsHeapSizeLimit / 1024 / 1024);
        const usagePercent = Math.round((used / limit) * 100);
        
        // Logamos a cada 2 segundos o uso atual. 
        // O último log antes do crash mostrará quão perto do limite você estava.
        addLog("MEM_TRACE", `${used}MB / ${limit}MB (${usagePercent}%)`);
        
        if (usagePercent > 85) {
          addLog("CRITICAL_WARNING", "Memória acima de 85%! Crash iminente.");
        }
      }
    };
    
    setInterval(monitorMemory, 2000);

    /* WEBGPU TRACKING */
    try {
      if ("gpu" in navigator) {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          const device = await adapter.requestDevice();
          device.lost.then((info: any) => {
            addLog("GPU_LOST", `A GPU DESLIGOU: ${info.message} (Reason: ${info.reason})`);
          });
          addLog("WEBGPU", "Hardware acelerado detectado.");
        }
      }
    } catch (err) {
      addLog("WEBGPU_FAIL", err);
    }

    /* HOOKS */
    const hook = (type: string, original: any) => (...args: any[]) => {
      addLog(type, ...args);
      original(...args);
    };

    console.error = hook("ERROR", console.error);
    console.warn = hook("WARN", console.warn);

    window.addEventListener("error", (e) => {
      addLog("GLOBAL_CRASH", { message: e.message, stack: e.error?.stack });
    });

    window.addEventListener("unhandledrejection", (e) => {
      addLog("PROMISE_FAIL", e.reason);
    });
  };

  if (document.body) start();
  else window.addEventListener("load", start);
}
