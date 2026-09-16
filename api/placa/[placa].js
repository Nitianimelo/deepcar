// Vercel: GET /api/placa/:placa. Mesma consulta do servidor local (server/placa.mjs).
// Token do provedor fica nas variaveis de ambiente do projeto (FALCON_TOKEN ou CONSULTARPLACA_*).
import { consultarPlaca } from '../../server/placa.mjs'
import { ambienteCom } from '../_lib/segredos.js'
import { exigir } from '../_lib/sessao.js'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ erro: 'Use GET.' })
  }
  // consulta de placa custa cota do provedor: só para quem está logado e com acesso
  // em dia — free com os minutos vencidos recebe 402 e a tela pede a assinatura
  if (!(await exigir(req, res, { acesso: true }))) return
  try {
    const env = await ambienteCom('FALCON_TOKEN', 'FALCON_BASE_URL', 'CONSULTARPLACA_EMAIL', 'CONSULTARPLACA_API_KEY')
    const veiculo = await consultarPlaca(req.query.placa, env)
    // rota autenticada: nada de cache compartilhado na borda, que serviria a resposta
    // a quem nao fez login. Repetir a mesma placa ja e barato pelo cache em server/placa.mjs.
    res.setHeader('Cache-Control', 'private, no-store')
    return res.status(200).json(veiculo)
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(err.status ?? 500).json({ erro: err.message ?? 'Falha na consulta.' })
  }
}
