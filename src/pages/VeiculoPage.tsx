import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ChevronRight, FlaskConical } from 'lucide-react'
import { consultarPlaca, formatarPlaca, type Veiculo } from '../lib/placa'
import { ESQUEMAS, type Esquema } from '../data/esquemas'
import { NAV, SECTION_META, type SectionKey } from '../data/nav'
import { TracePad } from '../components/TracePad'

type Estado = { fase: 'carregando' } | { fase: 'ok'; veiculo: Veiculo } | { fase: 'erro'; msg: string }

export default function VeiculoPage() {
  const { placa = '' } = useParams()
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' })

  useEffect(() => {
    let vivo = true
    setEstado({ fase: 'carregando' })
    consultarPlaca(placa)
      .then((v) => vivo && setEstado({ fase: 'ok', veiculo: v }))
      .catch((e: Error) => vivo && setEstado({ fase: 'erro', msg: e.message }))
    return () => { vivo = false }
  }, [placa])

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <p className="code text-[11px] uppercase tracking-[0.2em] text-ink-4">Consulta por placa</p>
      <h1 className="code mt-1.5 text-[26px] font-semibold tracking-[0.08em] sm:text-3xl">{formatarPlaca(placa)}</h1>

      {estado.fase === 'carregando' && <Carregando />}
      {estado.fase === 'erro' && <Erro msg={estado.msg} />}
      {estado.fase === 'ok' && <Resultado v={estado.veiculo} />}
    </div>
  )
}

function Carregando() {
  return (
    <div className="mt-6 rounded-xl border seam bg-bench-2 p-6">
      <div className="flex items-center gap-3 text-ink-3">
        <span className="h-2 w-2 animate-pulse rounded-full bg-trace" />
        Consultando base de veículos…
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-bench-3" />)}
      </div>
    </div>
  )
}

function Erro({ msg }: { msg: string }) {
  return (
    <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-warn/30 bg-warn/8 p-5 text-[14px]">
      <AlertTriangle size={18} className="mt-0.5 flex-none text-warn" />
      <div>
        <p className="text-ink-1">Não foi possível identificar o veículo.</p>
        <p className="mt-1 text-ink-3">{msg}</p>
      </div>
    </div>
  )
}

