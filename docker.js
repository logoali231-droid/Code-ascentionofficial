// docker.js
const { exec } = require("child_process");
const CONFIG = require("./config"); // Importa seu config para puxar o timeout de lá

function runDocker(command) {
  let childProcess;

  const promise = new Promise((resolve, reject) => {
    // Usando o timeout centralizado do seu CONFIG
    childProcess = exec(command, { timeout: CONFIG.LIMITS.timeout });

    let stdoutData = "";
    let stderrData = "";

    childProcess.stdout.on("data", data => { stdoutData += data; });
    childProcess.stderr.on("data", data => { stderrData += data; });

    childProcess.on("close", code => {
      if (code === 0 || code === null) {
        resolve(stdoutData);
      } else {
        reject(new Error(stderrData.trim() || `Processo falhou com código ${code}`));
      }
    });

    childProcess.on("error", reject);
  });

  return { promise, kill: () => { if (childProcess) childProcess.kill("SIGKILL"); } };
}

module.exports = { runDocker };