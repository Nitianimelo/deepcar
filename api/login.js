// POST /api/login  { email, senha }  → sessão em cookie httpOnly.
// POST /api/login?acao=esqueci  { email }         → manda o link de nova senha por e-mail (resposta igual exista ou não)
// POST /api/login?acao=redefinir { token, senha } → grava a nova senha e derruba as sessões abertas
// (aqui porque a Vercel Hobby aceita só 12 funções)
import { createHash, randomBytes } from 'node:crypto'
import { sql, um } from './_lib/db.js'
import { enviarEmail, SITE } from './_lib/email.js'
import { emailRedefinirSenha } from './_lib/emails.js'
import { SENHA_MINIMA } from './_lib/validar.js'
import { anotarApp } from './_lib/uso.js'
import { abrirJanelaFree, cifrarSenha, conferirSenha, ehApp, corpo, criarSessao, porCookie, publicoCompleto, vencerAnual } from './_lib/sessao.js'
import { limitarDispositivos } from './_lib/planos.js'
import { consumirPendente } from './_lib/assinatura.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ erro: 'Use POST.' })
  }
  res.setHeader('Cache-Control', 'no-store')
  try {
    if (req.query?.acao === 'esqueci') return await esqueci(req, res)
    if (req.query?.acao === 'redefinir') return await redefinir(req, res)
    const { email, senha } = corpo(req)
    const u = await um(sql`select * from usuarios where lower(email) = lower(${String(email ?? '').trim()})`)
    // mesma resposta para e-mail inexistente e senha errada: não conta quem tem conta
    if (!u || !u.ativo || !(await conferirSenha(String(senha ?? ''), u.senha))) {
      await anotarApp(req, u?.id ?? null, 'login_erro', { erro: 'E-mail ou senha incorretos.', email: String(email ?? '').trim().slice(0, 120) })
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' })
    }
    // pagamento que chegou enquanto a pessoa estava fora (ou vinculado no /admin)
    const comPlano = await consumirPendente(await vencerAnual(u))
    // quem entra pela primeira vez no plano free começa a contar o teste agora
    const comJanela = await abrirJanelaFree(comPlano, { app: ehApp(req) })
    const { token, expira } = await criarSessao(u.id, req.headers['user-agent'])
    // passou do limite de aparelhos do plano: cai o que estava parado havia mais tempo
    await limitarDispositivos(comJanela)
    await sql`update usuarios set visto_em = now() where id = ${u.id}`
    porCookie(res, token, expira)
    await anotarApp(req, u.id, 'login')
    return res.status(200).json(await publicoCompleto(comJanela))
  } catch (err) {
    return res.status(err.status ?? 500).json({ erro: err.message ?? 'Falha no login.' })
  }
}

const hash = (t) => createHash('sha256').update(t).digest('hex')

// sempre a mesma resposta: não conta quem tem conta. No máximo 3 pedidos por conta por hora.
async function esqueci(req, res) {
  const email = String(corpo(req).email ?? '').trim().toLowerCase()
  const resposta = { ok: true, mensagem: 'Se este e-mail tiver conta na Deepcar, o link para criar uma nova senha chega em instantes.' }
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ erro: 'Digite um e-mail válido.' })
  const u = await um(sql`select id, nome, email, ativo from usuarios where lower(email) = ${email}`)
  if (!u || !u.ativo) return res.status(200).json(resposta)
  const recentes = await um(sql`select count(*)::int n from redefinicoes_senha where usuario_id = ${u.id} and criado_em > now() - interval '1 hour'`)
  if (recentes.n >= 3) return res.status(200).json(resposta)
  const token = randomBytes(32).toString('base64url')
  await sql`insert into redefinicoes_senha (token, usuario_id, expira_em) values (${hash(token)}, ${u.id}, now() + interval '1 hour')`
  const m = emailRedefinirSenha(u, `${SITE}/redefinir-senha?t=${token}`)
  await enviarEmail({ para: u.email, assunto: m.assunto, html: m.html, texto: m.texto, etiqueta: 'redefinir_senha' })
  return res.status(200).json(resposta)
}

async function redefinir(req, res) {
  const { token, senha } = corpo(req)
  if (String(senha ?? '').length < SENHA_MINIMA) return res.status(400).json({ erro: `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.`, campo: 'senha' })
  const linha = await um(sql`select token, usuario_id from redefinicoes_senha
                              where token = ${hash(String(token ?? ''))} and usado_em is null and expira_em > now()`)
  if (!linha) return res.status(400).json({ erro: 'Este link já foi usado ou venceu. Peça um novo em "Esqueci a senha".' })
  await sql`update usuarios set senha = ${await cifrarSenha(String(senha))} where id = ${linha.usuario_id}`
  await sql`update redefinicoes_senha set usado_em = now() where usuario_id = ${linha.usuario_id} and usado_em is null`
  // quem pediu a senha nova pode estar com a conta aberta num aparelho perdido: derruba todas as sessões
  await sql`delete from sessoes where usuario_id = ${linha.usuario_id}`
  // e já entra (09/10/2026): quem pagou sem conta cria a senha pelo link do e-mail e cai direto na plataforma
  const u = await consumirPendente(await um(sql`select * from usuarios where id = ${linha.usuario_id}`))
  const { token: sessao, expira } = await criarSessao(u.id, req.headers['user-agent'])
  porCookie(res, sessao, expira)
  await sql`update usuarios set visto_em = now() where id = ${u.id}`
  return res.status(200).json(await publicoCompleto(u))
}
