// Define os tipos para identificar os times, usando os mesmos que você já tem
export type Time = 'vermelho' | 'azul';

// Define os possíveis estados do pedido de truco
type EstadoTruco = 'SEM_PEDIDO' | 'AGUARDANDO_RESPOSTA';

// Mapeia o valor atual da mão para o próximo valor possível
const PROXIMO_VALOR: Record<number, number> = {
  1: 3,  // Truco
  3: 6,  // Seis
  6: 9,  // Nove
  9: 12, // Doze
};

export class GerenciadorDeTruco {
  private valorDaMao!: number;
  private estado!: EstadoTruco;
  private timeComPermissao!: Time | 'AMBOS';
  private timeQuePediu!: Time | null;

  constructor() {
    this.reiniciarRodada();
  }

  public reiniciarRodada() {
    this.valorDaMao = 1;
    this.estado = 'SEM_PEDIDO';
    this.timeComPermissao = 'AMBOS';
    this.timeQuePediu = null;
  }
  
  public getValorDaMao(): number {
    return this.valorDaMao;
  }

  public getState() {
    return {
      valorDaMao: this.valorDaMao,
      estado: this.estado,
      timeComPermissao: this.timeComPermissao,
      timeQuePediu: this.timeQuePediu,
      proximoValor: PROXIMO_VALOR[this.valorDaMao]
    };
  }
  
  public pedirAumento(timeQueEstaPedindo: Time): { sucesso: boolean, mensagem: string } {
    if (this.timeComPermissao !== 'AMBOS' && this.timeComPermissao !== timeQueEstaPedindo) {
      return { sucesso: false, mensagem: `O time ${timeQueEstaPedindo} não tem permissão para pedir agora.` };
    }
    if (this.estado === 'AGUARDANDO_RESPOSTA') {
      return { sucesso: false, mensagem: 'Já existe um pedido aguardando resposta.' };
    }
    if (this.valorDaMao === 12) {
      return { sucesso: false, mensagem: 'A aposta já está em 12 e não pode ser aumentada.' };
    }

    const proximoValor = PROXIMO_VALOR[this.valorDaMao];
    this.estado = 'AGUARDANDO_RESPOSTA';
    this.timeQuePediu = timeQueEstaPedindo;
    this.timeComPermissao = timeQueEstaPedindo === 'vermelho' ? 'azul' : 'vermelho';
    
    return { sucesso: true, mensagem: `Time ${timeQueEstaPedindo} pediu ${this.getNomeDoAumento(proximoValor)}!` };
  }
  
  public aceitar(timeQueResponde: Time): { sucesso: boolean, mensagem: string, novoValor?: number } {
    if (!this.validarResposta(timeQueResponde)) {
      return { sucesso: false, mensagem: 'Não é seu time que deve responder.' };
    }
    
    const valorAceito = PROXIMO_VALOR[this.valorDaMao];
    this.valorDaMao = valorAceito;
    this.estado = 'SEM_PEDIDO';
    this.timeQuePediu = null;
    this.timeComPermissao = timeQueResponde;

    return { sucesso: true, mensagem: `A mão agora vale ${valorAceito} pontos.`, novoValor: valorAceito };
  }

  public correr(timeQueResponde: Time): { sucesso: boolean, mensagem: string, pontosGanhos?: number, timeVencedor?: Time } {
    if (!this.validarResposta(timeQueResponde)) {
      return { sucesso: false, mensagem: 'Não é seu time que deve correr.' };
    }

    const pontos = this.valorDaMao;
    const vencedor = this.timeQuePediu;
    this.reiniciarRodada();
    return { sucesso: true, mensagem: `Time ${timeQueResponde} correu! Time ${vencedor} ganha ${pontos} ponto(s).`, pontosGanhos: pontos, timeVencedor: vencedor! };
  }

  public aumentarAposta(timeQueEstaAumentando: Time): { sucesso: boolean, mensagem: string } {
    if (!this.validarResposta(timeQueEstaAumentando)) {
       return { sucesso: false, mensagem: 'Não é seu time que pode aumentar a aposta.' };
    }
    if (this.valorDaMao === 9) { // Se a aposta era 9, o próximo é 12 (não pode aumentar de novo)
        this.aceitar(timeQueEstaAumentando);
        return { sucesso: true, mensagem: 'Aposta aumentada para 12!' };
    }

    // Primeiro, o time "aceita" a aposta atual.
    const resultadoAceite = this.aceitar(timeQueEstaAumentando);
    if (!resultadoAceite.sucesso) {
      return resultadoAceite; // Retorna a mensagem de erro do aceite, se houver.
    }
    // Em seguida, o mesmo time pede o próximo aumento.
    return this.pedirAumento(timeQueEstaAumentando);
  }

  private validarResposta(timeQueResponde: Time): boolean {
    if (this.estado !== 'AGUARDANDO_RESPOSTA') return false;
    if (timeQueResponde === this.timeQuePediu) return false;
    return true;
  }
  
  private getNomeDoAumento(valor: number): string {
    switch(valor) {
      case 3: return 'TRUCO';
      case 6: return 'SEIS';
      case 9: return 'NOVE';
      case 12: return 'DOZE';
      default: return '';
    }
  }
}