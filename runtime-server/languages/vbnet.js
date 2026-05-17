const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const util = require("util");
const CONFIG = require("./config");
const execPromise = util.promisify(exec);

module.exports = async function runVBNet(code) {
  const executionId = uuidv4();
  const tempDir = path.resolve(__dirname, `../temp-vb-${executionId}`);

  try {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    // Isolamento na criação do boilerplate
    await execPromise(`docker run --rm -v "${tempDir}:/src" mcr.microsoft.com/dotnet/sdk:8.0 bash -c "cd /src && dotnet new console -lang VB -o VBApp"`);

    const filePath = path.join(tempDir, "VBApp", "Program.vb");
    fs.writeFileSync(filePath, code);

    const command = `docker run --rm \
--memory="${CONFIG.LIMITS.memory_light}" \
--cpus="${CONFIG.LIMITS.cpus}" \
--pids-limit=${CONFIG.LIMITS.pidsLimit} \
--network none \
-v "${tempDir}:/src" \
-w /src/VBApp \
mcr.microsoft.com/dotnet/sdk:8.0 \
dotnet run`;

    const { stdout } = await execPromise(command, { timeout: CONFIG.LIMITS.timeout });
    return stdout;
  } catch (error) {
    throw new Error(error.stderr || error.message);
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
};