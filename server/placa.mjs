// Consulta de placa → dados do veículo.
// Provedor principal: Falcon Data Hub (datahub.falcon-server.com.br). Alternativo: Consultar Placa.
// Sem credenciais no ambiente, roda em modo simulado (dados fictícios) para desenvolvimento.
//
// Este módulo não depende do Vite: pode ser reaproveitado em um backend Node real.

const PLACA_RE = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/ // AAA0000 (antiga) ou AAA0A00 (Mercosul)

export function normalizarPlaca(entrada) {
  const p = String(entrada || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return PLACA_RE.test(p) ? p : null
}

/** Formato único que o frontend consome, independente do provedor. */
function montarVeiculo(src) {
  return {
    placa: src.placa,
    marca: src.marca ?? null,
    modelo: src.modelo ?? null,
    anoFabricacao: toInt(src.ano_fabricacao),
    anoModelo: toInt(src.ano_modelo),
    combustivel: src.combustivel ?? null,
    cor: src.cor ?? null,
    motor: src.numero_motor ?? null,
    cilindradas: toInt(src.cilindradas),
    potencia: toInt(src.potencia),
    segmento: src.segmento ?? null,
    municipio: src.municipio ?? null,
    uf: src.uf_municipio ?? null,
    origem: src._origem ?? 'consultarplaca', // falcon | consultarplaca | simulado
  }
}

function toInt(v) {
  const n = parseInt(String(v ?? '').replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

/* ── Provedor: Consultar Placa ─────────────────────────────────────── */
async function viaConsultarPlaca(placa, { email, apiKey }) {
  const url = `https://api.consultarplaca.com.br/v2/consultarPlaca?placa=${placa}`
  const auth = Buffer.from(`${email}:${apiKey}`).toString('base64')
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' } })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = body?.message || body?.erro || body?.error || `HTTP ${res.status}`
    throw Object.assign(new Error(msg), { status: res.status === 404 ? 404 : 502 })
  }
  // A API pode envelopar em `data`/`dados`; aceita os dois.
  const d = body.data ?? body.dados ?? body
  if (!d || (!d.marca && !d.modelo)) {
    throw Object.assign(new Error('Veículo não encontrado.'), { status: 404 })
  }
  return montarVeiculo({ ...d, placa })
}

/* ── Provedor: Falcon Data Hub (datahub.falcon-server.com.br) ──────
   GET {base}/private/v1/vehicles/{placa}/search  +  Authorization: Bearer
   Resposta: { data: { placa, marca, modelo, ano, ano_modelo, cor, municipio, uf, combustivel, tipo } }
   404 → { error: "Placa não encontrada" }                                  */
const FALCON_BASE_PADRAO = 'https://beta.falcon-server.com.br/data-hub'

async function viaFalcon(placa, { token, base }) {
  const url = `${(base || FALCON_BASE_PADRAO).replace(/\/$/, '')}/private/v1/vehicles/${placa}/search`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  const body = await res.json().catch(() => ({}))
  const msg = String(body?.error || body?.message || '')
  if (res.status === 404 || /not found|n[aã]o encontrad/i.test(msg)) {
    throw Object.assign(new Error('Placa não encontrada na base.'), { status: 404 })
  }
  if (res.status === 401 || res.status === 403) throw Object.assign(new Error('Token do Falcon Data Hub inválido ou expirado.'), { status: 502 })
  if (res.status === 429) {
    // A mensagem do Falcon ("try again after 59 minutes") é mais confiável que o header de reset.
    const daMsg = String(body?.message || '').match(/(\d+)\s*min/i)
    const reset = parseInt(res.headers.get('x-ratelimit-reset') || '', 10)
    const min = daMsg ? parseInt(daMsg[1], 10)
      : Number.isFinite(reset) ? Math.max(1, Math.ceil((reset * 1000 - Date.now()) / 60000)) : null
    const limite = res.headers.get('x-ratelimit-limit')
    throw Object.assign(new Error(
      `Limite do plano Falcon atingido${limite ? ` (${limite} consultas/hora)` : ''}.` +
      (min ? ` Libera em ${min} min.` : ' Tente novamente mais tarde.'),
    ), { status: 503 })
  }
  if (!res.ok || body?.success === false) throw Object.assign(new Error(msg || `HTTP ${res.status}`), { status: 502 })

  const d = body.data ?? body
  if (!d || (!d.marca && !d.modelo)) throw Object.assign(new Error('Placa não encontrada.'), { status: 404 })
  return montarVeiculo({
    placa,
    marca: d.marca ?? null,
    modelo: d.modelo ?? null,
    ano_fabricacao: d.ano ?? d.ano_fabricacao ?? null,
    ano_modelo: d.ano_modelo ?? d.ano ?? null,
    combustivel: d.combustivel ? String(d.combustivel).toUpperCase() : null,
    cor: d.cor ? String(d.cor).toUpperCase() : null,
    numero_motor: d.motor ?? null,
    cilindradas: d.cilindradas ?? null,
    potencia: d.potencia ?? null,
    segmento: d.tipo ?? d.segmento ?? null,
    municipio: d.municipio ?? null,
    uf_municipio: d.uf ?? null,
    _origem: 'falcon',
  })
}

/* ── Modo simulado (sem credenciais) ───────────────────────────────── */
const MOCK = {
  AAA0000: { marca: 'CHEVROLET', modelo: 'ONIX 1.0 TURBO', ano_fabricacao: 2021, ano_modelo: 2022, combustivel: 'FLEX', cor: 'BRANCA', numero_motor: 'B10XFT', cilindradas: 999, potencia: 116 },
  ABC1D23: { marca: 'VOLKSWAGEN', modelo: 'GOL 1.6 MSI', ano_fabricacao: 2015, ano_modelo: 2016, combustivel: 'FLEX', cor: 'PRATA', numero_motor: 'CWS', cilindradas: 1598, potencia: 120 },
  BRA2E19: { marca: 'TOYOTA', modelo: 'HILUX CD SRX 2.8 4X4', ano_fabricacao: 2020, ano_modelo: 2020, combustivel: 'DIESEL', cor: 'PRETA', numero_motor: '1GD-FTV', cilindradas: 2755, potencia: 204 },
  FIA1T23: { marca: 'FIAT', modelo: 'ARGO DRIVE 1.3', ano_fabricacao: 2019, ano_modelo: 2020, combustivel: 'FLEX', cor: 'VERMELHA', numero_motor: 'FIREFLY', cilindradas: 1332, potencia: 109 },
  HON2C24: { marca: 'HONDA', modelo: 'CIVIC EXL 2.0 CVT', ano_fabricacao: 2018, ano_modelo: 2018, combustivel: 'FLEX', cor: 'CINZA', numero_motor: 'R20Z', cilindradas: 1997, potencia: 155 },
}

async function viaSimulado(placa) {
  await new Promise((r) => setTimeout(r, 400))
  const d = MOCK[placa]
  if (!d) throw Object.assign(new Error('Veículo não encontrado (modo simulado). Placas de teste: ' + Object.keys(MOCK).join(', ')), { status: 404 })
  return montarVeiculo({ ...d, placa, municipio: 'CURITIBA', uf_municipio: 'PR', _origem: 'simulado' })
}

/* ── Cache em memória (poupa a cota do provedor) ───────────────────── */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const cache = new Map() // placa → { veiculo, expira }

/* ── Entrada única ─────────────────────────────────────────────────── */
export async function consultarPlaca(entrada, env = process.env) {
  const placa = normalizarPlaca(entrada)
  if (!placa) throw Object.assign(new Error('Placa inválida. Use o formato AAA0000 ou AAA0A00.'), { status: 400 })

  const hit = cache.get(placa)
  if (hit && hit.expira > Date.now()) return { ...hit.veiculo, cache: true }

  const veiculo = await consultarNoProvedor(placa, env)
  if (veiculo.origem !== 'simulado') cache.set(placa, { veiculo, expira: Date.now() + CACHE_TTL_MS })
  return veiculo
}

async function consultarNoProvedor(placa, env) {
  if (env.FALCON_TOKEN) return viaFalcon(placa, { token: env.FALCON_TOKEN, base: env.FALCON_BASE_URL })

  const email = env.CONSULTARPLACA_EMAIL
  const apiKey = env.CONSULTARPLACA_API_KEY
  if (email && apiKey) return viaConsultarPlaca(placa, { email, apiKey })

  return viaSimulado(placa)
}
