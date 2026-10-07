// Vercel: GET /api/placa/:placa. Mesma consulta do servidor local (server/placa/).
// Credenciais do provedor saem do cofre (/admin → Chaves de API) ou das variaveis da Vercel.
import { consultarPlaca, VARIAVEIS_PLACA } from '../../server/placa/index.mjs'
import { ambienteCom } from '../_lib/segredos.js'
import { sql } from '../_lib/db.js'
import { exigir } from '../_lib/sessao.js'
import { acessoDe } from '../_lib/planos.js'
import { podeConsultar, registrarConsulta } from '../_lib/consultas.js'
import { normalizarPlaca } from '../../server/placa/veiculo.mjs'

export const config = { runtime: 'nodejs' }

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ erro: 'Use GET.' })
  }
  // consulta de placa custa cota do provedor: só para quem está logado e com acesso
  // em dia — free com o teste vencido recebe 402 e a tela pede a assinatura
  const u = await exigir(req, res, { acesso: true })
  if (!u) return
  // busca pela placa e item do plano (Full na pagina de vendas): o Pro recebe 403 e a tela oferece o upgrade
  if (!(await acessoDe(u)).placa) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(403).json({ erro: 'A busca pela placa não faz parte do seu plano.', semPlaca: true })
  }
  // teste gratis por consultas (api/_lib/consultas.js): vale tambem para o app Android, que chama esta rota.
  // Confere antes do provedor; conta so depois de achar o veiculo (placa nao encontrada nao gasta consulta).
  const placa = normalizarPlaca(req.query.placa)
  if (placa && !(await podeConsultar(u, 'placa', placa))) {
    res.setHeader('Cache-Control', 'no-store')
    // mesmo corpo do 402 de exigir(): site e app ja mostram o convite para assinar
    return res.status(402).json({ erro: 'Seu teste gratuito terminou. Assine um plano para acessar os sistemas.', expirado: true, plano: u.plano })
  }
  try {
    const env = await ambienteCom(...VARIAVEIS_PLACA)
    const veiculo = await consultarPlaca(req.query.placa, env)
    if (placa && veiculo.origem !== 'simulado') await registrarConsulta(u, 'placa', placa)
    // rota autenticada: nada de cache compartilhado na borda, que serviria a resposta
    // a quem nao fez login. Repetir a mesma placa ja e barato pelo cache em server/placa/index.mjs.
    res.setHeader('Cache-Control', 'private, no-store')
    // ativacao: primeira placa que deu certo (aparece no /admin); so escreve uma vez
    await sql`update usuarios set primeira_placa_em = now() where id = ${u.id} and primeira_placa_em is null`
    return res.status(200).json(veiculo)
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(err.status ?? 500).json({ erro: err.message ?? 'Falha na consulta.' })
  }
}
