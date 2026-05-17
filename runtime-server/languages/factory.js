// languages/factory.js
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const CONFIG = require("./config.js");
const { LANGUAGE_METADATA } = require("./meta.js");

function escapeCode(code, escapeBacktick = false) {
  let escaped = code
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$");
  if (escapeBacktick) {
    escaped = escaped.replace(/`/g, "\\`");
  }
  return escaped;
}

function buildRuntime(language, code) {
  const meta = LANGUAGE_METADATA[language.toLowerCase()];
  
  if (!meta) {
    throw new Error(`Unsupported language engine: ${language}`);
  }

  const memoryLimit = meta.memory === "heavy" ? CONFIG.LIMITS.memory_heavy : CONFIG.LIMITS.memory_light;

  // Se for padrão de Linha de Comando direta (Interpretadas)
  if (meta.type === "cli") {
    const escaped = escapeCode(code, meta.escapeBacktick);
    const innerCmd = meta.cmd(escaped);
    
    const command = `docker run --rm \
--memory="${memoryLimit}" \
--cpus="${CONFIG.LIMITS.cpus}" \
--pids-limit=${CONFIG.LIMITS.pidsLimit} \
--network none \
${meta.image} \
${innerCmd}`;

    return { command, tempDir: null };
  }

  // Se for padrão que exige compilação ou arquivos em disco
  if (meta.type === "temp") {
    const id = uuidv4();
    const tempDir = path.resolve(__dirname, `../temp-${language.toLowerCase()}-${id}`);

    fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, meta.ext);
    fs.writeFileSync(filePath, code);

    const command = `docker run --rm \
--memory="${memoryLimit}" \
--cpus="${CONFIG.LIMITS.cpus}" \
--pids-limit=${CONFIG.LIMITS.pidsLimit} \
--network none \
-v "${tempDir}:/app" \
-w /app \
${meta.image} \
sh -c "${meta.cmd}"`;

    return { command, tempDir };
  }
}

module.exports = { buildRuntime };