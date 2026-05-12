"use client";

import * as webllm from "@mlc-ai/web-llm";

import { playSound } from "./sounds";

import {
  AVAILABLE_MODELS,
  detectSystemCapabilities,
} from "./modelManager";

let engine: webllm.MLCEngine | null = null;

let loadingPromise:
  | Promise<webllm.MLCEngine>
  | null = null;

let currentModel: string | null = null;

let generationLock = false;

export async function initEngine(
  modelId?: string,
  onProgress?: (report: any) => void
) {
  let selectedModelId = modelId;

  if (!selectedModelId) {
    const specs =
      await detectSystemCapabilities();

    selectedModelId =
      specs.recommended.model_id;
  }

  // reutiliza engine
  if (
    engine &&
    currentModel === selectedModelId
  ) {
    return engine;
  }

  // evita race condition
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      // limpa engine anterior
      if (engine) {
        try {
          await engine.unload();
        } catch (err) {
          console.warn(
            "[Engine Unload Warning]",
            err
          );
        }

        engine = null;
      }

      console.log(
        `[WebLLM] Creating engine`
      );

      engine = new webllm.MLCEngine({
        appConfig: {
          model_list: AVAILABLE_MODELS,
        },

        initProgressCallback: (report) => {
          console.log(
            `[WebLLM] ${report.text}`
          );

          onProgress?.(report);
        },
      });

      console.log(
        `[WebLLM] Loading ${selectedModelId}`
      );

      await engine.reload(selectedModelId);

      currentModel = selectedModelId;

      console.log(
        `[WebLLM] Loaded ${selectedModelId}`
      );

      return engine;
    } catch (error) {
      console.error(
        "[WebLLM Init Error]",
        error
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
  } finally {
    engine = null;
    loadingPromise = null;
    currentModel = null;
  }
}

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

    const response =
      await currentEngine.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],

        temperature,

        stream: true,
      });

    return response;
  } catch (err) {
    console.error(
      "[WebLLM Generate Error]",
      err
    );

    playSound("error", 0.4);

    throw err;
  } finally {
    generationLock = false;
  }
}