import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ChevronRight, FlaskConical } from 'lucide-react'
import { consultarPlaca, formatarPlaca, normalizarPlaca, type Veiculo } from '../lib/placa'
import { carregarTudo, useCarga, type Esquema } from '../lib/acervo'
import { marcaCanonica, sistemasDisponiveis } from '../lib/compatibilidade'
import { registrarRecente, veiculoGuardado } from '../lib/recentes'
import { marcarTitulo } from '../lib/transicao'
import { SECOES, SECTION_META } from '../data/nav'
import { TracePad } from '../components/TracePad'
import { LogoMarca } from '../components/LogoMarca'
import { DetalhesEsquema } from '../components/DetalhesEsquema'
import MARCAS from '../data/marcas.json'
import { BloqueioPlano } from '../components/BloqueioPlano'
import { useAcesso } from '../lib/acesso'

type Estado = { fase: 'carregando' } | { fase: 'ok'; veiculo: Veiculo } | { fase: 'erro'; msg: string }

export default function VeiculoPage() {
  if (!useAcesso().podePlaca) return <BloqueioPlano titulo="Consulta por placa" oQue="A busca pela placa" />
  return <ConsultaVeiculo />
}

function ConsultaVeiculo() {
  const { placa = '' } = useParams()
  const [estado, setEstado] = useState<Estado>({ fase: 'carregando' })

  useEffect(() => {
    let vivo = true
    // placa já consultada nesta conta: marca, modelo e ano não mudam, não gasta outra consulta do provedor
    const guardado = veiculoGuardado(normalizarPlaca(placa))
    const consulta = guardado ? Promise.resolve(guardado) : consultarPlaca(placa)
    setEstado({ fase: 'carregando' })
    consulta
      .then((v) => {
        if (!vivo) return
        setEstado({ fase: 'ok', veiculo: v })
        registrarRecente({ tipo: 'placa', placa: v.placa, titulo: tituloVeiculo(v), detalhe: detalheVeiculo(v), veiculo: v })
      })
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

const anoDe = (v: Veiculo) =>
  v.anoFabricacao && v.anoModelo && v.anoFabricacao !== v.anoModelo
    ? `${v.anoFabricacao}/${v.anoModelo}`
    : String(v.anoModelo ?? v.anoFabricacao ?? '')

const tituloVeiculo = (v: Veiculo) => [v.marca, v.modelo].filter(Boolean).join(' ') || 'Veículo'
const detalheVeiculo = (v: Veiculo) => [formatarPlaca(v.placa), anoDe(v)].filter(Boolean).join(' · ')

function Carregando() {
  // o provedor costuma responder em 1–3 s; passado disso, avisa em vez de deixar a tela parada sem explicação
  const [demorando, setDemorando] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setDemorando(true), 5000)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="mt-6 rounded-xl border seam bg-bench-2 p-6" aria-busy="true">
      <div className="flex items-center gap-3 text-ink-2">
        <span className="h-2 w-2 flex-none rounded-full bg-trace pad-pulse" />
        <span aria-live="polite">{demorando ? 'A base de veículos está demorando mais que o normal. Continuamos tentando…' : 'Consultando a placa na base de veículos…'}</span>
      </div>
      {/* linha de leitura passando sobre a ficha que vai aparecer */}
      <div className="varredura mt-5 grid gap-3 rounded-lg sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="skeleton sobre-cartao h-14 rounded-lg" />)}
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
  const catalogo = useCarga(() => carregarTudo(SECOES), [])
  const sistemas = useMemo(() => (catalogo.estado === 'ok' ? sistemasDisponiveis(v, catalogo.dados) : []), [v, catalogo])
  // nome da marca como está no catálogo ("VOLKSWAGEN" → "Volkswagen"), para achar o símbolo
  const marcaLogo = useMemo(() => {
    const alvo = marcaCanonica(v.marca ?? v.modelo?.split('/')[0])
    return alvo ? Object.keys(MARCAS).find((m) => marcaCanonica(m) === alvo) : undefined
  }, [v])
  const ano = anoDe(v) || '—'

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
          <div className="skeleton mt-4 h-24 rounded-xl" aria-busy="true" />
        ) : sistemas.length === 0 ? (
          <div className="mt-4 rounded-xl border seam bg-bench-2 p-6 text-[14px]">
            <p className="text-ink-1">Ainda não há esquemas cadastrados para este veículo.</p>
            <p className="mt-1 text-ink-3">Navegue pelos sistemas no menu lateral para procurar por modelo semelhante.</p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {sistemas.map((s, i) => {
              const Icon = s.icon
              return (
                <div key={s.key} className="surge rounded-xl border seam bg-bench-2" style={{ '--i': i } as React.CSSProperties}>
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
            <Link to={`/app/esquema/${e.id}`} viewTransition onClick={marcarTitulo} className="group flex items-center gap-3 px-4 py-3 hover:bg-bench-3">
              <span className="min-w-0 flex-1">
                <span data-titulo className="block break-words text-[14px] font-medium text-ink-1">{e.marca} {e.modelo}</span>
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
