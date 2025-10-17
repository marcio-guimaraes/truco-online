import styles from './styles.module.css';

interface TrucoState {
  valorDaMao: number;
  estado: 'SEM_PEDIDO' | 'AGUARDANDO_RESPOSTA';
  timeComPermissao: 'vermelho' | 'azul' | 'AMBOS';
  timeQuePediu: 'vermelho' | 'azul' | null;
  proximoValor: number;
}

interface AcoesProps {
  trucoState: TrucoState;
  meuTime: 'vermelho' | 'azul';
  onPedirTruco: () => void;
  onResponderTruco: (resposta: 'aceitar' | 'correr' | 'aumentar') => void;
}

export function Acoes({ trucoState, meuTime, onPedirTruco, onResponderTruco }: AcoesProps) {
  const { estado, timeQuePediu, timeComPermissao, valorDaMao } = trucoState;

  if (estado === 'AGUARDANDO_RESPOSTA') {
    if (timeQuePediu !== meuTime) {
      let nomeDoAumento = '';
      switch (valorDaMao) {
        case 1: nomeDoAumento = 'SEIS'; break;
        case 3: nomeDoAumento = 'NOVE'; break;
        case 6: nomeDoAumento = 'DOZE'; break;
      }
      
      return (
        <div className={styles.container}>
          <p>Seu time recebeu um pedido de TRUCO!</p>
          <button className={styles.botaoAceitar} onClick={() => onResponderTruco('aceitar')}>Aceitar</button>
          <button className={styles.botaoCorrer} onClick={() => onResponderTruco('correr')}>Correr</button>
          {valorDaMao < 9 && (
            <button className={styles.botaoAumentar} onClick={() => onResponderTruco('aumentar')}>Pedir {nomeDoAumento}!</button>
          )}
        </div>
      );
    } else {
      return <p>Aguardando resposta do adversário...</p>;
    }
  }

  if (estado === 'SEM_PEDIDO') {
    const podePedir = timeComPermissao === meuTime || timeComPermissao === 'AMBOS';
    let nomeDoAumento = '';
    switch (valorDaMao) {
        case 1: nomeDoAumento = 'TRUCO'; break;
        case 3: nomeDoAumento = 'SEIS'; break;
        case 6: nomeDoAumento = 'NOVE'; break;
        case 9: nomeDoAumento = 'DOZE'; break;
    }

    if (podePedir && valorDaMao < 12) {
      return (
        <div className={styles.container}>
          <button className={styles.botaoTruco} onClick={onPedirTruco}>{nomeDoAumento}!</button>
        </div>
      );
    }
  }

  return <div className={styles.container}></div>;
}