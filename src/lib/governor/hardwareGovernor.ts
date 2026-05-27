export interface HardwareLimits {
  maxContextSize: number;
  tier: 'LOW' | 'MID' | 'HIGH';
  isMobile: boolean;
  batchSize: number;
}

// Configurações baseadas em tiers de performance
const LIMITS = {
  LOW: { maxContextSize: 1024, tier: 'LOW' as const, batchSize: 1 }, // Ex: M23 / Mobile
  MID: { maxContextSize: 2200, tier: 'MID' as const, batchSize: 1 },
  HIGH: { maxContextSize: 5000, tier: 'HIGH' as const, batchSize: 4 }, // Ex: Desktop
};

export const HardwareGovernor = {
  getLimits: (): HardwareLimits => {
    // 1. Detecção segura (SSR-safe)
    const isMobile = typeof window !== "undefined" 
      && /Mobi|Android|iP(hone|od|ad)/i.test(navigator.userAgent);
    getPedagogicalConstraints: (isMobile: boolean) => {
    return {
      maxTokensPerModule: isMobile ? 800 : 2000,
      detailLevel: isMobile ? "concise" : "detailed",
      allowDeepNesting: !isMobile,
      // Você pode adicionar mais propriedades conforme necessário
    };
  },
    // 2. Determinação de Tier
    if (isMobile) return { ...LIMITS.LOW, isMobile };
    
    // Default para desktop ou dispositivos desconhecidos
    return { ...LIMITS.HIGH, isMobile };
  },

  // Método auxiliar para decidir se deve aplicar "throttling" térmico
  shouldThrottle: (): boolean => {
    return HardwareGovernor.getLimits().isMobile;
  }
};
