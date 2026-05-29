import { SandboxInput } from "./engines";
import { ExecutionPolicyEngine } from "./executionDecision";
import { ExecutionRouter } from "./router";
import { TelemetryBus } from "./telemetryBus";

export class SandboxBrain {
  constructor(
    private policy: ExecutionPolicyEngine,
    private router: ExecutionRouter,
    private telemetry: TelemetryBus,
  ) {}

  async execute(input: SandboxInput, signal?: AbortSignal) {
    // 1. ANALISA CONTEXTO
    const decision = this.policy.decide(input);

    // 2. ROTEIA
    const executor = this.router.resolve(decision.route);

    // 3. EXECUTA
    const result = await executor.run(input, signal);

    // 4. OBSERVA
    this.telemetry.record({
      route: decision.route,
      latency: result.latency,
      success: !result.error,
      language: input.language,
    });

    // 5. FEEDBACK LOOP (auto-ajuste futuro)
    this.policy.learn(decision, result);

    return result;
  }
}

