// src/config/system.ts

export interface Model {
  model_id: string;
  model: string;
  model_lib?: string;

  name: string;
  sizeMb: number;

  recommendedFor: "LOW" | "MID" | "HIGH";

  /* =========================================================
     MOBILE SAFETY FLAGS
  ========================================================= */

  mobileSafe: boolean;

  /*
    HARD LIMIT DE RAM RECOMENDADA
    Evita Android suicidar tentando carregar modelo grande
  */
  minRamGB?: number;
}

const SYSTEM_CONFIG = {
  PORT: parseInt(process.env.PORT || "3001", 10),

  /* =========================================================
     RUNTIME LIMITS
  ========================================================= */

  LIMITS: {
    memory_light: "256m",
    memory_heavy: "512m",

    cpus: "0.5",

    pidsLimit: 64,

    timeout: 15000,

    LANGUAGES: {
      javascript: "128m",
      python: "192m",
      csharp: "384m",
    },
  },

  /* =========================================================
     LOCAL LLM CONFIG
  ========================================================= */

  LLM: {
    /*
      Desktop continua relativamente confortável.
      Mobile precisa ser MUITO mais conservador.
    */

    context_window_size: 1536,

    sliding_window_size: 1024,

    attention_sink_size: 4,

    /*
      Android browsers quebram MUITO fácil
      com KV cache alto.
    */

    MOBILE: {
      context_window_size: 1024,

      sliding_window_size: 256,

      /*
        HARD LIMITS
      */

      max_tokens: 256,

      gpuLimitMb: 512,

      /*
        Tempo máximo em background antes
        de descarregar VRAM.
      */
      aggressiveUnload: true,
    },
  },

  /* =========================================================
     CLEANUP / MEMORY PRESSURE
  ========================================================= */

  CLEANUP: {
    MAX_EXPLANATIONS_TOTAL: 50,

    MAX_ERRORS_TOTAL: 10,

    /*
      Reduzido.
      Mobile mata tabs agressivamente.
    */
    MOBILE_BACKGROUND_TIMEOUT_MS: 45000,

    /*
      Thresholds de heap JS
    */
    MEMORY: {
      MOBILE_CRITICAL_MB: 180,

      DESKTOP_CRITICAL_MB: 400,
    },
  },

  /* =========================================================
     EXECUTION QUEUE
  ========================================================= */

  QUEUE: {
    /*
      Evita concorrência assassina
      no mobile/browser low-end.
    */
    maxConcurrent: 1,
  },

  /* =========================================================
     AVAILABLE MODELS
  ========================================================= */

  AVAILABLE_MODELS: [
    {
      model_id: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",

      model:
        "https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f32_1-MLC",

      name: "Qwen 2.5 0.5B (Ultra Safe)",

      sizeMb: 550,

      recommendedFor: "LOW",

      mobileSafe: true,

      minRamGB: 3,
    },

    {
      model_id: "Phi-3-mini-4k-instruct-q4f16_1-MLC",

      model:
        "https://huggingface.co/mlc-ai/Phi-3-mini-4k-instruct-q4f16_1-MLC",

      name: "Phi 3 Mini (Balanced)",

      sizeMb: 1200,

      recommendedFor: "MID",

      /*
        Só celulares fortes.
      */
      mobileSafe: false,

      minRamGB: 6,
    },

    {
      model_id: "Phi-3.5-mini-instruct-q4f16_1-MLC",

      model:
        "https://huggingface.co/mlc-ai/Phi-3.5-mini-instruct-q4f16_1-MLC",

      name: "Phi 3.5 Mini (Desktop Only)",

      sizeMb: 2200,

      recommendedFor: "HIGH",

      /*
        NÃO deixar Android carregar isso.
      */
      mobileSafe: false,

      minRamGB: 8,
    },
  ],
} as const;

/* =========================================================
   DEEP FREEZE
========================================================= */

Object.freeze(SYSTEM_CONFIG);

Object.freeze(SYSTEM_CONFIG.LIMITS);

Object.freeze(SYSTEM_CONFIG.LIMITS.LANGUAGES);

Object.freeze(SYSTEM_CONFIG.LLM);

Object.freeze(SYSTEM_CONFIG.LLM.MOBILE);

Object.freeze(SYSTEM_CONFIG.CLEANUP);

Object.freeze(SYSTEM_CONFIG.CLEANUP.MEMORY);

Object.freeze(SYSTEM_CONFIG.QUEUE);

SYSTEM_CONFIG.AVAILABLE_MODELS.forEach((model) =>
  Object.freeze(model)
);

Object.freeze(SYSTEM_CONFIG.AVAILABLE_MODELS);

export { SYSTEM_CONFIG };