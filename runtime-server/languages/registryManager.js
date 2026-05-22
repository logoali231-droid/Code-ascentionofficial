import { get } from 'axios'; 

let cachedLanguages = {};

const REGISTRY_URL = "https://raw.githubusercontent.com/Logoali231/repo/main/languages.json";

async function updateRegistry() {
    try {
        const response = await get(REGISTRY_URL, { timeout: 5000 });
        cachedLanguages = response.data;
        console.log("✅ Registro de linguagens atualizado com sucesso.");
    } catch (error) {
        console.error("❌ Falha ao buscar registry, usando fallback local:", error);
        // Opcional: manter um arquivo fallback local caso a rede falhe
    }
}

function getLanguageConfig(language) {
    return cachedLanguages[language];
}

export default { updateRegistry, getLanguageConfig };