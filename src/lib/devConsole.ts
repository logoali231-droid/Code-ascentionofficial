"use client";

declare global {
  interface Window {
    __DEV_LOGS__?: string[];
    __DEV_CONSOLE_READY__?: boolean;
  }
}

const MAX_LOGS = 150;

function stringify(value: any) {
  try {
    if (typeof value === "string")
      return value;

    return JSON.stringify(
      value,
      null,
      2
    );
  } catch {
    return String(value);
  }
}

function updateOverlay() {
  const overlay =
    document.getElementById(
      "__DEV_OVERLAY__"
    );

  if (!overlay) return;

  overlay.textContent =
    (
      window.__DEV_LOGS__ || []
    )
      .slice()
      .reverse()
      .join("\n\n");
}

function addLog(
  type: string,
  ...args: any[]
) {
  if (
    typeof window === "undefined"
  )
    return;

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

function createUI() {
  /*
    remove duplicates
  */

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
      width: "56px",
      height: "56px",
      borderRadius: "999px",
      border: "none",
      background: "#000",
      color: "#00ff88",
      fontSize: "24px",
      zIndex: "9999999",
      boxShadow:
        "0 0 15px rgba(0,255,136,.5)",
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
      height: "50vh",
      background:
        "rgba(0,0,0,.96)",
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
    CLOSE BUTTON
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

export function initDevConsole() {
  if (
    typeof window === "undefined"
  )
    return;

  /*
    prevent duplicate init
  */

  if (
    window.__DEV_CONSOLE_READY__
  ) {
    return;
  }

  window.__DEV_CONSOLE_READY__ =
    true;

  /*
    WAIT BODY
  */

  const start = () => {
    createUI();

    addLog(
      "SYSTEM",
      "Dev console initialized"
    );

    /*
      console hooks
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
        ...args
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
      JS ERRORS
    */

    window.addEventListener(
      "error",
      (e: any) => {
        addLog(
          "GLOBAL_ERROR",
          e.message ||
            e.error
        );
      }
    );

    /*
      PROMISE
    */

    window.addEventListener(
      "unhandledrejection",
      (e) => {
        addLog(
          "PROMISE",
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
              "FETCH",
              `${res.status} ${args[0]}`
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
