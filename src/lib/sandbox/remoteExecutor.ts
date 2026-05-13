"use client";

import { connectSandboxSocket } from "./sandboxSocket";

export async function runRemote(
  code: string,
  language: string
) {
  const socket = await connectSandboxSocket();

  return new Promise((resolve, reject) => {
    socket.send(
      JSON.stringify({
        type: "execute",
        language,
        code
      })
    );

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      resolve({
        output: data.output || [],
        error: data.error
      });
    };

    socket.onerror = reject;
  });
}