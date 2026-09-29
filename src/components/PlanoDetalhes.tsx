// O miolo dos cartões de plano (landing, aba Plano da conta e convite depois do teste).
// Em vez de uma lista de ✓, um painel de módulos: cada sistema é um módulo com LED — aceso quando o plano
// libera, apagado com cadeado quando não. O mecânico vê de relance o que ganha e o que fica de fora.
import { Headset, Lock, ScanLine, Smartphone, TabletSmartphone } from 'lucide-react'
import { NAV, type SectionKey } from '../data/nav'
import type { PlanoVenda } from '../data/planos'

/** Linhas do painel na ordem do menu: grupo com Leve/Diesel, ou um sistema só (ABS). */
const LINHAS = NAV.map((n) =>
  n.kind === 'group'
    ? { rotulo: n.label, icone: n.icon, modulos: n.children.map((c) => ({ key: c.key, rotulo: c.label })) }
    : { rotulo: n.label, icone: n.icon, modulos: [{ key: n.key, rotulo: 'ABS e ESP' }] },
)
const TOTAL = LINHAS.reduce((t, l) => t + l.modulos.length, 0)

function Modulo({ rotulo, aceso, largo }: { rotulo: string; aceso: boolean; largo: boolean }) {
  return (
    <span
      className={`modulo flex h-8 items-center gap-2 rounded-md border px-2.5 text-[12.5px] ${largo ? 'col-span-2' : ''} ${
        aceso ? 'modulo-aceso border-ok/30 bg-ok/[0.08] text-ink-1' : 'border-dashed border-[color:var(--seam-1)] text-ink-4'
      }`}
    >
      {aceso ? <span aria-hidden="true" className="led h-1.5 w-1.5 flex-none rounded-full bg-ok" /> : <Lock size={11} className="flex-none" aria-hidden="true" />}
      <span className="truncate">{rotulo}</span>
      <span className="sr-only">{aceso ? '(incluso)' : '(não incluso)'}</span>
    </span>
  )
}

export function PainelSistemas({ p }: { p: PlanoVenda }) {
  const tem = (k: SectionKey) => p.secoes.includes(k)
  const acesos = p.secoes.length
  return (
    <div className="painel-sistemas rounded-xl border seam bg-well/70 p-3 sm:p-3.5">
      <div className="flex items-center justify-between gap-3 px-0.5">
        <span className="code text-[10.5px] uppercase tracking-[0.18em] text-ink-4">Sistemas liberados</span>
        <span className={`code text-[12px] ${acesos === TOTAL ? 'text-ok' : 'text-ink-3'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {acesos}/{TOTAL}
        </span>
      </div>
      <ul className="mt-2.5 space-y-1.5">
        {LINHAS.map(({ rotulo, icone: Icone, modulos }) => {
          const algum = modulos.some((m) => tem(m.key))
          return (
            <li key={rotulo} className="grid grid-cols-[minmax(0,6.6rem)_1fr_1fr] items-center gap-1.5">
              <span className={`flex min-w-0 items-center gap-1.5 text-[12.5px] ${algum ? 'text-ink-2' : 'text-ink-4'}`}>
                <Icone size={14} className={`flex-none ${algum ? 'text-trace-hi' : ''}`} />
                <span className="truncate">{rotulo.replace('Injeção Eletrônica', 'Injeção')}</span>
              </span>
              {modulos.map((m) => <Modulo key={m.key} rotulo={m.rotulo} aceso={tem(m.key)} largo={modulos.length === 1} />)}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** O que vem junto: placa, aparelhos, app e suporte — com o que falta à vista, apagado. */
export function ExtrasPlano({ p }: { p: PlanoVenda }) {
  const extras = [
    { icone: ScanLine, titulo: 'Busca pela placa', detalhe: p.placa ? 'Digite a placa e ache o esquema' : 'Só no plano Full', tem: p.placa },
    {
      icone: Smartphone,
      titulo: `${p.aparelhos} aparelhos`,
      detalhe: 'Conectados ao mesmo tempo',
      tem: true,
      aparelhos: p.aparelhos,
    },
    { icone: TabletSmartphone, titulo: 'App mobile', detalhe: 'Celular, tablet e computador', tem: true },
    { icone: Headset, titulo: 'Suporte', detalhe: 'Fale com a gente', tem: true },
  ]
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-3">
      {extras.map(({ icone: Icone, titulo, detalhe, tem, aparelhos }) => (
        <li key={titulo} className="flex min-w-0 items-start gap-2.5">
          <span
            className={`grid h-8 w-8 flex-none place-items-center rounded-lg border ${
              tem ? 'border-trace/30 bg-trace/10 text-trace-hi' : 'border-dashed border-[color:var(--seam-1)] text-ink-4'
            }`}
          >
            {tem ? <Icone size={15} /> : <Lock size={13} />}
          </span>
          <span className="min-w-0 leading-tight">
            <span className={`flex items-center gap-1.5 text-[13px] font-medium ${tem ? 'text-ink-1' : 'text-ink-4 line-through decoration-ink-4/60'}`}>
              {titulo}
              {aparelhos && (
                <span aria-hidden="true" className="flex gap-0.5">
                  {Array.from({ length: aparelhos }, (_, i) => <span key={i} className="h-2.5 w-1.5 rounded-[2px] bg-trace/70" />)}
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-[11.5px] text-ink-4">{detalhe}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
