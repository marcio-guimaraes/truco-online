import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Carta, criarBaralho, embaralhar } from './baralho';
import { getForca } from './jogo';

interface Jogador {
  id: string;
  nome: string;
  mao: Carta[];
  time: 'vermelho' | 'azul';
}

interface Espectador {
  id: string;
  nome: string;
}

interface Sala {
  jogadores: Jogador[];
  ordemDeJogo: string[];
  espectadores: Espectador[];
  turnoDe: string;
  mesa: { jogadorId: string, carta: Carta }[];
  rodadasVencidas: { time: 'vermelho' | 'azul' | 'empate' }[];
  placar: { vermelho: number; azul: number };
  quemIniciouMao: string;
  valorMao: number;
  trucoState: {
    quemPediu: string;
    quemResponde: 'vermelho' | 'azul' | '';
    timeQuePediu: 'vermelho' | 'azul' | '';
  };
}

const salas: Record<string, Sala> = {};

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

function broadcastSalasDisponiveis() {
  const salasInfo = Object.entries(salas).map(([nome, sala]) => ({
    nome,
    jogadores: sala.jogadores.length,
    espectadores: sala.espectadores.length,
  })).filter(sala => sala.jogadores < 4 || sala.jogadores === 4);

  io.emit('atualizar_lista_salas', salasInfo);
}
function iniciarNovaMao(sala: Sala, nomeDaSala: string) {
  const baralho = embaralhar(criarBaralho());
  sala.jogadores.forEach((jogador, index) => {
    jogador.mao = baralho.slice(index * 3, index * 3 + 3);
  });

  const indexInicianteAnterior = sala.quemIniciouMao ? sala.jogadores.findIndex(j => j.id === sala.quemIniciouMao) : -1;
  sala.quemIniciouMao = sala.jogadores[(indexInicianteAnterior + 1) % sala.jogadores.length].id;

  sala.ordemDeJogo = sala.jogadores.map(j => j.id);
  while (sala.ordemDeJogo[0] !== sala.quemIniciouMao) {
    sala.ordemDeJogo.push(sala.ordemDeJogo.shift()!);
  }

  sala.turnoDe = sala.quemIniciouMao;
  sala.mesa = [];
  sala.rodadasVencidas = [];
  sala.valorMao = 1;
  sala.trucoState = { quemPediu: '', quemResponde: '', timeQuePediu: '' };

  broadcastEstado(nomeDaSala, sala);
}

function broadcastEstado(nomeDaSala: string, sala: Sala) {
  sala.jogadores.forEach(jogador => {
    io.to(jogador.id).emit('atualizacao_de_estado', sala);
  });

  sala.espectadores.forEach(espectador => {
    io.to(espectador.id).emit('atualizacao_de_estado', getSalaParaEspectador(sala));
  });
}

