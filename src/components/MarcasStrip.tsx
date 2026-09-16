// Faixa contínua com os símbolos das montadoras do acervo, em duas linhas que correm em sentidos opostos.
// Pausa no hover e fica parada quando o sistema pede menos movimento.
import MARCAS from '../data/marcas.json'
import { LogoMarca } from './LogoMarca'

const TODAS = Object.keys(MARCAS).filter((m) => !/ Caminhões$/.test(m))

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
                className="grid h-[72px] w-[148px] flex-none place-items-center rounded-xl border seam bg-bench-1/80 text-ink-3 transition-colors hover:border-trace/40 hover:text-ink-1"
              >
                <LogoMarca marca={m} altura={26} larguraMax={104} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
