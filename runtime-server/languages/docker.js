// docker.js
const { exec } = require("child_process");
const CONFIG = require("./config"); // Importa seu config para puxar o timeout de lá

function runDocker(command) {
  let childProcess;

  // Garante que qualquer comando "docker run" enviado possua o isolamento de rede ativo
  // Isso previne brechas caso alguma linguagem esqueça de adicionar a flag.
  let secureCommand = command;
  if (secureCommand.includes("docker run") && !secureCommand.includes("--network")) {
    secureCommand = secureCommand.replace("docker run", "docker run --network none");
  }

  const promise = new Promise((resolve, reject) => {
    // Usando o timeout centralizado do seu CONFIG
    // Adicionado killSignal para garantir a destruição imediata do container em caso de timeout
    childProcess = exec(secureCommand, { 
      timeout: CONFIG.LIMITS.timeout,
      killSignal: "SIGKILL" 
    });

    let stdoutData = "";
    let stderrData = "";

    childProcess.stdout.on("data", data => { stdoutData += data; });
    childProcess.stderr.on("data", data => { stderrData += data; });

    childProcess.on("close", (code, signal) => {
      // Se o processo foi morto por timeout, o signal será 'SIGKILL'
      if (signal === "SIGKILL") {
        return reject(new Error(`Timeout de Execução: O código excedeu o limite de ${CONFIG.LIMITS.timeout / 1000} segundos.`));
      }

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