function getSalaParaEspectador(sala: Sala): Omit<Sala, 'jogadores'> & { jogadores: Omit<Jogador, 'mao'>[] } {
    const salaSanitizada = {
        ...sala,
        jogadores: sala.jogadores.map(j => {
            const { mao, ...jogadorSemMao } = j;
            return {
                ...jogadorSemMao,
                mao: []
            };
        })
    };
    return salaSanitizada;
}
io.on('connection', (socket) => {
  console.log(`Jogador conectado: ${socket.id}`);
  broadcastSalasDisponiveis();

  socket.on('entrar_na_sala', ({ nomeDaSala, nomeJogador }) => {
    socket.join(nomeDaSala);

    if (!salas[nomeDaSala]) {
      salas[nomeDaSala] = {
        jogadores: [],
        espectadores: [],
        ordemDeJogo: [],
        turnoDe: '',
        mesa: [],
        rodadasVencidas: [],
        placar: { vermelho: 0, azul: 0 },
        quemIniciouMao: '',
        valorMao: 1,
        trucoState: { quemPediu: '', quemResponde: '', timeQuePediu: '' },
      };
    }
    const sala = salas[nomeDaSala];

    if (sala.jogadores.length >= 4) {
      socket.leave(nomeDaSala);
      return;
    }

    const time = sala.jogadores.length % 2 === 0 ? 'vermelho' : 'azul';
    sala.jogadores.push({ id: socket.id, nome: nomeJogador, mao: [], time });

    broadcastSalasDisponiveis();
    broadcastEstado(nomeDaSala, sala);

    if (sala.jogadores.length === 4) {
      iniciarNovaMao(sala, nomeDaSala);
    }
  });

  socket.on('entrar_como_espectador', ({ nomeDaSala, nomeJogador }) => {
    const sala = salas[nomeDaSala];
    if (!sala) {
      return;
    }

    socket.join(nomeDaSala);
    sala.espectadores.push({ id: socket.id, nome: nomeJogador });

    socket.emit('atualizacao_de_estado', getSalaParaEspectador(sala));

    broadcastEstado(nomeDaSala, sala);
    broadcastSalasDisponiveis();
  });

  socket.on('jogar_carta', ({ nomeDaSala, carta }) => {
    const sala = salas[nomeDaSala];
    if (!sala || socket.id !== sala.turnoDe) return;

    const jogador = sala.jogadores.find(j => j.id === socket.id);
    if (!jogador) return;

    jogador.mao = jogador.mao.filter(c => !(c.valor === carta.valor && c.naipe === carta.naipe));
    sala.mesa.push({ jogadorId: socket.id, carta: carta });

    const jogadorAtualIndexNaOrdem = sala.ordemDeJogo.findIndex(id => id === socket.id);
    const proximoJogadorIndexNaOrdem = (jogadorAtualIndexNaOrdem + 1) % sala.jogadores.length;
    sala.turnoDe = sala.ordemDeJogo[proximoJogadorIndexNaOrdem];

    if (sala.mesa.length < sala.jogadores.length) {
      broadcastEstado(nomeDaSala, sala);
      return;
    }

    const mesaComForca = sala.mesa.map(jogada => {
      const jogadorDaJogada = sala.jogadores.find(j => j.id === jogada.jogadorId);
      return { ...jogada, forca: getForca(jogada.carta), time: jogadorDaJogada!.time };
    });
    mesaComForca.sort((a, b) => b.forca - a.forca);
    
    const melhorJogada = mesaComForca[0];
    const segundaMelhorJogada = mesaComForca[1];
    let timeVencedorRodada: 'vermelho' | 'azul' | 'empate';

    if (melhorJogada.forca > segundaMelhorJogada.forca) {
      timeVencedorRodada = melhorJogada.time;
    } else {
      timeVencedorRodada = 'empate';
    }

    sala.rodadasVencidas.push({ time: timeVencedorRodada });
    io.to(nomeDaSala).emit('fim_da_rodada', { timeVencedor: timeVencedorRodada, mesaOrdenada: mesaComForca });

    let vencedorMao: 'vermelho' | 'azul' | 'ninguem' | null = null;
    const vitoriasVermelho = sala.rodadasVencidas.filter(v => v.time === 'vermelho').length;
    const vitoriasAzul = sala.rodadasVencidas.filter(v => v.time === 'azul').length;

    if (vitoriasVermelho === 2) vencedorMao = 'vermelho';
    if (vitoriasAzul === 2) vencedorMao = 'azul';

    if (!vencedorMao) {
      const r1 = sala.rodadasVencidas[0]?.time;
      const r2 = sala.rodadasVencidas[1]?.time;
      
      if (r1 === 'empate') {
        if (r2 === 'vermelho') vencedorMao = 'vermelho';
        if (r2 === 'azul') vencedorMao = 'azul';
      }
      if (r2 === 'empate') {
        if (r1 === 'vermelho') vencedorMao = 'vermelho';
        if (r1 === 'azul') vencedorMao = 'azul';
      }
      if (sala.rodadasVencidas.length === 3) {
        const r3 = sala.rodadasVencidas[2].time;
        if(r1 === 'empate' && r2 === 'empate' && r3 !== 'empate') vencedorMao = r3;
        if(r1 === 'empate' && r2 === 'empate' && r3 === 'empate') vencedorMao = 'ninguem';
      }
    }

    setTimeout(() => {
      if (vencedorMao) {
        if (vencedorMao !== 'ninguem') {
          sala.placar[vencedorMao] += sala.valorMao;
        }
        io.to(nomeDaSala).emit('fim_da_mao', { timeVencedor: vencedorMao });
        setTimeout(() => iniciarNovaMao(sala, nomeDaSala), 3000);
      } else {
        sala.mesa = [];
        sala.turnoDe = melhorJogada.jogadorId;
        broadcastEstado(nomeDaSala, sala);
      }
    }, 3000);
  });

  socket.on('pedir_truco', ({ nomeDaSala }) => {
    const sala = salas[nomeDaSala];
    const jogadorPediu = sala.jogadores.find(j => j.id === socket.id);
    if (!sala || !jogadorPediu || sala.valorMao >= 12) return;

    const timeOponente = jogadorPediu.time === 'vermelho' ? 'azul' : 'vermelho';
    sala.trucoState = {
      quemPediu: socket.id,
      quemResponde: timeOponente,
      timeQuePediu: jogadorPediu.time
    };
    broadcastEstado(nomeDaSala, sala);
  });

  socket.on('responder_truco', ({ nomeDaSala, resposta }) => {
    const sala = salas[nomeDaSala];
    const jogadorRespondeu = sala.jogadores.find(j => j.id === socket.id);
    if (!sala || !jogadorRespondeu || jogadorRespondeu.time !== sala.trucoState.quemResponde) return;

    if (resposta === 'aceitar') {
      sala.valorMao = sala.valorMao === 1 ? 3 : sala.valorMao + 3;
      if (sala.valorMao > 12) sala.valorMao = 12;

      io.to(nomeDaSala).emit('mostrar_mensagem_global', `A MÃO AGORA VALE ${sala.valorMao} PONTOS!`);

      sala.trucoState = { quemPediu: '', quemResponde: '', timeQuePediu: '' };
      broadcastEstado(nomeDaSala, sala);

    } else if (resposta === 'correr') {
      const timeVencedor = sala.trucoState.timeQuePediu;
      if (timeVencedor) {
        sala.placar[timeVencedor] += sala.valorMao;
      }
      io.to(nomeDaSala).emit('fim_da_mao', { timeVencedor });
      setTimeout(() => iniciarNovaMao(sala, nomeDaSala), 2000);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Jogador desconectado: ${socket.id}`);
    for (const nomeDaSala in salas) {
      const sala = salas[nomeDaSala];
      const jogadorIndex = sala.jogadores.findIndex(j => j.id === socket.id);
      if (jogadorIndex !== -1) {
        sala.jogadores.splice(jogadorIndex, 1);
        if (sala.jogadores.length === 0) {
          delete salas[nomeDaSala];
        }
        broadcastSalasDisponiveis();
        broadcastEstado(nomeDaSala, sala);
        break;
      }

      const espectadorIndex = sala.espectadores.findIndex(e => e.id === socket.id);
      if (espectadorIndex !== -1) {
        sala.espectadores.splice(espectadorIndex, 1);
        broadcastSalasDisponiveis();
        broadcastEstado(nomeDaSala, sala);
        break;
      }
    }
  });
});

const PORT = 3000;
httpServer.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));