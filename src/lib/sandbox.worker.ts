import { SandboxFile } from "@/components/SandboxEditor";

/**
 * Worker otimizado para o Samsung M23.
 * Limpa referências de memória imediatamente após o processamento.
 */
self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === "BUNDLE_FILES") {
    try {
      const { mainFile, allFiles } = payload;
      
      let fileMap: Map<string, string> | null = new Map<string, string>(
        allFiles.map((f: SandboxFile) => [f.name, f.content])
      );

      let bundledCode = mainFile.content;
      const importRegex = /import\s+.*\s+from\s+['"]\.\/(.*)['"]/g;
      
      bundledCode = bundledCode.replace(importRegex, (match: string, fileName: string) => {
        const nameWithExt = fileName.endsWith('.ts') ? fileName : `${fileName}.ts`;
        const content = fileMap?.get(nameWithExt) || fileMap?.get(fileName);
        return content ? `/* inline ${fileName} */\n${content}` : match;
      });

      self.postMessage({ type: "BUNDLE_READY", payload: { code: bundledCode } });
      
      // Limpeza agressiva de RAM pós-bundle
      fileMap.clear();
      fileMap = null;
      bundledCode = ""; 
    } catch (error: any) {
      self.postMessage({ type: "ERROR", payload: error.message });
    }
  }
};