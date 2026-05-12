"use client";

import { ModelRecord } from "@mlc-ai/web-llm";

export interface Model extends ModelRecord {
  name: string;
  sizeMb: number;
}

export interface SystemSpecs {
  modelTier: "LOW" | "MID" | "HIGH";
  gpuLimit: number;
  recommended: Model;
}

export const AVAILABLE_MODELS: Model[] = [
  {
    model_id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",

    model:
      "https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC",

    model_lib:
      "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/webgpu/Qwen2.5-0.5B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm",

    name: "Qwen 2.5 0.5B",

    sizeMb: 550,
  },

  {
    model_id: "Phi-3.5-mini-instruct-q4f16_1-MLC",

    model:
      "https://huggingface.co/mlc-ai/Phi-3.5-mini-instruct-q4f16_1-MLC",

    model_lib:
      "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/webgpu/Phi-3.5-mini-instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm",

    name: "Phi 3.5 Mini",

    sizeMb: 2200,
  },

  {
    model_id: "Phi-4-mini-instruct-q4f16_1-MLC",

    model:
      "https://huggingface.co/mlc-ai/Phi-4-mini-instruct-q4f16_1-MLC",

    model_lib:
      "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/webgpu/Phi-4-mini-instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm",

    name: "Phi 4 Mini",

    sizeMb: 2450,
  },

  {
    model_id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",

    model:
      "https://huggingface.co/mlc-ai/Llama-3.2-3B-Instruct-q4f16_1-MLC",

    model_lib:
      "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/webgpu/Llama-3.2-3B-Instruct-q4f16_1-ctx4k_cs1k-webgpu.wasm",

    name: "Llama 3.2 3B",

    sizeMb: 2600,
  },
];

export async function detectSystemCapabilities(): Promise<SystemSpecs> {
  const nav = navigator as any;

  const memory = nav.deviceMemory || 4;

  let gpuLimit = 512;

  let modelTier: "LOW" | "MID" | "HIGH" =
    "LOW";

  try {
    if (nav.gpu) {
      const adapter =
        await nav.gpu.requestAdapter();

      if (adapter) {
        gpuLimit = 2048;

        if (memory >= 8) {
          modelTier = "HIGH";
        } else if (memory >= 4) {
          modelTier = "MID";
        }
      }
    }
  } catch (err) {
    console.error(
      "[WebGPU Detection Error]",
      err
    );
  }

  let recommended: Model;

  switch (modelTier) {
    case "HIGH":
      recommended = AVAILABLE_MODELS[2];
      break;

    case "MID":
      recommended = AVAILABLE_MODELS[0];
      break;

    default:
      recommended = AVAILABLE_MODELS[0];
      break;
  }

  console.log("[System Detection]", {
    memory,
    gpuLimit,
    modelTier,
    recommended: recommended.name,
  });

  return {
    modelTier,
    gpuLimit,
    recommended,
  };
}