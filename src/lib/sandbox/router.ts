import { ExecutionRoute } from "./engines";

export interface Executor {
  run(input: any, signal?: AbortSignal): Promise<any>;
}

export class ExecutionRouter {
  constructor(
    private executors: Record<ExecutionRoute, Executor>
  ) {}

  resolve(route: ExecutionRoute): Executor {
    const executor = this.executors[route];

    if (!executor) {
      throw new Error(`No executor for route: ${route}`);
    }

    return executor;
  }
}