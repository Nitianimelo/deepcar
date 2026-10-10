// "Veja se tem o seu carro" (09/10/2026): busca no catálogo público por marca, modelo, motor ou código, sem placa e sem
// conta. Mostra os veículos que existem no acervo e, ao escolher um, quais diagramas ele tem (sistema, motor,
// gerenciamento, quantos componentes) — o desenho NUNCA aparece aqui (só uma prévia borrada de outro carro). O botão
// leva aos planos com o carro escolhido em destaque (evento `deepcar:carro-escolhido`, ouvido pelo PlanosLanding).
// O catálogo (catalogo/<sistema>.json no acervo, ~290 KB gzip no total) só é baixado quando a pessoa começa a digitar.
// Busca tolerante (10/10/2026): palavra que não existe no catálogo ("titanium", "motor") é ignorada com aviso; geração do
// Gol ("gol g5") vira faixa de anos; ano digitado filtra pela fabricação e, se zerar, é ignorado; resultados ordenados
// por quão bem batem (palavra inteira > começo de palavra > pedaço) e do mais novo ao mais antigo.
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Car, Loader2, Lock, Search, Truck, X } from 'lucide-react'
import { carregarCatalogo, type Esquema } from '../../lib/acervo'
import { indexar, termosDe, type Indexado } from '../../lib/busca'
import { SECTION_META, SECOES, type SectionKey } from '../../data/nav'
import { registrar as anotar } from '../../lib/log'
import { Reveal } from './Reveal'

/** `placa`: veio do campo de placa da página (não consultamos: a consulta só existe para quem assina). */
export type CarroEscolhido = { nome: string; secoes: SectionKey[]; placa?: boolean }
export const EVENTO_CARRO = 'deepcar:carro-escolhido'

type Veiculo = { chave: string; marca: string; modelo: string; motorizacao: string | null; producao: string | null; itens: Esquema[] }

const DIESEL = new Set<SectionKey>(['injecao-diesel', 'eletrica-diesel', 'cambio-diesel'])
const EXEMPLOS = ['Strada 1.4', 'Hilux 2.8', 'Onix', 'Gol G5', 'HB20', 'Sprinter']
const MAX = 12
const PARADAS = new Set(['motor', 'carro', 'do', 'da', 'de', 'ano', 'anos', 'modelo', 'versao', 'o', 'a', 'e', 'com', 'para', 'pra', 'meu', 'minha', 'esquema', 'esquemas'])
// gerações do Gol e irmãos (Parati, Saveiro, Voyage): no catálogo elas aparecem como anos de fabricação
const FAMILIA_GOL = new Set(['gol', 'parati', 'saveiro', 'voyage'])
const GERACOES: Record<string, [number, number]> = { g1: [1980, 1994], g2: [1994, 1999], g3: [1999, 2005], g4: [2005, 2014], g5: [2008, 2012], g6: [2013, 2016], g7: [2016, 2023], g8: [2023, 2030] }

/** "2008 a 2012" → [2008, 2012]; "2017 em diante" → [2017, 9999]; sem ano → null */
function faixaDe(producao: string | null): [number, number] | null {
  const anos = (producao ?? '').match(/\b(19|20)\d{2}\b/g)?.map(Number) ?? []
  if (!anos.length) return null
  return [Math.min(...anos), /em diante/i.test(producao ?? '') ? 9999 : Math.max(...anos)]
}
const anoMaisNovo = (e: Esquema) => faixaDe(e.producao)?.[1] ?? 0

type Item = Indexado & { palavras: string[] }
/** 3 = palavra inteira ("gol"), 2 = começo de palavra ("eco" em "ecosport"), 1 = pedaço, 0 = não tem */
function nota(termo: string, x: Item) {
  if (!x.alvo.includes(termo)) return 0
  if (x.palavras.includes(termo)) return 3
  return x.palavras.some((w) => w.startsWith(termo)) ? 2 : 1
}

