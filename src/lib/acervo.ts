// Acesso ao acervo publicado (catálogo + dados do visualizador).
// Em desenvolvimento o Vite serve a pasta local em /acervo (server/viteAcervoPlugin.mjs);
// em produção VITE_ACERVO_URL aponta para o bucket (R2). Nada mais muda entre os dois.
import { useEffect, useState } from 'react'
import type { SectionKey } from '../data/nav'

export const ACERVO_URL = (import.meta.env.VITE_ACERVO_URL as string | undefined)?.replace(/\/$/, '') || '/acervo'

export type Esquema = {
  id: string // "<secao>/<marca>/<slug>"
  secao: SectionKey
  marca: string
  modelo: string
  motorizacao: string | null
  codigoMotor: string | null
  gerenciamento: string | null
  producao: string | null
  chassi: string | null
  componentes: number
  trechos: number
  gerado: string
}

export type Trecho = { arquivo: string; w: number; h: number }
/** [grupo, [[id, nome, y], ...]] — y em px do desenho contínuo */
export type SecaoDesenho = [string, [string, string, number][]]

export type EsquemaDetalhe = {
  id: string
  secao: SectionKey
  marca: string
  modelo: string
  subtitulo: string
  specs: [string, string][]
  largura: number
  altura: number
  secoes: SecaoDesenho[]
  imagens: string // pasta relativa ao ACERVO_URL
  trechos: Trecho[]
  minimapa: Trecho
  gerado: string
}

export type IndiceAcervo = {
  gerado: string
  secoes: Partial<Record<SectionKey, { total: number; marcas: { nome: string; total: number }[] }>>
}

const cache = new Map<string, Promise<unknown>>()

function getJson<T>(rel: string): Promise<T> {
  let p = cache.get(rel) as Promise<T> | undefined
  if (!p) {
    p = fetch(`${ACERVO_URL}/${rel}`).then((r) => {
      if (!r.ok) throw new Error(r.status === 404 ? 'Não encontrado no acervo.' : `Falha ao carregar o acervo (HTTP ${r.status}).`)
      return r.json() as Promise<T>
    })
    p.catch(() => cache.delete(rel)) // permite tentar de novo
    cache.set(rel, p)
  }
  return p
}

export const carregarIndice = () => getJson<IndiceAcervo>('catalogo/index.json')
export const carregarCatalogo = (secao: SectionKey) => getJson<Esquema[]>(`catalogo/${secao}.json`)
export const carregarEsquema = (id: string) => getJson<EsquemaDetalhe>(`esquemas/${id}.json`)

export async function carregarTudo(secoes: SectionKey[]) {
  const listas = await Promise.all(secoes.map((s) => carregarCatalogo(s).catch(() => [] as Esquema[])))
  return listas.flat()
}

export const urlImagem = (d: EsquemaDetalhe, t: Trecho) => `${ACERVO_URL}/${d.imagens}/${t.arquivo}`

/** Totais do acervo; "Ford Caminhões" conta como Ford. Fallback com os números da última exportação. */
export function resumoAcervo(i?: IndiceAcervo | null) {
  if (!i) return { esquemas: 10522, montadoras: 55, sistemas: 5 }
  const secoes = Object.values(i.secoes)
  const nomes = new Set(secoes.flatMap((s) => s?.marcas.map((m) => m.nome.replace(/ Caminhões$/i, '')) ?? []))
  return { esquemas: secoes.reduce((n, s) => n + (s?.total ?? 0), 0), montadoras: nomes.size, sistemas: secoes.length }
}

export const fmt = (n: number) => n.toLocaleString('pt-BR')

/** Vocabulário da interface: o pipeline gera "Produção" e "Gerenciamento"; o mecânico lê "Fabricação" e "Sistema". */
export const rotulo = (k: string) =>
  k.replace(/produção/gi, (m) => (m[0] === 'P' ? 'Fabricação' : 'fabricação')).replace(/gerenciamento/gi, (m) => (m[0] === 'G' ? 'Sistema' : 'sistema'))

/** "Esquema elétrico de injeção eletrônica — gerenciamento Siemens 2.1" → só a primeira parte (o resto já está nos cartões). */
export const subtituloCurto = (s: string) => s.split(' — ')[0]

export function rotaSecao(secao: SectionKey) {
  return `/app/${secao === 'injecao-leve' ? 'injecao/leve' : secao === 'injecao-diesel' ? 'injecao/diesel' : secao}`
}

export type Carga<T> = { estado: 'carregando' } | { estado: 'ok'; dados: T } | { estado: 'erro'; msg: string }

export function useCarga<T>(fn: () => Promise<T>, deps: unknown[]): Carga<T> {
  const [c, setC] = useState<Carga<T>>({ estado: 'carregando' })
  useEffect(() => {
    let vivo = true
    setC({ estado: 'carregando' })
    fn()
      .then((dados) => vivo && setC({ estado: 'ok', dados }))
      .catch((e: Error) => vivo && setC({ estado: 'erro', msg: e.message }))
    return () => { vivo = false }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return c
}
