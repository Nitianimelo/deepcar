import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ChevronRight, FlaskConical } from 'lucide-react'
import { consultarPlaca, formatarPlaca, type Veiculo } from '../lib/placa'
import { carregarTudo, useCarga, type Esquema } from '../lib/acervo'
import { NAV, SECTION_META, type SectionKey } from '../data/nav'
import { TracePad } from '../components/TracePad'
import { LogoMarca } from '../components/LogoMarca'
import { DetalhesEsquema } from '../components/DetalhesEsquema'
import MARCAS from '../data/marcas.json'

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

const TODAS_SECOES = NAV.flatMap((n) => (n.kind === 'group' ? n.children : [n])).map((n) => n.key)

function Resultado({ v }: { v: Veiculo }) {
  const catalogo = useCarga(() => carregarTudo(TODAS_SECOES), [])
  const sistemas = useMemo(() => (catalogo.estado === 'ok' ? sistemasDisponiveis(v, catalogo.dados) : []), [v, catalogo])
  // nome da marca como está no catálogo ("VOLKSWAGEN" → "Volkswagen"), para achar o símbolo
  const marcaLogo = useMemo(() => {
    const alvo = marcaCanonica(v.marca ?? v.modelo?.split('/')[0])
    return alvo ? Object.keys(MARCAS).find((m) => marcaCanonica(m) === alvo) : undefined
  }, [v])
  const ano = v.anoFabricacao && v.anoModelo && v.anoFabricacao !== v.anoModelo
    ? `${v.anoFabricacao}/${v.anoModelo}`
    : String(v.anoModelo ?? v.anoFabricacao ?? '—')

  return (
    <>
      {/* ficha do veículo */}
      <div className="relative mt-6 rounded-xl border seam bg-bench-2 p-6">
        <TracePad className="trace-pad absolute left-[-12px] top-[38px]" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-5">
            {marcaLogo && (
              <span className="grid h-14 w-20 flex-none place-items-center rounded-lg border seam bg-bench-1 text-ink-1">
                <LogoMarca marca={marcaLogo} altura={26} larguraMax={60} />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[13px] uppercase tracking-[0.08em] text-ink-3">{v.marca ?? 'Marca não informada'}</p>
              <h2 className="mt-0.5 text-2xl font-semibold tracking-tight">{v.modelo ?? 'Modelo não informado'}</h2>
            </div>
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
            <FlaskConical size={13} /> Veículo de demonstração.
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
        </div>

        {catalogo.estado === 'carregando' ? (
          <div className="mt-4 h-24 animate-pulse rounded-xl bg-bench-2" aria-busy="true" />
        ) : sistemas.length === 0 ? (
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
                  </div>
                  <ListaSistema esquemas={s.esquemas} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

const PREVIA = 6

function ListaSistema({ esquemas }: { esquemas: Esquema[] }) {
  const [todos, setTodos] = useState(false)
  const lista = todos ? esquemas : esquemas.slice(0, PREVIA)
  return (
    <>
      <ul>
        {lista.map((e) => (
          <li key={e.id} className="border-t seam-soft first:border-t-0">
            <Link to={`/app/esquema/${e.id}`} className="group flex items-center gap-3 px-4 py-3 hover:bg-bench-3">
              <span className="min-w-0 flex-1">
                <span className="block break-words text-[14px] font-medium text-ink-1">{e.marca} {e.modelo}</span>
                <DetalhesEsquema e={e} className="mt-1.5" />
              </span>
              <ChevronRight size={16} className="flex-none text-ink-4 group-hover:text-trace" />
            </Link>
          </li>
        ))}
      </ul>
      {esquemas.length > PREVIA && (
        <button
          type="button"
          onClick={() => setTodos((v) => !v)}
          className="w-full border-t seam-soft px-4 py-2.5 text-left text-[13px] font-medium text-trace hover:bg-bench-3 hover:text-trace-hi"
        >
          {todos ? 'Mostrar menos' : 'Ver todos'}
        </button>
      )}
    </>
  )
}

// Só mostra o que o provedor retornou; campos vazios não ocupam espaço.
type CampoVeiculo = { k: string; v: string; mono?: boolean; largo?: boolean }

function campos(v: Veiculo): CampoVeiculo[] {
  const todos: (Omit<CampoVeiculo, 'v'> & { v: string | null | undefined })[] = [
    { k: 'Combustível', v: v.combustivel },
    { k: 'Motor', v: v.motor, mono: true },
    { k: 'Cilindrada', v: v.cilindradas ? `${v.cilindradas} cm³` : null, mono: true },
    { k: 'Potência', v: v.potencia ? `${v.potencia} cv` : null, mono: true },
    { k: 'Cor', v: v.cor },
    { k: 'Tipo', v: v.segmento },
    { k: 'Procedência', v: v.importado === null ? null : v.importado ? 'Importado' : 'Nacional' },
    { k: 'Município', v: v.municipio && v.uf ? `${v.municipio} · ${v.uf}` : v.municipio },
    // 17 caracteres: no celular ocupa a linha inteira para não quebrar no meio
    { k: 'Chassi', v: v.chassi, mono: true, largo: true },
  ]
  return todos.filter((c): c is CampoVeiculo => !!c.v)
}

function Campo({ k, v, mono = false, largo = false }: CampoVeiculo) {
  return (
    <div className={largo ? 'col-span-2 sm:col-span-1' : ''}>
      <dt className="text-[12px] text-ink-4">{k}</dt>
      <dd className={`mt-0.5 text-ink-1 ${mono ? 'code break-all' : 'break-words'}`}>{v}</dd>
    </div>
  )
}

/* ── Ponto de extensão ───────────────────────────────────────────────
   Decide quais esquemas se aplicam ao veículo consultado.
   Hoje: casa montadora (com apelidos) + primeira palavra do modelo + ano dentro da produção.
   Substituir por regra própria (tabela de compatibilidade, API, etc.).  */
const APELIDOS: Record<string, string> = {
  vw: 'volkswagen', 'vw volkswagen': 'volkswagen', gm: 'chevrolet', 'gm chevrolet': 'chevrolet', chev: 'chevrolet',
  mercedes: 'mercedes benz', 'm benz': 'mercedes benz', mb: 'mercedes benz', citroen: 'citroen',
  'land rover': 'land rover', lr: 'land rover', 'jac motors': 'jac', 'caoa chery': 'chery', 'caoa hyundai': 'hyundai',
}
const marcaCanonica = (s: string | null | undefined) => {
  const n = norm(s).replace(/-/g, ' ')
  return APELIDOS[n] ?? n
}

export function sistemasDisponiveis(v: Veiculo, esquemas: Esquema[]) {
  // bases de placa às vezes trazem "VW/GOL 1.6" no modelo e a marca vazia
  let marcaV = v.marca, modeloV = v.modelo ?? ''
  if (modeloV.includes('/')) {
    const [a, ...b] = modeloV.split('/')
    if (!marcaV || marcaCanonica(a) === marcaCanonica(marcaV)) { marcaV = marcaV || a; modeloV = b.join(' ') }
  }
  const marca = marcaCanonica(marcaV)
  const modelo1 = norm(modeloV).replace(/[^a-z0-9 ]/g, ' ').split(' ').find((t) => t.length > 1) ?? ''
  const ano = v.anoModelo ?? v.anoFabricacao

  // alguns nomes de arquivo trazem o ano na motorização ("2.4 Diesel 08 1997 a 08 2001")
  const producaoDe = (e: Esquema) => e.producao ?? [e.motorizacao, e.gerenciamento].filter(Boolean).join(' ')
  let compativeis = esquemas.filter((e) => {
    if (marcaCanonica(e.marca) !== marca || !modelo1) return false
    const m = norm(e.modelo).replace(/[^a-z0-9 ]/g, ' ').split(' ')
    if (!m.includes(modelo1)) return false
    if (ano && !anoNaFaixa(ano, producaoDe(e))) return false
    return true
  })

  // Refinos por sistema (motor antes do ano): num sistema em que algum esquema passa no critério,
  // ficam só os que passam; nos demais sistemas nada é removido.
  const refinar = (criterio: (e: Esquema) => boolean) => {
    const secoes = new Set(compativeis.filter(criterio).map((e) => e.secao))
    compativeis = compativeis.filter((e) => !secoes.has(e.secao) || criterio(e))
  }
  // cilindrada da placa (1598 cm³ → "1.6")
  if (v.cilindradas && v.cilindradas > 500) {
    const litros = (Math.round(v.cilindradas / 100) / 10).toFixed(1)
    const re = new RegExp(`(^|[^0-9.])${litros.replace('.', '\\.')}(?![0-9])`)
    refinar((e) => re.test(`${e.motorizacao ?? ''} ${e.modelo}`))
  }
  // esquema com ano que confirma o veículo dispensa os que não informam ano
  if (ano) refinar((e) => /\b(19|20)\d{2}\b/.test(producaoDe(e)))

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

// "1997 a 2001", "06/2018 em diante", "2012 a 2017"; sem ano legível não exclui o esquema
function anoNaFaixa(ano: number, producao: string | null) {
  const anos = (producao ?? '').match(/\b(19|20)\d{2}\b/g)?.map(Number) ?? []
  if (!anos.length) return true
  const ini = Math.min(...anos)
  const fim = /em diante/i.test(producao ?? '') ? 9999 : Math.max(...anos)
  return ano >= ini && ano <= fim
}
