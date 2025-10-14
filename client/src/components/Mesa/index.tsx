import { Carta, type CartaInfo } from '../Carta';

interface Jogador {
  id: string;
  nome: string;
}

interface MesaProps {
  cartasNaMesa: { jogadorId: string, carta: CartaInfo }[];
  jogadores: Jogador[];
}

export function Mesa({ cartasNaMesa, jogadores }: MesaProps) {
  return (
    <div className="mesaContainer">
      <div className="cartasNaMesa">
        {cartasNaMesa.map(({ jogadorId, carta }) => {
          const jogador = jogadores.find(j => j.id === jogadorId);
          return (
            <div key={jogadorId}>
              <Carta cartaInfo={carta} onCartaClick={() => {}} />
              <p className="nomeJogador">{jogador?.nome}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}