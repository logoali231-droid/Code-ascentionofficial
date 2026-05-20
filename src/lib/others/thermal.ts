export type ThermalState = 'STABLE' | 'DEGRADED' | 'THROTTLED' | 'THERMAL_CRITICAL';

class ThermalMonitor {
  private state: ThermalState = 'STABLE';
  private currentTtft: number = 0;
  private listeners: (() => void)[] = [];

  /**
   * Atualiza a latência Time to First Token capturada pela camada de rede ou IA
   */
  public updateTTFT(ttft: number) {
    this.currentTtft = ttft;
    let newState: ThermalState = 'STABLE';

    // Zoneamento Granular de Latência/Degradação
    if (ttft > 1200 && ttft <= 3000) {
      newState = 'DEGRADED';
    } else if (ttft > 3000) {
      newState = 'THROTTLED';
    }

    // Se o estado mudou de patamar, dispara o barramento reativo
    if (this.state !== newState && this.state !== 'THERMAL_CRITICAL') {
      this.state = newState;
      this.notify();
    }
  }

  /**
   * Permite que a camada nativa injete alertas brutos de hardware (Overheating real do processador)
   */
  public reportHardwareEmergency(isOverheating: boolean) {
    const newState: ThermalState = isOverheating ? 'THERMAL_CRITICAL' : 'STABLE';
    if (this.state !== newState) {
      this.state = newState;
      this.notify();
    }
  }

  public getStatus(): ThermalState { 
    return this.state; 
  }

  public getCurrentTTFT(): number { 
    return this.currentTtft; 
  }
  
  public subscribe(cb: () => void) { 
    this.listeners.push(cb); 
  }
  
  private notify() { 
    this.listeners.forEach(cb => cb()); 
  }
}

export const thermalMonitor = new ThermalMonitor();