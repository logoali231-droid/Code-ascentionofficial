// Estado persistido em tempo de execução do Shell Control
let currentPath: string[] = []; // Array de diretórios que representa o PWD relativo do terminal

export const terminalCommands = {
  /**
   * PWD: Print Working Directory
   */
  pwd: async (): Promise<string> => {
    return `/${currentPath.join('/')}`;
  },

  /**
   * LS: List files and directories do handle atual do OPFS
   */
  ls: async (): Promise<string> => {
    try {
      const root = await navigator.storage.getDirectory();
      let currentHandle = root;

      // Navega de forma recursiva até o diretório atual do Shell
      for (const dir of currentPath) {
        currentHandle = await currentHandle.getDirectoryHandle(dir);
      }

      const entries: string[] = [];
      // Iteração assíncrona oficial da especificação FileSystemDirectoryHandle
      for await (const [name, handle] of currentHandle.entries()) {
        const indicator = handle.kind === 'directory' ? '/' : '';
        entries.push(`${name}${indicator}`);
      }

      return entries.length > 0 ? entries.join('\n') : '(diretório vazio)';
    } catch (error: any) {
      return `ls: erro ao ler o diretório: ${error.message}`;
    }
  },

  /**
   * CD: Change Directory com caminhos absolutos ou relativos
   */
  cd: async (args: string[]): Promise<string> => {
    const target = args[0];
    if (!target || target === '~') {
      currentPath = [];
      return '';
    }

    if (target === '..') {
      if (currentPath.length > 0) currentPath.pop();
      return '';
    }

    const segments = target.split('/').filter(p => p.length > 0);
    const initialPath = target.startsWith('/') ? [] : [...currentPath];
    const testPath = [...initialPath, ...segments];

    try {
      const root = await navigator.storage.getDirectory();
      let currentHandle = root;

      // Valida se o caminho de destino existe fisicamente no OPFS antes de mudar o estado
      for (const dir of testPath) {
        currentHandle = await currentHandle.getDirectoryHandle(dir);
      }

      currentPath = testPath;
      return '';
    } catch {
      return `cd: o diretório não existe: ${target}`;
    }
  },

  /**
   * MKDIR: Cria pastas nativas no OPFS
   */
  mkdir: async (args: string[]): Promise<string> => {
    const folderName = args[0];
    if (!folderName) return 'mkdir: informe o nome do diretório';

    try {
      const root = await navigator.storage.getDirectory();
      let currentHandle = root;

      for (const dir of currentPath) {
        currentHandle = await currentHandle.getDirectoryHandle(dir);
      }

      // Cria a pasta física ativando a flag create
      await currentHandle.getDirectoryHandle(folderName, { create: true });
      return '';
    } catch (error: any) {
      return `mkdir: falha ao criar diretório: ${error.message}`;
    }
  },

  /**
   * CAT: Lê o conteúdo binário de um arquivo convertido em UTF-8 texto
   */
  cat: async (args: string[]): Promise<string> => {
    const fileName = args[0];
    if (!fileName) return 'cat: informe o nome do arquivo';

    try {
      const root = await navigator.storage.getDirectory();
      let currentHandle = root;

      for (const dir of currentPath) {
        currentHandle = await currentHandle.getDirectoryHandle(dir);
      }

      const fileHandle = await currentHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const content = await file.text();
      return content;
    } catch (error: any) {
      return `cat: ${fileName}: não foi possível ler o arquivo`;
    }
  },

  /**
   * RM: Remove arquivos ou pastas recursivamente
   */
  rm: async (args: string[]): Promise<string> => {
    const targetName = args[0];
    if (!targetName) return 'rm: informe o alvo';

    try {
      const root = await navigator.storage.getDirectory();
      let currentHandle = root;

      for (const dir of currentPath) {
        currentHandle = await currentHandle.getDirectoryHandle(dir);
      }

      await currentHandle.removeEntry(targetName, { recursive: true });
      return '';
    } catch (error: any) {
      return `rm: falha ao deletar ${targetName}: ${error.message}`;
    }
  }
};