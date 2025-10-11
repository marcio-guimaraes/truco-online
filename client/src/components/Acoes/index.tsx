import styles from './styles.module.css';

interface AcoesProps {
  meuTurno: boolean;
  trucoState: { quemPediu: string; quemResponde: string; };
  meuId: string;
  onPedirTruco: () => void;
  onResponderTruco: (resposta: 'aceitar' | 'correr') => void;
}

export function Acoes({ meuTurno, trucoState, meuId, onPedirTruco, onResponderTruco }: AcoesProps) {
  if (trucoState.quemResponde === meuId) {
    return (
      <div className={styles.container}>
        <button className={styles.botaoAceitar} onClick={() => onResponderTruco('aceitar')}>Aceitar</button>
        <button className={styles.botaoCorrer} onClick={() => onResponderTruco('correr')}>Correr</button>
      </div>
    );
  }

  if (trucoState.quemPediu === meuId) {
    return <p>Aguardando resposta do oponente...</p>;
  }

  if (meuTurno) {
    return (
      <div className={styles.container}>
        <button className={styles.botaoTruco} onClick={onPedirTruco}>TRUCO!</button>
      </div>
    );
  }

  return null;
}