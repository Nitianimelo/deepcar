import { chamarGoogle, ESCOPO_PLAY } from './api/_lib/google.js'
const PKG = 'deepcar.app.android'
const B = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PKG}/subscriptions`
const preco = (v) => { const [u, c] = v.split(','); return { currencyCode: 'BRL', units: u, nanos: Number(c.padEnd(9, '0')) } }
const plano = (id, periodo, valor) => ({ basePlanId: id, autoRenewingBasePlanType: { billingPeriodDuration: periodo, gracePeriodDuration: 'P3D', resubscribeState: 'RESUBSCRIBE_STATE_ACTIVE', legacyCompatible: id === 'mensal' },
  regionalConfigs: [{ regionCode: 'BR', newSubscriberAvailability: true, price: preco(valor) }] })
const listagem = (titulo, desc, beneficios) => ['pt-PT', 'pt-BR'].map((languageCode) => ({ languageCode, title: titulo, description: desc, benefits: beneficios }))
const SUBS = [
  { productId: 'deepcar_pro', listings: listagem('Deepcar Pro', 'Esquemas da linha leve com busca pela placa.', ['Injeção, ABS, elétrica e câmbio leve', 'Busca pela placa do veículo', '2 aparelhos ao mesmo tempo']),
    basePlans: [plano('mensal', 'P1M', '56,90'), plano('anual', 'P1Y', '340,90')] },
  { productId: 'deepcar_full', listings: listagem('Deepcar Full', 'Todos os esquemas, do leve ao diesel, com placa.', ['Linha leve e diesel completas', 'Busca pela placa do veículo', '4 aparelhos ao mesmo tempo']),
    basePlans: [plano('mensal', 'P1M', '70,90'), plano('anual', 'P1Y', '431,90')] },
]
for (const s of SUBS) {
  const r = await chamarGoogle(`${B}?productId=${s.productId}&regionsVersion.version=2022/02`, ESCOPO_PLAY, { metodo: 'POST', corpo: { packageName: PKG, ...s } })
  console.log(s.productId, 'criar', r.status, r.ok ? '' : JSON.stringify(r.dados).slice(0, 400))
  for (const bp of s.basePlans) {
    const a = await chamarGoogle(`${B}/${s.productId}/basePlans/${bp.basePlanId}:activate`, ESCOPO_PLAY, { metodo: 'POST', corpo: { latencyTolerance: 'PRODUCT_UPDATE_LATENCY_TOLERANCE_LATENCY_TOLERANT' } })
    console.log('  ', bp.basePlanId, 'ativar', a.status, a.ok ? '' : JSON.stringify(a.dados).slice(0, 300))
  }
}
const l = await chamarGoogle(B, ESCOPO_PLAY)
for (const s of l.dados.subscriptions ?? []) console.log('==', s.productId, s.basePlans.map((b) => `${b.basePlanId}:${b.state}:${b.regionalConfigs?.[0]?.price?.units},${String(b.regionalConfigs?.[0]?.price?.nanos ?? 0).slice(0, 2)}`).join(' | '))
