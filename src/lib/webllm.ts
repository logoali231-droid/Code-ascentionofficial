"use client";

import {
  CreateWebWorkerMLCEngine,
  MLCEngineInterface,
} from "@mlc-ai/web-llm";

import { playSound } from "./sounds";

import {
  AVAILABLE_MODELS,
  detectSystemCapabilities,
} from "./modelManager";

let worker: Worker | null = null;

let engine: MLCEngineInterface | null = null;

let loadingPromise:
  | Promise<MLCEngineInterface>
  | null = null;

let currentModel:
  | string
  | null = null;

let generationLock = false;

export async function initEngine(
  modelId?: string,
  onProgress?: (report: any) => void
) {
  if (loadingPromise)
    return loadingPromise;

  loadingPromise =
    (async () => {
      try {
        await detectSystemCapabilities();

        const selectedModelId =
          modelId ||
          "Phi-3-mini-4k-instruct-q4f16_1-MLC";

        const modelConfig =
          AVAILABLE_MODELS.find(
            (m) =>
              m.model_id ===
              selectedModelId
          );

        if (!modelConfig) {
          throw new Error(
            "Modelo não encontrado."
          );
        }

        if (
          engine &&
          currentModel ===
            selectedModelId
        ) {
          return engine;
        }

        /*
          CLEANUP
        */

        if (worker) {
          worker.terminate();
          worker = null;
        }

        if (engine) {
          try {
            await engine.unload();
          } catch {}
          engine = null;
        }

        /*
          NEW WORKER
        */

        worker = new Worker(
          new URL(
            "./webllm.worker.ts",
            import.meta.url
          ),
          {
            type: "module",
          }
        );

        worker.onerror = (err) => {
          console.error(
            "[WORKER ERROR]",
            err
          );
        };

        /*
          ENGINE
        */

        engine =
          await CreateWebWorkerMLCEngine(
            worker,
            selectedModelId,
            {
              initProgressCallback:
                onProgress,

              logLevel: "INFO",
            }
          );

        currentModel =
          selectedModelId;

        console.log(
          "[WebLLM] Engine pronta:",
          selectedModelId
        );

        return engine;
      } catch (err) {
        console.error(
          "[WebLLM INIT ERROR]",
          err
        );

        loadingPromise = null;

        throw err;
      }
    })();

  return loadingPromise;
}

export async function unloadEngine() {
  try {
    if (engine) {
      await engine.unload();
    }
  } catch (err) {
    console.error(
      "[UNLOAD ERROR]",
      err
    );
  } finally {
    if (worker) {
      worker.terminate();
      worker = null;
    }

    engine = null;

    loadingPromise = null;

    currentModel = null;

    generationLock = false;

    console.log(
      "[WebLLM] Memória liberada."
    );
  }
}

export async function* generate(
  prompt: string,
  temperature = 0.7
) {
  if (generationLock)
    return;

  generationLock = true;

  try {
    const currentEngine =
      await initEngine();

    const stream =
      await currentEngine.chat.completions.create(
        {
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],

          temperature,

          stream: true,
        }
      );

    for await (const chunk of stream as any) {
      const content =
        chunk.choices?.[0]
          ?.delta?.content || "";

      if (content)
        yield content;
    }
  } catch (err) {
    console.error(
      "[GENERATE ERROR]",
      err
    );

    playSound("error", 0.4);

    throw err;
  } finally {
    generationLock = false;
  }
}