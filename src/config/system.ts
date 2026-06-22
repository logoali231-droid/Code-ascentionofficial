// src/config/system.ts

export interface Model {
  model_id: string;
  model: string;
  model_lib?: string;

  name: string;

  /*
    Tamanho aproximado de download/storage.
    NÃO representa RAM real utilizada.
  */
  sizeMb: number;

  recommendedFor:
  | "LOW"
  | "MID"
  | "HIGH";

  /* =========================================================
     MOBILE SAFETY FLAGS
  ========================================================= */

  mobileSafe: boolean;

  /*
    RAM mínima recomendada.
    Usado para evitar OOM brutal
    em Android/browser.
  */
  minRamGB?: number;

  /*
    Experimental model warning.
  */
  experimental?: boolean;
}

const SYSTEM_CONFIG = {
  PORT: parseInt(
    process.env.PORT || "3001",
    10
  ),

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
  context_window_size: 1024,
  sliding_window_size: 256,

  MOBILE: {
    context_window_size: 512,
    sliding_window_size: 128,
  }
}
  /* =========================================================
     CLEANUP / MEMORY PRESSURE
  ========================================================= */

  CLEANUP: {
    MAX_EXPLANATIONS_TOTAL: 50,

    MAX_ERRORS_TOTAL: 10,

    /*
      Mobile browsers são frágeis.
    */

    MOBILE_BACKGROUND_TIMEOUT_MS:
      45000,

    /*
      Heap JS thresholds.
      180MB estava agressivo demais.
    */

    MEMORY: {
      MOBILE_CRITICAL_MB: 320,

      DESKTOP_CRITICAL_MB: 900,
    },

    /*
      Delay para permitir WebGPU
      desalocar buffers.
    */

    GC_SETTLE_DELAY_MS: 1000,
  },

  /* =========================================================
     EXECUTION QUEUE
  ========================================================= */

  QUEUE: {
    /*
      Mobile/browser low-end:
      concorrência = caos.
    */

    maxConcurrent: 1,
  },

  /* =========================================================
     AVAILABLE MODELS
  ========================================================= */

  AVAILABLE_MODELS: [
    {
  model_id: "Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC",

  model:
    "https://huggingface.co/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC",

  name: "Qwen 2.5 Coder 0.5B (Ultra Safe)",

  sizeMb: 600,

  recommendedFor: "LOW",

  mobileSafe: true,

  minRamGB: 3,
},

    {
      /* ===================================================
         EXPERIMENTAL MOBILE / MID DESKTOP
      =================================================== */

      model_id:
        "Phi-3-mini-4k-instruct-q4f16_1-MLC",

      model:
        "https://huggingface.co/mlc-ai/Phi-3-mini-4k-instruct-q4f16_1-MLC",

      name:
        "Phi 3 Mini (Experimental)",

      sizeMb: 1200,

      recommendedFor: "MID",

      /*
        NÃO seguro pra maioria
        dos Androids.
      */

      mobileSafe: true,

      minRamGB: 4,

      experimental: true,
    },

    {
      /* ===================================================
         DESKTOP ONLY
      =================================================== */

      model_id:
        "Phi-3.5-mini-instruct-q4f16_1-MLC",

      model:
        "https://huggingface.co/mlc-ai/Phi-3.5-mini-instruct-q4f16_1-MLC",

      name:
        "Phi 3.5 Mini (Desktop Only)",

      sizeMb: 2200,

      recommendedFor: "HIGH",

      /*
        Não deixar Android tocar nisso ☢️
      */

      mobileSafe: false,

      minRamGB: 8,
    },
  ],
} as const;

/* =========================================================
   DEEP FREEZE
========================================================= */

Object.freeze(
  SYSTEM_CONFIG
);

Object.freeze(
  SYSTEM_CONFIG.LIMITS
);

Object.freeze(
  SYSTEM_CONFIG.LIMITS
    .LANGUAGES
);

Object.freeze(
  SYSTEM_CONFIG.LLM
);

Object.freeze(
  SYSTEM_CONFIG.LLM.MOBILE
);

Object.freeze(
  SYSTEM_CONFIG.CLEANUP
);

Object.freeze(
  SYSTEM_CONFIG.CLEANUP
    .MEMORY
);

Object.freeze(
  SYSTEM_CONFIG.QUEUE
);

SYSTEM_CONFIG.AVAILABLE_MODELS.forEach(
  (model) =>
    Object.freeze(model)
);

Object.freeze(
  SYSTEM_CONFIG.AVAILABLE_MODELS
);

export { SYSTEM_CONFIG };
