"use client";

import * as webllm from "@mlc-ai/web-llm";

import {
  get,
  save,
} from "@/lib/db";

import { playSound } from "./sounds";

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

let currentModel:
  string | null = null;

let generationLock = false;

let generationId = 0;

let recovering = false;



/* =====================================
   HARD MEMORY SAFE MODE
===================================== */

const isMobile =
  /Android|iPhone|iPad/i.test(
    navigator.userAgent
  );

const SAFE_MAX_TOKENS = isMobile ? 512 : 1024;


/* =========================================================
   INIT ENGINE
========================================================= */

export async function initEngine(


  modelId: string =
    AVAILABLE_MODELS[0].id,

  onProgress?: (p: any) => void
) {
  /* already ready */

  if (
    engine &&
    currentModel === modelId
  ) {
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

    currentModel =
      modelId;

    /* =====================================
       DEVICE LOST RECOVERY
    ===================================== */

    try {
      const gpuDevice: any =
        (engine as any)
          ?.engine
          ?.device;

      if (gpuDevice?.lost) {
        gpuDevice.lost.then(
          async () => {
            console.warn(
              "[WebGPU] Device lost"
            );

            await unloadEngine();
          }
        );
      }
    } catch { }

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

    currentModel = null;

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

  currentModel = null;
}

/* =========================================================
   GENERATE
========================================================= */

export async function generate(
  prompt: string,

  temperature: number = 0.7
) {
  /* =====================================
     PREVENT PARALLEL GPU GENERATION
  ===================================== */

  while (generationLock) {
    await sleep(50);
  }

  generationLock = true;

  const myGenerationId =
    ++generationId;

  try {
    const currentEngine =
      await initEngine();

    if (!currentEngine) {
      throw new Error(
        "AI_OFFLINE"
      );
    }

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
                "You are a Cyberpunk AI tutor. Return ONLY valid JSON.",
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

          max_tokens: SAFE_MAX_TOKENS,
        }
      );

    const response: any =
      await Promise.race([
        request,
        timeout,
      ]);

    /* =====================================
       CANCEL STALE GENERATIONS
    ===================================== */

    if (
      myGenerationId !==
      generationId
    ) {
      throw new Error(
        "STALE_GENERATION"
      );
    }

    return response
      ?.choices?.[0]
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

    /* =====================================
       GPU RECOVERY
    ===================================== */

    if (
      msg.includes(
        "OutOfMemory"
      ) ||

      msg.includes(
        "disposed"
      ) ||

      msg.includes(
        "Device"
      ) ||

      msg.includes(
        "STALE_GENERATION"
      )
    ) {
      if (!recovering) {
        recovering = true;

        await unloadEngine();

        await sleep(1000);

        recovering = false;
      }
    }

    return JSON.stringify({
      error:
        "System Glitch",
    });
  } finally {
    generationLock = false;

    /* ============================
       GPU THERMAL COOLDOWN
    ============================ */

    await sleep(
      isMobile ? 180 : 80
    );
  }
}

/* =========================================================
   HELPERS
========================================================= */

function sleep(ms: number) {
  return new Promise(
    (resolve) =>
      setTimeout(
        resolve,
        ms
      )
  );
}