import styles from './styles.module.css';

interface PlacarProps {
  placar: Record<string, number>;
  meuId: string;
}

export function Placar({ placar, meuId }: PlacarProps) {
  const idsJogadores = Object.keys(placar);
  const meuPlacar = placar[meuId];
  const idOponente = idsJogadores.find(id => id !== meuId);
  const placarOponente = idOponente ? placar[idOponente] : 0;

  return (
    <div className={styles.placarContainer}>
      <h2>Placar</h2>
      <div className={styles.pontos}>
        <span>Você: {meuPlacar}</span>
        <span>Oponente: {placarOponente}</span>
      </div>
    </div>
  );
}