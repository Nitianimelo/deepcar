// Busca de texto no catálogo: sem acento, sem diferenciar maiúsculas, todos os termos precisam aparecer.
// O texto de cada esquema é montado uma vez (indexar) e reaproveitado a cada tecla (filtrar).
import { SECTION_META } from '../data/nav'
import type { Esquema } from './acervo'

/** "Injeção/ABS-Diesel" → "injecao abs diesel" */
export const normalizar = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[/\\_-]+/g, ' ')

export const termosDe = (q: string) => normalizar(q).split(' ').filter(Boolean)

export type Indexado = { e: Esquema; alvo: string }

/** `comSecao`: o nome do sistema também entra na busca ("abs gol", "diesel hilux"). */
export function indexar(lista: Esquema[], { comSecao = false } = {}): Indexado[] {
  return lista.map((e) => ({
    e,
    alvo: normalizar([
      e.marca, e.modelo, e.motorizacao, e.codigoMotor, e.gerenciamento, e.producao, e.chassi,
      comSecao ? SECTION_META[e.secao]?.trilha.join(' ') : '',
    ].join(' ')),
  }))
}

export function filtrar(indice: Indexado[], q: string, marca = ''): Esquema[] {
  const termos = termosDe(q)
  const saida: Esquema[] = []
  for (const { e, alvo } of indice) {
    if (marca && e.marca !== marca) continue
    if (termos.every((t) => alvo.includes(t))) saida.push(e)
  }
  return saida
}
