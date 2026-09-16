// POST /api/admin/inicializar → cria o primeiro administrador.
//
// Só funciona enquanto não existir nenhum admin, e usa ADMIN_EMAIL e ADMIN_SENHA
// das variáveis da Vercel. Depois de criar, apague as duas variáveis: a conta já existe
// e a senha passa a ser trocada pela própria tela do /admin.
import { sql, um } from '../_lib/db.js'
import { cifrarSenha } from '../_lib/sessao.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ erro: 'Use POST.' })
  }
  try {
    const email = String(process.env.ADMIN_EMAIL ?? '').trim().toLowerCase()
    const senha = String(process.env.ADMIN_SENHA ?? '')
    if (!email || senha.length < 8) {
      return res.status(400).json({ erro: 'Configure ADMIN_EMAIL e ADMIN_SENHA (8+ caracteres) na Vercel.' })
    }
    const jaTem = await um(sql`select 1 from usuarios where papel = 'admin' limit 1`)
    if (jaTem) return res.status(409).json({ erro: 'Já existe um administrador. Use a tela /admin.' })

    await sql`
      insert into usuarios (email, senha, nome, oficina, plano, papel)
      values (${email}, ${await cifrarSenha(senha)}, 'Administrador', 'Deepcar', 'pro', 'admin')
      on conflict (lower(email)) do update set senha = excluded.senha, papel = 'admin', plano = 'pro', ativo = true`
    return res.status(201).json({ ok: true, email })
  } catch (err) {
    return res.status(err.status ?? 500).json({ erro: err.message ?? 'Falha ao criar o administrador.' })
  }
}
