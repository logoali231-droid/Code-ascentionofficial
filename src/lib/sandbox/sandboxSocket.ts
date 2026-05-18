"use client";

let socket: WebSocket | null = null;

const WS_URL = process.env.NEXT_PUBLIC_SANDBOX_WS || "ws://localhost:8080";

export function connectSandboxSocket() {
  return new Promise<WebSocket>((resolve, reject) => {
    if (socket?.readyState === WebSocket.OPEN) {
      return resolve(socket);
    }

    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      console.log("[SANDBOX] Socket connected");
      resolve(socket!);
    };

    socket.onerror = (err) => {
      reject(err);
    };
  });
}

export function disconnectSandboxSocket() {
  if (!socket) return;

  socket.close();
  socket = null;
}

export function getSandboxSocket() {
  return socket;
}
