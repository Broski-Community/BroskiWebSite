/**
 * Sistema Imprevisti Bomb Party
 *
 * Ogni turno ha una probabilità di attivare un imprevisto (bomba speciale).
 * La bomba mostrata cambia visivamente e gli effetti si applicano
 * quando il giocatore risponde correttamente o sbaglia.
 */

export type BombType = 'normal' | 'dollar' | 'lightning' | 'striped' | 'star';

export interface BombEvent {
  type: BombType;
  name: string;
  description: string;
  image: string;
}

export const BOMB_EVENTS: Record<BombType, BombEvent> = {
  normal: {
    type: 'normal',
    name: 'Bomba Normale',
    description: '',
    image: '/bombparty-assets/bombs-with-fuse-props-game-icons-metal-balls (1).png',
  },
  dollar: {
    type: 'dollar',
    name: 'Parola Lunga',
    description: '💰 Scrivi una parola di almeno 7 lettere per guadagnare +1 vita!',
    image: '/bombparty-assets/bombs-with-fuse-props-game-icons-metal-balls (2).png',
  },
  lightning: {
    type: 'lightning',
    name: 'Shock',
    description: '⚡ Se rispondi correttamente, tutti gli avversari perdono 1 vita!',
    image: '/bombparty-assets/bombs-with-fuse-props-game-icons-metal-balls (3).png',
  },
  striped: {
    type: 'striped',
    name: 'Timer Bomba',
    description: '🎯 Il tempo è dimezzato! Rispondi in fretta!',
    image: '/bombparty-assets/bombs-with-fuse-props-game-icons-metal-balls (4).png',
  },
  star: {
    type: 'star',
    name: 'Scudo',
    description: '⭐ Rispondi correttamente per ottenere uno scudo (salva 1 vita futura)!',
    image: '/bombparty-assets/bombs-with-fuse-props-game-icons-metal-balls (5).png',
  },
};

/**
 * Determina casualmente quale bomba appare per il prossimo turno.
 *
 * @param canLightning - se false, la bomba fulmine non può apparire
 *                       (quando qualche avversario ha solo 1 vita)
 */
export function rollBombEvent(canLightning: boolean): BombType {
  // 55% normale, ~11% ciascuna per le speciali
  const roll = Math.random();

  if (roll < 0.55) return 'normal';
  if (roll < 0.67) return 'dollar';
  if (roll < 0.79) return canLightning ? 'lightning' : 'normal';
  if (roll < 0.89) return 'striped';
  return 'star';
}

// Sillabe più difficili per la bomba dollar (parola lunga)
export const HARD_SYLLABLES = [
  'STR', 'SPR', 'GRA', 'FRA', 'TRA', 'PRE', 'PRO',
  'SCR', 'SQU', 'GHI', 'CHI', 'GLI', 'GNO', 'BRI',
  'CRO', 'DRA', 'FRE', 'GRI', 'PRI', 'TRI', 'VER',
  'STRA', 'SPRE', 'MENT', 'CION', 'QUES',
];

export function getHardSyllable(): string {
  return HARD_SYLLABLES[Math.floor(Math.random() * HARD_SYLLABLES.length)];
}
