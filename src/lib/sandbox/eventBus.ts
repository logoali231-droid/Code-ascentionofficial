// lib/sandbox/eventBus.ts
type Subscriber = (event: SandboxEvent) => void;

class SandboxEventBus {
  private subscribers: Subscriber[] = [];

  publish(event: SandboxEventBus) {
    this.subscribers.forEach(sub => sub(event));
  }

  subscribe(callback: Subscriber) {
    this.subscribers.push(callback);
    return () => { /* remove logic */ };
  }
}

export const sandboxBus = new SandboxEventBus();
