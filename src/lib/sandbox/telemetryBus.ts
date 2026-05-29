export interface TelemetryEvent {
  route: string;
  latency: number;
  success: boolean;
  language: string;
}

export class TelemetryBus {
  record(event: TelemetryEvent) {
    console.log("[TELEMETRY]", event);

    // depois: Supabase / Azure / analytics
  }
}