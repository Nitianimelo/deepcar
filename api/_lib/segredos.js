// Cofre de chaves de API (token do Falcon, dados do R2, ...).
//
// O valor vai cifrado para o Neon em AES-256-GCM; a chave da cifra (SEGREDOS_CHAVE)
// fica nas variaveis da Vercel. Assim o banco sozinho nao entrega nenhum token.
// DATABASE_URL e SESSAO_SEGREDO nunca entram aqui: sao o que abre o proprio cofre.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { sql, um } from './db.js'

const PROIBIDAS = new Set(['DATABASE_URL', 'POSTGRES_URL', 'SEGREDOS_CHAVE', 'SESSAO_SEGREDO'])

function chave() {
  const bruta = process.env.SEGREDOS_CHAVE
  if (!bruta) throw new Error('SEGREDOS_CHAVE nao configurada.')
  // aceita qualquer texto: vira 32 bytes pelo sha-256
  return createHash('sha256').update(bruta).digest()
}

export function cifrar(texto) {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', chave(), iv)
  const dados = Buffer.concat([c.update(String(texto), 'utf8'), c.final()])
  return [iv.toString('base64'), c.getAuthTag().toString('base64'), dados.toString('base64')].join('.')
}

export function decifrar(guardado) {
  const [iv, tag, dados] = String(guardado).split('.')
  const d = createDecipheriv('aes-256-gcm', chave(), Buffer.from(iv, 'base64'))
  d.setAuthTag(Buffer.from(tag, 'base64'))
  return Buffer.concat([d.update(Buffer.from(dados, 'base64')), d.final()]).toString('utf8')
}

/** Valor de uma chave: primeiro o cofre, senao a variavel de ambiente de mesmo nome. */
export async function segredo(nome) {
  try {
    const linha = await um(sql`select valor from segredos where chave = ${nome}`)
    if (linha) return decifrar(linha.valor)
  } catch {
    // banco fora do ar ou chave de cifra trocada: cai para o ambiente
  }
  return process.env[nome] ?? null
}

/** Ambiente com os segredos do cofre por cima — para módulos que leem process.env. */
export async function ambienteCom(...nomes) {
  const extras = {}
  for (const nome of nomes) {
    const v = await segredo(nome)
    if (v) extras[nome] = v
  }
  return { ...process.env, ...extras }
}

export async function guardar(nome, valor, usuarioId, descricao = null) {
  if (PROIBIDAS.has(nome)) throw Object.assign(new Error(`${nome} fica nas variaveis da Vercel, nao no banco.`), { status: 400 })
  if (!/^[A-Z][A-Z0-9_]{2,60}$/.test(nome)) throw Object.assign(new Error('Nome invalido: use MAIUSCULAS_COM_SUBLINHADO.'), { status: 400 })
  await sql`
    insert into segredos (chave, valor, descricao, atualizado_por)
    values (${nome}, ${cifrar(valor)}, ${descricao}, ${usuarioId})
    on conflict (chave) do update
      set valor = excluded.valor,
          descricao = coalesce(excluded.descricao, segredos.descricao),
          atualizado_em = now(),
          atualizado_por = excluded.atualizado_por`
}

/** Lista para a tela do admin: nomes e um resumo, nunca o valor inteiro. */
export async function listar() {
  const linhas = await sql`
    select s.chave, s.descricao, s.atualizado_em, u.nome as por
      from segredos s left join usuarios u on u.id = s.atualizado_por
     order by s.chave`
  return linhas.map((l) => ({ ...l, valor: '••••••••' }))
}

export const apagar = (nome) => sql`delete from segredos where chave = ${nome}`
