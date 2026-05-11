"use client";

import * as webllm from "@mlc-ai/web-llm";

import {
  get,
  save,
} from "@/lib/db";

import {
  playSound,
} from "./sounds";

import {
  AVAILABLE_MODELS,
} from "./modelManager";

/* =========================================================
   SINGLETONS
========================================================= */

let engine:
  webllm.MLCEngine | null =
  null;

let loadingPromise:
  Promise<webllm.MLCEngine> | null =
  null;

/* =========================================================
   INIT ENGINE
========================================================= */

export async function initEngine(
  modelId: string =
    AVAILABLE_MODELS[0].id,

  onProgress?: (p: any) => void
) {
  /* already ready */
  if (engine) {
    return engine;
  }

  /* already loading */
  if (loadingPromise) {
    return loadingPromise;
  }

  try {
    loadingPromise =
      webllm.CreateMLCEngine(
        modelId,
        {
          initProgressCallback:
            onProgress,

          logLevel: "INFO",
        }
      );

    engine =
      await loadingPromise;

    const user =
      await get(
        "user",
        "main"
      );

    if (user) {
      await save(
        "user",
        {
          ...user,

          engineReady: true,

          model:
            modelId,
        },
        "main"
      );
    }

    return engine;
  } catch (err) {
    console.error(
      "[WebLLM Init Error]",
      err
    );

    engine = null;

    throw err;
  } finally {
    loadingPromise = null;
  }
}

/* =========================================================
   GET ENGINE
========================================================= */

export function getEngine() {
  return engine;
}

/* =========================================================
   UNLOAD ENGINE
========================================================= */

export async function unloadEngine() {
  try {
    if (engine) {
      await engine.unload();
    }
  } catch (err) {
    console.warn(
      "[WebLLM Unload Error]",
      err
    );
  }

  engine = null;

  loadingPromise = null;
}

/* =========================================================
   GENERATE
========================================================= */

export async function generate(
  prompt: string,

  temperature: number = 0.7
) {
  const currentEngine =
    await initEngine();

  if (!currentEngine) {
    throw new Error(
      "AI_OFFLINE"
    );
  }

  try {
    const timeout =
      new Promise(
        (_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "TIMEOUT"
                )
              ),
            30000
          )
      );

    const request =
      currentEngine.chat.completions.create(
        {
          messages: [
            {
              role: "system",

              content:
                "You are a Cyberpunk AI. Return ONLY JSON.",
            },

            {
              role: "user",

              content:
                prompt,
            },
          ],

          temperature,

          response_format:
            {
              type:
                "json_object",
            },

          /* IMPORTANT */
          max_tokens: 256,
        }
      );

    const response: any =
      await Promise.race([
        request,
        timeout,
      ]);

    return response
      .choices?.[0]
      ?.message?.content;
  } catch (err: any) {
    console.error(
      "[WebLLM Generate Error]",
      err
    );

    playSound(
      "error",
      0.4
    );

    const msg =
      String(err);

    /* GPU recovery */

    if (
      msg.includes(
        "OutOfMemory"
      ) ||

      msg.includes(
        "disposed"
      ) ||

      msg.includes(
        "Device"
      )
    ) {
      await unloadEngine();
    }

    return JSON.stringify({
      error:
        "System Glitch",
    });
  }
}

async function withTimeout(
  promise: Promise<any>,
  ms = 45000
) {
  const timeout = new Promise(
    (_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error("LLM timeout")
          ),
        ms
      )
  );

  return Promise.race([
    promise,
    timeout,
  ]);
}