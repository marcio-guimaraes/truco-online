// server/src/jogo.ts

import type { Carta } from './baralho';

const forcaCartasComuns: Record<string, number> = {
  'J': 1,
  'Q': 2,
  'K': 3,
  'A': 4,
  '2': 5,
  '3': 6,
};

const manilhas: Carta[] = [
  { valor: '7', naipe: 'ouros' },
  { valor: 'A', naipe: 'espadas' },
  { valor: '7', naipe: 'copas' },
  { valor: '4', naipe: 'paus' },
];

export function getForca(carta: Carta): number {
  const forcaManilha = manilhas.findIndex(m => m.valor === carta.valor && m.naipe === carta.naipe);
  
  if (forcaManilha !== -1) {
    return forcaManilha + 10;
  }
  
  return forcaCartasComuns[carta.valor] || 0;
}