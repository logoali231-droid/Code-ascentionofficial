// docker.js
const { exec } = require("child_process");
const CONFIG = require("./config");

function runDocker(command) {
  let childProcess;

  const promise = new Promise((resolve, reject) => {
    // Executa o comando diretamente no container Linux da Azure
    childProcess = exec(command, {
      timeout: CONFIG.LIMITS.timeout,
      killSignal: "SIGKILL",
    });

    let stdoutData = "";
    let stderrData = "";

    childProcess.stdout.on("data", (data) => {
      stdoutData += data;
    });
    childProcess.stderr.on("data", (data) => {
      stderrData += data;
    });

    childProcess.on("close", (code, signal) => {
      if (signal === "SIGKILL") {
        return reject(
          new Error(
            `Timeout de Execução: O código excedeu o limite de ${CONFIG.LIMITS.timeout / 1000} segundos.`,
          ),
        );
      }

      if (code === 0 || code === null) {
        resolve(stdoutData);
      } else {
        // Retorna o erro de compilação/execução estruturado para o aluno aprender
        reject(
          new Error(stderrData.trim() || `Processo falhou com código ${code}`),
        );
      }
    });

    childProcess.on("error", reject);
  });

  return {
    promise,
    kill: () => {
      if (childProcess) childProcess.kill("SIGKILL");
    },
  };
}

module.exports = { runDocker };
