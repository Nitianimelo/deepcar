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
    select u.id, u.email, u.nome, u.oficina, u.plano, u.papel, u.ativo
      from sessoes s join usuarios u on u.id = s.usuario_id
     where s.token = ${digerir(token)} and s.expira_em > now()`)
  if (!linha || !linha.ativo) return null
  return linha
}

export async function encerrarSessao(req) {
  const token = tokenDe(req)
  if (token) await sql`delete from sessoes where token = ${digerir(token)}`
}

/** Devolve o usuario ou responde 401/403 e devolve null. */
export async function exigir(req, res, { admin = false } = {}) {
  const u = await usuarioDaSessao(req)
  if (!u) {
    res.status(401).json({ erro: 'Faca login para continuar.' })
    return null
  }
  if (admin && u.papel !== 'admin') {
    res.status(403).json({ erro: 'Area restrita ao administrador.' })
    return null
  }
  return u
}

/** So o que o navegador pode ver. */
export const publico = (u) => ({ nome: u.nome, email: u.email, oficina: u.oficina, plano: u.plano, papel: u.papel })

export const corpo = (req) => (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {}))
