"use client";

let socket: WebSocket | null = null;

const WS_URL =
  process.env.NEXT_PUBLIC_SANDBOX_WS ||
  "wss://code-ascention.kindsand-c67711f7.brazilsouth.azurecontainerapps.io/ws";

export function connectSandboxSocket() {
  return new Promise<WebSocket>((resolve, reject) => {
    try {
      if (socket?.readyState === WebSocket.OPEN) {
        return resolve(socket);
      }

      if (typeof window === "undefined") {
        return reject(new Error("WebSocket only runs on client"));
      }

      socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        console.log("[SANDBOX] connected");
        resolve(socket!);
      };

      socket.onerror = (err) => {
        console.error("[SANDBOX] socket error", err);
        reject(new Error("WebSocket connection failed"));
      };

      socket.onclose = () => {
        console.warn("[SANDBOX] socket closed");
        socket = null;
      };
    } catch (e) {
      reject(e);
    }
  });
}

export function disconnectSandboxSocket() {
  if (!socket) return;

  try {
    socket.close();
  } finally {
    socket = null;
  }
}

export function getSandboxSocket() {
  return socket;
}