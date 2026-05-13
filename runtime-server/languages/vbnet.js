const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const util = require("util");
const execPromise = util.promisify(exec);

module.exports = async function runVBNet(code) {
  const executionId = uuidv4();
  const tempDir = path.resolve(__dirname, `../temp-vb-${executionId}`);

  try {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    // 1. Criar o projeto VB de forma isolada dentro do container
    await execPromise(`docker run --rm -v "${tempDir}:/src" mcr.microsoft.com/dotnet/sdk:8.0 bash -c "cd /src && dotnet new console -lang VB -o VBApp"`);

    const filePath = path.join(tempDir, "VBApp", "Program.vb");
    fs.writeFileSync(filePath, code);

    // 2. Executar o código com limites de recursos
    const command = `docker run --rm --memory="256m" --cpus="0.5" --network none -v "${tempDir}:/src" -w /src/VBApp mcr.microsoft.com/dotnet/sdk:8.0 dotnet run`;

    const { stdout } = await execPromise(command, { timeout: 15000 });
    return stdout;

  } catch (error) {
    throw new Error(error.stderr || error.message);
  } finally {
    // 3. Limpeza: Remove a pasta temporária para poupar espaço
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
};