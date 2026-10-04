// GET /api/sessao → quem está logado (ou 401). O front chama isto ao abrir e de tempos
// em tempos, para saber quanto resta do teste gratuito e perceber uma troca de plano.
//
// DELETE /api/sessao { senha } → exclui a própria conta (exigência da Google Play: quem cria
// conta pelo app precisa poder apagá-la pelo app e pela web). Fica aqui porque a Vercel Hobby
// aceita só 12 funções em api/ e o projeto já está no limite.
//
// POST /api/sessao { evento: 'checkout', plano, ciclo, valor, id } → clique num botão de assinar do site: manda
// InitiateCheckout pela API de Conversões da Meta (o pixel não roda dentro do /app). O app Android não usa.
// POST /api/sessao { evento: 'ativacao', marco: 'boas_vindas' | 'esquema' } → primeira vez que a conta fez isso
// (src/lib/funil.ts). Guarda só a primeira data; aparece no /admin.
import { randomUUID } from 'node:crypto'
import { sql, um } from './_lib/db.js'
import { dadosDoNavegador, enviarEvento } from './_lib/meta.js'
import { abrirJanelaFree, conferirSenha, corpo, limparCookie, publicoCompleto, usuarioDaSessao } from './_lib/sessao.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const u = await usuarioDaSessao(req)
    if (!u) return res.status(401).json({ erro: 'Sem sessão.' })
    if (req.method === 'DELETE') return await excluirConta(req, res, u)
    if (req.method === 'POST') return corpo(req).evento === 'ativacao' ? await marcarAtivacao(req, res, u) : await eventoCheckout(req, res, u)
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET, POST, DELETE')
      return res.status(405).json({ erro: 'Use GET, POST ou DELETE.' })
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

const PLANOS = new Set(['pro', 'full'])
const CICLOS = new Set(['mensal', 'anual'])

// Clique em "assinar": InitiateCheckout com os dados da conta. A URL vai fixa (/app/conta), nunca a pagina de onde
// veio o clique (pode ter placa). Administrador nao conta.
async function eventoCheckout(req, res, u) {
  const d = corpo(req)
  if (d.evento !== 'checkout' || !PLANOS.has(d.plano) || !CICLOS.has(d.ciclo)) {
    return res.status(400).json({ erro: 'Evento inválido.' })
  }
  if (u.papel !== 'admin') {
    const id = /^[\w-]{8,64}$/.test(String(d.id ?? '')) ? String(d.id) : randomUUID()
    const valor = Number(d.valor)
    const navegador = dadosDoNavegador(req)
    if (!navegador.fbc) {
      const conta = await um(sql`select rastreio_meta from usuarios where id = ${u.id}`)
      navegador.fbc = conta?.rastreio_meta?.fbc
    }
    await enviarEvento({
      nome: 'InitiateCheckout', id: `checkout-${id}`, url: 'https://deepcar.app.br/app/conta',
      pessoa: { email: u.email, whatsapp: u.whatsapp, nome: u.nome, idExterno: u.id }, navegador,
      dados: {
        value: valor > 0 && valor < 5000 ? valor : undefined, currency: 'BRL',
        content_name: `${d.plano} ${d.ciclo}`, content_ids: [`${d.plano}-${d.ciclo}`], content_type: 'product',
      },
    })
  }
  return res.status(202).json({ ok: true })
}

// so a primeira data vale (coalesce): o site manda uma vez por aparelho, e quem troca de aparelho nao reescreve
async function marcarAtivacao(req, res, u) {
  const { marco } = corpo(req)
  if (marco === 'boas_vindas') await sql`update usuarios set boas_vindas_em = coalesce(boas_vindas_em, now()) where id = ${u.id}`
  else if (marco === 'esquema') await sql`update usuarios set primeiro_esquema_em = coalesce(primeiro_esquema_em, now()) where id = ${u.id}`
  else return res.status(400).json({ erro: 'Marco inválido.' })
  return res.status(204).end()
}
