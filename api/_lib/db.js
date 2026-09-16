// Conexao com o Neon por HTTP: sem pool, sem conexao fria travando a funcao.
// A DATABASE_URL vem das variaveis da Vercel (integracao Neon). Nunca do banco.
import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!url) throw new Error('DATABASE_URL nao configurada.')

export const sql = neon(url)

/** Primeira linha ou null. */
export async function um(promessa) {
  const linhas = await promessa
  return linhas[0] ?? null
}
