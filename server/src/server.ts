// server/src/server.ts

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Carta, criarBaralho, embaralhar } from './baralho';
import { getForca } from './jogo';

interface Jogador {
  id: string;
  mao: Carta[];
}

interface Sala {
  jogadores: Jogador[];
  turnoDe: string;
  mesa: { jogadorId: string, carta: Carta }[];
  rodadasVencidas: { jogadorId: string }[];
  placar: Record<string, number>;
  quemIniciouMao: string;
  valorMao: number;
  trucoState: {
    quemPediu: string;
    quemResponde: string;
  };
}

const salas: Record<string, Sala> = {};

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

function iniciarNovaMao(sala: Sala, nomeDaSala: string) {
  const baralho = embaralhar(criarBaralho());
  sala.jogadores.forEach((jogador, index) => {
    jogador.mao = baralho.slice(index * 3, index * 3 + 3);
  });
  
  if (sala.quemIniciouMao) {
      const indexIniciante = sala.jogadores.findIndex(j => j.id === sala.quemIniciouMao);
      const proximoInicianteIndex = (indexIniciante + 1) % sala.jogadores.length;
      sala.quemIniciouMao = sala.jogadores[proximoInicianteIndex].id;
  } else if (sala.jogadores.length > 0) {
      sala.quemIniciouMao = sala.jogadores[0].id;
  }
  
  sala.turnoDe = sala.quemIniciouMao;
  sala.mesa = [];
  sala.rodadasVencidas = [];
  sala.valorMao = 1;
  sala.trucoState = { quemPediu: '', quemResponde: '' };
  
  io.to(nomeDaSala).emit('atualizacao_de_estado', sala);
}

io.on('connection', (socket) => {
  console.log(`Jogador conectado: ${socket.id}`);

  socket.on('entrar_na_sala', (nomeDaSala) => {
    socket.join(nomeDaSala);

    if (!salas[nomeDaSala]) {
      salas[nomeDaSala] = { 
        jogadores: [], 
        turnoDe: '', 
        mesa: [], 
        rodadasVencidas: [], 
        placar: {},
        quemIniciouMao: '',
        valorMao: 1,
        trucoState: { quemPediu: '', quemResponde: '' }
      };
    }
    const sala = salas[nomeDaSala];
    
    sala.jogadores.push({ id: socket.id, mao: [] });
    sala.placar[socket.id] = 0;
    console.log(`Jogador ${socket.id} entrou na sala ${nomeDaSala}`);

    if (sala.jogadores.length === 2) {
      console.log(`Sala ${nomeDaSala} está cheia. Começando o jogo!`);
      iniciarNovaMao(sala, nomeDaSala);
    }
  });

  socket.on('jogar_carta', ({ nomeDaSala, carta }) => {
    const sala = salas[nomeDaSala];
    if (!sala || socket.id !== sala.turnoDe) return;

    const jogador = sala.jogadores.find(j => j.id === socket.id);
    if (jogador) {
      jogador.mao = jogador.mao.filter(c => !(c.valor === carta.valor && c.naipe === carta.naipe));
    }
    sala.mesa.push({ jogadorId: socket.id, carta: carta });
    
    const jogadorAtualIndex = sala.jogadores.findIndex(j => j.id === socket.id);
    const proximoJogadorIndex = (jogadorAtualIndex + 1) % sala.jogadores.length;
    sala.turnoDe = sala.jogadores[proximoJogadorIndex].id;

    if (sala.mesa.length === sala.jogadores.length) {
      const jogada1 = sala.mesa[0];
      const jogada2 = sala.mesa[1];
      const forca1 = getForca(jogada1.carta);
      const forca2 = getForca(jogada2.carta);
      
      let vencedorRodadaId = '';
      if (forca1 > forca2) vencedorRodadaId = jogada1.jogadorId;
      else if (forca2 > forca1) vencedorRodadaId = jogada2.jogadorId;
      else vencedorRodadaId = 'empate';

      sala.rodadasVencidas.push({ jogadorId: vencedorRodadaId });
      io.to(nomeDaSala).emit('fim_da_rodada', { vencedorId: vencedorRodadaId });

      let vencedorMaoId = '';
      const vitoriasJogador1 = sala.rodadasVencidas.filter(v => v.jogadorId === sala.jogadores[0].id).length;
      const vitoriasJogador2 = sala.rodadasVencidas.filter(v => v.jogadorId === sala.jogadores[1].id).length;

      if (vitoriasJogador1 >= 2) vencedorMaoId = sala.jogadores[0].id;
      if (vitoriasJogador2 >= 2) vencedorMaoId = sala.jogadores[1].id;
      if (sala.rodadasVencidas.length >= 2 && !vencedorMaoId) {
        if (sala.rodadasVencidas[0].jogadorId === 'empate' && vitoriasJogador1 === 1) vencedorMaoId = sala.jogadores[0].id;
        if (sala.rodadasVencidas[0].jogadorId === 'empate' && vitoriasJogador2 === 1) vencedorMaoId = sala.jogadores[1].id;
      }
      if (sala.rodadasVencidas.length === 3 && !vencedorMaoId) vencedorMaoId = "Ninguém pontua";

      setTimeout(() => {
        if (vencedorMaoId) {
          if (sala.placar[vencedorMaoId] !== undefined) {
            sala.placar[vencedorMaoId] += sala.valorMao;
          }
          io.to(nomeDaSala).emit('fim_da_mao', { vencedorMaoId });
          setTimeout(() => iniciarNovaMao(sala, nomeDaSala), 2000);
        } else {
          sala.mesa = [];
          sala.turnoDe = vencedorRodadaId !== 'empate' ? vencedorRodadaId : sala.quemIniciouMao;
          io.to(nomeDaSala).emit('atualizacao_de_estado', sala);
        }
      }, 2000);
    } else {
      io.to(nomeDaSala).emit('atualizacao_de_estado', sala);
    }
  });

  socket.on('pedir_truco', ({ nomeDaSala }) => {
    const sala = salas[nomeDaSala];
    if (!sala) return;

    const oponente = sala.jogadores.find(j => j.id !== socket.id);
    if (!oponente) return;
    
    sala.trucoState.quemPediu = socket.id;
    sala.trucoState.quemResponde = oponente.id;
    
    io.to(nomeDaSala).emit('atualizacao_de_estado', sala);
  });

  socket.on('responder_truco', ({ nomeDaSala, resposta }) => {
    const sala = salas[nomeDaSala];
    if (!sala || socket.id !== sala.trucoState.quemResponde) return;

    if (resposta === 'aceitar') {
      sala.valorMao = 3;
      sala.trucoState = { quemPediu: '', quemResponde: '' };
      io.to(nomeDaSala).emit('atualizacao_de_estado', sala);
    } else if (resposta === 'correr') {
      const vencedorId = sala.trucoState.quemPediu;
      sala.placar[vencedorId] += sala.valorMao;
      io.to(nomeDaSala).emit('fim_da_mao', { vencedorMaoId: vencedorId });
      setTimeout(() => iniciarNovaMao(sala, nomeDaSala), 2000);
    }
  });

  socket.on('disconnect', () => { console.log(`Jogador desconectado: ${socket.id}`); });
});

const PORT = 3000;
httpServer.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));