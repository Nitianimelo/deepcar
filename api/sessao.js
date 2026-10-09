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
// POST /api/sessao { evento: 'consulta', item } → esquema aberto no site (src/lib/consulta.ts): conta a consulta do
// teste grátis e responde { liberado }. Sem liberado, o teste acabou e a tela borra (api/_lib/consultas.js).
// POST /api/sessao { evento: 'play', token } → assinatura feita no app Android (Google Play Billing): o servidor confere
// com a Google, reconhece a compra e libera o plano; responde a sessão completa (api/_lib/play.js). Também "restaurar".
// POST /api/sessao { evento: 'push', token } → aparelho do app aceitou notificação (token do FCM, api/_lib/push.js).
// POST /api/sessao { evento: 'log', visitante, itens: [{ tipo, detalhe, rota, em }] } → lote do registro de uso
// (src/lib/log.ts), também SEM login (visitante anônimo); gravado em eventos_uso, visto no /admin → Logs.
import { randomUUID } from 'node:crypto'
import { sql, um } from './_lib/db.js'
import { ativacaoMeta, dadosDoNavegador, enviarEvento, visitanteValido } from './_lib/meta.js'
import { abrirJanelaFree, conferirSenha, corpo, ehApp, limparCookie, publicoCompleto, usuarioDaSessao } from './_lib/sessao.js'
import { registrarConsulta } from './_lib/consultas.js'
import { registrarCompraPlay } from './_lib/play.js'
import { registrarCompraApple } from './_lib/apple.js'
import { anotarAberturaApp, anotarApp } from './_lib/uso.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    if (req.method === 'POST' && corpo(req).evento === 'log') return await registrarLog(req, res)
    const u = await usuarioDaSessao(req)
    // clique em "Assinar" vale também SEM conta (página de vendas → checkout da Cakto, desde 09/10/2026)
    if (req.method === 'POST' && corpo(req).evento === 'checkout') return await eventoCheckout(req, res, u)
    if (!u) return res.status(401).json({ erro: 'Sem sessão.' })
    if (req.method === 'DELETE') return await excluirConta(req, res, u)
    if (req.method === 'POST') {
      const { evento } = corpo(req)
      if (evento === 'ativacao') return await marcarAtivacao(req, res, u)
      if (evento === 'consulta') return await consultaEsquema(req, res, u)
      if (evento === 'play') {
        const pago = await registrarCompraPlay(u, corpo(req).token)
        await anotarApp(req, u.id, 'compra_play', { plano: pago?.plano, ciclo: pago?.assinatura_ciclo })
        return res.status(200).json(await publicoCompleto(pago))
      }
      if (evento === 'apple') {
        const pago = await registrarCompraApple(u, corpo(req).jws)
        await anotarApp(req, u.id, 'compra_apple', { plano: pago?.plano, ciclo: pago?.assinatura_ciclo })
        return res.status(200).json(await publicoCompleto(pago))
      }
      if (evento === 'push_diag') {
        // diagnóstico das notificações no app (permissão negada, erro do APNs/Firebase): aparece em /admin → Logs
        const d = corpo(req)
        await anotarApp(req, u.id, 'push_diag', { etapa: String(d.etapa ?? '').slice(0, 40), info: String(d.info ?? '').slice(0, 300) })
        return res.status(204).end()
      }
      if (evento === 'push') return await registrarAparelho(req, res, u)
      return await eventoCheckout(req, res, u)
    }
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET, POST, DELETE')
      return res.status(405).json({ erro: 'Use GET, POST ou DELETE.' })
    }
    await anotarAberturaApp(req, u.id) // app Android: "abriu o app" (no máximo 1 a cada 30 min)
    // conta criada pelo /admin, ou rebaixada para free: o relógio parte no primeiro acesso
    return res.status(200).json(await publicoCompleto(await abrirJanelaFree(u, { app: ehApp(req) })))
  } catch (err) {
    return res.status(err.status ?? 500).json({ erro: err.message ?? 'Falha ao ler a sessão.' })
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

/** "fb.1.<ms>.<fbclid>" vindo do navegador (origem guardada): só o formato do cookie, nada além. */
const fbcValido = (v) => (/^fb\.\d\.\d{10,14}\.[\w-]{10,500}$/.test(String(v ?? '')) ? String(v) : undefined)

const PLANOS = new Set(['pro', 'full'])
const CICLOS = new Set(['mensal', 'anual'])

// Clique em "assinar" (no /app ou na página de vendas, com ou sem conta): InitiateCheckout pela API de Conversões
// com o MESMO id que o pixel mandou do navegador, e o checkout guardado (db/020) para a compra achar o navegador
// depois (webhook da Cakto). A URL vai fixa: /app/conta para quem está logado (nunca a página com placa), a home
// para quem não tem conta. Administrador não conta.
async function eventoCheckout(req, res, u) {
  const d = corpo(req)
  if (d.evento !== 'checkout' || !PLANOS.has(d.plano) || !CICLOS.has(d.ciclo)) {
    return res.status(400).json({ erro: 'Evento inválido.' })
  }
  if (u?.papel !== 'admin') {
    const id = /^[\w-]{8,64}$/.test(String(d.id ?? '')) ? String(d.id) : randomUUID()
    const valor = Number(d.valor)
    const navegador = dadosDoNavegador(req)
    const conta = u ? await um(sql`select rastreio_meta from usuarios where id = ${u.id}`) : null
    // fbc: o cookie de agora; sem ele, o do clique no anúncio guardado no navegador (origem) ou no cadastro
    if (!navegador.fbc) navegador.fbc = fbcValido(d.fbc) ?? conta?.rastreio_meta?.fbc
    // o do navegador de agora; sem ele, o do cadastro (liga o clique em assinar as visitas anonimas)
    const visitante = visitanteValido(d.visitante) ?? conta?.rastreio_meta?.visitante
    await sql`insert into checkouts (id, usuario_id, visitante, plano, ciclo, valor, navegador, origem, rota)
              values (${id}, ${u?.id ?? null}, ${visitante ?? null}, ${d.plano}, ${d.ciclo}, ${valor > 0 && valor < 5000 ? valor : null},
                      ${JSON.stringify(navegador)}, ${d.origem && typeof d.origem === 'object' ? JSON.stringify(d.origem).slice(0, 2000) : null},
                      ${String(d.rota ?? '').replace(/\/app\/.*/, '/app').slice(0, 120) || null})
              on conflict (id) do nothing`
    await enviarEvento({
      nome: 'InitiateCheckout', id: `checkout-${id}`, url: u ? 'https://deepcar.app.br/app/conta' : 'https://deepcar.app.br/',
      pessoa: u ? { email: u.email, whatsapp: u.whatsapp, nome: u.nome, idExterno: u.id, visitante } : { visitante }, navegador,
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
  else if (marco === 'esquema') {
    await sql`update usuarios set primeiro_esquema_em = coalesce(primeiro_esquema_em, now()) where id = ${u.id}`
    await ativacaoMeta(u.id, req) // StartTrial para a Meta, uma vez por conta
  } else return res.status(400).json({ erro: 'Marco inválido.' })
  return res.status(204).end()
}

// esquema aberto no site: o id do acervo (secao/marca/modelo). Texto curto e sem quebra; o resto o banco aguenta.
async function consultaEsquema(req, res, u) {
  const item = String(corpo(req).item ?? '').trim()
  if (!item || item.length > 240 || /\p{Cc}/u.test(item)) return res.status(400).json({ erro: 'Esquema inválido.' })
  const r = await registrarConsulta(u, 'esquema', item)
  await anotarApp(req, u.id, 'esquema', { id: item, estado: r.liberado ? 'liberado' : 'teste_encerrado' })
  return res.status(200).json({ liberado: r.liberado })
}

// token do Firebase do aparelho: um aparelho pertence a uma conta (outra conta no mesmo celular "toma" o token)
async function registrarAparelho(req, res, u) {
  const token = String(corpo(req).token ?? '').trim()
  if (!/^[\w:.-]{20,400}$/.test(token)) return res.status(400).json({ erro: 'Aparelho inválido.' })
  // iPhone (desde 08/10/2026): token do APNs, enviado pela Apple; Android: token do Firebase
  const plataforma = corpo(req).plataforma === 'ios' ? 'ios' : 'android'
  await sql`insert into aparelhos_push (token, usuario_id, plataforma) values (${token}, ${u.id}, ${plataforma})
            on conflict (token) do update set usuario_id = excluded.usuario_id, plataforma = excluded.plataforma, visto_em = now()`
  return res.status(204).end()
}

/** Celular/computador e navegador, em poucas palavras (o agente inteiro não interessa ao /admin). */
function aparelhoDe(ua) {
  ua = String(ua ?? '')
  const lugar = /^Dalvik\//.test(ua) ? 'app Android' : /Instagram/.test(ua) ? 'Instagram' : /FBAN|FBAV|FB_IAB|FBIOS/.test(ua) ? 'Facebook'
    : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : /Firefox\//.test(ua) ? 'Firefox' : 'outro'
  const so = /iPhone|iPad|iPod/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Macintosh/.test(ua) ? 'Mac' : ''
  return `${so}${so ? ' · ' : ''}${lugar}`
}

// lote do registro de uso: no máximo 40 itens, textos curtos; a data do navegador vale se for das últimas 24 h
async function registrarLog(req, res) {
  const d = corpo(req)
  const itens = Array.isArray(d.itens) ? d.itens.slice(0, 40) : []
  if (!itens.length) return res.status(204).end()
  const u = await usuarioDaSessao(req).catch(() => null)
  const visitante = /^[\w-]{8,64}$/.test(String(d.visitante ?? '')) ? String(d.visitante) : null
  const aparelho = aparelhoDe(req.headers['user-agent'])
  const agora = Date.now()
  const linhas = itens.filter((i) => /^[a-z_]{2,40}$/.test(String(i?.tipo ?? ''))).map((i) => {
    const em = Date.parse(i.em)
    let detalhe = i.detalhe && typeof i.detalhe === 'object' ? JSON.stringify(i.detalhe) : null
    if (detalhe && detalhe.length > 1500) detalhe = JSON.stringify({ cortado: detalhe.slice(0, 1400) })
    return { tipo: i.tipo, detalhe, rota: String(i.rota ?? '').slice(0, 300) || null, em: em > agora - 864e5 && em <= agora + 60_000 ? new Date(em).toISOString() : new Date(agora).toISOString() }
  })
  if (linhas.length) {
    await sql`insert into eventos_uso (usuario_id, visitante, tipo, detalhe, rota, aparelho, em)
              select ${u?.id ?? null}, ${visitante}, t.tipo, t.detalhe::jsonb, t.rota, ${aparelho}, t.em::timestamptz
                from unnest(${linhas.map((l) => l.tipo)}::text[], ${linhas.map((l) => l.detalhe)}::text[], ${linhas.map((l) => l.rota)}::text[], ${linhas.map((l) => l.em)}::text[])
                     as t(tipo, detalhe, rota, em)`
  }
  return res.status(204).end()
}
