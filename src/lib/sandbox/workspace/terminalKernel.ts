type CommandHandler = (
  args: string[],
) => Promise<string>;

export class TerminalKernel {
  private cwd = "/";

  private commands =
    new Map<string, CommandHandler>();

  register(
    name: string,
    handler: CommandHandler,
  ) {
    this.commands.set(name, handler);
  }

  async execute(input: string) {
    const [cmd, ...args] =
      input.split(" ");

    const handler =
      this.commands.get(cmd);

    if (!handler) {
      return `command not found: ${cmd}`;
    }

    return await handler(args);
  }

  getCwd() {
    return this.cwd;
  }

  setCwd(path: string) {
    this.cwd = path;
  }
}