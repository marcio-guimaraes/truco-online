// client/src/App.tsx

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Carta, type CartaInfo } from './components/Carta';
import { Mesa } from './components/Mesa';
import { Placar } from './components/Placar';
import { Acoes } from './components/Acoes';

const socket = io('http://localhost:3000');

interface SalaState {
  jogadores: { id: string, mao: CartaInfo[] }[];
  turnoDe: string;
  mesa: { jogadorId: string, carta: CartaInfo }[];
  rodadasVencidas: { jogadorId: string }[];
  placar: Record<string, number>;
  valorMao: number;
  trucoState: { quemPediu: string; quemResponde: string; };
}

function App() {
  const [nomeDaSala, setNomeDaSala] = useState('');
  const [entrouNaSala, setEntrouNaSala] = useState(false);
  const [sala, setSala] = useState<SalaState | null>(null);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    socket.on('atualizacao_de_estado', (novoEstadoDaSala: SalaState) => {
      setSala(novoEstadoDaSala);
      setMensagem('');
    });
    
    socket.on('fim_da_rodada', ({ vencedorId }) => {
      let msg = '';
      if (vencedorId === 'empate') msg = "A rodada empatou!";
      else if (vencedorId === socket.id) msg = "Você venceu a rodada!";
      else msg = "Você perdeu a rodada!";
      setMensagem(msg);
    });

    socket.on('fim_da_mao', ({ vencedorMaoId }) => {
      let msg = '';
      if (vencedorMaoId === "Ninguém pontua") msg = "Mão empatada! Ninguém pontua.";
      else if (vencedorMaoId === socket.id) msg = "🎉 VOCÊ VENCEU A MÃO! 🎉";
      else msg = "Você perdeu a mão...";
      setMensagem(msg);
    });

    return () => {
      socket.off('atualizacao_de_estado');
      socket.off('fim_da_rodada');
      socket.off('fim_da_mao');
    };
  }, []);

  const handleEntrarNaSala = () => {
    if (nomeDaSala.trim() !== '') {
      socket.emit('entrar_na_sala', nomeDaSala);
      setEntrouNaSala(true);
    }
  };

  const handleJogarCarta = (cartaJogada: CartaInfo) => {
    if (sala?.trucoState.quemResponde) {
      alert("Responda ao truco primeiro!");
      return;
    }
    if (sala?.turnoDe === socket.id) {
      socket.emit('jogar_carta', { nomeDaSala, carta: cartaJogada });
    } else {
      alert("Não é a sua vez de jogar!");
    }
  };
  
  const handlePedirTruco = () => {
    socket.emit('pedir_truco', { nomeDaSala });
  };
  
  const handleResponderTruco = (resposta: 'aceitar' | 'correr') => {
    socket.emit('responder_truco', { nomeDaSala, resposta });
  };

  if (!entrouNaSala) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <h1>Truco Online</h1>
        <div>
          <input
            type="text"
            placeholder="Digite o nome da sala"
            value={nomeDaSala}
            onChange={(e) => setNomeDaSala(e.target.value)}
          />
          <button onClick={handleEntrarNaSala}>Entrar na Sala</button>
        </div>
      </div>
    );
  }

  if (!sala || !socket.id) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <h1>Truco Online</h1>
        <h2>Sala: {nomeDaSala}</h2>
        <p>Aguardando outro jogador para começar...</p>
      </div>
    );
  }

  const minhaMao = sala.jogadores.find(j => j.id === socket.id)?.mao || [];

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <h1>Truco Online</h1>
      <div>
        <Placar placar={sala.placar} meuId={socket.id} />
        <h3>Valendo: {sala.valorMao} Ponto(s)</h3>
        <h2>Sala: {nomeDaSala}</h2>
        <p>
          {sala.turnoDe === socket.id && !mensagem && !sala.trucoState.quemResponde ? <strong>É a sua vez!</strong> : `Aguardando...`}
        </p>
        
        {mensagem && <h2 style={{ color: '#4de7b7', minHeight: '3rem' }}>{mensagem}</h2>}
        
        <Mesa cartasNaMesa={sala.mesa} />

        <Acoes 
          meuTurno={sala.turnoDe === socket.id}
          trucoState={sala.trucoState}
          meuId={socket.id}
          onPedirTruco={handlePedirTruco}
          onResponderTruco={handleResponderTruco}
        />

        <h3>Sua Mão:</h3>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', padding: '20px', minHeight: '150px' }}>
          {minhaMao.map((carta, index) => (
            <Carta key={index} cartaInfo={carta} onCartaClick={handleJogarCarta} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;