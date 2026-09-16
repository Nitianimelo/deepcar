// POST /api/registrar  { nome, email, senha, oficina }  → cria a conta (plano free) e já entra.
import { sql, um } from './_lib/db.js'
import { cifrarSenha, corpo, criarSessao, porCookie, publico } from './_lib/sessao.js'

export const config = { runtime: 'nodejs' }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ erro: 'Use POST.' })
  }
  res.setHeader('Cache-Control', 'no-store')
  try {
    const dados = corpo(req)
    const email = String(dados.email ?? '').trim().toLowerCase()
    const senha = String(dados.senha ?? '')
    const nome = String(dados.nome ?? '').trim()
    const oficina = String(dados.oficina ?? '').trim() || 'Minha oficina'

    if (!nome) return res.status(400).json({ erro: 'Informe seu nome.' })
    if (!EMAIL_RE.test(email)) return res.status(400).json({ erro: 'E-mail inválido.' })
    if (senha.length < 8) return res.status(400).json({ erro: 'A senha precisa de pelo menos 8 caracteres.' })

    const existe = await um(sql`select 1 from usuarios where lower(email) = ${email}`)
    if (existe) return res.status(409).json({ erro: 'Já existe uma conta com este e-mail.' })

    const u = await um(sql`
      insert into usuarios (email, senha, nome, oficina)
      values (${email}, ${await cifrarSenha(senha)}, ${nome}, ${oficina})
      returning *`)

    const { token, expira } = await criarSessao(u.id, req.headers['user-agent'])
    porCookie(res, token, expira)
    return res.status(201).json(publico(u))
  } catch (err) {
    return res.status(err.status ?? 500).json({ erro: err.message ?? 'Não foi possível criar a conta.' })
  }
}
