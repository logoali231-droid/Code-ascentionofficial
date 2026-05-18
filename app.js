import { runDocker } from "./docker.js";

// Esse comando diz ao Docker: "Rode o code-ascension, mas tire a rede,
// tire os privilégios, use o usuário 1000, limite chamadas de kernel e não deixe ninguém alterar os arquivos".
const comandoHardening = `
  docker run -d \
    --name container_cyber \
    --read-only \
    --cap-drop=ALL \
    --user 1000:1000 \
    --security-opt=no-new-privileges \
    --security-opt seccomp=builtin \
    --network none \
    code-ascension
`
  .trim()
  .replace(/\s+/g, " ");

async function rodarComSeguranca() {
  console.log("🔒 Aplicando Hardening e iniciando o container...");

  const resultado = await runDocker(comandoHardening);

  if (resultado.code === 0) {
    console.log("✅ Container iniciado com sucesso!");
    console.log("ID do Container:", resultado.output.trim());
  } else {
    console.error("❌ Erro ao iniciar o container:", resultado.error);
  }
}

rodarComSeguranca();
