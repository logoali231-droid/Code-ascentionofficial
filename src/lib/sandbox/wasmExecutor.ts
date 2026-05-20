export class WasmExecutor implements IEngineExecutor {
  async execute(code: string, language: string) {
    return runWasm(code, language);
  }
}
