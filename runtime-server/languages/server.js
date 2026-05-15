// server.js
const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

const CONFIG = require("./config");
const { enqueue } = require("./queue");
const { validateCode } = require("./security");

// Importando os runners das linguagens
const runKotlin = require("./languages/kotlin");
const runScala = require("./languages/scala");
const runVBNet = require("./languages/vbnet");
const { createNodeCommand } = require("./languages/node");
const { createPythonCommand } = require("./languages/python");
const { createPHPCommand } = require("./languages/php");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  exec("docker info", (error) => {
    res.json({
      server: "online",
      docker: !error,
      timestamp: new Date().toISOString()
    });
  });
});

app.post("/run", async (req, res) => {
  const { language, code } = req.body;

  try {
    if (!language || !code) throw new Error("Missing language or code");

    // Passa pelo escudo anti-exploit estático primeiro
    validateCode(code);

    const langKey = language.toLowerCase();

    // Enfileira a tarefa para execução controlada
    const output = await enqueue(async () => {
      switch (langKey) {
        case "scala":
          return await runScala(code);

        case "vbnet":
        case "vb":
          return await runVBNet(code);

        case "kotlin":
        case "kt":
          return await runKotlin(code);

        case "node":
        case "javascript":
        case "js": {
          const cmd = createNodeCommand(code);
          const { stdout } = await execPromise(cmd, { timeout: CONFIG.LIMITS.timeout });
          return stdout;
        }

        case "python":
        case "py": {
          const cmd = createPythonCommand(code);
          const { stdout } = await execPromise(cmd, { timeout: CONFIG.LIMITS.timeout });
          return stdout;
        }

        case "php": {
          const cmd = createPHPCommand(code);
          const { stdout } = await execPromise(cmd, { timeout: CONFIG.LIMITS.timeout });
          return stdout;
        }

        default:
          throw new Error(`Unsupported language: ${language}`);
      }
    });

    res.json({ success: true, output });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || "Erro interno na execução do código."
    });
  }
});

app.listen(CONFIG.PORT, () => {
  console.log(`⚡ Code Ascension Runtime rodando na porta ${CONFIG.PORT}`);
});