"use client";

import { ModelRecord } from "@mlc-ai/web-llm";
import { save, get } from "./db";

/* =========================================================
   BENCHMARK
========================================================= */

export async function runQuickBenchmark(engine: any): Promise<number> {
  const startTime = performance.now();

  const testPrompt =
    "Explique loop em 3 palavras.";

  await engine.chat.completions.create({
    messages: [
      {
        role: "user",
        content: testPrompt,
      },
    ],
    max_tokens: 10,
  });

  const endTime = performance.now();

  const durationSeconds =
    (endTime - startTime) / 1000;

  const tokensPerSecond =
    10 / durationSeconds;

  const user =
    await get("user", "main");

  await save("user", {
    ...user,
    tokensPerSecond,
  });

  return tokensPerSecond;
}

/* =========================================================
   TYPES
========================================================= */

export interface Model
  extends ModelRecord {
  name: string;

  sizeMb: number;

  recommendedFor:
    | "LOW"
    | "MID"
    | "HIGH";
}

export interface SystemSpecs {
  modelTier:
    | "LOW"
    | "MID"
    | "HIGH";

  gpuLimit: number;

  recommended: Model;

  memory: number;

  webgpu: boolean;

  sharedArrayBuffer: boolean;

  ramGB: number;

  isMobile: boolean;
}

/* =========================================================
   MODELS
========================================================= */

export const AVAILABLE_MODELS: Model[] = [
  {
  model_id: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC", // Alterado para f32
  model: "https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
  name: "Qwen 2.5 0.5B (Safe Mode)",
  sizeMb: 550,
  recommendedFor: "LOW",
},
{
  model_id: "Phi-3-mini-4k-instruct-q4f32_1-MLC", // Alterado para f32
  model: "https://huggingface.co/mlc-ai/Phi-3-mini-4k-instruct-q4f32_1-MLC",
  name: "Phi 3 Mini (Safe Mode)",
  sizeMb: 1900,
  recommendedFor: "MID",
}


  {
    model_id:
      "Phi-3.5-mini-instruct-q4f16_1-MLC",

    model:
      "https://huggingface.co/mlc-ai/Phi-3.5-mini-instruct-q4f16_1-MLC",

    model_lib:
      "",

    name:
      "Phi 3.5 Mini",

    sizeMb:
      2200,

    recommendedFor:
      "HIGH",
  },
];

/* =========================================================
   HELPERS
========================================================= */

function getModelByTier(
  tier:
    | "LOW"
    | "MID"
    | "HIGH"
) {
  switch (tier) {
    case "HIGH":
      return AVAILABLE_MODELS[2];

    case "MID":
      return AVAILABLE_MODELS[1];

    default:
      return AVAILABLE_MODELS[0];
  }
}

/* =========================================================
   CACHE SYSTEM DETECTION
========================================================= */

let cachedSpecs:
  | SystemSpecs
  | null = null;

/* =========================================================
   SYSTEM DETECTION
========================================================= */

export async function detectSystemCapabilities(): Promise<SystemSpecs> {
  if (cachedSpecs)
    return cachedSpecs;

  const nav =
    navigator as any;

  const memory =
    nav.deviceMemory || 4;

  const cores =
    navigator.hardwareConcurrency || 4;

  const webgpu =
    "gpu" in navigator;

  const sharedArrayBuffer =
    typeof SharedArrayBuffer !==
    "undefined";

  const isMobile =
    /Mobi|Android/i.test(
      navigator.userAgent
    );

  let gpuLimit = 512;

  let modelTier:
    | "LOW"
    | "MID"
    | "HIGH" =
    "LOW";

  try {
    if (!webgpu) {
      cachedSpecs = {
        modelTier: "LOW",
        gpuLimit,
        recommended:
          AVAILABLE_MODELS[0],
        memory,
        webgpu,
        sharedArrayBuffer,
        ramGB: memory,
        isMobile,
      };

      return cachedSpecs;
    }

    const adapter =
      await nav.gpu.requestAdapter();

    if (!adapter) {
      cachedSpecs = {
        modelTier: "LOW",
        gpuLimit,
        recommended:
          AVAILABLE_MODELS[0],
        memory,
        webgpu,
        sharedArrayBuffer,
        ramGB: memory,
        isMobile,
      };

      return cachedSpecs;
    }

    gpuLimit = 2048;

    if (
      memory <= 3 ||
      cores <= 4 ||
      !sharedArrayBuffer
    ) {
      modelTier = "LOW";
    }

    else if (
      memory >= 4 &&
      cores >= 6
    ) {
      modelTier = "MID";
    }

    if (memory >= 8 && cores >= 8) {
  modelTier = "HIGH";
  gpuLimit = 4096;
}

// CORREÇÃO CRÍTICA: Se for mobile, nunca use HIGH. 
// O Shader do M23 não aguenta a complexidade do Phi 3.5
if (isMobile) {
  modelTier = memory > 4 ? "MID" : "LOW";
  gpuLimit = 1024; // Reduz pressão na VRAM
}


    if (
      memory <= 4 &&
      modelTier === "HIGH"
    ) {
      modelTier = "MID";
    }
  }

  catch (err) {
    console.error(
      "[WebGPU Detection Error]",
      err
    );
  }

  const recommended =
    getModelByTier(modelTier);

  console.log(
    "[System Detection]",
    {
      memory,
      cores,
      gpuLimit,
      modelTier,
      webgpu,
      sharedArrayBuffer,
      recommended:
        recommended.name,
    }
  );

  cachedSpecs = {
    modelTier,
    gpuLimit,
    recommended,
    memory,
    webgpu,
    sharedArrayBuffer,
    ramGB: memory,
    isMobile,
  };

  return cachedSpecs;
}
