"use client";

/**
 * =========================================
 * DEV CONSOLE OVERLAY
 * =========================================
 *
 * Mobile debugging helper
 * Captures:
 * - console.error
 * - console.warn
 * - uncaught errors
 * - promise rejections
 * - fetch failures
 * - resource loading errors
 * - service worker issues
 */

declare global {
  interface Window {
    __DEV_LOGS__?: string[];
  }
}

const MAX_LOGS = 120;

function safeStringify(value: any) {
  try {
    if (typeof value === "string") return value;

    return JSON.stringify(
      value,
      null,
      2
    );
  } catch {
    return String(value);
  }
}

function addLog(
  type: string,
  ...args: any[]
) {
  if (typeof window === "undefined")
    return;

  if (!window.__DEV_LOGS__) {
    window.__DEV_LOGS__ = [];
  }

  const text = args
    .map((a) => safeStringify(a))
    .join(" ");

  const line = `[${new Date().toLocaleTimeString()}] [${type}] ${text}`;

  window.__DEV_LOGS__.push(line);

  if (
    window.__DEV_LOGS__.length >
    MAX_LOGS
  ) {
    window.__DEV_LOGS__.shift();
  }

  consoleOutput(line);
}

function consoleOutput(text: string) {
  const el =
    document.getElementById(
      "__dev_console_overlay"
    );

  if (!el) return;

  el.textContent =
    window.__DEV_LOGS__
      ?.slice()
      .reverse()
      .join("\n\n") || "";
}

function createOverlay() {
  if (
    document.getElementById(
      "__dev_console_overlay"
    )
  ) {
    return;
  }

  const overlay =
    document.createElement("pre");

  overlay.id =
    "__dev_console_overlay";

  overlay.style.position =
    "fixed";

  overlay.style.bottom = "0";
  overlay.style.left = "0";
  overlay.style.right = "0";

  overlay.style.height = "40vh";

  overlay.style.background =
    "rgba(0,0,0,0.92)";

  overlay.style.color = "#00ff88";

  overlay.style.fontSize = "11px";

  overlay.style.zIndex =
    "999999";

  overlay.style.padding = "12px";

  overlay.style.overflow = "auto";

  overlay.style.whiteSpace =
    "pre-wrap";

  overlay.style.fontFamily =
    "monospace";

  overlay.style.borderTop =
    "2px solid #00ff88";

  overlay.style.display = "none";

  document.body.appendChild(
    overlay
  );

  /**
   * Toggle:
   * triple tap top-left
   */

  let taps = 0;

  document.addEventListener(
    "click",
    (e) => {
      if (
        e.clientX < 80 &&
        e.clientY < 80
      ) {
        taps++;

        setTimeout(() => {
          taps = 0;
        }, 900);

        if (taps >= 3) {
          overlay.style.display =
            overlay.style.display ===
            "none"
              ? "block"
              : "none";

          taps = 0;
        }
      }
    }
  );
}

/* =========================================
   MAIN INIT
========================================= */

export function initDevConsole() {
  if (
    typeof window === "undefined"
  )
    return;

  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    return;
  }

  createOverlay();

  addLog(
    "SYSTEM",
    "Dev Console Initialized"
  );

  /* ======================================
     CONSOLE OVERRIDE
  ====================================== */

  const originalError =
    console.error;

  const originalWarn =
    console.warn;

  const originalLog =
    console.log;

  console.error = (
    ...args: any[]
  ) => {
    addLog("ERROR", ...args);

    originalError(...args);
  };

  console.warn = (
    ...args: any[]
  ) => {
    addLog("WARN", ...args);

    originalWarn(...args);
  };

  console.log = (
    ...args: any[]
  ) => {
    addLog("LOG", ...args);

    originalLog(...args);
  };

  /* ======================================
     GLOBAL ERRORS
  ====================================== */

  window.addEventListener(
    "error",
    (event) => {
      addLog(
        "GLOBAL_ERROR",
        {
          message:
            event.message,

          source:
            event.filename,

          line:
            event.lineno,

          column:
            event.colno,
        }
      );
    }
  );

  /* ======================================
     PROMISE REJECTION
  ====================================== */

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      addLog(
        "PROMISE_REJECTION",
        event.reason
      );
    }
  );

  /* ======================================
     FETCH WRAPPER
  ====================================== */

  const originalFetch =
    window.fetch;

  window.fetch = async (
    ...args
  ) => {
    try {
      const response =
        await originalFetch(...args);

      if (!response.ok) {
        addLog(
          "FETCH_ERROR",
          {
            url: args?.[0],
            status:
              response.status,
          }
        );
      }

      return response;
    } catch (err) {
      addLog(
        "FETCH_CRASH",
        err
      );

      throw err;
    }
  };

  /* ======================================
     RESOURCE ERRORS
  ====================================== */

  window.addEventListener(
    "error",
    (event: any) => {
      const target =
        event.target;

      if (
        target?.src ||
        target?.href
      ) {
        addLog(
          "RESOURCE_ERROR",
          {
            tag:
              target.tagName,

            source:
              target.src ||
              target.href,
          }
        );
      }
    },
    true
  );

  /* ======================================
     SERVICE WORKER
  ====================================== */

  if (
    "serviceWorker" in navigator
  ) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        addLog(
          "SW",
          `Registrations: ${regs.length}`
        );
      })
      .catch((err) => {
        addLog(
          "SW_ERROR",
          err
        );
      });
  }

  /* ======================================
     NEXT.JS HYDRATION
  ====================================== */

  const originalConsoleError =
    console.error;

  console.error = (
    ...args: any[]
  ) => {
    const text = args.join(" ");

    if (
      text.includes(
        "hydration"
      )
    ) {
      addLog(
        "HYDRATION",
        text
      );
    }

    originalConsoleError(
      ...args
    );
  };

  addLog(
    "SYSTEM",
    "All listeners attached"
  );
        }
