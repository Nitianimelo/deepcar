// POST /api/registrar  { nome, email, whatsapp, senha }  → cria a conta (plano free) e já entra.
// GET  /api/registrar  → { testeMinutos }: duração do teste que a página de cadastro anuncia (/admin → Planos).
import { sql, um } from './_lib/db.js'
import { abrirJanelaFree, cifrarSenha, ehApp, corpo, criarSessao, porCookie, publicoCompleto } from './_lib/sessao.js'
import { emailValido, nomeValido, normalizarWhatsapp, senhaValida, SENHA_MINIMA } from './_lib/validar.js'
import { consumirPendente } from './_lib/assinatura.js'
import { dadosDoNavegador, enviarEvento, rastreioParaGuardar, visitanteValido } from './_lib/meta.js'
import { minutosTeste } from './_lib/planos.js'

export const config = { runtime: 'nodejs' }

const CAMPOS_ORIGEM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'entrada', 'referrer', 'em']

/** Origem que o site mandou (src/lib/origem.ts): so os campos conhecidos, texto curto. */
function limparOrigem(o) {
  if (!o || typeof o !== 'object') return null
  const r = {}
  for (const c of CAMPOS_ORIGEM) {
    const v = typeof o[c] === 'string' ? o[c].trim() : ''
    if (v) r[c] = v.slice(0, 200)
  }
  return Object.keys(r).length ? r : null
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300')
    return res.status(200).json({ testeMinutos: await minutosTeste() })
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ erro: 'Use POST.' })
  }
  res.setHeader('Cache-Control', 'no-store')
  try {
    const dados = corpo(req)
    const nome = String(dados.nome ?? '').trim().replace(/\s+/g, ' ')
    const email = String(dados.email ?? '').trim().toLowerCase()
    const whatsapp = normalizarWhatsapp(dados.whatsapp)
    const senha = String(dados.senha ?? '')
    // so o site manda: e o mesmo eventID do pixel. O app Android nao manda, e cadastro pelo app nao vai para a Meta
    const eventoId = /^[\w-]{8,64}$/.test(String(dados.evento_id ?? '')) ? String(dados.evento_id) : null
    const oficina = String(dados.oficina ?? '').trim() || 'Minha oficina'
    // origem e rastreio so do site (mesma regra do eventID): cadastro pelo app Android nao vai para a Meta
    // o app marca { entrada: 'app' } (sem campanha): o /admin e o CRM mostram que a conta nasceu no Android
    const doApp = !eventoId && dados.origem?.entrada === 'app'
    const origem = eventoId ? limparOrigem(dados.origem) : doApp ? { entrada: 'app', em: new Date().toISOString() } : null
    const navegador = eventoId ? dadosDoNavegador(req) : null
    const visitante = eventoId ? visitanteValido(dados.visitante) : undefined
    const rastreio = navegador ? rastreioParaGuardar(navegador, dados.origem?.fbc, visitante) : null

    // uma mensagem por campo, na ordem da tela: quem errar dois sabe qual corrigir primeiro
    if (!nomeValido(nome)) return res.status(400).json({ erro: 'Informe seu nome.', campo: 'nome' })
    if (!emailValido(email)) return res.status(400).json({ erro: 'E-mail inválido.', campo: 'email' })
    if (!whatsapp) return res.status(400).json({ erro: 'WhatsApp inválido. Use DDD + número, com o 9 na frente.', campo: 'whatsapp' })
    if (!senhaValida(senha)) {
      return res.status(400).json({ erro: `A senha precisa de pelo menos ${SENHA_MINIMA} caracteres.`, campo: 'senha' })
    }

    const existe = await um(sql`select 1 from usuarios where lower(email) = ${email}`)
    if (existe) return res.status(409).json({ erro: 'Já existe uma conta com este e-mail.', campo: 'email' })

    const u = await um(sql`
      insert into usuarios (email, senha, nome, oficina, whatsapp, origem, rastreio_meta)
      values (${email}, ${await cifrarSenha(senha)}, ${nome}, ${oficina}, ${whatsapp},
              ${origem ? JSON.stringify(origem) : null}::jsonb, ${rastreio ? JSON.stringify(rastreio) : null}::jsonb)
      returning *`)

    // CompleteRegistration + Lead, com os mesmos ids do pixel (cad-… e lead-cad-…): a Meta junta navegador e servidor
    const doCadastro = { url: 'https://deepcar.app.br/cadastro', pessoa: { email, whatsapp, nome, idExterno: u.id, visitante }, navegador: { ...navegador, fbc: rastreio?.fbc } }
    const meta = eventoId
      ? Promise.all([
          enviarEvento({ nome: 'CompleteRegistration', id: eventoId, ...doCadastro }),
          enviarEvento({ nome: 'Lead', id: `lead-${eventoId}`, ...doCadastro }),
        ])
      : null

    // pagou antes de ter conta: o plano entra agora, sem passar pelo bloqueio do free
    const comPlano = await consumirPendente(u)
    // a conta nasce free: o relógio do teste começa aqui, porque o cadastro já entra no app
    const comJanela = await abrirJanelaFree(comPlano, { app: doApp || ehApp(req) })
    const { token, expira } = await criarSessao(u.id, req.headers['user-agent'])
    porCookie(res, token, expira)
    await meta // a funcao congela depois da resposta: o envio termina antes (no maximo 2,5 s, e nunca falha o cadastro)
    return res.status(201).json(await publicoCompleto(comJanela))
  } catch (err) {
    return res.status(err.status ?? 500).json({ erro: err.message ?? 'Não foi possível criar a conta.' })
  }
}
