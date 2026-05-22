// server.js
const express = require("express");
const cors = require("cors");
const { exec } = require("child_process");
const fs = require("fs");

const CONFIG = require("./config.js");
const { enqueue } = require("./queue.js");
const { validateCode } = require("./security.js");
const { runDocker } = require("./docker.js");
const { buildRuntime } = require("./factory.js");

const app = express();

// Injeta o suporte a WebSockets dentro do app Express
const expressWs = require("express-ws")(app);



app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Health Check HTTP básico
app.get("/health", (_req, res) => {
  exec("docker info", (error) => {
    res.json({
      server: "online",
      docker: !error,
      timestamp: new Date().toISOString(),
    });
  });
});

// --- GATEWAY WEBSAOCKET (SANDBOX CORE) ---
app.ws("/", (ws) => {
  console.log("🔌 [WS] Nova instância de execução conectada via PWA.");

  let currentExecution = null;
  let activeTempDir = null; // Rastreia o diretório físico da execução atual

  // Centralizador de limpeza estrita para evitar vazamentos (Aba fechada / Abort)
  const cleanActiveResources = () => {
    if (currentExecution) {
      console.log("🛑 [DOCKER] Derrubando container ativo imediatamente.");
      currentExecution.kill();
      currentExecution = null;
    }
    if (activeTempDir && fs.existsSync(activeTempDir)) {
      console.log(`📁 [DISK] Removendo diretório temporário: ${activeTempDir}`);
      fs.rmSync(activeTempDir, { recursive: true, force: true });
      activeTempDir = null;
    }
  };

  ws.on("message", async (msg) => {
    try {
      const data = JSON.parse(msg);

      // --- CENÁRIO A: ORDEM DE EXECUÇÃO ---
      if (data.type === "execute") {
        const { language, code } = data;

        if (!language || !code) {
          return ws.send(
            JSON.stringify({
              success: false,
              error: "Missing language or code",
            }),
          );
        }

        validateCode(code);
        const langKey = language.toLowerCase();

        // Enfileira a tarefa na fila controlada concorrente
        await enqueue(async () => {
          try {
            const { command, tempDir } = buildRuntime(langKey, code);

            activeTempDir = tempDir;

            if (command) {
              // Chama o executor do docker.js integrado por CommonJS
              currentExecution = runDocker(command);
              const stdout = await currentExecution.promise;

              ws.send(JSON.stringify({ success: true, output: [stdout] }));
            }
          } catch (execErr) {
            const isAborted =
              execErr.signal === "SIGKILL" ||
              (execErr.message && execErr.message.includes("null"));
            ws.send(
              JSON.stringify({
                success: false,
                error: isAborted
                  ? "[SYSTEM] Processamento interrompido: Container destruído pelo usuário."
                  : execErr.message,
              }),
            );
          } finally {
            cleanActiveResources();
          }
        });
      }

      // --- CENÁRIO B: CANCELAMENTO ATIVO (ABORT) ---
      if (data.type === "abort") {
        cleanActiveResources();
      }
    } catch (err) {
      ws.send(
        JSON.stringify({
          success: false,
          error: "Erro de parseamento do payload interno.",
        }),
      );
    }
  });

  ws.on("close", () => {
    console.log(
      "⚠️ [WS] Conexão encerrada pelo cliente. Limpando possíveis resíduos.",
    );
    cleanActiveResources();
  });
});

app.listen(3001, "0.0.0.0", () => {
  console.log("runtime online");
});
