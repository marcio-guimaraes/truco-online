import styles from './styles.module.css';

interface PlacarProps {
  placar: { vermelho: number; azul: number };
  meuTime: 'vermelho' | 'azul';
}

export function Placar({ placar, meuTime }: PlacarProps) {
  const placarNos = placar[meuTime];
  const placarEles = meuTime === 'vermelho' ? placar.azul : placar.vermelho;
  const corNos = meuTime === 'vermelho' ? styles.timeVermelho : styles.timeAzul;
  const corEles = meuTime === 'vermelho' ? styles.timeAzul : styles.timeVermelho;

  return (
    <div className={styles.placarContainer}>
      <h2>Placar</h2>
      <div className={styles.pontos}>
        <span className={corNos}>Nós: {placarNos}</span>
        <span className={corEles}>Eles: {placarEles}</span>
      </div>
    </div>
  );
}