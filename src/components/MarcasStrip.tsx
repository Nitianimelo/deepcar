// Faixa contínua com os símbolos das montadoras do acervo, em duas linhas que correm em sentidos opostos.
// Pausa no hover e fica parada quando o sistema pede menos movimento.
// Cada símbolo sai na cor oficial da marca, sobre cartão claro: várias cores de marca são azul-marinho
// ou vermelho escuro e sumiriam no fundo escuro da página.
import MARCAS from '../data/marcas.json'
import { LogoMarca } from './LogoMarca'

const TODAS = Object.keys(MARCAS).filter((m) => !/ Caminhões$/.test(m))

/** Cor oficial (ou a predominante do logotipo) de cada marca. Marca sem cor aqui sai grafite. */
const CORES: Record<string, string> = {
  Agrale: '#D6001C',
  'Alfa Romeo': '#981E32',
  Audi: '#BB0A30',
  BMW: '#0066B1',
  Caterpillar: '#E0A100',
  Chery: '#C8102E',
  Chevrolet: '#CD9834',
  Chrysler: '#0B2D62',
  Citroën: '#DA291C',
  Daewoo: '#0055A5',
  DAF: '#004B93',
  Daihatsu: '#E60012',
  Dodge: '#BA0C2F',
  Fiat: '#941711',
  Ford: '#003478',
  Foton: '#0068B7',
  Honda: '#E40521',
  Hummer: '#B8860B',
  Hyundai: '#002C5F',
  International: '#D2232A',
  Isuzu: '#E60012',
  Iveco: '#004489',
  'JAC Motors': '#C8102E',
  Jaguar: '#01422D',
  Jeep: '#4B5320',
  Kia: '#BB162B',
  Lancia: '#0A3A7A',
  'Land Rover': '#005A2B',
  Lexus: '#1A1A1A',
  Lifan: '#0E63C4',
  Mahindra: '#DD052B',
  MAN: '#E40045',
  Marcopolo: '#F47920',
  Maserati: '#0C2340',
  Mazda: '#910A2D',
  'Mercedes-Benz': '#333F48',
  MINI: '#1A1A1A',
  Mitsubishi: '#E60012',
  Nissan: '#C3002F',
  Peugeot: '#152D4A',
  Porsche: '#B12B28',
  RAM: '#C8102E',
  Renault: '#EFB700',
  Scania: '#041E42',
  SEAT: '#EA0029',
  Sinotruk: '#DD0017',
  Smart: '#7FA800',
  SsangYong: '#032E65',
  Subaru: '#013C74',
  Suzuki: '#E30613',
  Toyota: '#EB0A1E',
  Troller: '#ED3237',
  Volkswagen: '#001E50',
  Volvo: '#003057',
}

export function MarcasStrip({ className = '' }: { className?: string }) {
  const meio = Math.ceil(TODAS.length / 2)
  const linhas = [TODAS.slice(0, meio), TODAS.slice(meio)]
  return (
    <div className={`space-y-5 ${className}`} aria-label="Montadoras no catálogo">
      {linhas.map((marcas, i) => (
        <div key={i} className="marquee-mask overflow-hidden">
          <ul className={`marquee gap-4 ${i ? 'reverse' : ''}`} style={{ '--dur': `${marcas.length * 2.4}s` } as React.CSSProperties}>
            {[...marcas, ...marcas].map((m, k) => (
              <li
                key={`${m}-${k}`}
                data-tip={k < marcas.length ? m : undefined}
                aria-hidden={k >= marcas.length}
                className="grid h-[72px] w-[148px] flex-none place-items-center rounded-xl border border-white/10 bg-[#F4F6F9] transition-transform hover:-translate-y-0.5"
              >
                <LogoMarca marca={m} altura={26} larguraMax={104} cor={CORES[m] ?? '#2B2F36'} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
