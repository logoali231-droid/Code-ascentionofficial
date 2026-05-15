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

    const timeout = setTimeout(() => {

      reject(new Error("Remote execution timeout"));

    }, 15000);

    socket.addEventListener("message", (event) => {

      clearTimeout(timeout);

      const data = JSON.parse(event.data);

      resolve({

        output: data.output || [],

        error: data.error

      });

    }, { once: true });

    socket.addEventListener("error", (err) => {

      clearTimeout(timeout);

      reject(err);

    }, { once: true });
  });
}