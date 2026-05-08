/**
 * @file factions.ts
 */

export type BonusType = 'XP_BOOST' | 'LOGIC_PRECISION' | 'COMPILATION_SPEED' | 'AI_COOLDOWN' | 'RESOURCE_EFFICIENCY';

export interface FactionBonus {
    type: BonusType;
    value: number;
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
    // 1. O PERFECCIONISTA (Antigo Monge) - Focado em performance e elegância.
    'the-purists': {
        id: 'the-purists',
        name: 'Os Puristas',
        motto: 'Código limpo é código sagrado.',
        description: 'Não importa se funciona, importa se está perfeito. Focados em Clean Code, algoritmos e performance.',
        philosophy: 'Otimização, padrões de projeto e elegância técnica.',
        primaryColor: '#F59E0B',
        secondaryColor: '#451A03',
        bonuses: [
            { type: 'LOGIC_PRECISION', value: 0.20, description: 'Bônus de precisão em desafios complexos.' }
        ],
        ranks: [ /* ... níveis ... */ ],
        specializationPath: ['Algorithms', 'Clean Architecture', 'Optimization']
    },

    // 2. O PRAGMÁTICO (Sua sugestão!) - Focado em entrega e utilidade.
    'the-pragmatics': {
        id: 'the-pragmatics',
        name: 'Os Pragmáticos',
        motto: 'Se funciona, não mexe.',
        description: 'Interessa o resultado final. Se o script resolve o problema, ele é um bom script.',
        philosophy: 'Produtividade, prototipagem rápida e soluções "Good Enough".',
        primaryColor: '#10B981',
        secondaryColor: '#064E3B',
        bonuses: [
            { type: 'COMPILATION_SPEED', value: 0.30, description: 'Redução drástica no tempo de espera da IA.' }
        ],
        ranks: [ /* ... níveis ... */ ],
        specializationPath: ['MVP Development', 'Scripting', 'Rapid Prototyping']
    },

    // 3. O ARQUITETO (Antigo Neon/Cyber) - Focado em sistemas e conexão.
    'system-architects': {
        id: 'system-architects',
        name: 'Arquitetos de Sistemas',
        motto: 'Tudo é um componente de algo maior.',
        description: 'Focados em como as partes se conectam. Interfaces, APIs e fluxos de dados.',
        philosophy: 'Integração, UX e visão sistêmica.',
        primaryColor: '#06B6D4',
        secondaryColor: '#0F172A',
        bonuses: [
            { type: 'RESOURCE_EFFICIENCY', value: 0.25, description: 'IA consome menos bateria/RAM local.' }
        ],
        ranks: [ /* ... níveis ... */ ],
        specializationPath: ['System Design', 'API Integration', 'UI/UX']
    },

    // 4. O SHADOW/HACKER (Antigo Vanguard) - Focado em quebrar e proteger.
    'void-runners': {
        id: 'void-runners',
        name: 'Void Runners',
        motto: 'Nenhum sistema é impenetrável.',
        description: 'Focados em segurança, testes e encontrar falhas onde outros veem perfeição.',
        philosophy: 'Cibersegurança, Debugging profundo e Pentest.',
        primaryColor: '#EF4444',
        secondaryColor: '#1E1B4B',
        bonuses: [
            { type: 'XP_BOOST', value: 0.15, description: 'Ganho extra de XP ao corrigir erros.' }
        ],
        ranks: [ /* ... níveis ... */ ],
        specializationPath: ['Cybersecurity', 'Debugging', 'Quality Assurance']
    }
};

// ... Resto do FactionManager (canAscend, getActiveBonuses, etc)

export class FactionManager {
    static getFactionById(id: string): Faction | undefined {
        return FACTIONS[id];
    }

    static calculateCurrentRank(factionId: string, currentXp: number): FactionRank {
        const faction = FACTIONS[factionId];
        if (!faction) throw new Error("Facção não encontrada");
        return [...faction.ranks].reverse().find(r => currentXp >= r.xpRequirement) || faction.ranks[0];
    }

    static getNextRank(factionId: string, currentXp: number): FactionRank | null {
        const faction = FACTIONS[factionId];
        if (!faction) return null;
        return faction.ranks.find(r => r.xpRequirement > currentXp) || null;
    }

    // MÉTODOS QUE ESTAVAM FALTANDO:
    static canAscend(currentXp: number, currentLevel: number): boolean {
        return currentLevel >= 25 && currentXp >= 50000;
    }

    static getActiveBonuses(factionId: string, currentXp: number): FactionBonus[] {
        const faction = FACTIONS[factionId];
        if (!faction) return [];
        return faction.bonuses;
    }
}