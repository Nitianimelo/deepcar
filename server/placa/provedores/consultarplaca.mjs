// Consultar Placa — alternativa paga por consulta (docs.consultarplaca.com.br).
//   GET https://api.consultarplaca.com.br/v2/consultarPlaca?placa=...   Basic <email:apiKey>
import { erro, montarVeiculo } from '../veiculo.mjs'

export const configurado = (env) => !!(env.CONSULTARPLACA_EMAIL && env.CONSULTARPLACA_API_KEY)

export async function consultar(placa, env) {
  const auth = Buffer.from(`${env.CONSULTARPLACA_EMAIL}:${env.CONSULTARPLACA_API_KEY}`).toString('base64')
  const res = await fetch(`https://api.consultarplaca.com.br/v2/consultarPlaca?placa=${placa}`, {
    headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })
  const corpo = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = corpo?.message || corpo?.erro || corpo?.error || `HTTP ${res.status}`
    throw erro(msg, res.status === 404 ? 404 : 502)
  }
  // a API pode envelopar em `data`/`dados`
  const d = corpo.data ?? corpo.dados ?? corpo
  if (!d || (!d.marca && !d.modelo)) throw erro('Veículo não encontrado.', 404)
  return montarVeiculo({
    placa,
    marca: d.marca,
    modelo: d.modelo,
    anoFabricacao: d.ano_fabricacao,
    anoModelo: d.ano_modelo,
    combustivel: d.combustivel,
    cor: d.cor,
    motor: d.numero_motor,
    cilindradas: d.cilindradas,
    potencia: d.potencia,
    segmento: d.segmento,
    municipio: d.municipio,
    uf: d.uf_municipio,
  }, 'consultarplaca')
}
