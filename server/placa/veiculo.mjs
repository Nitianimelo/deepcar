// Formato único de veículo que o front consome (src/lib/placa.ts), seja qual for o provedor.

const PLACA_RE = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/ // AAA0000 (antiga) ou AAA0A00 (Mercosul)

export function normalizarPlaca(entrada) {
  const p = String(entrada || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return PLACA_RE.test(p) ? p : null
}

export function inteiro(v) {
  const n = parseInt(String(v ?? '').replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

const texto = (v) => {
  const s = String(v ?? '').trim()
  return s ? s : null
}

/**
 * Importado ou nacional, a partir do que a base mandar: true/false, "S"/"N", "SIM"/"NÃO",
 * "IMPORTADO"/"NACIONAL", "ESTRANGEIRA". Qualquer outra coisa vira null (a tela não mostra).
 */
export function importado(v) {
  if (typeof v === 'boolean') return v
  if (v === 1 || v === 0) return v === 1
  const s = String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase()
  if (/^(S|SIM|TRUE|1|IMPORTAD[OA]|ESTRANGEIR[OA])$/.test(s)) return true
  if (/^(N|NAO|FALSE|0|NACIONAL)$/.test(s)) return false
  return null
}

/** Erro com o status HTTP que a rota /api/placa devolve ao navegador. */
export const erro = (mensagem, status) => Object.assign(new Error(mensagem), { status })

/**
 * @param {object} d campos já traduzidos pelo provedor
 * @param {'falcon' | 'simulado'} origem
 */
export function montarVeiculo(d, origem) {
  return {
    placa: d.placa,
    marca: texto(d.marca),
    modelo: texto(d.modelo),
    anoFabricacao: inteiro(d.anoFabricacao),
    anoModelo: inteiro(d.anoModelo),
    combustivel: texto(d.combustivel),
    cor: texto(d.cor),
    motor: texto(d.motor),
    cilindradas: inteiro(d.cilindradas),
    potencia: inteiro(d.potencia),
    segmento: texto(d.segmento),
    chassi: texto(d.chassi),
    importado: importado(d.importado),
    municipio: texto(d.municipio),
    uf: texto(d.uf),
    origem,
  }
}
