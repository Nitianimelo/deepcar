// GET /api/sessao → quem está logado (ou 401). O front chama isto ao abrir e de tempos
// em tempos, para saber quanto resta do teste gratuito e perceber uma troca de plano.
//
// DELETE /api/sessao { senha } → exclui a própria conta (exigência da Google Play: quem cria
// conta pelo app precisa poder apagá-la pelo app e pela web). Fica aqui porque a Vercel Hobby
// aceita só 12 funções em api/ e o projeto já está no limite.
import { sql, um } from './_lib/db.js'
import { abrirJanelaFree, conferirSenha, corpo, limparCookie, publicoCompleto, usuarioDaSessao } from './_lib/sessao.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const u = await usuarioDaSessao(req)
    if (!u) return res.status(401).json({ erro: 'Sem sessão.' })
    if (req.method === 'DELETE') return await excluirConta(req, res, u)
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET, DELETE')
      return res.status(405).json({ erro: 'Use GET ou DELETE.' })
    }
    // conta criada pelo /admin, ou rebaixada para free: o relógio parte no primeiro acesso
    return res.status(200).json(await publicoCompleto(await abrirJanelaFree(u)))
  } catch (err) {
    return res.status(500).json({ erro: err.message ?? 'Falha ao ler a sessão.' })
  }
}

// Apaga a linha do usuario: sessoes e links compartilhados vao em cascata; eventos de pagamento
// ficam sem dono (on delete set null), porque sao registro fiscal da venda.
async function excluirConta(req, res, u) {
  if (u.papel === 'admin') {
    return res.status(403).json({ erro: 'Conta de administrador não pode ser excluída por aqui.' })
  }
  const { senha } = corpo(req)
  const linha = await um(sql`select senha from usuarios where id = ${u.id}`)
  if (!linha || !(await conferirSenha(String(senha ?? ''), linha.senha))) {
    return res.status(403).json({ erro: 'Senha incorreta.', campo: 'senha' })
  }
  await sql`delete from usuarios where id = ${u.id}`
  limparCookie(res)
  return res.status(200).json({ ok: true })
}