type Resultado = { total: number; veiculos: Veiculo[]; ignorados: string[]; aviso: string | null }
function buscarCarros(indice: Item[], q: string): Resultado | null {
  const termos = termosDe(q).filter((t) => !PARADAS.has(t))
  if (!termos.length || q.trim().length < 2) return null
  const anos = termos.filter((t) => /^(19|20)\d{2}$/.test(t)).map(Number)
  const ehGol = termos.some((t) => FAMILIA_GOL.has(t))
  const geracao = ehGol ? termos.find((t) => GERACOES[t]) : undefined
  let texto = termos.filter((t) => !/^(19|20)\d{2}$/.test(t) && t !== geracao)
  // palavra que não aparece em nenhum diagrama ("titanium", "g5" fora do Gol) não pode zerar a busca
  const ignorados = texto.filter((t) => !indice.some((x) => x.alvo.includes(t)))
  texto = texto.filter((t) => !ignorados.includes(t))
  if (!texto.length) return { total: 0, veiculos: [], ignorados, aviso: null }
  const com = (ts: string[]) => indice.filter((x) => ts.every((t) => x.alvo.includes(t)))
  let achados = com(texto)
  // tudo junto não existe ("gol 1.6 power"): tira as últimas palavras (a primeira costuma ser o modelo)
  while (!achados.length && texto.length > 1) { ignorados.push(texto[texto.length - 1]); texto = texto.slice(0, -1); achados = com(texto) }
  // ano ou geração filtram pela fabricação; se não sobrar nada, mostra todos os anos e avisa
  let aviso: string | null = null
  // o ano digitado é mais preciso que a geração ("gol g4 2010" → 2010)
  const faixa: [number, number] | null = anos.length ? [Math.min(...anos), Math.max(...anos)] : geracao ? GERACOES[geracao] : null
  if (faixa) {
    const naFaixa = achados.filter((x) => { const f = faixaDe(x.e.producao); return !f || (f[0] <= faixa[1] && f[1] >= faixa[0]) })
    if (naFaixa.length) {
      achados = naFaixa
      if (geracao && !anos.length) aviso = `${geracao.toUpperCase()}: mostrando os de fabricação entre ${faixa[0]} e ${faixa[1]}.`
    } else aviso = `Não achamos diagramas de ${geracao ? geracao.toUpperCase() : anos.join(' ou ')}; mostrando todos os anos.`
  }
  const pontos = (x: Item) => texto.reduce((s, t) => s + nota(t, x), 0)
  // com ano/geração: primeiro o que começou a ser fabricado dentro da faixa, depois o que só a cruza ("1996 em diante")
  const encaixe = (x: Item) => { const f = faixaDe(x.e.producao); return !faixa || !f ? 0 : f[0] >= faixa[0] && f[0] <= faixa[1] ? 2 : 1 }
  // dentro do mesmo encaixe, o que começou mais perto do início da faixa (G5: os de 2008 antes dos de 2012)
  const distancia = (x: Item) => { const f = faixaDe(x.e.producao); return !faixa || !f ? 0 : Math.abs(f[0] - faixa[0]) }
  achados.sort((a, b) => pontos(b) - pontos(a) || encaixe(b) - encaixe(a) || distancia(a) - distancia(b) || anoMaisNovo(b.e) - anoMaisNovo(a.e))
  const veiculos = agrupar(achados.map((x) => x.e))
  return { total: veiculos.length, veiculos, ignorados, aviso }
}

/** As versões do mesmo carro (marca + modelo + motor + anos) viram um item só, com os sistemas juntos. */
function agrupar(lista: Esquema[]): Veiculo[] {
  const mapa = new Map<string, Veiculo>()
  for (const e of lista) {
    const chave = [e.marca, e.modelo, e.motorizacao ?? '', e.producao ?? ''].join('|').toLowerCase()
    let v = mapa.get(chave)
    if (!v) { v = { chave, marca: e.marca, modelo: e.modelo, motorizacao: e.motorizacao, producao: e.producao, itens: [] }; mapa.set(chave, v) }
    v.itens.push(e)
  }
  return [...mapa.values()]
}

const nomeDe = (v: Veiculo) => [v.marca, v.modelo, v.motorizacao].filter(Boolean).join(' ')
const sistemaCurto = (s: SectionKey) => SECTION_META[s]?.titulo.replace('Injeção Eletrônica', 'Injeção') ?? s

