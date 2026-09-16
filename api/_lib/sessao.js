// Senhas e sessoes.
//
// Senha: scrypt do proprio Node (sem dependencia), guardada como "scrypt$<sal>$<hash>".
// Sessao: token aleatorio de 32 bytes no cookie httpOnly; no banco fica so o sha-256 dele,
// entao um vazamento da tabela nao permite entrar como ninguem.
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { sql, um } from './db.js'

const scryptAsync = promisify(scrypt)
const COOKIE = 'deepcar_sessao'
const DIAS = 30

/** Quanto tempo de acesso o plano free da. Trocar aqui muda o produto inteiro. */
export const MINUTOS_FREE = 5

/**
 * Comeca a contar o teste gratuito na primeira entrada (nao na criacao da conta):
 * quem cadastra hoje e so volta amanha nao perde o teste. Idempotente.
 */
export async function abrirJanelaFree(u) {
  if (!u || u.plano !== 'free' || u.free_expira_em) return u
  const ate = new Date(Date.now() + MINUTOS_FREE * 60_000)
  await sql`update usuarios set free_expira_em = ${ate} where id = ${u.id} and free_expira_em is null`
  return { ...u, free_expira_em: ate }
}

/** Teste gratuito ja vencido? Plano pago nunca vence. */
export const freeAcabou = (u) =>
  u.plano === 'free' && !!u.free_expira_em && new Date(u.free_expira_em) <= new Date()

export async function cifrarSenha(senha) {
  const sal = randomBytes(16)
  const hash = await scryptAsync(senha, sal, 64)
  return `scrypt$${sal.toString('base64')}$${hash.toString('base64')}`
}

export async function conferirSenha(senha, guardada) {
  const [algo, sal, hash] = String(guardada || '').split('$')
  if (algo !== 'scrypt' || !sal || !hash) return false
  const esperado = Buffer.from(hash, 'base64')
  const obtido = await scryptAsync(senha, Buffer.from(sal, 'base64'), esperado.length)
  return esperado.length === obtido.length && timingSafeEqual(esperado, obtido)
}

const digerir = (token) => createHash('sha256').update(token).digest('hex')

export async function criarSessao(usuarioId, agente) {
  const token = randomBytes(32).toString('base64url')
  const expira = new Date(Date.now() + DIAS * 86400_000)
  await sql`insert into sessoes (token, usuario_id, expira_em, agente)
            values (${digerir(token)}, ${usuarioId}, ${expira}, ${agente ?? null})`
  return { token, expira }
}

export function porCookie(res, token, expira) {
  const partes = [
    `${COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Expires=${expira.toUTCString()}`,
  ]
  res.setHeader('Set-Cookie', partes.join('; '))
}

export function limparCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`)
}

function tokenDe(req) {
  const bruto = req.headers.cookie
  if (!bruto) return null
  for (const parte of bruto.split(';')) {
    const [nome, ...resto] = parte.trim().split('=')
    if (nome === COOKIE) return resto.join('=')
  }
  return null
}

/** Usuario da requisicao, ou null. Renova nada: a sessao vale 30 dias. */
export async function usuarioDaSessao(req) {
  const token = tokenDe(req)
  if (!token) return null
  const linha = await um(sql`
    select u.id, u.email, u.nome, u.oficina, u.plano, u.papel, u.ativo, u.whatsapp, u.free_expira_em
      from sessoes s join usuarios u on u.id = s.usuario_id
     where s.token = ${digerir(token)} and s.expira_em > now()`)
  if (!linha || !linha.ativo) return null
  return linha
}

export async function encerrarSessao(req) {
  const token = tokenDe(req)
  if (token) await sql`delete from sessoes where token = ${digerir(token)}`
}

/**
 * Devolve o usuario ou responde 401/403/402 e devolve null.
 * `acesso: true` nas rotas que entregam conteudo: ai o teste gratuito vencido barra.
 */
export async function exigir(req, res, { admin = false, acesso = false } = {}) {
  const u = await usuarioDaSessao(req)
  if (!u) {
    res.status(401).json({ erro: 'Faca login para continuar.' })
    return null
  }
  if (admin && u.papel !== 'admin') {
    res.status(403).json({ erro: 'Area restrita ao administrador.' })
    return null
  }
  if (acesso && u.papel !== 'admin' && freeAcabou(u)) {
    res.status(402).json({
      erro: `Seus ${MINUTOS_FREE} minutos de acesso gratuito terminaram.`,
      expirado: true,
      plano: u.plano,
    })
    return null
  }
  return u
}

/** So o que o navegador pode ver. */
export const publico = (u) => ({
  nome: u.nome,
  email: u.email,
  oficina: u.oficina,
  plano: u.plano,
  papel: u.papel,
  whatsapp: u.whatsapp ?? null,
  // nulo = teste ainda nao comecou, ou plano pago (ai nao ha relogio nenhum)
  freeExpiraEm: u.plano === 'free' && u.free_expira_em ? new Date(u.free_expira_em).toISOString() : null,
})

export const corpo = (req) => (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {}))
