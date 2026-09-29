// O miolo dos cartões de plano (landing, aba Plano da conta e convite depois do teste).
// Em vez de uma lista de ✓, um chicote: cada sistema é um fio com a sua cor (como no esquema elétrico) ligando o
// nome aos módulos. Módulo liberado = fio energizado na cor do sistema, com LED; fora do plano = fio cortado,
// cinza e com cadeado. O mecânico vê de relance o que ganha e o que fica de fora. Cores: tokens --color-fio-*.
import type { CSSProperties } from 'react'
import { Headset, Lock, ScanLine, Smartphone, TabletSmartphone } from 'lucide-react'
import { NAV, type SectionKey } from '../data/nav'
import type { PlanoVenda } from '../data/planos'

/** Cor do fio de cada grupo do menu. */
const FIO: Record<string, string> = {
  'Injeção Eletrônica': 'var(--color-fio-vermelho)',
  ABS: 'var(--color-fio-amarelo)',
  'Elétrica': 'var(--color-fio-azul)',
  'Câmbio': 'var(--color-fio-verde)',
}

/** Linhas do painel na ordem do menu: grupo com Leve/Diesel, ou um sistema só (ABS). */
const LINHAS = NAV.map((n) =>
  n.kind === 'group'
    ? { rotulo: n.label, icone: n.icon, modulos: n.children.map((c) => ({ key: c.key, rotulo: c.label })) }
    : { rotulo: n.label, icone: n.icon, modulos: [{ key: n.key, rotulo: 'ABS e ESP' }] },
)
const TOTAL = LINHAS.reduce((t, l) => t + l.modulos.length, 0)

const comFio = (cor: string) => ({ '--fio': cor }) as CSSProperties

function Modulo({ rotulo, aceso, largo }: { rotulo: string; aceso: boolean; largo: boolean }) {
  return (
    <span
      className={`modulo relative z-10 flex h-8 min-w-0 items-center gap-1.5 rounded-md border px-2 text-[12.5px] font-medium ${largo ? 'col-span-2' : ''} ${
        aceso ? 'modulo-aceso text-ink-1' : 'modulo-cortado border-dashed text-ink-4'
      }`}
    >
      {aceso ? <span aria-hidden="true" className="led h-2 w-2 flex-none rounded-full" /> : <Lock size={11} className="flex-none" aria-hidden="true" />}
      <span className="truncate">{rotulo}</span>
      <span className="sr-only">{aceso ? '(incluso)' : '(não incluso)'}</span>
    </span>
  )
}

export function PainelSistemas({ p }: { p: PlanoVenda }) {
  const tem = (k: SectionKey) => p.secoes.includes(k)
  const acesos = p.secoes.length
  const tudo = acesos === TOTAL
  return (
    <div className="painel-sistemas rounded-xl border seam bg-well/80 p-3 sm:p-3.5">
      <div className="flex items-center justify-between gap-3 px-0.5">
        {/* as quatro cores do chicote, lado a lado: o "logo" do painel */}
        <span className="flex items-center gap-2 text-[12.5px] font-medium text-ink-2">
          <span aria-hidden="true" className="flex gap-[3px]">
            {Object.values(FIO).map((c) => <span key={c} className="h-3.5 w-[5px] rounded-full" style={{ background: c }} />)}
          </span>
          Sistemas
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${tudo ? 'contagem-tudo' : 'bg-bench-3 text-ink-2'}`}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {acesos} de {TOTAL}
        </span>
      </div>
      {/* a lista inteira é uma grade só (cada linha com display: contents): a coluna dos nomes fica com a largura
          do nome mais longo e os módulos alinham em todas as linhas */}
      <ul className="mt-3 grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-1.5 gap-y-2">
        {LINHAS.map(({ rotulo, icone: Icone, modulos }) => {
          const algum = modulos.some((m) => tem(m.key))
          return (
            <li
              key={rotulo}
              style={comFio(FIO[rotulo] ?? 'var(--color-trace)')}
              className={`linha-fio contents ${algum ? 'fio-vivo' : 'fio-morto'}`}
            >
              <span className="flex min-w-0 items-center gap-2 text-[12.5px] font-medium">
                <span className="fio-chip grid h-6 w-6 flex-none place-items-center rounded-md">
                  <Icone size={13} />
                </span>
                <span className={`truncate ${algum ? 'text-ink-1' : 'text-ink-4'}`}>{rotulo.replace('Injeção Eletrônica', 'Injeção')}</span>
                {/* o fio sai do nome e segue por trás dos módulos até a ponta */}
                <span aria-hidden="true" className="fio -mr-1.5 h-[2px] min-w-3 flex-1 rounded-l-full" />
              </span>
              <span className="relative col-span-2 grid grid-cols-2 gap-1.5">
                <span aria-hidden="true" className="fio pointer-events-none absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2" />
                {modulos.map((m) => <Modulo key={m.key} rotulo={m.rotulo} aceso={tem(m.key)} largo={modulos.length === 1} />)}
              </span>
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
    { icone: ScanLine, cor: 'var(--color-fio-vermelho)', titulo: 'Busca pela placa', detalhe: p.placa ? 'Digite a placa e ache o esquema' : 'Só no plano Full', tem: p.placa },
    { icone: Smartphone, cor: 'var(--color-fio-azul)', titulo: `${p.aparelhos} aparelhos`, detalhe: 'Conectados ao mesmo tempo', tem: true, aparelhos: p.aparelhos },
    { icone: TabletSmartphone, cor: 'var(--color-fio-verde)', titulo: 'App mobile', detalhe: 'Celular, tablet e computador', tem: true },
    { icone: Headset, cor: 'var(--color-fio-amarelo)', titulo: 'Suporte', detalhe: 'Fale com a gente', tem: true },
  ]
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-3">
      {extras.map(({ icone: Icone, cor, titulo, detalhe, tem, aparelhos }) => (
        <li key={titulo} style={comFio(cor)} className="flex min-w-0 items-start gap-2.5">
          <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg ${tem ? 'extra-chip' : 'border border-dashed border-[color:var(--seam-1)] text-ink-4'}`}>
            {tem ? <Icone size={15} /> : <Lock size={13} />}
          </span>
          <span className="min-w-0 leading-tight">
            <span className={`flex items-center gap-1.5 text-[13px] font-medium ${tem ? 'text-ink-1' : 'text-ink-4 line-through decoration-ink-4/60'}`}>
              {titulo}
              {aparelhos && (
                <span aria-hidden="true" className="flex gap-0.5">
                  {Array.from({ length: aparelhos }, (_, i) => <span key={i} className="h-2.5 w-1.5 rounded-[2px]" style={{ background: cor }} />)}
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
