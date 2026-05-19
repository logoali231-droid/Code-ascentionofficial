type ThermalState = 'STABLE' | 'THROTTLED';

class ThermalMonitor {
  private state: ThermalState = 'STABLE';
  private listeners: (() => void)[] = [];

  public updateTTFT(ttft: number) {
    // Se TTFT > 3000ms, entramos em modo de preservação
    const newState = ttft > 3000 ? 'THROTTLED' : 'STABLE';
    if (this.state !== newState) {
      this.state = newState;
      this.notify();
    }
  }

  public getStatus() { return this.state; }
  
  public subscribe(cb: () => void) { this.listeners.push(cb); }
  
  private notify() { this.listeners.forEach(cb => cb()); }
}

export const thermalMonitor = new ThermalMonitor();
