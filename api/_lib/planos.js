// O que cada plano libera: sistemas do acervo, busca por placa e quantos dispositivos.
//
// As regras vivem na tabela planos_acesso (db/005) e o /admin edita. Aqui fica o padrao
// (igual a pagina de vendas) para quando a tabela ainda nao existir ou estiver vazia.
// Administrador ve tudo e nao tem limite de dispositivos.
import { sql } from './db.js'

/** Mesmas chaves do menu (src/data/nav.ts). */
export const SECOES = ['injecao-leve', 'injecao-diesel', 'abs', 'eletrica', 'eletrica-diesel', 'cambio', 'cambio-diesel']
export const PLANOS = ['free', 'pro', 'full']

export const PADRAO = {
  free: { secoes: SECOES, placa: true, dispositivos: 2 },
  pro: { secoes: ['injecao-leve', 'abs', 'eletrica'], placa: false, dispositivos: 2 },
  full: { secoes: SECOES, placa: true, dispositivos: 4 },
}

const TUDO = { secoes: SECOES, placa: true, dispositivos: null }

// cache curto por instancia: toda sessao conferida le as regras, e elas quase nunca mudam.
// Mudanca feita no /admin vale na hora nesta instancia e em ate 1 minuto nas outras.
let cache = null
let lidoEm = 0
const VALIDADE_MS = 60_000

export async function regras() {
  if (cache && Date.now() - lidoEm < VALIDADE_MS) return cache
  const todas = { ...PADRAO }
  try {
    for (const l of await sql`select plano, secoes, placa, dispositivos from planos_acesso`) {
      todas[l.plano] = { secoes: (l.secoes ?? []).filter((s) => SECOES.includes(s)), placa: !!l.placa, dispositivos: l.dispositivos ?? null }
    }
  } catch {
    // tabela ainda nao criada (migracao pendente): vale o padrao
  }
  cache = todas
  lidoEm = Date.now()
  return todas
}

export const esquecerRegras = () => { cache = null }

/** Regras que valem para esta conta. */
export async function acessoDe(u) {
  if (!u) return null
  if (u.papel === 'admin') return TUDO
  const r = await regras()
  return r[u.plano] ?? r.free
}

/** A secao do esquema e o primeiro trecho do id ("injecao-diesel/scania/..."). */
export const secaoDoId = (id) => String(id ?? '').split('/')[0]

/**
 * Mantem so os N aparelhos usados mais recentemente. Roda depois de abrir uma sessao nova:
 * quem entra no terceiro aparelho do Pro derruba o que estava parado havia mais tempo.
 */
export async function limitarDispositivos(u) {
  const { dispositivos } = await acessoDe(u)
  if (!dispositivos) return 0
  const caidas = await sql`
    delete from sessoes
     where usuario_id = ${u.id}
       and token not in (
         select token from sessoes
          where usuario_id = ${u.id} and expira_em > now()
          order by coalesce(visto_em, criado_em) desc
          limit ${dispositivos})
    returning token`
  return caidas.length
}
