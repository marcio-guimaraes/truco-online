import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Carta, criarBaralho, embaralhar } from './baralho';
import { getForca } from './jogo';
import { GerenciadorDeTruco } from './gerenciadorDeTruco';

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
  gerenciadorDeTruco: GerenciadorDeTruco;
}

const salas: Record<string, Sala> = {};
const PONTOS_PARA_VITORIA = 12;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { 
    origin: process.env.CLIENT_URL || "http://localhost:5173", 
    methods: ["GET", "POST"] 
  }
});

function broadcastSalasDisponiveis() {
  const salasInfo = Object.entries(salas).map(([nome, sala]) => ({
    nome,
    jogadores: sala.jogadores.length,
    espectadores: sala.espectadores.length,
  })).filter(sala => sala.jogadores < 4 || sala.jogadores === 4);

  io.emit('atualizar_lista_salas', salasInfo);
}

function verificarFimDeJogo(sala: Sala, nomeDaSala: string): boolean {
  const { vermelho, azul } = sala.placar;
  if (vermelho >= PONTOS_PARA_VITORIA) {
    io.to(nomeDaSala).emit('fim_de_jogo', { timeVencedor: 'vermelho' });
    return true;
  }
  if (azul >= PONTOS_PARA_VITORIA) {
    io.to(nomeDaSala).emit('fim_de_jogo', { timeVencedor: 'azul' });
    return true;
  }
  return false;
}

function iniciarNovaMao(sala: Sala, nomeDaSala: string) {
  if (sala.placar.vermelho >= PONTOS_PARA_VITORIA || sala.placar.azul >= PONTOS_PARA_VITORIA) {
      sala.placar = { vermelho: 0, azul: 0 };
  }

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
  sala.gerenciadorDeTruco.reiniciarRodada();

  broadcastEstado(nomeDaSala, sala);
}

function broadcastEstado(nomeDaSala: string, sala: Sala) {
  const estadoCompleto = {
    ...sala,
    trucoState: sala.gerenciadorDeTruco.getState()
  };

  sala.jogadores.forEach(jogador => {
    io.to(jogador.id).emit('atualizacao_de_estado', estadoCompleto);
  });

  sala.espectadores.forEach(espectador => {
    io.to(espectador.id).emit('atualizacao_de_estado', getSalaParaEspectador(estadoCompleto));
  });
}

function getSalaParaEspectador(sala: any): any {
    const salaSanitizada = {
        ...sala,
        jogadores: sala.jogadores.map((j: any) => {
            const { mao, ...jogadorSemMao } = j;
            return { ...jogadorSemMao, mao: [] };
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
        gerenciadorDeTruco: new GerenciadorDeTruco(),
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
    if (!sala) return;
    socket.join(nomeDaSala);
    sala.espectadores.push({ id: socket.id, nome: nomeJogador });
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

    // MUDANÇA: Lógica alterada aqui
    if (sala.mesa.length < sala.jogadores.length) {
      broadcastEstado(nomeDaSala, sala);
      return;
    }

    // Se for o quarto jogador, primeiro envia o estado com a carta na mesa
    broadcastEstado(nomeDaSala, sala);
    
    // E então, após uma pequena pausa, calcula e anuncia o vencedor da rodada
    setTimeout(() => {
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
            sala.placar[vencedorMao] += sala.gerenciadorDeTruco.getValorDaMao();
            if (verificarFimDeJogo(sala, nomeDaSala)) return;
          }
          io.to(nomeDaSala).emit('fim_da_mao', { timeVencedor: vencedorMao });
          setTimeout(() => iniciarNovaMao(sala, nomeDaSala), 3000);
        } else {
          sala.mesa = [];
          sala.turnoDe = melhorJogada.jogadorId;
          broadcastEstado(nomeDaSala, sala);
        }
      }, 3000);
    }, 1500); // Pausa de 1.5s para que todos vejam a última carta
  });

  socket.on('pedir_truco', ({ nomeDaSala }) => {
    const sala = salas[nomeDaSala];
    const jogador = sala?.jogadores.find(j => j.id === socket.id);
    if (!sala || !jogador) return;

    const resultado = sala.gerenciadorDeTruco.pedirAumento(jogador.time);

    if (resultado.sucesso) {
      broadcastEstado(nomeDaSala, sala);
    } else {
      socket.emit('erro', resultado.mensagem);
    }
  });

  socket.on('responder_truco', ({ nomeDaSala, resposta }) => {
    const sala = salas[nomeDaSala];
    const jogador = sala?.jogadores.find(j => j.id === socket.id);
    if (!sala || !jogador) return;

    let resultado;

    if (resposta === 'aceitar') {
      resultado = sala.gerenciadorDeTruco.aceitar(jogador.time);
      if(resultado.sucesso) {
        io.to(nomeDaSala).emit('mostrar_mensagem_global', `A MÃO AGORA VALE ${resultado.novoValor} PONTOS!`);
      }
    } else if (resposta === 'correr') {
      resultado = sala.gerenciadorDeTruco.correr(jogador.time);
      if(resultado.sucesso) {
        sala.placar[resultado.timeVencedor!] += resultado.pontosGanhos!;
        io.to(nomeDaSala).emit('fim_da_mao', { timeVencedor: resultado.timeVencedor });
        
        if (verificarFimDeJogo(sala, nomeDaSala)) return;

        setTimeout(() => iniciarNovaMao(sala, nomeDaSala), 2000);
        return;
      }
    } else if (resposta === 'aumentar') {
        resultado = sala.gerenciadorDeTruco.aumentarAposta(jogador.time);
    } else {
        return;
    }

    if (resultado.sucesso) {
      broadcastEstado(nomeDaSala, sala);
    } else {
      socket.emit('erro', resultado.mensagem);
    }
  });

  socket.on('jogar_novamente', ({ nomeDaSala }) => {
    const sala = salas[nomeDaSala];
    if (sala) {
      iniciarNovaMao(sala, nomeDaSala);
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

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));