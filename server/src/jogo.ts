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
  { valor: '4', naipe: 'paus' },
  { valor: '7', naipe: 'copas' },
  { valor: 'A', naipe: 'espadas' },
  { valor: '7', naipe: 'ouros' },
  { valor: '4', naipe: 'ouros' },
];

export function getForca(carta: Carta): number {
  const indexManilha = manilhas.findIndex(m => m.valor === carta.valor && m.naipe === carta.naipe);
  
  if (indexManilha !== -1) {
    return 15 - indexManilha;
  }
  
  return forcaCartasComuns[carta.valor] || 0;
}