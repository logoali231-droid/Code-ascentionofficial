"use client";

import React, { useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

// Tipagem para auxiliar na detecção de raridade e estilos
type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'glitch';

interface DynamicIconProps {
  name: string;           // Ex: "Binary_Sword_V1" ou "QuantumScanner"
  category?: string;      // Ex: "weapon", "module", "booster"
  rarity?: ItemRarity;    // Afeta as cores e o brilho neon
  size?: number;
  className?: string;
  showGlow?: boolean;     // Ativa/Desativa o aura cyberpunk
}

/**
 * DYNAMIC ICON SYSTEM - CODE ASCENSION
 * Sistema robusto que garante que nenhum item fique sem representação visual,
 * utilizando lógica de fuzzy matching para a biblioteca Lucide.
 */
const DynamicIcon: React.FC<DynamicIconProps> = ({
  name,
  category = 'default',
  rarity = 'common',
  size = 24,
  className = "",
  showGlow = true
}) => {

  // Memória de cores cyberpunk baseada na raridade
  const rarityConfig = useMemo(() => {
    const configs: Record<ItemRarity, { color: string, glow: string, label: string }> = {
      common: { color: 'text-slate-400', glow: 'bg-slate-500', label: '' },
      uncommon: { color: 'text-emerald-400', glow: 'bg-emerald-500', label: 'UC' },
      rare: { color: 'text-blue-400', glow: 'bg-blue-600', label: 'R' },
      epic: { color: 'text-purple-500', glow: 'bg-purple-600', label: 'EP' },
      legendary: { color: 'text-amber-400', glow: 'bg-orange-500', label: 'LG' },
      glitch: { color: 'text-rose-500', glow: 'bg-rose-600', label: 'ERR' },
    };
    return configs[rarity];
  }, [rarity]);

  // LÓGICA DE DESCOBERTA DE ÍCONE (HEURÍSTICA)
  const IconComponent = useMemo(() => {
    const allIcons = LucideIcons as any;
    const normalizedTarget = name.replace(/[^a-zA-Z]/g, '').toLowerCase();

    // 1. Tentativa Direta (Case Sensitive/Insensitive)
    if (allIcons[name]) return allIcons[name];
    
    // 2. Busca por palavra-chave no nome (Heurística)
    const keywords: Record<string, keyof typeof LucideIcons> = {
      sword: 'Sword', blade: 'Sword', katana: 'Sword',
      shield: 'Shield', guard: 'Shield',
      key: 'Key', access: 'Key',
      data: 'Database', chip: 'Cpu', logic: 'Binary',
      heal: 'HeartPulse', med: 'Medal', 
      boost: 'Zap', power: 'Zap',
      search: 'Search', scan: 'Scan',
      box: 'Package', chest: 'Archive',
      credit: 'Coins', money: 'CircleDollarSign'
    };

    for (const [key, icon] of Object.entries(keywords)) {
      if (normalizedTarget.includes(key)) return allIcons[icon];
    }

    // 3. Fallback por Categoria
    const categoryFallbacks: Record<string, keyof typeof LucideIcons> = {
      weapon: 'Crosshair',
      module: 'Cpu',
      utility: 'Wrench',
      currency: 'Bitcoin',
      skin: 'Zap',
      default: 'HelpCircle'
    };

    const fallbackName = categoryFallbacks[category] || categoryFallbacks.default;
    
    // Alerta de desenvolvimento para ícones não mapeados
    if (process.env.NODE_ENV === 'development' && !allIcons[name]) {
       console.warn(`[DynamicIcon] Mapeamento não encontrado para: "${name}". Usando: "${fallbackName}"`);
    }

    return allIcons[fallbackName];
  }, [name, category]);

  return (
    <div 
      className={`relative inline-flex items-center justify-center p-1 rounded-lg group ${className}`}
      title={`${name} (${rarity})`}
    >
      {/* Camada 1: Glow de Fundo (Aura) */}
      {showGlow && (
        <div className={`absolute inset-0 blur-md opacity-20 transition-opacity group-hover:opacity-40 ${rarityConfig.glow}`} />
      )}

      {/* Camada 2: Moldura Cyberpunk (Opcional p/ épicos/lendários) */}
      {(rarity === 'epic' || rarity === 'legendary') && (
        <div className="absolute inset-0 border border-white/10 rounded-lg animate-pulse" />
      )}

      {/* Camada 3: O Ícone em si */}
      <div className="relative z-10">
        <IconComponent 
          size={size} 
          strokeWidth={1.5}
          className={`${rarityConfig.color} drop-shadow-[0_0_2px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:scale-110`} 
        />
      </div>

      {/* Camada 4: Badge de Raridade (Micro-texto) */}
      {rarityConfig.label && (
        <span className="absolute -bottom-1 -right-1 text-[7px] font-bold px-1 bg-black/80 border border-white/20 rounded leading-none py-0.5 text-white uppercase tracking-tighter">
          {rarityConfig.label}
        </span>
      )}

      {/* Efeito Especial: Partículas para Itens "Glitch" */}
      {rarity === 'glitch' && (
        <div className="absolute inset-0 overflow-hidden opacity-50 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-px bg-white animate-scanline" />
        </div>
      )}
      
      <style jsx>{`
        @keyframes scanline {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        .animate-scanline {
          animation: scanline 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default DynamicIcon;