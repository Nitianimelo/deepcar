// Motorização, sistema e fabricação de um esquema, um por linha e com rótulo.
// Nas telas estreitas não há espaço para colunas: juntar tudo numa linha cortada com "…"
// escondia justamente o que o mecânico precisa para escolher o esquema certo.
import type { Esquema } from '../lib/acervo'

function detalhesEsquema(e: Esquema): [string, string][] {
  const sistema = [e.codigoMotor, e.gerenciamento].filter(Boolean).join(' · ')
  const campos: [string, string | null][] = [
    ['Motorização', e.motorizacao],
    ['Sistema', sistema || null],
    ['Fabricação', e.producao],
  ]
  return campos.filter((c): c is [string, string] => !!c[1])
}

export function DetalhesEsquema({ e, className = '' }: { e: Esquema; className?: string }) {
  const campos = detalhesEsquema(e)
  if (!campos.length) return null
  return (
    <dl className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px] leading-snug ${className}`}>
      {campos.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-4">{k}</dt>
          <dd className="code break-words text-ink-2">{v}</dd>
        </div>
      ))}
    </dl>
  )
}
