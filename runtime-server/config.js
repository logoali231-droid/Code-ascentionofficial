// config.js
const CONFIG = {
  PORT: 4000,
  LIMITS: {
    memory_light: "256m",
    memory_heavy: "512m", // Kotlin / Java precisam de mais fôlego no JRE
    cpus: "0.5",
    pidsLimit: 64,
    timeout: 15000 // 15 segundos max por execução
  },
  QUEUE: {
    maxConcurrent: 2
  }
};

module.exports = CONFIG;