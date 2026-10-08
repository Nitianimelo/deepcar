// API de Conversoes da Meta: o servidor avisa a Meta do cadastro e da compra, sem depender do navegador
// (bloqueador de anuncio, Safari e iOS cortam boa parte do pixel). Mesmo pixel do site (src/lib/pixel.ts).
//
// Tokens no cofre (/admin -> Chaves de API): META_CAPI_TOKEN (Gerenciador de Eventos -> pixel -> Configuracoes ->
// API de Conversoes -> Gerar token). Sem ele, nada e enviado. META_TEST_EVENT_CODE (opcional) faz os eventos aparecerem
// na aba "Testar eventos", MAS ELES CONTAM DE VERDADE (a Meta nao descarta: entram na medicao e na otimizacao dos
// anuncios; o teste de 03/10/2026 virou 1 compra falsa no Gerenciador). Teste com conta e dados falsos so num conjunto
// de dados (pixel) separado, nunca no "Deepcar teste 1". Apague o codigo depois.
//
// E-mail, telefone, nome e id vao como sha-256 (exigencia da Meta); IP, navegador e os cookies _fbp/_fbc vao como estao.
// Nunca derruba quem chamou: falha vira log. Mudou o que e enviado? Atualize src/pages/Privacidade.tsx junto.
import { sql, um } from './db.js'
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
/** Lista sem vazios; vazia vira undefined (campo omitido, como antes). */
const ids = (...v) => (v.filter(Boolean).length ? v.filter(Boolean) : undefined)

/**
 * Id anonimo do visitante (src/lib/pixel.ts: visitanteId), o MESMO que o pixel manda como external_id desde o primeiro
 * PageView. Mandar ele aqui (cadastro, checkout, compra) liga as visitas e cliques anonimos a pessoa que se cadastrou.
 * O pixel faz o sha-256 dele; aqui o hash() faz o mesmo, entao os dois lados batem.
 */
const VISITANTE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
export const visitanteValido = (v) => (VISITANTE.test(String(v ?? '')) ? String(v) : undefined)
// todo cliente da Deepcar e do Brasil: o pais conta na qualidade da correspondencia (o pixel manda o mesmo)
const PAIS = hash('br')

/** Cookie da propria pagina: o pixel grava _fbp/_fbc no dominio do site, e eles chegam junto na chamada da API. */
function cookie(req, nome) {
  const m = String(req?.headers?.cookie ?? '').match(new RegExp(`(?:^|;\\s*)${nome}=([^;]+)`))
  return m ? decodeURIComponent(m[1]) : undefined
}

const FBC = /^fb\.1\.\d{10,16}\.[\w-]{8,500}$/
/** fbc no formato do cookie _fbc (fb.1.<ms>.<fbclid>), ou undefined. */
export const fbcValido = (v) => (FBC.test(String(v ?? '')) ? String(v) : undefined)

/**
 * O que guardar do navegador no cadastro (usuarios.rastreio_meta), para eventos que chegam depois sem navegador:
 * a compra vem do webhook da Cakto, servidor a servidor. `fbcReserva` = fbc montado do fbclid (src/lib/origem.ts),
 * usado quando o cookie _fbc nao existe (Safari apaga em 7 dias, ou o pixel nao chegou a carregar).
 */
export function rastreioParaGuardar(navegador, fbcReserva, visitante) {
  const r = {
    visitante: visitanteValido(visitante),
    fbp: navegador.fbp,
    fbc: navegador.fbc ?? fbcValido(fbcReserva),
    ip: navegador.client_ip_address,
    navegador: navegador.client_user_agent?.slice(0, 400),
  }
  return Object.values(r).some(Boolean) ? r : null
}

/** O inverso: rastreio guardado -> campos de user_data da Meta. */
export const navegadorGuardado = (r) =>
  r ? { client_ip_address: r.ip, client_user_agent: r.navegador, fbp: r.fbp, fbc: r.fbc } : {}

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
 * `pessoa`: { email, whatsapp, nome, idExterno, visitante }. `navegador`: saida de dadosDoNavegador, quando houver.
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
      // a Meta exige o navegador (client_user_agent) em evento 'website'; sem ele (compra de quem pagou antes de
      // ter conta) o evento vai como gerado pelo sistema, para nao ser recusado
      action_source: navegador.client_user_agent ? 'website' : 'system_generated',
      event_source_url: navegador.client_user_agent ? url : undefined,
      user_data: {
        em: lista(hash(pessoa.email)),
        ph: lista(telefone(pessoa.whatsapp)),
        fn: lista(hash(primeiro)),
        ln: lista(hash(resto.at(-1))),
        external_id: ids(hash(pessoa.idExterno), hash(visitanteValido(pessoa.visitante))),
        country: [PAIS],
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

/**
 * Ativacao (08/10/2026): o conjunto de anuncios otimizava por cadastro e trazia muito curioso (um criativo deu 72
 * cadastros e nenhuma venda). StartTrial = a pessoa USOU o teste (1a placa encontrada ou 1o esquema aberto): sai uma
 * vez por conta, so para quem se cadastrou pelo site (tem rastreio_meta; o app Android nao vai para a Meta), com o
 * navegador de agora ou, sem ele, o do cadastro. Para otimizar: conjunto novo com o evento "Iniciar avaliacao gratuita".
 */
export async function ativacaoMeta(usuarioId, req) {
  try {
    const u = await um(sql`update usuarios set meta_ativacao_em = now()
                            where id = ${usuarioId} and meta_ativacao_em is null and rastreio_meta is not null and papel <> 'admin'
                            returning id, email, whatsapp, nome, rastreio_meta`)
    if (!u) return
    const agora = req ? dadosDoNavegador(req) : {}
    const navegador = agora.client_user_agent ? { ...agora, fbc: agora.fbc ?? u.rastreio_meta?.fbc, fbp: agora.fbp ?? u.rastreio_meta?.fbp } : navegadorGuardado(u.rastreio_meta)
    await enviarEvento({
      nome: 'StartTrial', id: `ativ-${u.id}`, url: 'https://deepcar.app.br/app',
      pessoa: { email: u.email, whatsapp: u.whatsapp, nome: u.nome, idExterno: u.id, visitante: u.rastreio_meta?.visitante },
      navegador, dados: { value: 0, currency: 'BRL' },
    })
  } catch (err) {
    console.error('[meta] ativacao:', err?.message)
  }
}
