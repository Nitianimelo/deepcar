// APIBrasil — consulta de dados do veículo pela placa (plano device-based, com cota grátis diária).
//
//   POST https://gateway.apibrasil.io/api/v2/vehicles/dados   { "placa": "ABC1D23" }
//   Authorization: Bearer <APIBRASIL_BEARER_TOKEN>   (a conta)
//   DeviceToken: <APIBRASIL_DEVICE_TOKEN>            (o "device" da API de veículos, criado no painel)
//
// Resposta: { error, message, response: { ...dados do veículo }, api_limit, api_limit_used }.
// Os nomes dos campos dentro de `response` variam entre bases (MARCA/marca, anoModelo/ano_modelo,
// às vezes dentro de `extra`), então a leitura procura cada campo por vários nomes.
import { erro, montarVeiculo } from '../veiculo.mjs'

const BASE_PADRAO = 'https://gateway.apibrasil.io/api/v2'
const TEMPO_MAXIMO_MS = 10_000

export const configurado = (env) => !!(env.APIBRASIL_BEARER_TOKEN && env.APIBRASIL_DEVICE_TOKEN)

export async function consultar(placa, env) {
  const base = (env.APIBRASIL_BASE_URL || BASE_PADRAO).replace(/\/$/, '')
  let res
  try {
    res = await fetch(`${base}/vehicles/dados`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.APIBRASIL_BEARER_TOKEN}`,
        DeviceToken: env.APIBRASIL_DEVICE_TOKEN,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ placa }),
      signal: AbortSignal.timeout(TEMPO_MAXIMO_MS),
    })
  } catch (e) {
    const tempo = e?.name === 'TimeoutError'
    throw erro(tempo ? 'A base de veículos demorou a responder. Tente de novo.' : 'Não foi possível falar com a base de veículos.', 504)
  }

  const corpo = await res.json().catch(() => ({}))
  const msg = String(corpo?.message || corpo?.error || '').trim()

  if (res.status === 401) throw erro('Credenciais da APIBrasil inválidas ou expiradas (APIBRASIL_BEARER_TOKEN).', 502)
  if (res.status === 402 || res.status === 403) {
    throw erro(`APIBrasil recusou a consulta${msg ? `: ${msg}` : ''}. Confira o plano e o DeviceToken.`, 502)
  }
  if (res.status === 429) throw erro('Limite de consultas da APIBrasil atingido. Tente novamente mais tarde.', 503)
  if (res.status === 404 || /n[aã]o encontrad|not found/i.test(msg)) throw erro('Placa não encontrada na base.', 404)
  if (!res.ok || corpo?.error === true) {
    // o gateway às vezes responde 200 com { error: true, message } quando a cota do dia acabou
    if (/limit|cota|excedid/i.test(msg)) throw erro('Limite de consultas da APIBrasil atingido. Tente novamente mais tarde.', 503)
    throw erro(msg || `APIBrasil respondeu HTTP ${res.status}.`, 502)
  }

  const d = corpo.response ?? corpo.data ?? corpo
  const campo = (...nomes) => achar(d, nomes)
  const marca = campo('marca', 'MARCA')
  const modelo = campo('modelo', 'MODELO')
  if (!marca && !modelo) throw erro('Placa não encontrada na base.', 404)

  return montarVeiculo({
    placa,
    marca,
    modelo,
    anoFabricacao: campo('ano', 'anoFabricacao', 'ano_fabricacao'),
    anoModelo: campo('anoModelo', 'ano_modelo', 'ano'),
    combustivel: campo('combustivel'),
    cor: campo('cor'),
    motor: campo('motor', 'numero_motor'),
    cilindradas: campo('cilindradas', 'cilindrada'),
    potencia: campo('potencia'),
    segmento: campo('segmento', 'tipo_veiculo', 'tipo'),
    municipio: campo('municipio'),
    uf: campo('uf', 'uf_municipio'),
  }, 'apibrasil')
}

/** Primeiro valor preenchido entre os nomes, sem diferenciar maiúsculas, olhando também em `extra`. */
function achar(obj, nomes) {
  const alvos = nomes.map((n) => n.toLowerCase())
  for (const fonte of [obj, obj?.extra]) {
    if (!fonte || typeof fonte !== 'object') continue
    for (const alvo of alvos) {
      const chave = Object.keys(fonte).find((k) => k.toLowerCase() === alvo)
      const v = chave ? fonte[chave] : undefined
      if (v !== undefined && v !== null && typeof v !== 'object' && String(v).trim() !== '') return v
    }
  }
  return null
}
