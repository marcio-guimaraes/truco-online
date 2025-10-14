export interface Carta {
  valor: string;
  naipe: string;
}

export function criarBaralho(): Carta[] {
  const baralho: Carta[] = [
    { valor: '4', naipe: 'paus' },
    { valor: '7', naipe: 'copas' },
    { valor: 'A', naipe: 'espadas' },
    { valor: '7', naipe: 'ouros' },
    { valor: '4', naipe: 'ouros' },

    { valor: '3', naipe: 'paus' }, { valor: '3', naipe: 'copas' }, { valor: '3', naipe: 'ouros' }, { valor: '3', naipe: 'espadas' },
    { valor: '2', naipe: 'paus' }, { valor: '2', naipe: 'copas' }, { valor: '2', naipe: 'ouros' }, { valor: '2', naipe: 'espadas' },
    { valor: 'A', naipe: 'paus' }, { valor: 'A', naipe: 'copas' }, { valor: 'A', naipe: 'ouros' },
    { valor: 'K', naipe: 'paus' }, { valor: 'K', naipe: 'copas' }, { valor: 'K', naipe: 'ouros' }, { valor: 'K', naipe: 'espadas' },
    { valor: 'Q', naipe: 'paus' }, { valor: 'Q', naipe: 'copas' }, { valor: 'Q', naipe: 'ouros' }, { valor: 'Q', naipe: 'espadas' },
    { valor: 'J', naipe: 'paus' }, { valor: 'J', naipe: 'copas' }, { valor: 'J', naipe: 'ouros' }, { valor: 'J', naipe: 'espadas' },
  ];
  return baralho;
}

export function embaralhar(baralho: Carta[]): Carta[] {
  for (let i = baralho.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [baralho[i], baralho[j]] = [baralho[j], baralho[i]];
  }
  return baralho;
}