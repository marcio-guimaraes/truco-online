import styles from './styles.module.css';

export interface CartaInfo {
  valor: string;
  naipe: string;
}

interface CartaProps {
  cartaInfo: CartaInfo;
  onCartaClick: (carta: CartaInfo) => void;
}

const valorParaNomeArquivo: Record<string, string> = {
  'A': 'ace', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', 'Q': 'queen', 'J': 'jack', 'K': 'king'
};

const naipeParaNomeArquivo: Record<string, string> = {
  'ouros': 'diamonds', 'espadas': 'spades', 'copas': 'hearts', 'paus': 'clubs'
};

function getImagemCarta(carta: CartaInfo) {
  const valor = valorParaNomeArquivo[carta.valor];
  const naipe = naipeParaNomeArquivo[carta.naipe];
  // Este caminho assume que você tem as imagens numa pasta public/cards/PNG-cards-1.3/
  return `/cards/PNG-cards-1.3/${valor}_of_${naipe}.png`;
}

export function Carta({ cartaInfo, onCartaClick }: CartaProps) {
  const caminhoImagem = getImagemCarta(cartaInfo);

  return (
    <img
      className={styles.carta}
      src={caminhoImagem}
      alt={`${cartaInfo.valor} de ${cartaInfo.naipe}`}
      onClick={() => onCartaClick(cartaInfo)}
    />
  );
}