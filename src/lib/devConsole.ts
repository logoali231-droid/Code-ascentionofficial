"use client";

declare global {
  interface Window {
    __DEV_LOGS__?: string[];
    __DEV_CONSOLE_READY__?: boolean;
    __DEV_IS_PAUSED__?: boolean;
  }
}

const MAX_LOGS = 300;
const STORAGE_KEY = "code_ascention_debug_logs";

/* =========================================================
   STRINGIFY & PERSISTENCE
========================================================= */

function stringify(value: any): string {
  try {
    if (typeof value === "string") return value;
    if (value instanceof Error) {
      return `[ERROR] ${value.name}: ${value.message}\nStack: ${value.stack}`;
    }
    if (typeof value === "object" && value !== null) {
      const parsed: any = {};
      Object.getOwnPropertyNames(value).forEach((key) => {
        try {
          const val = (value as any)[key];
          parsed[key] = (typeof val === 'object' && val !== null) ? '[Object]' : val;
        } catch (e) { parsed[key] = "[Unreadable]"; }
      });
      return JSON.stringify(parsed, null, 2);
    }
    return String(value);
  } catch (err) { return `[STRINGIFY_FAILED] ${String(err)}`; }
}

function saveLogs(logs: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(logs)); } catch (e) {}
}

function loadLogs(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) { return []; }
}

/* =========================================================
   CORE LOGIC
========================================================= */

function updateOverlay() {
  const overlay = document.getElementById("__DEV_OVERLAY_CONTENT__");
  if (!overlay) return;
  overlay.textContent = (window.__DEV_LOGS__ || []).slice().reverse().join("\n\n");
}

function addLog(type: string, ...args: any[]) {
  if (typeof window === "undefined" || window.__DEV_IS_PAUSED__) return;

  if (!window.__DEV_LOGS__) window.__DEV_LOGS__ = loadLogs();

  const line = `[${new Date().toLocaleTimeString()}] [${type}] ${args.map(stringify).join(" ")}`;
  window.__DEV_LOGS__.push(line);

  if (window.__DEV_LOGS__.length > MAX_LOGS) window.__DEV_LOGS__.shift();

  saveLogs(window.__DEV_LOGS__);
  updateOverlay();
}

/* =========================================================
   UI WITH PAUSE BUTTON
========================================================= */

function createUI() {
  if (document.getElementById("__DEV_CONTAINER__")) return;

  const container = document.createElement("div");
  container.id = "__DEV_CONTAINER__";

  const button = document.createElement("button");
  Object.assign(button.style, {
    position: "fixed", bottom: "16px", right: "16px",
    width: "58px", height: "58px", borderRadius: "999px",
    background: "#111", color: "#00ff88", zIndex: "9999999",
    border: "2px solid #00ff88", fontSize: "24px"
  });
  button.innerHTML = "🐞";

  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed", left: "0", right: "0", bottom: "0",
    height: "75vh", background: "#050505", color: "#00ff88",
    zIndex: "9999998", display: "none", flexDirection: "column",
    borderTop: "2px solid #333", fontFamily: "monospace"
  });

  const toolbar = document.createElement("div");
  Object.assign(toolbar.style, {
    display: "flex", justifyContent: "space-between", padding: "10px",
    background: "#111", borderBottom: "1px solid #222", alignItems: "center"
  });

  const title = document.createElement("b");
  title.innerText = "DEBUG_TERMINAL";

  const actions = document.createElement("div");

  // BOTÃO PAUSE
  const pauseBtn = document.createElement("button");
  pauseBtn.innerText = "PAUSE";
  Object.assign(pauseBtn.style, {
    background: "#444", color: "#fff", border: "none",
    marginRight: "8px", padding: "6px 12px", borderRadius: "4px"
  });

  const clearBtn = document.createElement("button");
  clearBtn.innerText = "CLEAR";
  Object.assign(clearBtn.style, {
    background: "transparent", color: "#ff9900", border: "1px solid #ff9900",
    marginRight: "8px", padding: "6px 12px", borderRadius: "4px"
  });

  const closeBtn = document.createElement("button");
  closeBtn.innerText = "✕";
  Object.assign(closeBtn.style, {
    background: "#cc0000", color: "#fff", border: "none",
    padding: "6px 14px", borderRadius: "4px"
  });

  actions.append(pauseBtn, clearBtn, closeBtn);
  toolbar.append(title, actions);

  const content = document.createElement("pre");
  content.id = "__DEV_OVERLAY_CONTENT__";
  Object.assign(content.style, {
    flex: "1", overflowY: "auto", padding: "12px",
    fontSize: "10px", whiteSpace: "pre-wrap", margin: "0"
  });

  overlay.append(toolbar, content);
  container.append(overlay, button);
  document.body.appendChild(container);

  /* EVENTS */
  button.onclick = () => {
    const isHidden = overlay.style.display === "none";
    overlay.style.display = isHidden ? "flex" : "none";
    if (isHidden) updateOverlay();
  };

  pauseBtn.onclick = () => {
    window.__DEV_IS_PAUSED__ = !window.__DEV_IS_PAUSED__;
    pauseBtn.innerText = window.__DEV_IS_PAUSED__ ? "RESUME" : "PAUSE";
    pauseBtn.style.background = window.__DEV_IS_PAUSED__ ? "#00ff88" : "#444";
    pauseBtn.style.color = window.__DEV_IS_PAUSED__ ? "#000" : "#fff";
    if (!window.__DEV_IS_PAUSED__) addLog("SYSTEM", "Logs resumed.");
  };

  clearBtn.onclick = () => {
    window.__DEV_LOGS__ = [];
    localStorage.removeItem(STORAGE_KEY);
    updateOverlay();
  };

  closeBtn.onclick = () => overlay.style.display = "none";
}

/* =========================================================
   INITIALIZATION
========================================================= */

export function initDevConsole() {
  if (typeof window === "undefined" || window.__DEV_CONSOLE_READY__) return;
  window.__DEV_CONSOLE_READY__ = true;
  window.__DEV_IS_PAUSED__ = false;

  const start = async () => {
    window.__DEV_LOGS__ = loadLogs();
    createUI();

    if (window.__DEV_LOGS__.length > 0) {
      addLog("RECOVERY", "--- CRASH DATA RECOVERED ---");
    }

    /* MEMORY TRACKER */
    setInterval(() => {
      const perf = (performance as any).memory;
      if (perf && !window.__DEV_IS_PAUSED__) {
        const used = Math.round(perf.usedJSHeapSize / 1048576);
        const limit = Math.round(perf.jsHeapSizeLimit / 1048576);
        addLog("MEM", `${used}MB / ${limit}MB`);
      }
    }, 3000);

    /* HOOKS */
    const hook = (type: string, original: any) => (...args: any[]) => {
      addLog(type, ...args);
      original(...args);
    };

    console.error = hook("ERROR", console.error);
    console.warn = hook("WARN", console.warn);

    window.addEventListener("error", (e) => {
      addLog("FATAL", { msg: e.message, stack: e.error?.stack });
    });

    window.addEventListener("unhandledrejection", (e) => {
      addLog("PROMISE", e.reason);
    });
  };

  if (document.body) start();
  else window.addEventListener("load", start);
    }
