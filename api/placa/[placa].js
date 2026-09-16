// Vercel: GET /api/placa/:placa. Mesma consulta do servidor local (server/placa/).
// Credenciais do provedor saem do cofre (/admin → Chaves de API) ou das variaveis da Vercel.
import { consultarPlaca, VARIAVEIS_PLACA } from '../../server/placa/index.mjs'
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
    const env = await ambienteCom(...VARIAVEIS_PLACA)
    const veiculo = await consultarPlaca(req.query.placa, env)
    // rota autenticada: nada de cache compartilhado na borda, que serviria a resposta
    // a quem nao fez login. Repetir a mesma placa ja e barato pelo cache em server/placa/index.mjs.
    res.setHeader('Cache-Control', 'private, no-store')
    return res.status(200).json(veiculo)
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(err.status ?? 500).json({ erro: err.message ?? 'Falha na consulta.' })
  }
}
