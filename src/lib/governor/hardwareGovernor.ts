export interface HardwareLimits {
  maxContextSize: number;
  tier: 'LOW' | 'MID' | 'HIGH';
  isMobile: boolean;
  batchSize: number;
}

const LIMITS = {
  LOW: { maxContextSize: 1024, tier: 'LOW' as const, batchSize: 1 },  // M23 e similares
  MID: { maxContextSize: 2200, tier: 'MID' as const, batchSize: 2 },  // S20, S21, Intermediários
  HIGH: { maxContextSize: 5000, tier: 'HIGH' as const, batchSize: 4 }, // Desktop / S24+
};

export const HardwareGovernor = {
  getLimits: (): HardwareLimits => {
    if (typeof window === "undefined") return { ...LIMITS.HIGH, isMobile: false };

    const ua = navigator.userAgent;
    const isMobile = /Mobi|Android|iP(hone|od|ad)/i.test(ua);
    
    // Tiering simples baseado em performance percebida
    // Em produção, você pode usar navigator.deviceMemory ou hardwareConcurrency
    if (!isMobile) return { ...LIMITS.HIGH, isMobile };
    
    // Se for mobile, vamos tentar identificar se é um dispositivo "premium" (ex: S24 tem mais núcleos)
    const isHighEndMobile = (navigator.hardwareConcurrency || 0) >= 8;
    
    if (isHighEndMobile) return { ...LIMITS.MID, isMobile };
    return { ...LIMITS.LOW, isMobile };
  },

  getPedagogicalConstraints: (tier: 'LOW' | 'MID' | 'HIGH') => {
    return {
      maxTokensPerModule: tier === 'LOW' ? 600 : tier === 'MID' ? 1200 : 2000,
      detailLevel: tier === 'LOW' ? 'concise' : 'detailed',
      allowDeepNesting: tier !== 'LOW',
    };
  },

  shouldThrottle: (): boolean => {
    return HardwareGovernor.getLimits().tier === 'LOW';
  }
};
