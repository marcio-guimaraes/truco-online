import styles from './styles.module.css';

interface AcoesProps {
  meuTurno: boolean;
  trucoState: { quemPediu: string; quemResponde: string; timeQuePediu: string; };
  meuId: string;
  meuTime: 'vermelho' | 'azul';
  valorMao: number;
  onPedirTruco: () => void;
  onResponderTruco: (resposta: 'aceitar' | 'correr' | 'aumentar') => void;
}

export function Acoes({ meuTurno, trucoState, meuId, meuTime, valorMao, onPedirTruco, onResponderTruco }: AcoesProps) {
  if (trucoState.quemResponde === meuTime) {
    return (
      <div className={styles.container}>
        <button className={styles.botaoAceitar} onClick={() => onResponderTruco('aceitar')}>Aceitar</button>
        <button className={styles.botaoCorrer} onClick={() => onResponderTruco('correr')}>Correr</button>
        {valorMao < 12 && (
          <button className={styles.botaoAumentar} onClick={() => onResponderTruco('aumentar')}>Aumentar</button>
        )}
      </div>
    );
  }

  if (trucoState.timeQuePediu === meuTime) {
    return <p>Aguardando resposta do adversário...</p>;
  }

  if (meuTurno) {
    return (
      <div className={styles.container}>
        {valorMao < 12 && (
          <button className={styles.botaoTruco} onClick={onPedirTruco}>TRUCO!</button>
        )}
      </div>
    );
  }

  return <div className={styles.container}></div>;
}