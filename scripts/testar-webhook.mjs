// Dispara eventos da Cakto contra a rota /api/webhooks/cakto, assinados do mesmo jeito que ela assina.
//
//   CAKTO_WEBHOOK_SECRET=... node scripts/testar-webhook.mjs [url] [email]
//
// Padrão: http://localhost:3000/api/webhooks/cakto (é a porta do `npx vercel dev`).
// Contra um Preview da Vercel, lembre que o banco é o mesmo da produção: use um e-mail descartável.
import { createHmac } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

if (!process.env.CAKTO_WEBHOOK_SECRET) {
  const arq = path.join(process.cwd(), '.env')
  if (fs.existsSync(arq)) {
    for (const linha of fs.readFileSync(arq, 'utf8').split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/)
      if (m) process.env[m[1]] ??= m[2].trim().replace(/^["']|["']$/g, '')
    }
  }
}

const SEGREDO = process.env.CAKTO_WEBHOOK_SECRET
const URL_ALVO = process.argv[2] ?? 'http://localhost:3000/api/webhooks/cakto'
const EMAIL = process.argv[3] ?? 'teste+cakto@deepcar.com.br'
const PRODUTO_PRO = process.env.CAKTO_PRODUTO_PRO ?? ''
const PRODUTO_FULL = process.env.CAKTO_PRODUTO_FULL ?? ''

if (!SEGREDO) {
  console.error('Defina CAKTO_WEBHOOK_SECRET (o mesmo que está no cofre do /admin).')
  process.exit(1)
}

const corpoDe = (evento, produtoId, extra = {}) => ({
  secret: SEGREDO,
  event: evento,
  data: {
    id: `pedido-teste-${evento}`,
    refId: 'TESTE01',
    status: 'paid',
    amount: produtoId === PRODUTO_FULL ? 59.9 : 47.9,
    paymentMethod: 'pix',
    customer: { id: 999001, name: 'Comprador de Teste', email: EMAIL, phone: '5511999999999' },
    product: { id: produtoId, short_id: 'TESTE', name: 'Produto de teste', type: 'subscription' },
    offer: { id: 'oferta-teste', name: 'Oferta de teste', price: 47.9 },
    subscription: { id: 'assinatura-teste-1', status: 'active', next_payment_date: '2026-10-21T12:00:00Z' },
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    ...extra,
  },
})

async function enviar(rotulo, corpo, { segredo = SEGREDO, tsDelta = 0, semAssinatura = false } = {}) {
  const texto = JSON.stringify(corpo)
  const ts = Math.floor(Date.now() / 1000) + tsDelta
  const assinatura = `v1=${createHmac('sha256', segredo).update(`${ts}.`).update(texto).digest('hex')}`
  const headers = { 'Content-Type': 'application/json', 'User-Agent': 'CaktoBot/1.0' }
  if (!semAssinatura) {
    headers['X-Cakto-Timestamp'] = String(ts)
    headers['X-Cakto-Signature'] = assinatura
  }
  const res = await fetch(URL_ALVO, {
    method: 'POST',
    headers,
    body: texto, // exatamente os bytes que foram assinados
  })
  const body = await res.text()
  console.log(`${rotulo.padEnd(38)} ${res.status}  ${body.slice(0, 120)}`)
  return res.status
}

console.log(`alvo: ${URL_ALVO}\ne-mail de teste: ${EMAIL}\n`)

const aprovadoPro = corpoDe('purchase_approved', PRODUTO_PRO)
await enviar('compra aprovada (Pro)', aprovadoPro)
await enviar('a mesma entrega de novo', aprovadoPro)
await enviar('assinatura criada (Full)', corpoDe('subscription_created', PRODUTO_FULL))
await enviar('cobrança atrasada', corpoDe('subscription_late', PRODUTO_FULL))
await enviar('atraso recuperado', corpoDe('subscription_late_recovered', PRODUTO_FULL))
await enviar('produto desconhecido', corpoDe('purchase_approved', 'produto-que-nao-existe'))
await enviar('evento sem tratamento', corpoDe('pix_gerado', PRODUTO_PRO))
await enviar('reembolso', corpoDe('refund', PRODUTO_FULL))
// na Vercel a assinatura nao pode ser conferida (o corpo cru nao chega); vale o secret do corpo
await enviar('assinatura errada, secret certo', corpoDe('purchase_approved', PRODUTO_PRO), { segredo: 'errado' })
await enviar('timestamp velho (espera 401)', corpoDe('purchase_approved', PRODUTO_PRO), { tsDelta: -1800 })
await enviar('só o secret do corpo (espera 200)', corpoDe('purchase_approved', PRODUTO_PRO, { id: 'pedido-sem-assinatura' }), { semAssinatura: true })
await enviar('secret errado no corpo (espera 401)', { ...corpoDe('purchase_approved', PRODUTO_PRO), secret: 'nao-e-o-segredo' }, { semAssinatura: true })

console.log('\nConfira no /admin → Assinaturas o que virou aplicado, pendente ou erro.')
