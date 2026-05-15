"use client";

declare global {
  interface Window {
    __DEV_LOGS__?: string[];
    __DEV_CONSOLE_READY__?: boolean;
    __DEV_IS_PAUSED__?: boolean;
    __DEV_DISABLED__?: boolean; // Flag de controle global do Kill Switch
  }
}

const MAX_LOGS = 300;
const STORAGE_KEY = "code_ascention_debug_logs";
const DISABLE_KEY = "code_ascention_debug_disabled";

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
          parsed[key] =
            typeof val === "object" && val !== null ? "[Object]" : val;
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

function extractCacheError(err: any) {
  const text = String(err?.message || err);
  const isCacheError = text.includes("Cache") || text.includes("add on 'Cache'");

  return {
    isCacheError,
    type: isCacheError ? "CACHE_API_FAILURE" : "UNKNOWN",
    hint: isCacheError
      ? "Service Worker tentou armazenar uma request inválida ou quebrada"
      : null,
  };
}

/* =========================================================
   FETCH HOOK
========================================================= */

function hookFetch(addLog: any) {
  const originalFetch = window.fetch;

  window.fetch = async (...args) => {
    // Se o console for desativado no meio do runtime, para de interceptar
    if (window.__DEV_DISABLED__) return originalFetch(...args);

    const url = args?.[0]?.toString?.() || String(args[0]);

    const isModelDownload =
      url.includes("shard") || url.includes("params") || url.includes("config.json");

    if (isModelDownload) {
      addLog("MODEL_PIPELINE", { url, stage: "WebLLM download stream" });
    }

    const isAIRequest =
      url.includes("huggingface") ||
      url.includes("mlc-ai") ||
      url.includes(".bin") ||
      url.includes(".wasm") ||
      url.includes("model");

    if (isAIRequest) {
      addLog("AI_FETCH", { url, note: "WebLLM pipeline request detected" });
    }

    try {
      const res = await originalFetch(...args);
      if (!res.ok) {
        addLog("FETCH_FAIL", { url, status: res.status, type: res.type });
      }
      return res;
    } catch (err) {
      addLog("FETCH_ERROR", { url, error: stringify(err) });
      throw err;
    }
  };
}

/* =========================================================
   ORIGIN DETECTOR
========================================================= */

function detectOrigin(error: any) {
  const stack = String(error?.stack || error);
  return {
    isServiceWorker: stack.includes("ServiceWorker") || stack.includes("sw.js"),
    isWorker: stack.includes("worker") || stack.includes("WebWorker"),
    isNetwork: stack.includes("fetch") || stack.includes("Cache"),
    probableFile:
      stack.match(/(sw\.js|webllm|worker|cache|fetch|model|engine)/i)?.[0] || "unknown",
  };
}

/* =========================================================
   STORAGE
========================================================= */

function saveLogs(logs: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (e) {}
}

function loadLogs(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
}

/* =========================================================
   CORE
========================================================= */

function updateOverlay() {
  const overlay = document.getElementById("__DEV_OVERLAY_CONTENT__");
  if (!overlay) return;

  overlay.textContent = (window.__DEV_LOGS__ || [])
    .slice()
    .reverse()
    .join("\n");
}

function addLog(type: string, ...args: any[]) {
  if (
    typeof window === "undefined" || 
    window.__DEV_IS_PAUSED__ || 
    window.__DEV_DISABLED__
  ) return;

  if (!window.__DEV_LOGS__) window.__DEV_LOGS__ = loadLogs();

  const line = {
    time: new Date().toISOString(),
    type,
    data: args.map(stringify),
    url: window.location.href,
    memory: (performance as any)?.memory?.usedJSHeapSize,
  };

  window.__DEV_LOGS__.push(JSON.stringify(line, null, 2));

  if (window.__DEV_LOGS__.length > MAX_LOGS) window.__DEV_LOGS__.shift();

  saveLogs(window.__DEV_LOGS__);
  updateOverlay();
}

/* =========================================================
   UI
========================================================= */

