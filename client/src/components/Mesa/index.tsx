import { Carta, type CartaInfo } from '../Carta';
import styles from './styles.module.css';

interface Jogador {
  id: string;
  nome: string;
}

interface MesaProps {
  jogadores: Jogador[];
  cartasNaMesa: { jogadorId: string; carta: CartaInfo }[];
  meuId: string | null;
}

type Posicao = 'inferior' | 'esquerda' | 'superior' | 'direita';

export function Mesa({ jogadores, cartasNaMesa, meuId }: MesaProps) {

  // Se não soubermos quem "eu" sou (espectador), usa o primeiro jogador como referência
  const idReferencia = meuId || (jogadores.length > 0 ? jogadores[0].id : null);
  if (!idReferencia) {
    return <div className={styles.container}></div>;
  }
  
  const indiceReferencia = jogadores.findIndex(j => j.id === idReferencia);
  if (indiceReferencia === -1) return null;

  const getPosicaoRelativa = (indiceJogador: number): Posicao => {
    const diff = (indiceJogador - indiceReferencia + 4) % 4;
    switch (diff) {
      case 0: return 'inferior';
      case 1: return 'direita';
      case 2: return 'superior';
      case 3: return 'esquerda'; 
      default: return 'inferior';
    }
  };

  return (
    <div className={styles.container}>
      {cartasNaMesa.map(({ jogadorId, carta }) => {
        const jogadorIndice = jogadores.findIndex(j => j.id === jogadorId);
        if (jogadorIndice === -1) return null;

        const posicao = getPosicaoRelativa(jogadorIndice);

        return (
          <div key={jogadorId} className={`${styles.cartaNaMesa} ${styles[posicao]}`}>
            <Carta cartaInfo={carta} onCartaClick={() => {}} />
          </div>
        );
      })}
    </div>
  );
}