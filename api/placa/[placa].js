// Vercel: GET /api/placa/:placa. Mesma consulta do servidor local (server/placa.mjs).
// Token do provedor fica nas variaveis de ambiente do projeto (FALCON_TOKEN ou CONSULTARPLACA_*).
import { consultarPlaca } from '../../server/placa.mjs'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ erro: 'Use GET.' })
  }
  try {
    const veiculo = await consultarPlaca(req.query.placa, process.env)
    // a mesma placa costuma ser consultada em seguida (recarregar a pagina, voltar): 10 min na borda
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=86400')
    return res.status(200).json(veiculo)
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(err.status ?? 500).json({ erro: err.message ?? 'Falha na consulta.' })
  }
}
