"use client";
import { SandboxFile } from "@/components/SandboxEditor";

/**
 * Interface de Log detalhada para o Terminal
 */
export interface NeuralLog {
  type: 'info' | 'error' | 'warn' | 'system' | 'mem' | 'perf';
  timestamp: string;
  content: string;
  source?: string; // Nome do arquivo de origem do log
}

/**
 * Serializador avançado (Substitui o stringify do DevConsole)
 * Lida com referências circulares, elementos DOM, Funções e Datas.
 */
function neuralStringify(value: any, depth = 0): string {
  if (depth > 3) return "[Max Depth Reached]";
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "function") return `[Function: ${value.name || 'anonymous'}]`;
  if (value instanceof Error) return `${value.name}: ${value.message}\n${value.stack}`;
  if (value instanceof HTMLElement) return `<${value.tagName.toLowerCase()} />`;
  if (value instanceof Date) return value.toISOString();
  
  if (typeof value === "object") {
    try {
      // Evita travamento por referência circular
      return JSON.stringify(value, (key, val) => {
        if (typeof val === "function") return `[Function]`;
        if (val instanceof HTMLElement) return `[Element]`;
        return val;
      }, 2);
    } catch (e) {
      return `[Complex Object: ${Object.keys(value).join(', ')}]`;
    }
  }
  return String(value);
}

/**
 * ENGINE CENTRAL: bundleAndExecute
 */
export async function bundleAndExecute(
  mainFile: SandboxFile,
  allFiles: SandboxFile[],
  pushLog: (log: NeuralLog) => void
) {
  const startTime = performance.now();
  const fileMap = new Map(allFiles.map(f => [f.name, f.content]));

  // Função auxiliar para injetar logs no sistema
  const createNeuralLog = (type: NeuralLog['type'], args: any[], source = mainFile.name): NeuralLog => ({
    type,
    timestamp: new Date().toLocaleTimeString(),
    content: args.map(neuralStringify).join(' '),
    source
  });

  try {
    // 1. RESOLUÇÃO DE DEPENDÊNCIAS E TRANSPILAÇÃO VIRTUAL
    // Substitui imports relativos por Blobs (VFS - Virtual File System)
    let processedCode = mainFile.content;
    
    // Regex para capturar imports
    const importRegex = /import\s+(?:[\w\s{},*]+)\s+from\s+['"](.+?)['"]/g;
    
    // Mapeamento de arquivos para Blobs para permitir imports reais entre arquivos
    const blobUrls: string[] = [];
    
    processedCode = processedCode.replace(importRegex, (match, path) => {
      if (path.startsWith('./') || path.startsWith('../')) {
        const fileName = path.replace(/^\.\//, '').replace(/\.(ts|js)$/, '') + '.ts';
        const content = fileMap.get(fileName) || fileMap.get(fileName.replace('.ts', '.js'));
        
        if (content) {
          const blob = new Blob([content], { type: 'application/javascript' });
          const url = URL.createObjectURL(blob);
          blobUrls.push(url);
          return match.replace(path, url);
        }
        pushLog(createNeuralLog('warn', [`Module not found: ${path}. Checking external...`]));
      } 
      
      // Auto-import de bibliotecas externas via ESM.sh (CDN)
      if (!path.startsWith('http') && !path.startsWith('.')) {
        return match.replace(path, `https://esm.sh/${path}`);
      }
      return match;
    });

    // 2. CONSTRUÇÃO DO AMBIENTE DE EXECUÇÃO (SANDBOX)
    const script = document.createElement('script');
    script.type = 'module';
    
    // Injeção de Hooks de monitoramento global dentro do script
    script.textContent = `
      // Hook de Console
      const console = {
        log: (...args) => window._neuralDispatch('info', args),
        error: (...args) => window._neuralDispatch('error', args),
        warn: (...args) => window._neuralDispatch('warn', args),
        info: (...args) => window._neuralDispatch('info', args),
        debug: (...args) => window._neuralDispatch('info', args),
      };

      // Captura de Erros Assíncronos (setTimeout, Promises, etc)
      window.addEventListener('error', (e) => {
        window._neuralDispatch('error', [e.message, e.error?.stack]);
      });

      window.addEventListener('unhandledrejection', (e) => {
        window._neuralDispatch('error', ['Unhandled Promise:', e.reason]);
      });

      // Monitor de Memória Local
      const memCheck = () => {
        if (performance.memory) {
          const used = Math.round(performance.memory.usedJSHeapSize / 1048576);
          window._neuralDispatch('mem', ['Heap Usage:', used + 'MB']);
        }
      };
      const memInterval = setInterval(memCheck, 2000);

      try {
        ${processedCode}
        
        // Sucesso na execução síncrona
        const duration = (performance.now() - ${startTime}).toFixed(2);
        window._neuralDispatch('perf', ['Execution finished in ' + duration + 'ms']);
      } catch (err) {
        window._neuralDispatch('error', [err]);
      } finally {
        // clearInterval(memInterval); // Opcional: manter monitorando
      }
    `;

    // 3. COMUNICAÇÃO ENTRE SANDBOX E UI
    (window as any)._neuralDispatch = (type: NeuralLog['type'], args: any[]) => {
      pushLog(createNeuralLog(type, args));
    };

    // Execução
    document.body.appendChild(script);

    // Limpeza de Blobs e Scripts para evitar vazamento de memória
    setTimeout(() => {
      if (document.body.contains(script)) document.body.removeChild(script);
      blobUrls.forEach(url => URL.revokeObjectURL(url));
    }, 1000);

  } catch (err: any) {
    pushLog(createNeuralLog('error', ['Bundler Critical Error:', err.message]));
  }
}