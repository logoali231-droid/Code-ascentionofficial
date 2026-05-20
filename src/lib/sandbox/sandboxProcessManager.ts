export type ProcessStatus =
  | "running"
  | "stopped"
  | "crashed";

export class SandboxProcess {
  pid: number;

  language: string;

  status: ProcessStatus;

  logs: string[];

  startedAt: number;

  constructor(
    pid: number,
    language: string,
  ) {
    this.pid = pid;

    this.language = language;

    this.status = "running";

    this.logs = [];

    this.startedAt = Date.now();
  }

  pushLog(message: string) {
    this.logs.push(message);
  }

  stop() {
    this.status = "stopped";
  }

  crash(error: string) {
    this.status = "crashed";

    this.logs.push(
      `[CRASH] ${error}`,
    );
  }
}

export class SandboxProcessManager {
  private processes =
    new Map<number, SandboxProcess>();

  private nextPid = 1;

  createProcess(
    language: string,
  ) {
    const process =
      new SandboxProcess(
        this.nextPid++,
        language,
      );

    this.processes.set(
      process.pid,
      process,
    );

    return process;
  }

  getProcess(pid: number) {
    return this.processes.get(pid);
  }

  getAllProcesses() {
    return Array.from(
      this.processes.values(),
    );
  }

  killProcess(pid: number) {
    const process =
      this.processes.get(pid);

    if (!process) {
      return false;
    }

    process.stop();

    this.processes.delete(pid);

    return true;
  }
}

export const sandboxProcessManager =
  new SandboxProcessManager();