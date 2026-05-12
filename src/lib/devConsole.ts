"use client";

declare global {
  interface Window {
    __DEV_LOGS__?: string[];

    __DEV_CONSOLE_READY__?: boolean;
  }
}

const MAX_LOGS = 200;

/* =========================================================
   STRINGIFY
========================================================= */

function stringify(value: any): string {
  try {
    if (typeof value === "string") {
      return value;
    }

    if (value instanceof Error) {
      return `
[ERROR]
Name: ${value.name}

Message:
${value.message}

Stack:
${value.stack}
`;
    }

    if (
      typeof DOMException !==
        "undefined" &&
      value instanceof DOMException
    ) {
      return `
[DOM_EXCEPTION]
${value.name}

${value.message}
`;
    }

    if (
      typeof value === "object" &&
      value !== null
    ) {
      const parsed: any = {};

      Object.getOwnPropertyNames(
        value
      ).forEach((key) => {
        parsed[key] =
          value[key];
      });

      return JSON.stringify(
        parsed,
        null,
        2
      );
    }

    return String(value);
  } catch (err) {
    return `
[STRINGIFY_FAILED]
${String(err)}
`;
  }
}

/* =========================================================
   UPDATE OVERLAY
========================================================= */

function updateOverlay() {
  const overlay =
    document.getElementById(
      "__DEV_OVERLAY__"
    );

  if (!overlay) return;

  overlay.textContent =
    (window.__DEV_LOGS__ || [])
      .slice()
      .reverse()
      .join("\n\n");
}

/* =========================================================
   ADD LOG
========================================================= */

function addLog(
  type: string,
  ...args: any[]
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  if (!window.__DEV_LOGS__) {
    window.__DEV_LOGS__ = [];
  }

  const line = `[${new Date().toLocaleTimeString()}] [${type}] ${args
    .map((x) => stringify(x))
    .join(" ")}`;

  window.__DEV_LOGS__.push(
    line
  );

  if (
    window.__DEV_LOGS__.length >
    MAX_LOGS
  ) {
    window.__DEV_LOGS__.shift();
  }

  updateOverlay();
}

/* =========================================================
   UI
========================================================= */

function createUI() {
  document
    .getElementById(
      "__DEV_BUTTON__"
    )
    ?.remove();

  document
    .getElementById(
      "__DEV_OVERLAY__"
    )
    ?.remove();

  /*
    BUTTON
  */

  const button =
    document.createElement(
      "button"
    );

  button.id =
    "__DEV_BUTTON__";

  button.innerHTML = "🐞";

  Object.assign(
    button.style,
    {
      position: "fixed",
      bottom: "16px",
      right: "16px",
      width: "58px",
      height: "58px",
      borderRadius: "999px",
      border: "none",
      background: "#000",
      color: "#00ff88",
      fontSize: "26px",
      zIndex: "9999999",
      boxShadow:
        "0 0 20px rgba(0,255,136,.5)",
    }
  );

  /*
    OVERLAY
  */

  const overlay =
    document.createElement(
      "pre"
    );

  overlay.id =
    "__DEV_OVERLAY__";

  Object.assign(
    overlay.style,
    {
      position: "fixed",
      left: "0",
      right: "0",
      bottom: "0",
      height: "55vh",
      background:
        "rgba(0,0,0,.97)",
      color: "#00ff88",
      zIndex: "9999998",
      padding: "14px",
      overflow: "auto",
      fontSize: "11px",
      display: "none",
      whiteSpace:
        "pre-wrap",
      margin: "0",
      fontFamily:
        "monospace",
      borderTop:
        "2px solid #00ff88",
    }
  );

  /*
    CLOSE
  */

  const close =
    document.createElement(
      "button"
    );

  close.innerHTML = "✕";

  Object.assign(
    close.style,
    {
      position: "absolute",
      top: "8px",
      right: "8px",
      border: "none",
      background:
        "#ff0033",
      color: "white",
      padding: "6px 10px",
      borderRadius: "8px",
      zIndex: "99999999",
    }
  );

  overlay.appendChild(close);

  /*
    EVENTS
  */

  button.onclick = () => {
    const isOpen =
      overlay.style.display ===
      "block";

    overlay.style.display =
      isOpen
        ? "none"
        : "block";

    if (!isOpen) {
      updateOverlay();
    }
  };

  close.onclick = () => {
    overlay.style.display =
      "none";
  };

  /*
    APPEND
  */

  document.body.appendChild(
    overlay
  );

  document.body.appendChild(
    button
  );
}

