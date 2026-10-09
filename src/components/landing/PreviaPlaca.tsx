// Placa na página de vendas, sem conta (09/10/2026): mostra o veículo e quais diagramas existem para ele no acervo
// (o mesmo casamento da tela do veículo, lib/compatibilidade.ts), nunca o esquema. Termina em "Assinar": vai aos planos
// com o carro em destaque (o mesmo evento da busca por modelo). Antes levava ao cadastro do teste grátis.
// O servidor limita a 3 placas novas por IP em 24 h (api/placa/[placa].js → previaPlaca).
import { useState, type FormEvent } from 'react'
import { ArrowRight, Loader2, Lock, ScanLine } from 'lucide-react'
import { formatarPlaca, normalizarPlaca, placaValida, type Veiculo } from '../../lib/placa'
import { carregarTudo } from '../../lib/acervo'
import { sistemasDisponiveis } from '../../lib/compatibilidade'
import { SECTION_META, SECOES, type SectionKey } from '../../data/nav'
import { registrar as anotar } from '../../lib/log'
import { visitanteId } from '../../lib/pixel'
import { EVENTO_CARRO, type CarroEscolhido } from './BuscaCarro'

type Resultado = { v: Veiculo; sistemas: { key: SectionKey; total: number }[] }

export function PreviaPlaca() {
  const [placa, setPlaca] = useState('')
  const [estado, setEstado] = useState<'livre' | 'buscando'>('livre')
  const [erro, setErro] = useState<string | null>(null)
  const [r, setR] = useState<Resultado | null>(null)
  const ok = placaValida(placa)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!ok || estado === 'buscando') return
    setEstado('buscando'); setErro(null); setR(null)
    const limpa = normalizarPlaca(placa)
    try {
      const [resp, catalogo] = await Promise.all([
        fetch(`/api/placa/${encodeURIComponent(limpa)}?previa=1&v=${encodeURIComponent(visitanteId() ?? '')}`),
        carregarTudo(SECOES),
      ])
      const d = await resp.json().catch(() => ({}))
      if (!resp.ok) throw new Error(d?.erro ?? 'Não foi possível consultar esta placa agora.')
      const v = d as Veiculo
      const sistemas = sistemasDisponiveis(v, catalogo).map((s) => ({ key: s.key, total: s.esquemas.length }))
      setR({ v, sistemas })
      anotar('placa_landing', { marca: v.marca, modelo: v.modelo, ano: v.anoModelo ?? v.anoFabricacao, sistemas: sistemas.length })
    } catch (err) {
      setErro((err as Error).message || 'Não foi possível consultar esta placa agora.')
      anotar('placa_landing_erro', { erro: String((err as Error).message ?? '').slice(0, 120) })
    } finally {
      setEstado('livre')
    }
  }

  function assinar() {
    if (!r) return
    const nome = [r.v.marca, r.v.modelo, r.v.anoModelo ?? r.v.anoFabricacao].filter(Boolean).join(' ')
    const detalhe: CarroEscolhido = { nome, secoes: r.sistemas.map((s) => s.key) }
    window.dispatchEvent(new CustomEvent(EVENTO_CARRO, { detail: detalhe }))
    anotar('carro_para_planos', { carro: nome.slice(0, 80), origem: 'placa' })
    document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const total = r?.sistemas.reduce((a, s) => a + s.total, 0) ?? 0
  return (
    <>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <ScanLine size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" />
          <input
            className="field code pl-12 text-[17px] uppercase tracking-[0.14em]"
            placeholder="ABC-1D23"
            value={placa}
            onChange={(e) => { setPlaca(formatarPlaca(e.target.value)); setR(null); setErro(null) }}
            autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={8}
            aria-label="Placa do veículo"
          />
        </label>
        <button type="submit" className="btn-cta btn-cta-grande inline-flex items-center justify-center gap-2 px-6" disabled={!ok || estado === 'buscando'}>
          {estado === 'buscando' ? <Loader2 size={18} className="animate-spin" /> : null} Ver os esquemas
        </button>
      </form>
      <p className="code mt-3 text-[11.5px] text-ink-4">Placas Mercosul e padrão antigo. Sem cadastro.</p>

      <div aria-live="polite">
        {erro && <p className="mt-4 text-[14px] text-fault">{erro}</p>}
        {r && (
          <div className="mt-5 rounded-xl border border-trace/30 bg-pit/70 p-4 sm:p-5">
            <p className="code text-[11.5px] uppercase tracking-[0.18em] text-trace-hi">{r.v.marca ?? 'Veículo'}</p>
            <p className="mt-1 text-[19px] font-semibold leading-tight text-ink-1">{r.v.modelo ?? formatarPlaca(placa)}</p>
            <p className="mt-0.5 text-[14px] text-ink-3">
              {[r.v.anoFabricacao && r.v.anoModelo && r.v.anoFabricacao !== r.v.anoModelo ? `${r.v.anoFabricacao}/${r.v.anoModelo}` : (r.v.anoModelo ?? r.v.anoFabricacao), r.v.combustivel].filter(Boolean).join(' · ')}
            </p>
            {r.sistemas.length ? (
              <>
                <p className="mt-4 text-[14.5px] text-ink-2"><b className="font-semibold text-ink-1">{total} {total === 1 ? 'diagrama' : 'diagramas'}</b> para este veículo:</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {r.sistemas.map((s) => (
                    <li key={s.key} className="rounded-md bg-bench-3 px-2.5 py-1 text-[13px] text-ink-2">{SECTION_META[s.key]?.titulo ?? s.key} · {s.total}</li>
                  ))}
                </ul>
                <button type="button" onClick={assinar} className="btn-cta mt-5 inline-flex h-12 w-full items-center justify-center gap-2 px-6 sm:w-auto">
                  <Lock size={16} /> Assinar e abrir os esquemas <ArrowRight size={18} />
                </button>
              </>
            ) : (
              <p className="mt-4 text-[14.5px] text-ink-2">
                Não encontramos diagramas para este veículo pela placa. Procure pelo modelo na busca acima ou chame a gente no WhatsApp.
              </p>
            )}
          </div>
        )}
      </div>
    </>
  )
}
