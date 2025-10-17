import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Carta, type CartaInfo } from './components/Carta';
import { Mesa } from './components/Mesa';
import { Placar } from './components/Placar';
import { Acoes } from './components/Acoes';
import './App.css';

const socket = io('http://localhost:3000');

interface Jogador {
  id: string;
  nome: string;
  mao: CartaInfo[];
  time: 'vermelho' | 'azul';
}

interface Espectador {
  id: string;
  nome: string;
}

interface TrucoStateFromServer {
  valorDaMao: number;
  estado: 'SEM_PEDIDO' | 'AGUARDANDO_RESPOSTA';
  timeComPermissao: 'vermelho' | 'azul' | 'AMBOS';
  timeQuePediu: 'vermelho' | 'azul' | null;
  proximoValor: number;
}

interface SalaState {
  jogadores: Jogador[];
  espectadores: Espectador[];
  turnoDe: string;
  mesa: { jogadorId: string, carta: CartaInfo }[];
  placar: { vermelho: number; azul: number };
  trucoState: TrucoStateFromServer;
}

interface SalaDisponivel {
  nome: string;
  jogadores: number;
  espectadores: number;
}

function App() {
  const [nomeDaSala, setNomeDaSala] = useState('');
  const [nomeJogador, setNomeJogador] = useState('');
  const [modo, setModo] = useState<'jogador' | 'espectador' | null>(null);
  const [entrouNaSala, setEntrouNaSala] = useState(false);
  const [sala, setSala] = useState<SalaState | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [salasDisponiveis, setSalasDisponiveis] = useState<SalaDisponivel[]>([]);
  const [vencedorDoJogo, setVencedorDoJogo] = useState<'vermelho' | 'azul' | null>(null);
  
  useEffect(() => {
    socket.on('atualizar_lista_salas', (salas: SalaDisponivel[]) => {
      setSalasDisponiveis(salas);
    });
    
    socket.on('atualizacao_de_estado', (novoEstadoDaSala: SalaState) => {
      setSala(novoEstadoDaSala);
      if (novoEstadoDaSala.trucoState.estado === 'SEM_PEDIDO') {
        setMensagem('');
      }
    });
    
    socket.on('fim_da_rodada', ({ timeVencedor, mesaOrdenada }) => {
      const meuTime = sala?.jogadores.find(j => j.id === socket.id)?.time;
      let msg = '';
      if (timeVencedor === 'empate') msg = "A rodada empatou!";
      else if (timeVencedor === meuTime) msg = "A sua dupla venceu a rodada!";
      else msg = "A sua dupla perdeu a rodada!";

      const sequencia = mesaOrdenada.map((jogada: any) => 
        sala?.jogadores.find(j => j.id === jogada.jogadorId)?.nome
      ).join(' > ');
      
      setMensagem(`${msg} (Ordem: ${sequencia})`);
    });
    
    socket.on('fim_da_mao', ({ timeVencedor }) => {
        const meuTime = sala?.jogadores.find(j => j.id === socket.id)?.time;
        let msg = '';
        if (timeVencedor === 'ninguem') {
            msg = "Mão empatada! Ninguém pontua.";
        } else if (timeVencedor === meuTime) {
            msg = `🎉 VOCÊS VENCERAM A MÃO VALENDO ${sala?.trucoState.valorDaMao || 1}! 🎉`;
        } else {
            msg = `Vocês perderam a mão valendo ${sala?.trucoState.valorDaMao || 1}...`;
        }
        setMensagem(msg);
    });

    socket.on('mostrar_mensagem_global', (texto: string) => {
      setMensagem(texto);
    });

    socket.on('erro', (texto: string) => {
      alert(texto);
    });

    socket.on('fim_de_jogo', ({ timeVencedor }) => {
      setVencedorDoJogo(timeVencedor);
    });

    return () => {
      socket.off('atualizar_lista_salas');
      socket.off('atualizacao_de_estado');
      socket.off('fim_da_rodada');
      socket.off('fim_da_mao');
      socket.off('mostrar_mensagem_global');
      socket.off('erro');
      socket.off('fim_de_jogo');
    };
  }, [sala]);

  const handleEntrarComoJogador = (salaParaEntrar: string) => {
    if (salaParaEntrar.trim() !== '' && nomeJogador.trim() !== '') {
      setNomeDaSala(salaParaEntrar);
      socket.emit('entrar_na_sala', { nomeDaSala: salaParaEntrar, nomeJogador });
      setModo('jogador');
      setEntrouNaSala(true);
    } else {
      alert("Por favor, preencha o seu nome e o nome da sala!");
    }
  };

  const handleEntrarComoEspectador = (salaParaEntrar: string) => {
    if (salaParaEntrar.trim() !== '' && nomeJogador.trim() !== '') {
      setNomeDaSala(salaParaEntrar);
      socket.emit('entrar_como_espectador', { nomeDaSala: salaParaEntrar, nomeJogador });
      setModo('espectador');
      setEntrouNaSala(true);
    } else {
      alert("Por favor, preencha o seu nome!");
    }
  };

  const handleJogarCarta = (cartaJogada: CartaInfo) => {
    if (sala?.trucoState.estado === 'AGUARDANDO_RESPOSTA') {
      alert('Responda o pedido de truco antes de jogar!');
      return;
    }
    if (sala?.turnoDe === socket.id) {
      socket.emit('jogar_carta', { nomeDaSala, carta: cartaJogada });
    } else {
      alert("Não é a sua vez de jogar!");
    }
  };
  
  const handlePedirTruco = () => socket.emit('pedir_truco', { nomeDaSala });
  const handleResponderTruco = (resposta: 'aceitar' | 'correr' | 'aumentar') => {
    socket.emit('responder_truco', { nomeDaSala, resposta });
  };

  const handleJogarNovamente = () => {
    setVencedorDoJogo(null);
    socket.emit('jogar_novamente', { nomeDaSala });
  }

  if (vencedorDoJogo) {
    const eu = sala?.jogadores.find(j => j.id === socket.id);
    const venci = eu?.time === vencedorDoJogo;

    return (
      <div className="tela-fim-de-jogo">
        <h1>{venci ? '🎉 VITÓRIA! 🎉' : 'Derrota'}</h1>
        <p>O time {vencedorDoJogo === 'vermelho' ? 'Vermelho' : 'Azul'} venceu a partida!</p>
        <button onClick={handleJogarNovamente}>Jogar Novamente</button>
        <button onClick={() => window.location.reload()}>Voltar para o Lobby</button>
      </div>
    )
  }

  if (!entrouNaSala) {
    return (
      <div className="lobby">
        <h1>Truco Online</h1>
        <input type="text" placeholder="Seu nome" value={nomeJogador} onChange={(e) => setNomeJogador(e.target.value)} />
        
        <div className="lista-salas">
          <h2>Salas Disponíveis</h2>
          {salasDisponiveis.length === 0 ? (
            <p>Nenhuma sala aberta. Crie uma!</p>
          ) : (
            salasDisponiveis.map(s => {
              const estaCheia = s.jogadores >= 4;
              return (
                <div key={s.nome} className="item-sala">
                  <span>{s.nome} ({s.jogadores}/4) {s.espectadores > 0 && `- 👁️ ${s.espectadores}`}</span>
                  <div className="botoes-sala">
                    {estaCheia ? (
                       <button onClick={() => handleEntrarComoEspectador(s.nome)}>Assistir</button>
                    ) : (
                       <>
                         <button onClick={() => handleEntrarComoJogador(s.nome)}>Entrar para Jogar</button>
                         <button onClick={() => handleEntrarComoEspectador(s.nome)}>Assistir</button>
                       </>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="criar-sala">
          <h2>Ou crie uma nova</h2>
          <input type="text" placeholder="Nome da nova sala" value={nomeDaSala} onChange={(e) => setNomeDaSala(e.target.value)} />
          <button onClick={() => handleEntrarComoJogador(nomeDaSala)}>Criar e Entrar</button>
        </div>
      </div>
    );
  }

  if (!sala || !socket.id || (modo === 'jogador' && sala.jogadores.length < 4)) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Truco Online</h1>
        <h2>Sala: {nomeDaSala}</h2>
        <p>Aguardando jogadores... ({sala?.jogadores.length || 0} / 4)</p>
        <h3>Jogadores na sala:</h3>
        <ul>
          {sala?.jogadores.map(j => (
            <li key={j.id} style={{ color: j.time === 'vermelho' ? '#e53e3e' : '#3182ce', fontWeight: 'bold' }}>{j.nome}</li>
          ))}
        </ul>
        <h3>Espectadores:</h3>
        <ul>
          {sala?.espectadores.map(e => (
            <li key={e.id}>{e.nome}</li>
          ))}
        </ul>
      </div>
    );
  }
  
  const eu = modo === 'jogador' ? sala.jogadores.find(j => j.id === socket.id) : null;

  if (modo === 'espectador') {
    if (sala.jogadores.length < 4) {
        return <div style={{ padding: '20px' }}>
            <h1>Assistindo a Sala: {nomeDaSala}</h1>
            <p>Aguardando a partida começar... ({sala.jogadores.length}/4 jogadores)</p>
        </div>
    }
    const jogadorReferencia = sala.jogadores[0];
    if (!jogadorReferencia) return <p>Aguardando jogadores...</p>;
    const parceiro = sala.jogadores[2];
    const oponenteEsquerda = sala.jogadores[1];
    const oponenteDireita = sala.jogadores[3];

    const jogadorDaVez = sala.jogadores.find(j => j.id === sala.turnoDe);
    const textoTurno = `É a vez de ${jogadorDaVez?.nome}`;
    
    return (
      <>
        <Placar placar={sala.placar} meuTime={jogadorReferencia.time} />
        <div className="container-jogo">
          <div className="posicao-jogador jogador-superior">
            <div className={`nome-jogador time-${parceiro.time}`}>{parceiro.nome}</div>
            <div className="mao-container">
              {Array(3).fill(0).map((_, index) => ( <img key={index} src="/cards/PNG-cards-1.3/red_joker.png" alt="carta virada" style={{width: '80px'}}/> ))}
            </div>
          </div>
          <div className="posicao-jogador jogador-esquerda">
            <div className={`nome-jogador time-${oponenteEsquerda.time}`}>{oponenteEsquerda.nome}</div>
            <div className="mao-container">
              {Array(3).fill(0).map((_, index) => ( <img key={index} src="/cards/PNG-cards-1.3/red_joker.png" alt="carta virada" style={{width: '60px'}}/> ))}
            </div>
          </div>

          <div className="centro-da-mesa">
            <h3>Valendo: {sala.trucoState.valorDaMao} Ponto(s)</h3>
            <Mesa jogadores={sala.jogadores} cartasNaMesa={sala.mesa} />
            {mensagem && <h2 style={{ color: '#4de7b7', fontSize: '1.2rem' }}>{mensagem}</h2>}
            {!mensagem && <p>{textoTurno}</p>}
            <p>Você está assistindo como {nomeJogador}.</p>
          </div>

          <div className="posicao-jogador jogador-direita">
            <div className={`nome-jogador time-${oponenteDireita.time}`}>{oponenteDireita.nome}</div>
            <div className="mao-container">
              {Array(3).fill(0).map((_, index) => ( <img key={index} src="/cards/PNG-cards-1.3/red_joker.png" alt="carta virada" style={{width: '60px'}}/> ))}
            </div>
          </div>

          <div className="posicao-jogador jogador-inferior">
            <div className="mao-container">
              {Array(3).fill(0).map((_, index) => ( <img key={index} src="/cards/PNG-cards-1.3/red_joker.png" alt="carta virada" style={{width: '80px'}}/> ))}
            </div>
            <div className={`nome-jogador time-${jogadorReferencia.time}`}>{jogadorReferencia.nome}</div>
          </div>
        </div>
      </>
    );
  }

  if (!eu) return <p>Erro. A recarregar...</p>;

  const meuIndice = sala.jogadores.findIndex(j => j.id === eu.id);
  const parceiro = sala.jogadores[(meuIndice + 2) % 4];
  const oponenteEsquerda = sala.jogadores[(meuIndice + 1) % 4];
  const oponenteDireita = sala.jogadores[(meuIndice + 3) % 4];

  const jogadorDaVez = sala.jogadores.find(j => j.id === sala.turnoDe);
  const textoTurno = jogadorDaVez?.id === socket.id ? "É a sua vez!" : `É a vez de ${jogadorDaVez?.nome}`;
  const valorDaMaoAtual = sala.trucoState.valorDaMao;

  return (
    <>
      <Placar placar={sala.placar} meuTime={eu.time} />
      
      <div className="container-jogo">
        <div className="posicao-jogador jogador-superior">
          <div className={`nome-jogador time-${parceiro.time}`}>{parceiro.nome}</div>
          <div className="mao-container">
            {Array(parceiro.mao.length).fill(0).map((_, index) => (
              <img key={index} src="/cards/PNG-cards-1.3/red_joker.png" alt="carta virada" style={{width: '80px'}}/>
            ))}
          </div>
        </div>

        <div className="posicao-jogador jogador-esquerda">
           <div className={`nome-jogador time-${oponenteEsquerda.time}`}>{oponenteEsquerda.nome}</div>
           <div className="mao-container">
             {Array(oponenteEsquerda.mao.length).fill(0).map((_, index) => (
                <img key={index} src="/cards/PNG-cards-1.3/red_joker.png" alt="carta virada" style={{width: '60px'}}/>
              ))}
            </div>
        </div>
        
        <div className="centro-da-mesa">
          <h3>Valendo: {valorDaMaoAtual} Ponto(s)</h3>
          <Mesa jogadores={sala.jogadores} cartasNaMesa={sala.mesa} />
          {mensagem && <h2 style={{ color: '#4de7b7', fontSize: '1.2rem' }}>{mensagem}</h2>}
          {!mensagem && <p>{textoTurno}</p>}
          <Acoes 
            trucoState={sala.trucoState}
            meuTime={eu.time}
            onPedirTruco={handlePedirTruco}
            onResponderTruco={handleResponderTruco}
          />
        </div>
        
        <div className="posicao-jogador jogador-direita">
           <div className={`nome-jogador time-${oponenteDireita.time}`}>{oponenteDireita.nome}</div>
           <div className="mao-container">
             {Array(oponenteDireita.mao.length).fill(0).map((_, index) => (
                <img key={index} src="/cards/PNG-cards-1.3/red_joker.png" alt="carta virada" style={{width: '60px'}}/>
              ))}
            </div>
        </div>

        <div className="posicao-jogador jogador-inferior">
          <div className="mao-container">
            {eu.mao.map((carta, index) => (
              <Carta key={index} cartaInfo={carta} onCartaClick={handleJogarCarta} />
            ))}
          </div>
          <div className={`nome-jogador time-${eu.time}`}>{eu.nome} (Você)</div>
        </div>
      </div>
    </>
  );
}

export default App;