// runtime-server/languages/docker.js
const Docker = require('dockerode');
const docker = new Docker();
const fs = require('fs');
const path = require('path');

// Carrega a configuração de linguagens de forma segura
const languagesPath = path.join(__dirname, 'languages.json');
const languages = JSON.parse(fs.readFileSync(languagesPath, 'utf8'));

/**
 * Faz o pull da imagem apenas se necessário ou se falhar silenciosamente
 */
async function pullImage(imageName) {
    try {
        const images = await docker.listImages({ filter: imageName });
        if (images.length > 0) return; // Imagem já presente

        console.log(`Pulling image: ${imageName}...`);
        const stream = await docker.pull(imageName);
        return new Promise((resolve, reject) => {
            docker.modem.followProgress(stream, (err, res) => err ? reject(err) : resolve(res));
        });
    } catch (err) {
        console.error(`Erro ao fazer pull da imagem ${imageName}:`, err);
    }
}

async function runDocker(language, codeSnippet) {
    const config = languages[language];
    if (!config) throw new Error(`Linguagem '${language}' não suportada.`);

    // 1. Garantir que a imagem exista
    await pullImage(config.image);

    // 2. Comando seguro
    const escapedCode = codeSnippet.replace(/'/g, "'\\''");
    
    // 3. Container com limites de segurança (CPU/Memória)
    const container = await docker.createContainer({
        Image: config.image,
        Cmd: ['sh', '-c', `${config.runCmd} '${escapedCode}'`],
        Tty: false,
        HostConfig: {
            AutoRemove: true,
            Memory: 128 * 1024 * 1024, // 128MB
            CpuQuota: 50000,           // 50% de 1 core (limita o consumo)
        },
    });

    try {
        await container.start();

        // 4. Captura e Decodificação de Logs (Remove o header binário do Docker)
        const stream = await container.logs({ follow: true, stdout: true, stderr: true });
        
        return new Promise((resolve, reject) => {
            let output = "";
            stream.on("data", (chunk) => {
                // Remove os headers de stream (8 bytes iniciais de cada frame do Docker)
                output += chunk.slice(8).toString('utf8');
            });
            stream.on("end", () => resolve(output.trim()));
            stream.on("error", reject);
        });
    } catch (error) {
        throw new Error(`Falha na execução do container: ${error.message}`);
    }
}

module.exports = { runDocker };