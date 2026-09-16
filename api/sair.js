// POST /api/sair → apaga a sessão no banco e no navegador.
import { encerrarSessao, limparCookie } from './_lib/sessao.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    await encerrarSessao(req)
  } catch {
    // mesmo se o banco falhar, o cookie sai
  }
  limparCookie(res)
  return res.status(200).json({ ok: true })
}
