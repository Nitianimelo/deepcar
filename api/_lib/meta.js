// API de Conversoes da Meta: o servidor avisa a Meta do cadastro e da compra, sem depender do navegador
// (bloqueador de anuncio, Safari e iOS cortam boa parte do pixel). Mesmo pixel do site (src/lib/pixel.ts).
//
// Tokens no cofre (/admin -> Chaves de API): META_CAPI_TOKEN (Gerenciador de Eventos -> pixel -> Configuracoes ->
// API de Conversoes -> Gerar token). Sem ele, nada e enviado. META_TEST_EVENT_CODE (opcional) manda tudo para a aba
// "Testar eventos" em vez de contar de verdade: apague depois de testar.
//
// E-mail, telefone, nome e id vao como sha-256 (exigencia da Meta); IP, navegador e os cookies _fbp/_fbc vao como estao.
// Nunca derruba quem chamou: falha vira log. Mudou o que e enviado? Atualize src/pages/Privacidade.tsx junto.
import { createHash } from 'node:crypto'
import { segredo } from './segredos.js'

const PIXEL_ID = '980567241730551'
const VERSAO = 'v23.0'
const ESPERA_MS = 2500

const hash = (v) => {
  const s = String(v ?? '').trim().toLowerCase()
  return s ? createHash('sha256').update(s).digest('hex') : undefined
}

/** Telefone so com digitos e DDI 55 (formato que a Meta casa com o cadastro dela). */
const telefone = (v) => {
  const d = String(v ?? '').replace(/\D/g, '')
  if (!d) return undefined
  return hash(d.length <= 11 ? `55${d}` : d)
}

const lista = (v) => (v ? [v] : undefined)

/** Cookie da propria pagina: o pixel grava _fbp/_fbc no dominio do site, e eles chegam junto na chamada da API. */
function cookie(req, nome) {
  const m = String(req?.headers?.cookie ?? '').match(new RegExp(`(?:^|;\\s*)${nome}=([^;]+)`))
  return m ? decodeURIComponent(m[1]) : undefined
}

/** Dados do navegador de quem fez a acao. So faz sentido quando a chamada veio do proprio navegador. */
export function dadosDoNavegador(req) {
  const ip = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim() || req.socket?.remoteAddress
  return {
    client_ip_address: ip || undefined,
    client_user_agent: req.headers['user-agent'] || undefined,
    fbp: cookie(req, '_fbp'),
    fbc: cookie(req, '_fbc'),
  }
}

/**
 * Envia um evento. `id` e o mesmo eventID que o pixel mandou do navegador (a Meta junta os dois e conta uma vez).
 * `pessoa`: { email, whatsapp, nome, idExterno }. `navegador`: saida de dadosDoNavegador, quando houver.
 */
export async function enviarEvento({ nome, id, url, pessoa = {}, navegador = {}, dados }) {
  try {
    const token = await segredo('META_CAPI_TOKEN')
    if (!token) return { enviado: false, motivo: 'sem token' }
    const teste = await segredo('META_TEST_EVENT_CODE')
    const [primeiro, ...resto] = String(pessoa.nome ?? '').trim().split(/\s+/)
    const evento = {
      event_name: nome,
      event_time: Math.floor(Date.now() / 1000),
      event_id: id,
      action_source: 'website',
      event_source_url: url,
      user_data: {
        em: lista(hash(pessoa.email)),
        ph: lista(telefone(pessoa.whatsapp)),
        fn: lista(hash(primeiro)),
        ln: lista(hash(resto.at(-1))),
        external_id: lista(hash(pessoa.idExterno)),
        ...navegador,
      },
      custom_data: dados,
    }
    const r = await fetch(`https://graph.facebook.com/${VERSAO}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [evento], ...(teste ? { test_event_code: teste } : {}) }),
      signal: AbortSignal.timeout(ESPERA_MS),
    })
    if (!r.ok) {
      // a resposta de erro da Meta nao traz o token; o corpo ajuda a achar campo errado
      console.error('[meta] evento recusado', nome, r.status, (await r.text()).slice(0, 300))
      return { enviado: false, motivo: `http ${r.status}` }
    }
    return { enviado: true }
  } catch (err) {
    console.error('[meta] falha ao enviar', nome, err?.message)
    return { enviado: false, motivo: err?.message }
  }
}
