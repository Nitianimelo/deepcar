export type Veiculo = {
  placa: string
  marca: string | null
  modelo: string | null
  anoFabricacao: number | null
  anoModelo: number | null
  combustivel: string | null
  cor: string | null
  motor: string | null
  cilindradas: number | null
  potencia: number | null
  segmento: string | null
  /** Pode vir mascarado pela base (ex.: 9BWAB45U0GT******). */
  chassi: string | null
  /** true = importado, false = nacional, null = a base não informou. */
  importado: boolean | null
  municipio: string | null
  uf: string | null
  origem: 'falcon' | 'simulado'
  cache?: boolean
}

export function formatarPlaca(p: string) {
  const s = p.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7)
  return s.length > 3 ? `${s.slice(0, 3)}-${s.slice(3)}` : s
}

export function placaValida(p: string) {
  return /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(p.toUpperCase().replace(/[^A-Z0-9]/g, ''))
}

export async function consultarPlaca(placa: string): Promise<Veiculo> {
  const limpa = placa.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const res = await fetch(`/api/placa/${encodeURIComponent(limpa)}`)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.erro ?? `Falha na consulta (HTTP ${res.status}).`)
  return body as Veiculo
}
