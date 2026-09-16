// Falcon Data Hub — consulta de veículo pela placa (datahub.falcon-server.com.br).
//
//   GET {FALCON_BASE_URL}/private/v1/vehicles/{placa}/search     Authorization: Bearer <FALCON_TOKEN>
//   200 → { data: { placa, marca, modelo, ano, ano_modelo, cor, municipio, uf, combustivel, tipo } }
//   404 → { error: "Placa não encontrada" }
//   429 → limite do plano (grátis: 10 consultas/hora), com x-ratelimit-limit / x-ratelimit-reset
import { erro, montarVeiculo } from '../veiculo.mjs'

const BASE_PADRAO = 'https://beta.falcon-server.com.br/data-hub'
const TEMPO_MAXIMO_MS = 10_000

export const configurado = (env) => !!env.FALCON_TOKEN

export async function consultar(placa, env) {
  const base = (env.FALCON_BASE_URL || BASE_PADRAO).replace(/\/$/, '')
  let res
  try {
    res = await fetch(`${base}/private/v1/vehicles/${placa}/search`, {
      headers: { Authorization: `Bearer ${env.FALCON_TOKEN}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(TEMPO_MAXIMO_MS),
    })
  } catch (e) {
    const tempo = e?.name === 'TimeoutError'
    throw erro(tempo ? 'A base de veículos demorou a responder. Tente de novo.' : 'Não foi possível falar com a base de veículos.', 504)
  }

  const corpo = await res.json().catch(() => ({}))
  const msg = String(corpo?.error || corpo?.message || '').trim()

  if (res.status === 401 || res.status === 403) throw erro('Token do Falcon Data Hub inválido ou expirado (FALCON_TOKEN).', 502)
  if (res.status === 429) throw erro(mensagemDeLimite(res, msg), 503)
  // 404 só é "placa não encontrada" quando o Falcon diz isso (ou não diz nada): rota errada também dá 404
  if (res.status === 404 && (!msg || /placa|ve[ií]culo|not found|n[aã]o encontrad/i.test(msg))) {
    throw erro('Placa não encontrada na base.', 404)
  }
  if (!res.ok || corpo?.success === false) throw erro(msg || `Falcon Data Hub respondeu HTTP ${res.status}.`, 502)

  const d = corpo.data ?? corpo
  if (!d || (!d.marca && !d.modelo)) throw erro('Placa não encontrada na base.', 404)

  return montarVeiculo({
    placa,
    marca: d.marca,
    modelo: d.modelo,
    anoFabricacao: d.ano ?? d.ano_fabricacao,
    anoModelo: d.ano_modelo ?? d.ano,
    combustivel: d.combustivel?.toUpperCase?.(),
    cor: d.cor?.toUpperCase?.(),
    motor: d.motor,
    cilindradas: d.cilindradas,
    potencia: d.potencia,
    segmento: d.tipo ?? d.segmento,
    municipio: d.municipio,
    uf: d.uf,
  }, 'falcon')
}

/** "Limite do plano Falcon atingido (10 consultas/hora). Libera em 42 min." */
function mensagemDeLimite(res, msg) {
  // a mensagem do Falcon ("try again after 59 minutes") é mais confiável que o cabeçalho de reset
  const daMsg = msg.match(/(\d+)\s*min/i)
  const reset = parseInt(res.headers.get('x-ratelimit-reset') || '', 10)
  const minutos = daMsg
    ? parseInt(daMsg[1], 10)
    : Number.isFinite(reset) ? Math.max(1, Math.ceil((reset * 1000 - Date.now()) / 60_000)) : null
  const limite = res.headers.get('x-ratelimit-limit')
  return `Limite do plano Falcon atingido${limite ? ` (${limite} consultas/hora)` : ''}.` +
    (minutos ? ` Libera em ${minutos} min.` : ' Tente novamente mais tarde.')
}
