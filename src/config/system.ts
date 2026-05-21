// src/config/system.ts

export interface Model {
  model_id: string;
  model: string;
  model_lib: string;
  name: string;
  sizeMb: number;
  recommendedFor: "LOW" | "MID" | "HIGH";
}

const SYSTEM_CONFIG = {
  PORT: parseInt(process.env.PORT || "4000", 10),

  // PARÂMETROS DE RUNTIME (Docker / Sandbox de Execução)
  LIMITS: {
    memory_light: "256m",
    memory_heavy: "512m",
    cpus: "0.5",
    pidsLimit: 64,
    timeout: 15000, // Timeout geral em ms

    // Limites de memória específicos por linguagem
    LANGUAGES: {
      javascript: "128m",
      python: "192m",
      csharp: "384m",
    },
  },

  // PARÂMETROS DA LLM (Inferência Local / WebLLM)
  LLM: {
  context_window_size: 1536,
  sliding_window_size: 1024,
  attention_sink_size: 4,

  // 🔥 ADICIONA ISSO:
  MOBILE: {
    context_window_size: 768,
    sliding_window_size: 512,
  }
  },
  // PARÂMETROS DE CLEANUP (Limites físicos e controle de estado do app)
  CLEANUP: {
    MAX_EXPLANATIONS_TOTAL: 50, // Limite de explicações salvas/em cache por sessão
    MAX_ERRORS_TOTAL: 10, // Limite máximo de erros antes do soft-reset do container/worker
    MOBILE_BACKGROUND_TIMEOUT_MS: 120000, // 2 minutos para descarregar a VRAM no mobile
  },

  QUEUE: {
    maxConcurrent: 2,
  },

  AVAILABLE_MODELS: [
    {
      model_id: "Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
      model: "https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f32_1-MLC",
      model_lib: "",
      name: "Qwen 2.5 0.5B (Safe Mode)",
      sizeMb: 550,
      recommendedFor: "LOW",
    },
    {
      model_id: "Phi-3-mini-4k-instruct-q4f32_1-MLC",
      model: "https://huggingface.co/mlc-ai/Phi-3-mini-4k-instruct-q4f32_1-MLC",
      model_lib: "",
      name: "Phi 3 Mini (Safe Mode)",
      sizeMb: 1900,
      recommendedFor: "MID",
    },
    {
      model_id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
      model: "https://huggingface.co/mlc-ai/Phi-3.5-mini-instruct-q4f16_1-MLC",
      model_lib: "",
      name: "Phi 3.5 Mini",
      sizeMb: 2200,
      recommendedFor: "HIGH",
    },
  ],
} as const;

// Congelamento recursivo em tempo de execução para garantir imutabilidade absoluta
Object.freeze(SYSTEM_CONFIG);
Object.freeze(SYSTEM_CONFIG.LIMITS);
Object.freeze(SYSTEM_CONFIG.LIMITS.LANGUAGES);
Object.freeze(SYSTEM_CONFIG.LLM);
Object.freeze(SYSTEM_CONFIG.CLEANUP);
Object.freeze(SYSTEM_CONFIG.QUEUE);
SYSTEM_CONFIG.AVAILABLE_MODELS.forEach((model) => Object.freeze(model));
Object.freeze(SYSTEM_CONFIG.AVAILABLE_MODELS);

export { SYSTEM_CONFIG };
