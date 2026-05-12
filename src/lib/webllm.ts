"use client";

import * as webllm from "@mlc-ai/web-llm";

import { playSound } from "./sounds";

import {
  AVAILABLE_MODELS,
  detectSystemCapabilities,
} from "./modelManager";

let engine: webllm.MLCEngine | null =
  null;

let loadingPromise:
  | Promise<webllm.MLCEngine>
  | null = null;

let currentModel: string | null =
  null;

let generationLock = false;

/* =========================================================
   INIT ENGINE
========================================================= */

export async function initEngine(
  modelId?: string,
  onProgress?: (
    report: any
  ) => void
) {
  let selectedModelId =
    modelId;

  if (!selectedModelId) {
    const specs =
      await detectSystemCapabilities();

    selectedModelId =
      specs.recommended.model_id;
  }

  if (
    engine &&
    currentModel ===
      selectedModelId
  ) {
    return engine;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise =
    (async () => {
      try {
        /*
          CLEAN OLD
        */

        if (engine) {
          try {
            await engine.unload();

            console.log(
              "[WebLLM] Previous engine unloaded"
            );
          } catch (err) {
            console.warn(
              "[Engine Unload Warning]",
              err
            );
          }

          engine = null;
        }

        /*
          MEMORY INFO
        */

        console.log(
          "[WebLLM] Memory",
          {
            deviceMemory:
              (
                navigator as any
              ).deviceMemory,

            cores:
              navigator.hardwareConcurrency,

            sharedArrayBuffer:
              typeof SharedArrayBuffer !==
              "undefined",

            webgpu:
              "gpu" in navigator,
          }
        );

        /*
          ENGINE
        */

        console.log(
          "[WebLLM] Creating engine"
        );

        // No seu arquivo src/lib/webllm.ts, dentro da função initEngine:

engine = new webllm.MLCEngine({
  appConfig: {
    model_list: AVAILABLE_MODELS,
  },
  // ADICIONE ISSO AQUI:
  cacheOptions: {
    useIndexedDBCache: true, // Força o uso de IndexedDB em vez da Cache API
  },
  initProgressCallback: (report) => {
    console.log("[MLC_PROGRESS]", report);
    onProgress?.(report);
  },
});

        /*
          LOAD
        */

        console.log(
          `[WebLLM] Loading ${selectedModelId}`
        );

        await Promise.race([
          engine.reload(
            selectedModelId
          ),

          new Promise(
            (_, reject) =>
              setTimeout(() => {
                reject(
                  new Error(
                    "Model loading timeout"
                  )
                );
              }, 1000 * 60 * 5)
          ),
        ]);

        currentModel =
          selectedModelId;

        console.log(
          `[WebLLM] Loaded ${selectedModelId}`
        );

        return engine;
      } catch (error: any) {
        console.error(
          "[WEBLLM_FATAL]",
          {
            name:
              error?.name,

            message:
              error?.message,

            stack:
              error?.stack,

            cause:
              error?.cause,
          }
        );

        engine = null;

        currentModel = null;

        throw error;
      } finally {
        loadingPromise = null;
      }
    })();

  return loadingPromise;
}

/* =========================================================
   UNLOAD
========================================================= */

export async function unloadEngine() {
  try {
    if (engine) {
      await engine.unload();

      console.log(
        "[WebLLM] Engine unloaded"
      );
    }
  } catch (err) {
    console.warn(
      "[WebLLM Unload Error]",
      err
    );
  } finally {
    engine = null;

    loadingPromise = null;

    currentModel = null;
  }
}

/* =========================================================
   GENERATE
========================================================= */

export async function generate(
  prompt: string,
  temperature = 0.7
) {
  if (generationLock) {
    console.warn(
      "[WebLLM] Generation locked"
    );

    return null;
  }

  generationLock = true;

  try {
    const currentEngine =
      await initEngine();

    if (!currentEngine) {
      throw new Error(
        "Engine unavailable"
      );
    }

    console.log(
      "[WebLLM] Generating",
      {
        promptLength:
          prompt.length,

        temperature,
      }
    );

    const response =
      await currentEngine.chat.completions.create(
        {
          messages: [
            {
              role: "user",
              content:
                prompt.slice(
                  0,
                  12000
                ),
            },
          ],

          temperature,

          max_tokens: 350,

          stream: true,
        }
      );

    console.log(
      "[WebLLM] Stream created"
    );

    return response;
  } catch (err) {
    console.error(
      "[WebLLM Generate Error]",
      err
    );

    playSound(
      "error",
      0.4
    );

    throw err;
  } finally {
    generationLock = false;
  }
}
