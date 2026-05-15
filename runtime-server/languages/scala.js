const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const util = require("util");
const execPromise = util.promisify(exec);

module.exports = async function runScala(code) {
  const executionId = uuidv4();
  const tempDir = path.resolve(__dirname, `../temp-scala-${executionId}`);

  try {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const filePath = path.join(tempDir, "Main.scala");
    fs.writeFileSync(filePath, code);

    const command = `
docker run --rm \
--memory="256m" \
--cpus="0.5" \
--pids-limit=64 \
--network none \
--read-only \
-v "${tempDir}:/app" \
-w /app \
sbtscala/scala-sbt \
sh -c "scalac Main.scala && scala Main"
`;

    const { stdout } = await execPromise(command, { timeout: 15000 });
    return stdout;

  } catch (error) {
    throw new Error(error.stderr || error.message);
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
};