/* =========================================================
   INIT
========================================================= */

export function initDevConsole() {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  if (
    window.__DEV_CONSOLE_READY__
  ) {
    return;
  }

  window.__DEV_CONSOLE_READY__ =
    true;

  const start = async () => {
    createUI();

    addLog(
      "SYSTEM",
      "Dev console initialized🐞"
    );

    /*
      SYSTEM INFO
    */

    addLog(
      "SYSTEM_INFO",
      {
        userAgent:
          navigator.userAgent,

        memory:
          (navigator as any)
            .deviceMemory,

        cores:
          navigator
            .hardwareConcurrency,

        language:
          navigator.language,

        online:
          navigator.onLine,

        webgpu:
          "gpu" in navigator,

        sharedArrayBuffer:
          typeof SharedArrayBuffer !==
          "undefined",
      }
    );

    /*
      WEBGPU
    */

    try {
      if ("gpu" in navigator) {
        addLog(
          "WEBGPU",
          "Supported"
        );

        const adapter =
          await (
            navigator as any
          ).gpu.requestAdapter();

        if (!adapter) {
          addLog(
            "WEBGPU",
            "No adapter"
          );
        } else {
          addLog(
            "WEBGPU_ADAPTER",
            {
              features: [
                ...adapter.features,
              ],
            }
          );

          const device =
            await adapter.requestDevice();

          device.lost.then(
            (info: any) => {
              addLog(
                "GPU_DEVICE_LOST",
                info
              );
            }
          );

          addLog(
            "WEBGPU",
            "Device acquired"
          );
        }
      } else {
        addLog(
          "WEBGPU",
          "Not supported"
        );
      }
    } catch (err) {
      addLog(
        "WEBGPU_ERROR",
        err
      );
    }

    /*
      CONSOLE HOOKS
    */

    const oldError =
      console.error;

    const oldWarn =
      console.warn;

    const oldLog =
      console.log;

    console.error = (
      ...args
    ) => {
      addLog(
        "ERROR",
        ...args.map((a) => {
          if (
            a instanceof Error
          ) {
            return {
              name: a.name,
              message:
                a.message,
              stack:
                a.stack,
            };
          }

          return a;
        })
      );

      oldError(...args);
    };

    console.warn = (
      ...args
    ) => {
      addLog(
        "WARN",
        ...args
      );

      oldWarn(...args);
    };

    console.log = (
      ...args
    ) => {
      addLog(
        "LOG",
        ...args
      );

      oldLog(...args);
    };

    /*
      GLOBAL ERRORS
    */

    window.addEventListener(
      "error",
      (e: any) => {
        addLog(
          "GLOBAL_ERROR",
          {
            message:
              e.message,

            filename:
              e.filename,

            line:
              e.lineno,

            column:
              e.colno,

            stack:
              e.error?.stack,
          }
        );
      }
    );

    /*
      PROMISE
    */

    window.addEventListener(
      "unhandledrejection",
      (e: any) => {
        addLog(
          "PROMISE_REJECTION",
          e.reason
        );
      }
    );

    /*
      FETCH
    */

    const oldFetch =
      window.fetch;

    window.fetch =
      async (...args) => {
        try {
          const res =
            await oldFetch(
              ...args
            );

          if (!res.ok) {
            addLog(
              "FETCH_ERROR",
              {
                status:
                  res.status,

                url:
                  args[0],
              }
            );
          }

          return res;
        } catch (err) {
          addLog(
            "FETCH_CRASH",
            err
          );

          throw err;
        }
      };

    addLog(
      "SYSTEM",
      "Hooks attached"
    );
  };

  if (document.body) {
    start();
  } else {
    window.addEventListener(
      "load",
      start
    );
  }
      }
