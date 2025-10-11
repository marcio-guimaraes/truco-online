// server/src/baralho.ts

const naipes = ['ouros', 'espadas', 'copas', 'paus'];
const valores = ['J', 'Q', 'K', 'A', '2', '3'];

export interface Carta {
  valor: string;
  naipe: string;
}

export function criarBaralho(): Carta[] {
  const baralho: Carta[] = [];
  for (const naipe of naipes) {
    for (const valor of valores) {
      baralho.push({ valor, naipe });
    }
  }
  
  baralho.push({ valor: '4', naipe: 'paus' });
  baralho.push({ valor: '7', naipe: 'copas' });
  baralho.push({ valor: '7', naipe: 'ouros' });
  
  baralho.push({ valor: '4', naipe: 'ouros' });
  baralho.push({ valor: '4', naipe: 'copas' });
  baralho.push({ valor: '4', naipe: 'espadas' });
  baralho.push({ valor: '7', naipe: 'paus' });
  baralho.push({ valor: '7', naipe: 'espadas' });

  return baralho;
}

export function embaralhar(baralho: Carta[]): Carta[] {
  for (let i = baralho.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [baralho[i], baralho[j]] = [baralho[j], baralho[i]];
  }
  return baralho;
}