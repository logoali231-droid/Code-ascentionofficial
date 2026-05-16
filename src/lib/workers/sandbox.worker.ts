import { SandboxFile } from "@/components/SandboxEditor";

/**
 * Worker otimizado para o Samsung M23 com suporte a Cancelamento Ativo.
 * Limpa referências de memória imediatamente após o processamento ou interrupção.
 */

let isAborted = false;

self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  // Intercepta o sinal de aborto da Runtime Queue / SandboxRunner
  if (type === "ABORT") {
    console.log("[Sandbox Worker] Operação cancelada ativamente pelo usuário.");
    isAborted = true;
    return;
  }

  if (type === "BUNDLE_FILES") {
    isAborted = false; // Reseta o estado para o novo empacotamento
    
    try {
      const { mainFile, allFiles } = payload;
      
      if (isAborted) return; // Checkpoint inicial

      let fileMap: Map<string, string> | null = new Map<string, string>(
        allFiles.map((f: SandboxFile) => [f.name, f.content])
      );

      let bundledCode = mainFile.content;
      const importRegex = /import\s+.*\s+from\s+['"]\.\/(.*)['"]/g;
      
      // Resolução e inlining dos arquivos locais
      bundledCode = bundledCode.replace(importRegex, (match: string, fileName: string) => {
        if (isAborted) return ""; // Corta o processamento se o sinal disparou no meio do replace

        const nameWithExt = fileName.endsWith('.ts') ? fileName : `${fileName}.ts`;
        const content = fileMap?.get(nameWithExt) || fileMap?.get(fileName);
        return content ? `/* inline ${fileName} */\n${content}` : match;
      });

      // Checkpoint final antes de emitir o sucesso para a Main Thread
      if (isAborted) {
        console.warn("[Sandbox Worker] Código empacotado descartado devido a aborto ativo.");
        if (fileMap) fileMap.clear();
        fileMap = null;
        bundledCode = "";
        return;
      }

      self.postMessage({ type: "BUNDLE_READY", payload: { code: bundledCode } });
      
      // Limpeza agressiva de RAM pós-bundle com sucesso
      fileMap.clear();
      fileMap = null;
      bundledCode = ""; 
    } catch (error: any) {
      if (isAborted) return; // Suprime erros se a operação foi abortada intencionalmente

      self.postMessage({ type: "ERROR", payload: error.message });
    }
  }
};