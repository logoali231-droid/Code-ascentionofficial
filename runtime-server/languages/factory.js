// runtime-server/languages/factory.js
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

async function buildRuntime(language, code) {
  // 1. Carregamento Dinâmico (Plugin-based)
  // Isso remove a necessidade de importar meta.js manualmente
  const langModule = require(`./${language.toLowerCase()}.js`);
  
  const id = uuidv4();
  const tempDir = path.resolve(__dirname, `../temp-${language}-${id}`);
  fs.mkdirSync(tempDir, { recursive: true });

  // 2. Execução Polimórfica
  // O factory não sabe o que está acontecendo dentro, apenas chama o contrato.
  let command;
  if (langModule.type === "cli") {
     const escaped = escapeCode(code); // Sua função utilitária
     command = langModule.buildCommand(escaped);
  } else if (langModule.type === "temp") {
     const filePath = path.join(tempDir, langModule.ext || 'main.code');
     fs.writeFileSync(filePath, code);
     command = langModule.buildCommand(tempDir);
  }

  return { command, tempDir };
}
