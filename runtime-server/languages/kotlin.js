const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const { v4: uuidv4 } = require("uuid");
const CONFIG = require("../config");

const execPromise = promisify(exec);

module.exports = async function runKotlin(code) {
  const id = uuidv4();
  const tempDir = path.resolve(__dirname, `../temp-kotlin-${id}`);

  try {
    fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, "Main.kt");
    fs.writeFileSync(filePath, code);

    const command = `docker run --rm \
--memory="${CONFIG.LIMITS.memory_heavy}" \
--cpus="${CONFIG.LIMITS.cpus}" \
--pids-limit=${CONFIG.LIMITS.pidsLimit} \
--network none \
-v "${tempDir}:/app" \
-w /app \
gradle:8.7-jdk21 \
sh -c "kotlinc Main.kt -include-runtime -d main.jar && java -jar main.jar"`;

    const { stdout, stderr } = await execPromise(command, { timeout: CONFIG.LIMITS.timeout });

    if (stderr && !stdout) {
      throw new Error(stderr);
    }
    return stdout;
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};