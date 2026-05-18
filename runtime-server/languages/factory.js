// languages/factory.js
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
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

  // Cria o ID único para a Sandbox desta execução específica
  const id = uuidv4();
  const tempDir = path.resolve(
    __dirname,
    `../temp-${language.toLowerCase()}-${id}`,
  );

  // Garante que a pasta temporária isolada exista no disco do container
  fs.mkdirSync(tempDir, { recursive: true });

  // Se for padrão de Linha de Comando direta (Interpretadas locais/runtimes simples)
  if (meta.type === "cli") {
    const escaped = escapeCode(code, meta.escapeBacktick);
    const command = meta.cmd(escaped);
    return { command, tempDir };
  }

  // Se for padrão que exige compilação (C++, C#, Java, Go, Rust...)
  if (meta.type === "temp") {
    const filePath = path.join(tempDir, meta.ext);
    fs.writeFileSync(filePath, code);

    // O comando roda de forma isolada dentro da pasta que acabamos de criar
    // Exemplo: cd /app/temp-cpp-123 && g++ main.cpp -o main && ./main
    const command = `cd "${tempDir}" && ${meta.cmd}`;

    return { command, tempDir };
  }
}

module.exports = { buildRuntime };
