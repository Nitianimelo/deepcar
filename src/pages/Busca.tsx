// Busca em todos os sistemas: modelo, motor, código, gerenciamento, fabricação e nome do sistema.
import { useDeferredValue, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AlertTriangle, Search, X } from 'lucide-react'
import { SECOES } from '../data/nav'
import { carregarTudo, fmt, useCarga } from '../lib/acervo'
import { filtrar, indexar, termosDe } from '../lib/busca'
import { ListaEsquemas } from '../components/ListaEsquemas'
import { useAcesso } from '../lib/acesso'

export default function Busca() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const buscar = (texto: string) => setParams(texto ? { q: texto } : {}, { replace: true })

  // só os sistemas do plano; o catálogo desce uma vez (fica em cache) e a lista acompanha a digitação
  const { podeSecao } = useAcesso()
  const secoes = SECOES.filter(podeSecao)
  const chave = secoes.join(',')
  const foraDoPlano = secoes.length < SECOES.length
  const carga = useCarga(() => carregarTudo(secoes), [chave]) // eslint-disable-line react-hooks/exhaustive-deps
  const indice = useMemo(() => (carga.estado === 'ok' ? indexar(carga.dados, { comSecao: true }) : []), [carga])
  const termoAdiado = useDeferredValue(q)
  const temTermo = termosDe(termoAdiado).length > 0
  const lista = useMemo(() => (temTermo ? filtrar(indice, termoAdiado) : []), [indice, termoAdiado, temTermo])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <p className="code text-[11px] uppercase tracking-[0.2em] text-ink-4">Busca</p>
      <h1 className="mt-1.5 text-[26px] font-semibold tracking-tight sm:text-3xl">Buscar esquema</h1>
      <p className="mt-1 text-ink-3">
        {foraDoPlano ? 'Nos sistemas do seu plano' : 'Em todos os sistemas'}: modelo, motor, código, gerenciamento ou o nome do sistema.
      </p>

      <label className="relative mt-6 block">
        <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" />
        <input
          className="field pl-11 pr-11"
          placeholder="Ex.: gol 1.6, hilux diesel, abs onix, bosch me7"
          value={q}
          onChange={(e) => buscar(e.target.value)}
          autoFocus
          aria-label="Buscar esquema"
        />
        {q && (
          <button type="button" onClick={() => buscar('')} aria-label="Limpar busca" data-tip="Limpar busca" className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-ink-4 hover:bg-bench-3 hover:text-ink-1">
            <X size={16} />
          </button>
        )}
      </label>

      {carga.estado === 'erro' && (
        <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-warn/30 bg-warn/8 p-5 text-[14px]">
          <AlertTriangle size={18} className="mt-0.5 flex-none text-warn" />
          <div>
            <p className="text-ink-1">Não foi possível carregar o catálogo.</p>
            <p className="mt-1 text-ink-3">{carga.msg}</p>
          </div>
        </div>
      )}

      {carga.estado === 'carregando' && temTermo && (
        <div aria-busy="true" className="mt-4 space-y-2">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      )}

      {carga.estado === 'ok' && temTermo && (
        <>
          <p className="mt-4 text-[13px] text-ink-3">
            {lista.length === 1 ? '1 esquema encontrado' : `${fmt(lista.length)} esquemas encontrados`}
          </p>
          <ListaEsquemas lista={lista} mostrarLogo mostrarSecao vazio="Tente menos palavras ou outro termo." />
        </>
      )}

      {!temTermo && (
        <p className="mt-6 rounded-xl border seam bg-bench-2 px-5 py-10 text-center text-[14px] text-ink-3">
          Digite o que procura. Todas as palavras precisam aparecer no esquema.
        </p>
      )}
    </div>
  )
}
