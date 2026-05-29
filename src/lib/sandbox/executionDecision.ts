import { SandboxInput, ExecutionRoute } from "./engines";

export interface ExecutionDecision {
  route: ExecutionRoute;
}

export class ExecutionPolicyEngine {
  decide(input: SandboxInput): ExecutionDecision {
    const code = input.code;

    const complexity =
      (code.includes("while") ? 0.2 : 0) +
      (code.length > 2000 ? 0.3 : 0) +
      (code.includes("worker") ? 0.2 : 0);

    if (complexity < 0.3) {
      return { route: "LOCAL_WORKER" };
    }

    if (complexity < 0.7) {
      return { route: "WASM_RUNTIME" };
    }

    return { route: "AZURE_SANDBOX" };
  }

  learn(_decision: ExecutionDecision, _result: any) {
    // futuro: auto-tuning
  }
}