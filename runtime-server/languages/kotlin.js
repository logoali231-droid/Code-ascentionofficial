const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const CONFIG = require("../config");

function setupKotlin(code) {
  const id = uuidv4();
  const tempDir = path.resolve(__dirname, `../temp-kotlin-${id}`);

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

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

  // Devolve o comando e a pasta para o gerenciador do WS controlar
  return { command, tempDir };
}

module.exports = { setupKotlin };