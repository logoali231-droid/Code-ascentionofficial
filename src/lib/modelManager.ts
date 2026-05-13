"use client";

import { ModelRecord } from "@mlc-ai/web-llm";

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

export const AVAILABLE_MODELS: Model[] =
  [
    /*
      =====================================================
      ULTRA SAFE MOBILE MODEL
      =====================================================
    */

    {
      model_id:
        "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",

      model:
        "https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC",

      model_lib:
        "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/webgpu/Qwen2.5-0.5B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm",

      name: "Qwen 2.5 0.5B",

      sizeMb: 550,

      recommendedFor:
        "LOW",
    },

    /*
      =====================================================
      MAIN REASONING MODEL
      =====================================================
    */

    {
      model_id:
        "Phi-3.5-mini-instruct-q4f16_1-MLC",

      model:
        "https://huggingface.co/mlc-ai/Phi-3.5-mini-instruct-q4f16_1-MLC",

      model_lib:
        "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/webgpu/Phi-3.5-mini-instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm",

      name: "Phi 3.5 Mini",

      sizeMb: 2200,

      recommendedFor:
        "MID",
    },

    /*
      =====================================================
      HIGH END
      =====================================================
    */

    {
      model_id:
        "Phi-4-mini-instruct-q4f16_1-MLC",

      model:
        "https://huggingface.co/mlc-ai/Phi-4-mini-instruct-q4f16_1-MLC",

      model_lib:
        "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/webgpu/Phi-4-mini-instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm",

      name: "Phi 4 Mini",

      sizeMb: 2450,

      recommendedFor:
        "HIGH",
    },

    /*
      =====================================================
      OPTIONAL LARGE MODEL
      =====================================================
    */

    {
      model_id:
        "Llama-3.2-3B-Instruct-q4f16_1-MLC",

      model:
        "https://huggingface.co/mlc-ai/Llama-3.2-3B-Instruct-q4f16_1-MLC",

      model_lib:
        "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/webgpu/Llama-3.2-3B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm",

      name: "Llama 3.2 3B",

      sizeMb: 2600,

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
   SYSTEM DETECTION
========================================================= */

export async function detectSystemCapabilities(): Promise<SystemSpecs> {
  const nav =
    navigator as any;

  const memory =
    nav.deviceMemory || 4;

  const cores =
    navigator.hardwareConcurrency ||
    4;

  const webgpu =
    "gpu" in navigator;

  const sharedArrayBuffer =
    typeof SharedArrayBuffer !==
    "undefined";

  let gpuLimit = 512;

  let modelTier:
    | "LOW"
    | "MID"
    | "HIGH" =
    "LOW";

  try {
    /*
      =====================================================
      NO WEBGPU
      =====================================================
    */

    if (!webgpu) {
  
  return {
    modelTier: "LOW",
    gpuLimit,
    recommended: AVAILABLE_MODELS[0],
    memory,
    webgpu,
    sharedArrayBuffer,
    ramGB: memory, // Adicionado
    isMobile: /Mobi|Android/i.test(navigator.userAgent), // Adicionado
  };
}

    /*
      =====================================================
      GPU ADAPTER
      =====================================================
    */

    const adapter =
      await nav.gpu.requestAdapter();

    if (!adapter) {
  // ...
  return {
    modelTier: "LOW",
    gpuLimit,
    recommended: AVAILABLE_MODELS[0],
    memory,
    webgpu,
    sharedArrayBuffer,
    ramGB: memory, // Atribuição correta de valor
    isMobile: /Mobi|Android/i.test(navigator.userAgent), // Atribuição correta
  };
}

    /*
      =====================================================
      TIER LOGIC
      =====================================================
    */

    gpuLimit = 2048;

    /*
      LOW
    */

    if (
      memory <= 3 ||
      cores <= 4 ||
      !sharedArrayBuffer
    ) {
      modelTier = "LOW";
    }

    /*
      MID
    */

    else if (
      memory >= 4 &&
      cores >= 6
    ) {
      modelTier = "MID";
    }

    /*
      HIGH
    */

    if (
      memory >= 8 &&
      cores >= 8
    ) {
      modelTier = "HIGH";

      gpuLimit = 4096;
    }

    /*
      SAFETY:
      Mobile devices with 4GB RAM
      should avoid auto-loading
      giant models.
    */

    if (
      memory <= 4 &&
      modelTier === "HIGH"
    ) {
      modelTier = "MID";
    }
  } catch (err) {
    console.error(
      "[WebGPU Detection Error]",
      err
    );
  }

  const recommended =
    getModelByTier(
      modelTier
    );

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

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

return {
  modelTier,
  gpuLimit,
  recommended,
  memory,
  webgpu,
  sharedArrayBuffer,
  ramGB: memory, // Adicionado
  isMobile, // Adicionado
};
      }
