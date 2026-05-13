// src/lib/sandbox.worker.ts
import { SandboxFile } from "@/components/SandboxEditor";

/**
 * Worker dedicado para processamento pesado do Sandbox Neural.
 * Evita bloqueio da UI durante o "bundling" de arquivos virtuais.
 */
self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data;

  if (type === "BUNDLE_FILES") {
    try {
      const { mainFile, allFiles } = payload;
      
      // Simula a lógica de resolução de dependências
      const fileMap = new Map<string, string>(
        allFiles.map((f: SandboxFile) => [f.name, f.content])
      );

      let bundledCode = mainFile.content;

      // Regex para simular imports locais no sandbox
      const importRegex = /import\s+.*\s+from\s+['"]\.\/(.*)['"]/g;
      
      // Tipagem explícita adicionada aqui: (match: string, fileName: string)
      bundledCode = bundledCode.replace(importRegex, (match: string, fileName: string) => {
        const nameWithExt = fileName.endsWith('.ts') ? fileName : `${fileName}.ts`;
        const content = fileMap.get(nameWithExt) || fileMap.get(fileName);
        return content ? `/* inline ${fileName} */\n${content}` : match;
      });

      self.postMessage({ 
        type: "BUNDLE_READY", 
        payload: { code: bundledCode } 
      });
    } catch (error: any) {
      self.postMessage({ type: "ERROR", payload: error.message });
    }
  }
};