let catalogo: Promise<Item[]> | null = null
function carregarTudo() {
  catalogo ??= Promise.all(SECOES.map((s) => carregarCatalogo(s).catch(() => [] as Esquema[])))
    .then((listas) => indexar(listas.flat(), { comSecao: true }).map((x) => ({ ...x, palavras: x.alvo.split(' ') })))
  catalogo.catch(() => { catalogo = null })
  return catalogo
}

export function BuscaCarro() {
  const [q, setQ] = useState('')
  const [indice, setIndice] = useState<Item[] | null>(null)
  const [limite, setLimite] = useState(MAX)
  const area = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLInputElement>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(false)
  const [escolhido, setEscolhido] = useState<Veiculo | null>(null)
  const anotado = useRef('')

  function preparar() {
    if (indice || carregando) return
    setCarregando(true); setErro(false)
    carregarTudo().then(setIndice).catch(() => setErro(true)).finally(() => setCarregando(false))
  }

  const resultado = useMemo(() => (indice ? buscarCarros(indice, q) : null), [indice, q])

  /** No celular, o teclado e a lista mudando de tamanho faziam a página pular para a dobra de baixo: o campo sobe
   *  para o topo da tela ao focar, e escolher/voltar leva o topo dos resultados para a vista. */
  function subirCampo() {
    if (window.innerWidth >= 768 || !campo.current) return
    const y = campo.current.getBoundingClientRect().top + window.scrollY - 128
    setTimeout(() => window.scrollTo({ top: y, behavior: 'smooth' }), 250)
  }
  function mostrarArea() {
    requestAnimationFrame(() => {
      const el = area.current
      if (!el) return
      const topo = el.getBoundingClientRect().top
      if (topo < 120 || topo > window.innerHeight * 0.6) window.scrollTo({ top: topo + window.scrollY - 128, behavior: 'smooth' })
    })
  }

  // o que as pessoas procuram (e não acham): /admin → Logs. Uma vez por termo, depois de parar de digitar.
  useEffect(() => {
    if (!resultado) return
    const t = setTimeout(() => {
      const termo = q.trim().toLowerCase()
      if (termo === anotado.current) return
      anotado.current = termo
      anotar('busca_landing', { termo: termo.slice(0, 60), resultados: resultado.total })
    }, 1200)
    return () => clearTimeout(t)
  }, [resultado, q])

  function onSubmit(e: FormEvent) { e.preventDefault(); preparar() }

  function escolher(v: Veiculo) {
    setEscolhido(v); mostrarArea()
    anotar('escolheu_carro', { carro: nomeDe(v).slice(0, 80), sistemas: v.itens.map((x) => x.secao) })
  }

  function irParaPlanos(v: Veiculo) {
    const detalhe: CarroEscolhido = { nome: nomeDe(v), secoes: [...new Set(v.itens.map((x) => x.secao))] }
    window.dispatchEvent(new CustomEvent(EVENTO_CARRO, { detail: detalhe }))
    anotar('carro_para_planos', { carro: detalhe.nome.slice(0, 80) })
    document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section id="seu-carro" className="relative border-t seam">
      <div className="mx-auto max-w-[1000px] px-5 py-20 sm:px-8 lg:py-28">
        <Reveal className="mx-auto max-w-[680px] text-center">
          <p className="code text-[12px] uppercase tracking-[0.24em] text-trace-hi">Veja se tem o seu carro</p>
          <h2 className="mt-4 text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-[1.05] tracking-[-0.02em]">
            Procure o carro que está na sua oficina.
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-ink-2">
            Digite a marca, o modelo, o motor ou o código. Mostramos quais diagramas existem para ele antes de você assinar.
          </p>
        </Reveal>

        <form onSubmit={onSubmit} className="mx-auto mt-10 max-w-[680px]">
          <label className="relative block">
            <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-4" />
            <input
              className="field h-14 pl-12 pr-12 text-[17px]"
              placeholder="Ex.: Strada 1.4, Hilux 2.8, Onix"
              ref={campo}
              value={q}
              onFocus={() => { preparar(); subirCampo() }}
              onChange={(e) => { setQ(e.target.value); setEscolhido(null); setLimite(MAX); preparar() }}
              autoCorrect="off" spellCheck={false} enterKeyHint="search"
              aria-label="Marca, modelo, motor ou código"
            />
            {carregando && <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-ink-4" />}
            {!carregando && q && (
              <button type="button" onClick={() => { setQ(''); setEscolhido(null); setLimite(MAX) }} aria-label="Limpar" className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-ink-4 hover:text-ink-1">
                <X size={17} />
              </button>
            )}
          </label>
          {!q && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {EXEMPLOS.map((x) => (
                <button key={x} type="button" onClick={() => { setQ(x); preparar() }} className="rounded-full border seam px-3.5 py-1.5 text-[13.5px] text-ink-3 hover:bg-bench-1 hover:text-ink-1">
                  {x}
                </button>
              ))}
            </div>
          )}
          {erro && <p className="mt-3 text-center text-[14px] text-fault">Não foi possível carregar o catálogo agora. Tente de novo em instantes.</p>}
        </form>

        {/* com algo digitado, a área guarda altura: a lista encolhendo não puxa a próxima dobra para cima */}
        <div ref={area} className={`mx-auto mt-8 max-w-[760px] scroll-mt-24 ${q.trim() ? 'min-h-[70vh] md:min-h-[420px]' : ''}`} aria-live="polite">
          {escolhido ? (
            <Detalhe v={escolhido} onVoltar={() => { setEscolhido(null); mostrarArea() }} onAssinar={() => irParaPlanos(escolhido)} />
          ) : resultado && (
            resultado.total === 0 ? (
              <div className="rounded-2xl border seam bg-bench-1 p-6 text-center">
                <p className="text-[16px] text-ink-1">Não achamos "{q.trim()}" no catálogo.</p>
                <p className="mt-1.5 text-[14.5px] text-ink-3">Tente só o modelo (ex.: "strada") ou o motor (ex.: "1.4 fire"). Se não estiver mesmo, chame no WhatsApp que a gente verifica.</p>
              </div>
            ) : (
              <>
                {!!resultado.ignorados.length && (
                  <p className="mb-2 rounded-xl border seam bg-bench-1 px-4 py-3 text-[14px] leading-snug text-ink-2">
                    Não encontramos <b className="font-semibold text-ink-1">{resultado.ignorados.map((t) => `"${t}"`).join(', ')}</b> nos nomes dos
                    diagramas (versão e acabamento nem sempre aparecem). Mostrando o que mais se aproxima.
                  </p>
                )}
                {resultado.aviso && <p className="mb-2 text-[14px] text-ink-2">{resultado.aviso}</p>}
                <p className="mb-3 text-[13.5px] text-ink-3">
                  {resultado.total} {resultado.total === 1 ? 'versão encontrada' : 'versões encontradas'}{resultado.total > limite ? `, mostrando as ${limite} mais parecidas` : ''}
                </p>
                <ul className="grid gap-2.5">
                  {resultado.veiculos.slice(0, limite).map((v) => {
                    const sistemas = [...new Set(v.itens.map((x) => x.secao))]
                    return (
                      <li key={v.chave}>
                        <button type="button" onClick={() => escolher(v)} className="flex w-full items-start gap-3.5 rounded-2xl border seam bg-bench-1 p-4 text-left transition-colors hover:border-trace/40 hover:bg-bench-2 sm:items-center">
                          <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-trace/10 text-trace-hi">
                            {v.itens.some((x) => DIESEL.has(x.secao)) ? <Truck size={19} /> : <Car size={19} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline gap-x-2">
                              <span className="text-[13px] font-medium uppercase tracking-wide text-trace-hi">{v.marca}</span>
                              {v.producao && <span className="rounded-md bg-bench-3 px-1.5 py-0.5 text-[12px] tabular-nums text-ink-2">{v.producao}</span>}
                            </span>
                            <span className="mt-0.5 line-clamp-2 block text-[16px] font-medium leading-snug text-ink-1">{v.modelo}</span>
                            {v.motorizacao && <span className="mt-0.5 line-clamp-2 block text-[13.5px] text-ink-3">Motor {v.motorizacao}</span>}
                            <span className="mt-2 flex flex-wrap gap-1.5">
                              {sistemas.map((sx) => (
                                <span key={sx} className="rounded-md border seam px-2 py-0.5 text-[12px] text-ink-2">{sistemaCurto(sx)}</span>
                              ))}
                            </span>
                          </span>
                          <ArrowRight size={18} className="mt-3 flex-none text-ink-4 sm:mt-0" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {resultado.total > limite && (
                  <button type="button" onClick={() => setLimite((n) => n + MAX)} className="mt-3 w-full rounded-xl border seam py-3 text-[14px] text-ink-2 hover:bg-bench-1 hover:text-ink-1">
                    Mostrar mais {Math.min(MAX, resultado.total - limite)} versões
                  </button>
                )}
              </>
            )
          )}
        </div>
      </div>
    </section>
  )
}

function Detalhe({ v, onVoltar, onAssinar }: { v: Veiculo; onVoltar: () => void; onAssinar: () => void }) {
  const diesel = v.itens.some((x) => DIESEL.has(x.secao))
  return (
    <div className="overflow-hidden rounded-2xl border border-trace/30 bg-bench-1">
      <div className="p-5 sm:p-7">
        <button type="button" onClick={onVoltar} className="text-[13.5px] text-ink-3 hover:text-ink-1">← Voltar aos resultados</button>
        <p className="code mt-4 text-[12px] uppercase tracking-[0.2em] text-trace-hi">{v.marca}</p>
        <h3 className="mt-1 text-[24px] font-semibold leading-tight tracking-tight sm:text-[28px]">{v.modelo}</h3>
        <p className="mt-1 text-[15px] text-ink-2">{[v.motorizacao, v.producao].filter(Boolean).join(' · ')}</p>

        <p className="mt-6 text-[13px] font-medium uppercase tracking-[0.12em] text-ink-3">
          {v.itens.length} {v.itens.length === 1 ? 'diagrama disponível' : 'diagramas disponíveis'}
        </p>
        <ul className="mt-3 grid gap-2.5">
          {v.itens.map((e) => (
            <li key={e.id} className="rounded-xl border seam bg-pit/60 p-4">
              <p className="text-[15.5px] font-medium text-ink-1">{SECTION_META[e.secao]?.titulo ?? e.secao}</p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13.5px]">
                {e.codigoMotor && <><dt className="text-ink-4">Código do motor</dt><dd className="text-ink-2">{e.codigoMotor}</dd></>}
                {e.gerenciamento && <><dt className="text-ink-4">Sistema</dt><dd className="text-ink-2">{e.gerenciamento}</dd></>}
                {e.producao && <><dt className="text-ink-4">Fabricação</dt><dd className="text-ink-2">{e.producao}</dd></>}
                <dt className="text-ink-4">Componentes</dt><dd className="text-ink-2">{e.componentes} mapeados no desenho</dd>
              </dl>
            </li>
          ))}
        </ul>
      </div>

      {/* prévia: o desenho borrado de outro carro, só para mostrar o formato; o esquema mesmo só com plano */}
      <div className="relative h-44 overflow-hidden border-t seam sm:h-52">
        <img src="/landing/tour/07.webp" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-110 object-cover object-[50%_20%] opacity-70 blur-[6px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-bench-1 via-bench-1/60 to-transparent" />
        <div className="relative flex h-full flex-col items-center justify-end gap-3 p-5 text-center">
          <span className="flex items-center gap-2 text-[14px] text-ink-2"><Lock size={15} /> {diesel ? 'Disponível no plano Full' : 'Disponível nos planos Pro e Full'}</span>
          <button type="button" onClick={onAssinar} className="btn-cta btn-cta-grande inline-flex w-full items-center justify-center gap-2 px-6 sm:w-auto">
            Assinar e abrir os esquemas <ArrowRight size={19} />
          </button>
        </div>
      </div>
    </div>
  )
}
