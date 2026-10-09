// Campo de placa da página de vendas (09/10/2026): NÃO consulta a placa — cada consulta gasta crédito do provedor
// (decisão do dono). Ao tocar em "Ver os esquemas", leva aos planos com a placa em destaque ("Para consultar a placa
// ABC-1D23 ... escolha um plano"); quem assina consulta à vontade dentro da plataforma.
import { useState, type FormEvent } from 'react'
import { ArrowRight, ScanLine } from 'lucide-react'
import { formatarPlaca, placaValida } from '../../lib/placa'
import { registrar as anotar } from '../../lib/log'
import { EVENTO_CARRO, type CarroEscolhido } from './BuscaCarro'

export function PreviaPlaca() {
  const [placa, setPlaca] = useState('')
  const ok = placaValida(placa)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!ok) return
    const detalhe: CarroEscolhido = { nome: formatarPlaca(placa), secoes: [], placa: true }
    window.dispatchEvent(new CustomEvent(EVENTO_CARRO, { detail: detalhe }))
    anotar('placa_landing', { placa: formatarPlaca(placa) })
    document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <ScanLine size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" />
          <input
            className="field code pl-12 text-[17px] uppercase tracking-[0.14em]"
            placeholder="ABC-1D23"
            value={placa}
            onChange={(e) => setPlaca(formatarPlaca(e.target.value))}
            autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={8}
            aria-label="Placa do veículo"
          />
        </label>
        <button type="submit" className="btn-cta btn-cta-grande inline-flex items-center justify-center gap-2 px-6" disabled={!ok}>
          Ver os esquemas <ArrowRight size={18} />
        </button>
      </form>
      <p className="code mt-3 text-[11.5px] text-ink-4">Placas Mercosul e padrão antigo. A consulta pela placa é liberada com o plano.</p>
    </>
  )
}
