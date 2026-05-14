/**
 * @file factions.ts
 */

export type BonusType = 'XP_BOOST' | 'LOGIC_PRECISION' | 'COMPILATION_SPEED' | 'AI_COOLDOWN' | 'RESOURCE_EFFICIENCY';

export interface FactionBonus {
    type: BonusType;
    value: number; // Ex: 0.15 para 15%
    description: string;
}

export interface FactionRank {
    level: number;
    title: string;
    xpRequirement: number;
    unlocks: string[];
}

export interface Faction {
    id: string;
    name: string;
    motto: string;
    description: string;
    philosophy: string;
    primaryColor: string;
    secondaryColor: string;
    bonuses: FactionBonus[];
    ranks: FactionRank[];
    specializationPath: string[];
}

export const FACTIONS: Record<string, Faction> = {
    'the-purists': {
        id: 'the-purists',
        name: 'Os Puristas',
        motto: 'Código limpo é código sagrado.',
        description: 'Focados em Clean Code e algoritmos.',
        philosophy: 'Otimização e elegância técnica.',
        primaryColor: '#F59E0B',
        secondaryColor: '#451A03',
        bonuses: [{ type: 'LOGIC_PRECISION', value: 0.20, description: 'Bônus de precisão em lógica.' }],
        ranks: [], 
        specializationPath: ['Algorithms', 'Clean Architecture']
    },
    'the-pragmatics': {
        id: 'the-pragmatics',
        name: 'Os Pragmáticos',
        motto: 'Se funciona, não mexe.',
        description: 'Focados em resultados e entrega rápida.',
        philosophy: 'Produtividade e soluções práticas.',
        primaryColor: '#10B981',
        secondaryColor: '#064E3B',
        bonuses: [{ type: 'COMPILATION_SPEED', value: 0.30, description: 'Compilação 30% mais rápida.' }],
        ranks: [],
        specializationPath: ['MVP Development', 'Scripting']
    },
    'system-architects': {
        id: 'system-architects',
        name: 'Arquitetos de Sistemas',
        motto: 'Tudo é um componente de algo maior.',
        description: 'Focados em infraestrutura e eficiência.',
        philosophy: 'Integração e visão sistêmica.',
        primaryColor: '#06B6D4',
        secondaryColor: '#0F172A',
        bonuses: [{ type: 'RESOURCE_EFFICIENCY', value: 0.25, description: '25% de desconto em operações de sistema.' }],
        ranks: [],
        specializationPath: ['System Design', 'API Integration']
    },
    'void-runners': {
        id: 'void-runners',
        name: 'Void Runners',
        motto: 'Nenhum sistema é impenetrável.',
        description: 'Focados em segurança e debugging.',
        philosophy: 'Cibersegurança e persistência.',
        primaryColor: '#EF4444',
        secondaryColor: '#1E1B4B',
        bonuses: [{ type: 'XP_BOOST', value: 0.15, description: '+15% de ganho de XP.' }],
        ranks: [],
        specializationPath: ['Cybersecurity', 'Debugging']
    }
};

export class FactionManager {
    static getFactionById(id: string): Faction | undefined {
        return FACTIONS[id];
    }

    static getActiveBonuses(factionId: string, currentXp: number): FactionBonus[] {
        const faction = FACTIONS[factionId];
        if (!faction) return [];
        // Aqui você pode expandir para liberar bônus conforme o rank da facção aumenta
        return faction.bonuses;
    }

    static canAscend(currentXp: number, currentLevel: number): boolean {
        return currentLevel >= 25 && currentXp >= 50000;
    }
}