function createUI(addLog: any) {
  if (document.getElementById("__DEV_CONTAINER__")) return;

  const container = document.createElement("div");
  container.id = "__DEV_CONTAINER__";

  const button = document.createElement("button");
  Object.assign(button.style, {
    position: "fixed",
    bottom: "16px",
    right: "16px",
    width: "58px",
    height: "58px",
    borderRadius: "999px",
    background: "#111",
    color: "#00ff88",
    zIndex: "9999999",
    border: "2px solid #00ff88",
    fontSize: "24px",
    cursor: "pointer"
  });
  button.innerHTML = "🐞";

  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    left: "0",
    right: "0",
    bottom: "0",
    height: "75vh",
    background: "#050505",
    color: "#00ff88",
    zIndex: "9999998",
    display: "none",
    flexDirection: "column",
    borderTop: "2px solid #333",
    fontFamily: "monospace",
  });

  const toolbar = document.createElement("div");
  Object.assign(toolbar.style, {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px",
    background: "#111",
    borderBottom: "1px solid #222",
    alignItems: "center",
  });

  const title = document.createElement("b");
  title.innerText = "DEBUG_TERMINAL";

  const actions = document.createElement("div");

  const pauseBtn = document.createElement("button");
  pauseBtn.innerText = "PAUSE";

  const clearBtn = document.createElement("button");
  clearBtn.innerText = "CLEAR";

  const killBtn = document.createElement("button");
  killBtn.innerText = "OFF";
  Object.assign(killBtn.style, { color: "#ff0055", marginLeft: "8px", fontWeight: "bold" });

  const closeBtn = document.createElement("button");
  closeBtn.innerText = "✕";
  Object.assign(closeBtn.style, { marginLeft: "8px" });

  // Corrigido: append único com todos os elementos na ordem correta
  actions.append(pauseBtn, clearBtn, killBtn, closeBtn);
  toolbar.append(title, actions);

  const content = document.createElement("pre");
  content.id = "__DEV_OVERLAY_CONTENT__";
  Object.assign(content.style, {
    padding: "10px",
    overflowY: "auto",
    flex: "1",
    margin: "0",
    whiteSpace: "pre-wrap"
  });

  overlay.append(toolbar, content);
  container.append(overlay, button);
  document.body.appendChild(container);

  button.onclick = () => {
    overlay.style.display = overlay.style.display === "none" ? "flex" : "none";
    if (overlay.style.display === "flex") updateOverlay();
  };

  pauseBtn.onclick = () => {
    window.__DEV_IS_PAUSED__ = !window.__DEV_IS_PAUSED__;
    pauseBtn.innerText = window.__DEV_IS_PAUSED__ ? "RESUME" : "PAUSE";
    if (!window.__DEV_IS_PAUSED__) addLog("SYSTEM", "Logs resumed.");
  };

  clearBtn.onclick = () => {
    window.__DEV_LOGS__ = [];
    localStorage.removeItem(STORAGE_KEY);
    updateOverlay();
  };

  // Implementado: Lógica do Kill Switch para desligar permanentemente
  killBtn.onclick = () => {
    const confirmKill = confirm("Desativar o terminal de desenvolvimento permanentemente nesta sessão?");
    if (!confirmKill) return;

    window.__DEV_DISABLED__ = true;
    try {
      localStorage.setItem(DISABLE_KEY, "true");
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}

    container.remove(); // Limpa do DOM imediatamente
  };

  closeBtn.onclick = () => (overlay.style.display = "none");
}

/* =========================================================
   INIT
========================================================= */

export function initDevConsole() {
  if (typeof window === "undefined" || window.__DEV_CONSOLE_READY__) return;

  // Verifica se o console foi morto em um acesso anterior
  try {
    if (localStorage.getItem(DISABLE_KEY) === "true") {
      window.__DEV_DISABLED__ = true;
      return;
    }
  } catch (e) {}

  window.__DEV_CONSOLE_READY__ = true;
  window.__DEV_IS_PAUSED__ = false;

  const start = () => {
    if (window.__DEV_DISABLED__) return;

    window.__DEV_LOGS__ = loadLogs();

    createUI(addLog);
    hookFetch(addLog);

    if (window.__DEV_LOGS__.length > 0) {
      addLog("RECOVERY", "Crash logs restored");
    }

    console.error = (...args) => addLog("ERROR", ...args);
    console.warn = (...args) => addLog("WARN", ...args);

    window.addEventListener("error", (e) => {
      const errorObj = e.error || new Error(e.message);
      const cacheInfo = extractCacheError(errorObj);
      const origin = detectOrigin(errorObj);

      addLog("FATAL", {
        message: e.message,
        stack: e.error?.stack,
        file: e.filename,
        line: e.lineno,
        col: e.colno,
        origin,
        cacheInfo,
      });
    });

    window.addEventListener("unhandledrejection", (e) => {
      addLog("PROMISE", e.reason);
    });

    setInterval(() => {
      const perf = (performance as any).memory;
      if (!perf || window.__DEV_IS_PAUSED__ || window.__DEV_DISABLED__) return;

      addLog("MEM", `${Math.round(perf.usedJSHeapSize / 1048576)}MB`);
    }, 3000);
  };

  if (document.body) start();
  else window.addEventListener("load", start);
}
