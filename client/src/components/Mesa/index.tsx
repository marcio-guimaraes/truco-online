import { Carta, type CartaInfo } from '../Carta';
import styles from './styles.module.css';

interface MesaProps {
  cartasNaMesa: { jogadorId: string, carta: CartaInfo }[];
}

export function Mesa({ cartasNaMesa }: MesaProps) {
  return (
    <div className={styles.mesaContainer}>
      <h3>Mesa</h3>
      <div className={styles.cartasNaMesa}>
        {cartasNaMesa.map(({ jogadorId, carta }) => (
          <div key={jogadorId}>
            <Carta cartaInfo={carta} onCartaClick={() => {}} />
            <p className={styles.nomeJogador}>Jogada por: {jogadorId.substring(0, 5)}...</p>
          </div>
        ))}
      </div>
    </div>
  );
}