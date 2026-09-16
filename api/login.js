// POST /api/login  { email, senha }  → sessão em cookie httpOnly.
import { sql, um } from './_lib/db.js'
import { conferirSenha, corpo, criarSessao, porCookie, publico } from './_lib/sessao.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ erro: 'Use POST.' })
  }
  res.setHeader('Cache-Control', 'no-store')
  try {
    const { email, senha } = corpo(req)
    const u = await um(sql`select * from usuarios where lower(email) = lower(${String(email ?? '').trim()})`)
    // mesma resposta para e-mail inexistente e senha errada: não conta quem tem conta
    if (!u || !u.ativo || !(await conferirSenha(String(senha ?? ''), u.senha))) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' })
    }
    const { token, expira } = await criarSessao(u.id, req.headers['user-agent'])
    await sql`update usuarios set visto_em = now() where id = ${u.id}`
    porCookie(res, token, expira)
    return res.status(200).json(publico(u))
  } catch (err) {
    return res.status(err.status ?? 500).json({ erro: err.message ?? 'Falha no login.' })
  }
}
