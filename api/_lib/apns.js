// Notificações para o app do iPhone direto pelo APNs da Apple (08/10/2026). O Android vai pelo Firebase (push.js); o
// iPhone manda ao servidor o token do APNs (64 caracteres hexadecimais), e aqui o envio usa HTTP/2 com um token JWT
// assinado pela chave do APNs da conta Apple Developer (cofre: APNS_P8 = conteúdo do .p8, APNS_KEY_ID). Sem a chave no
// cofre, o iPhone fica sem aviso e nada quebra. Token de app instalado pelo Xcode é do ambiente de testes (sandbox):
// se a produção recusar com BadDeviceToken, tenta o sandbox.
import http2 from 'node:http2'
import { createSign } from 'node:crypto'
import { segredo } from './segredos.js'

const TIME = 'RM7UYJK7M2'
const TOPICO = 'deepcar.app.ios'
let jwt = null

async function tokenApns() {
  if (jwt && jwt.ate > Date.now()) return jwt.valor
  const [p8, kid] = await Promise.all([segredo('APNS_P8'), segredo('APNS_KEY_ID')])
  if (!p8 || !kid) return null
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const corpo = `${b64({ alg: 'ES256', kid })}.${b64({ iss: TIME, iat: Math.floor(Date.now() / 1000) })}`
  const valor = `${corpo}.${createSign('SHA256').update(corpo).sign({ key: p8, dsaEncoding: 'ieee-p1363' }, 'base64url')}`
  jwt = { valor, ate: Date.now() + 45 * 60_000 } // a Apple aceita o mesmo token por até 1 h
  return valor
}

function enviarUm(sessao, auth, token, carga) {
  return new Promise((resolve) => {
    const req = sessao.request({
      ':method': 'POST', ':path': `/3/device/${token}`, authorization: `bearer ${auth}`,
      'apns-topic': TOPICO, 'apns-push-type': 'alert', 'apns-priority': '10', 'content-type': 'application/json',
    })
    let status = 0, corpo = ''
    req.setTimeout(10_000, () => { req.close(); resolve({ status: 0, motivo: 'tempo' }) })
    req.on('response', (h) => { status = h[':status'] })
    req.on('data', (d) => { corpo += d })
    req.on('end', () => { let motivo = ''; try { motivo = JSON.parse(corpo || '{}').reason ?? '' } catch { /* corpo vazio no sucesso */ } resolve({ status, motivo }) })
    req.on('error', (e) => resolve({ status: 0, motivo: e.message }))
    req.end(JSON.stringify(carga))
  })
}

/** Manda para os tokens do iPhone. Devolve { entregues, invalidos } (invalidos: tokens para apagar). */
export async function enviarApns(tokens, { titulo, texto, link = '/' }) {
  if (!tokens.length) return { entregues: 0, invalidos: [] }
  const auth = await tokenApns()
  if (!auth) return { entregues: 0, invalidos: [] }
  const carga = { aps: { alert: { title: titulo, body: texto }, sound: 'default' }, link }
  const conectar = (host) => http2.connect(`https://${host}`)
  const prod = conectar('api.push.apple.com')
  let sandbox = null
  let entregues = 0
  const invalidos = []
  try {
    for (const t of tokens) {
      let r = await enviarUm(prod, auth, t, carga)
      if (r.status === 400 && r.motivo === 'BadDeviceToken') {
        sandbox ??= conectar('api.sandbox.push.apple.com')
        r = await enviarUm(sandbox, auth, t, carga)
      }
      if (r.status === 200) entregues++
      else if (r.status === 410 || r.motivo === 'BadDeviceToken' || r.motivo === 'Unregistered') invalidos.push(t)
      else console.error('[apns]', r.status, r.motivo)
    }
  } finally {
    prod.close(); sandbox?.close()
  }
  return { entregues, invalidos }
}