function Resultado({ v }: { v: Veiculo }) {
  const sistemas = useMemo(() => sistemasDisponiveis(v), [v])
  const ano = v.anoFabricacao && v.anoModelo && v.anoFabricacao !== v.anoModelo
    ? `${v.anoFabricacao}/${v.anoModelo}`
    : String(v.anoModelo ?? v.anoFabricacao ?? '—')

  return (
    <>
      {/* ficha do veículo */}
      <div className="relative mt-6 rounded-xl border seam bg-bench-2 p-6">
        <TracePad className="trace-pad absolute left-[-12px] top-[38px]" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[13px] uppercase tracking-[0.08em] text-ink-3">{v.marca ?? 'Marca não informada'}</p>
            <h2 className="mt-0.5 text-2xl font-semibold tracking-tight">{v.modelo ?? 'Modelo não informado'}</h2>
          </div>
          <div className="code rounded-lg border seam bg-bench-1 px-3.5 py-2 text-[13px]">
            <span className="text-ink-4">Ano </span><span className="text-ink-1">{ano}</span>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-[14px] sm:grid-cols-4">
          {campos(v).map((c) => <Campo key={c.k} {...c} />)}
        </dl>

        {v.origem === 'simulado' && (
          <p className="code mt-5 flex items-center gap-2 text-[11.5px] text-warn">
            <FlaskConical size={13} /> Dados simulados. Configure FALCON_TOKEN no .env para consultar a base real.
          </p>
        )}
      </div>

      {/* sistemas disponíveis */}
      <div className="mt-8">
        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Sistemas disponíveis</h3>
            <p className="mt-0.5 text-[14px] text-ink-3">Esquemas do catálogo compatíveis com este veículo.</p>
          </div>
          <span className="code text-[12px] text-ink-4">{sistemas.reduce((n, s) => n + s.esquemas.length, 0)} esquemas</span>
        </div>

        {sistemas.length === 0 ? (
          <div className="mt-4 rounded-xl border seam bg-bench-2 p-6 text-[14px]">
            <p className="text-ink-1">Ainda não há esquemas cadastrados para este veículo.</p>
            <p className="mt-1 text-ink-3">Navegue pelos sistemas no menu lateral para procurar por modelo semelhante.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {sistemas.map((s) => {
              const Icon = s.icon
              return (
                <div key={s.key} className="rounded-xl border seam bg-bench-2">
                  <div className="flex items-center gap-2.5 border-b seam-soft px-4 py-3">
                    <Icon size={17} className="text-trace" />
                    <span className="font-medium">{SECTION_META[s.key].titulo}</span>
                    <span className="code ml-auto text-[11px] text-ink-4">{s.esquemas.length}</span>
                  </div>
                  <ul>
                    {s.esquemas.map((e) => (
                      <li key={e.id} className="border-t seam-soft first:border-t-0">
                        <Link to={`/app/esquema/${e.id}`} className="group flex items-center gap-3 px-4 py-2.5 hover:bg-bench-3">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] text-ink-1">{e.montadora} {e.modelo}</span>
                            <span className="code block truncate text-[12px] text-ink-4">{e.modulo} · {e.anos}</span>
                          </span>
                          <ChevronRight size={16} className="text-ink-4 group-hover:text-trace" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

// Só mostra o que o provedor retornou; campos vazios não ocupam espaço.
function campos(v: Veiculo): { k: string; v: string; mono?: boolean }[] {
  const todos: { k: string; v: string | null | undefined; mono?: boolean }[] = [
    { k: 'Combustível', v: v.combustivel },
    { k: 'Motor', v: v.motor, mono: true },
    { k: 'Cilindrada', v: v.cilindradas ? `${v.cilindradas} cm³` : null, mono: true },
    { k: 'Potência', v: v.potencia ? `${v.potencia} cv` : null, mono: true },
    { k: 'Cor', v: v.cor },
    { k: 'Tipo', v: v.segmento },
    { k: 'Município', v: v.municipio && v.uf ? `${v.municipio} · ${v.uf}` : v.municipio },
  ]
  return todos.filter((c): c is { k: string; v: string; mono?: boolean } => !!c.v)
}

function Campo({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[12px] text-ink-4">{k}</dt>
      <dd className={`mt-0.5 text-ink-1 ${mono ? 'code' : ''}`}>{v}</dd>
    </div>
  )
}

/* ── Ponto de extensão ───────────────────────────────────────────────
   Decide quais esquemas se aplicam ao veículo consultado.
   Hoje: casa montadora + primeira palavra do modelo + ano dentro da faixa.
   Substituir por regra própria (tabela de compatibilidade, API, etc.).  */
export function sistemasDisponiveis(v: Veiculo) {
  const marca = norm(v.marca)
  const modeloTokens = norm(v.modelo).split(' ').filter((t) => t.length > 2)
  const ano = v.anoModelo ?? v.anoFabricacao

  const compativeis = ESQUEMAS.filter((e) => {
    if (norm(e.montadora) !== marca) return false
    const m = norm(e.modelo)
    if (!modeloTokens.some((t) => m.includes(t))) return false
    if (ano && !anoNaFaixa(ano, e.anos)) return false
    return true
  })

  const porSecao = new Map<SectionKey, Esquema[]>()
  for (const e of compativeis) porSecao.set(e.secao, [...(porSecao.get(e.secao) ?? []), e])

  // mantém a ordem do menu
  const ordem = NAV.flatMap((n) => (n.kind === 'group' ? n.children : [n]))
  return ordem
    .filter((n) => porSecao.has(n.key))
    .map((n) => ({ key: n.key, icon: n.icon, esquemas: porSecao.get(n.key)! }))
}

function norm(s: string | null | undefined) {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

function anoNaFaixa(ano: number, faixa: string) {
  const [a, b] = faixa.split(/[–-]/).map((x) => parseInt(x, 10))
  if (!Number.isFinite(a)) return true
  return ano >= a && ano <= (Number.isFinite(b) ? b : a)
}
