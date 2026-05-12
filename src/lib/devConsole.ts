"use client";

declare global {
  interface Window {
    __DEV_LOGS__?: string[];
    __DEV_CONSOLE_READY__?: boolean;
  }
}

const MAX_LOGS = 200;
const STORAGE_KEY = "code_ascention_debug_logs";

/* =========================================================
   STRINGIFY (Melhorado para evitar loops)
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
        const val = value[key];
        parsed[key] = (typeof val === 'object' && val !== null) ? '[Object]' : val;
      });
      return JSON.stringify(parsed, null, 2);
    }
    return String(value);
  } catch (err) {
    return `[STRINGIFY_FAILED] ${String(err)}`;
  }
}

/* =========================================================
   PERSISTENCE
========================================================= */

function saveLogsToStorage(logs: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {
    // Se o localStorage lotar, removemos os mais antigos
    if (logs.length > 10) {
      saveLogsToStorage(logs.slice(10));
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
  const overlay = document.getElementById("__DEV_OVERLAY_CONTENT__");
  if (!overlay) return;

  overlay.textContent = (window.__DEV_LOGS__ || [])
    .slice()
    .reverse()
    .join("\n\n");
}

/* =========================================================
   ADD LOG
========================================================= */

function addLog(type: string, ...args: any[]) {
  if (typeof window === "undefined") return;

  if (!window.__DEV_LOGS__) {
    window.__DEV_LOGS__ = loadLogsFromStorage();
  }

  const line = `[${new Date().toLocaleTimeString()}] [${type}] ${args
    .map((x) => stringify(x))
    .join(" ")}`;

  window.__DEV_LOGS__.push(line);

  if (window.__DEV_LOGS__.length > MAX_LOGS) {
    window.__DEV_LOGS__.shift();
  }

  saveLogsToStorage(window.__DEV_LOGS__);
  updateOverlay();
}

/* =========================================================
   UI
========================================================= */

function createUI() {
  document.getElementById("__DEV_CONTAINER__")?.remove();

  const container = document.createElement("div");
  container.id = "__DEV_CONTAINER__";

  /* BUTTON */
  const button = document.createElement("button");
  button.id = "__DEV_BUTTON__";
  button.innerHTML = "🐞";
  Object.assign(button.style, {
    position: "fixed", bottom: "16px", right: "16px",
    width: "58px", height: "58px", borderRadius: "999px",
    border: "none", background: "#000", color: "#00ff88",
    fontSize: "26px", zIndex: "9999999",
    boxShadow: "0 0 20px rgba(0,255,136,.5)",
    cursor: "pointer"
  });

  /* OVERLAY */
  const overlay = document.createElement("div");
  overlay.id = "__DEV_OVERLAY__";
  Object.assign(overlay.style, {
    position: "fixed", left: "0", right: "0", bottom: "0",
    height: "60vh", background: "rgba(0,0,0,.98)",
    color: "#00ff88", zIndex: "9999998",
    display: "none", flexDirection: "column",
    borderTop: "2px solid #00ff88", fontFamily: "monospace"
  });

  /* TOOLBAR */
  const toolbar = document.createElement("div");
  Object.assign(toolbar.style, {
    display: "flex", justifyContent: "space-between",
    padding: "8px", background: "#111", borderBottom: "1px solid #333"
  });

  const title = document.createElement("span");
  title.innerText = "TERMINAL_CONSOLE_V2";
  
  const actions = document.createElement("div");
  
  const clearBtn = document.createElement("button");
  clearBtn.innerHTML = "CLEAR";
  Object.assign(clearBtn.style, {
    background: "transparent", color: "#ff9900", border: "1px solid #ff9900",
    marginRight: "8px", borderRadius: "4px", padding: "4px 8px", cursor: "pointer"
  });

  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "✕";
  Object.assign(closeBtn.style, {
    background: "#ff0033", color: "white", border: "none",
    borderRadius: "4px", padding: "4px 12px", cursor: "pointer"
  });

  actions.appendChild(clearBtn);
  actions.appendChild(closeBtn);
  toolbar.appendChild(title);
  toolbar.appendChild(actions);

  /* CONTENT */
  const content = document.createElement("pre");
  content.id = "__DEV_OVERLAY_CONTENT__";
  Object.assign(content.style, {
    flex: "1", overflow: "auto", padding: "12px",
    fontSize: "10px", whiteSpace: "pre-wrap", margin: "0"
  });

  overlay.appendChild(toolbar);
  overlay.appendChild(content);
  container.appendChild(overlay);
  container.appendChild(button);
  document.body.appendChild(container);

  /* EVENTS */
  button.onclick = () => {
    overlay.style.display = overlay.style.display === "none" ? "flex" : "none";
    if (overlay.style.display === "flex") updateOverlay();
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
    // Recupera logs antes de criar a UI
    const previousLogs = loadLogsFromStorage();
    window.__DEV_LOGS__ = previousLogs;

    createUI();

    if (previousLogs.length > 0) {
      addLog("CRASH_RECOVERY", "Logs from previous session restored.");
    }

    addLog("SYSTEM", "Dev console persistence active 💾");

    /* SYSTEM INFO */
    addLog("SYSTEM_INFO", {
      userAgent: navigator.userAgent,
      memory: (navigator as any).deviceMemory,
      cores: navigator.hardwareConcurrency,
      webgpu: "gpu" in navigator
    });

    /* WEBGPU DETECTOR */
    try {
      if ("gpu" in navigator) {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          const device = await adapter.requestDevice();
          device.lost.then((info: any) => addLog("GPU_DEVICE_LOST", info));
          addLog("WEBGPU", "Device Ready");
        }
      }
    } catch (err) {
      addLog("WEBGPU_ERROR", err);
    }

    /* CONSOLE HOOKS */
    const hook = (type: string, original: any) => (...args: any[]) => {
      addLog(type, ...args);
      original(...args);
    };

    console.error = hook("ERROR", console.error);
    console.warn = hook("WARN", console.warn);
    console.log = hook("LOG", console.log);

    /* GLOBAL ERROR HANDLERS */
    window.addEventListener("error", (e) => {
      addLog("GLOBAL_ERROR", {
        message: e.message,
        stack: e.error?.stack
      });
    });

    window.addEventListener("unhandledrejection", (e) => {
      addLog("PROMISE_REJECTION", e.reason);
    });

    // Monitor de Memória (Crucial para o M23)
    if ("performance" in window && (performance as any).memory) {
      setInterval(() => {
        const mem = (performance as any).memory;
        if (mem.usedJSHeapSize > mem.jsHeapSizeLimit * 0.8) {
          addLog("MEMORY_WARNING", "JS Heap is above 80%!");
        }
      }, 5000);
    }
  };

  if (document.body) start();
  else window.addEventListener("load", start);
}
