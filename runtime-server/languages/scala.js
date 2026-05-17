const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const CONFIG = require("./config");

function setupScala(code) {
  const executionId = uuidv4();
  const tempDir = path.resolve(__dirname, `../temp-scala-${executionId}`);

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const filePath = path.join(tempDir, "Main.scala");
  fs.writeFileSync(filePath, code);

  const command = `docker run --rm \
--memory="${CONFIG.LIMITS.memory_light}" \
--cpus="${CONFIG.LIMITS.cpus}" \
--pids-limit=${CONFIG.LIMITS.pidsLimit} \
--network none \
-v "${tempDir}:/app" \
-w /app \
sbtscala/scala-sbt \
sh -c "scalac Main.scala && scala Main"`;

  // Retorna as instruções para o servidor controlar a execução física
  return { command, tempDir };
}

module.exports = { setupScala };