// Vercel: GET /api/placa/:placa. Mesma consulta do servidor local (server/placa/).
// Credenciais do provedor saem do cofre (/admin → Chaves de API) ou das variaveis da Vercel.
import { consultarPlaca, VARIAVEIS_PLACA } from '../../server/placa/index.mjs'
import { ambienteCom } from '../_lib/segredos.js'
import { sql } from '../_lib/db.js'
import { ehApp, exigir, freeAcabou } from '../_lib/sessao.js'
import { acessoDe } from '../_lib/planos.js'
import { podeConsultar, registrarConsulta } from '../_lib/consultas.js'
import { normalizarPlaca } from '../../server/placa/veiculo.mjs'
import { ativacaoMeta } from '../_lib/meta.js'
import { anotarApp } from '../_lib/uso.js'

export const config = { runtime: 'nodejs' }

const PLACAS_DIA_VENCIDO = 10

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ erro: 'Use GET.' })
  }
  // consulta de placa custa cota do provedor: só para quem está logado. Teste encerrado (08/10/2026, decisão do dono)
  // continua vendo a ficha e os sistemas do veículo, com os esquemas borrados; o app Android ANTIGO (que não sabe
  // borrar) continua recebendo 402
  const u = await exigir(req, res, { acesso: ehApp(req) })
  if (!u) return
  // busca pela placa e item do plano (Full na pagina de vendas): o Pro recebe 403 e a tela oferece o upgrade
  if (!(await acessoDe(u)).placa) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(403).json({ erro: 'A busca pela placa não faz parte do seu plano.', semPlaca: true })
  }
  // teste gratis por consultas (api/_lib/consultas.js): vale tambem para o app Android, que chama esta rota.
  // Confere antes do provedor; conta so depois de achar o veiculo (placa nao encontrada nao gasta consulta).
  const placa = normalizarPlaca(req.query.placa)
  const vencido = u.papel !== 'admin' && (freeAcabou(u) || (placa && !(await podeConsultar(u, 'placa', placa))))
  if (vencido) {
    // mesmo corpo do 402 de exigir(): site e app ja mostram o convite para assinar
    const recusar = () => {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(402).json({ erro: 'Seu teste gratuito terminou. Assine um plano para acessar os sistemas.', expirado: true, plano: u.plano })
    }
    if (ehApp(req) || !placa) return recusar()
    // a mesma placa de novo não conta; placas novas, no máximo PLACAS_DIA_VENCIDO por dia (cota do provedor)
    const ja = await sql`select 1 from placas_teste_vencido where usuario_id = ${u.id} and placa = ${placa}`
    if (!ja.length) {
      const hoje = await sql`select count(*)::int n from placas_teste_vencido where usuario_id = ${u.id} and em > now() - interval '1 day'`
      if (hoje[0].n >= PLACAS_DIA_VENCIDO) return recusar()
    }
  }
  try {
    const env = await ambienteCom(...VARIAVEIS_PLACA)
    const veiculo = await consultarPlaca(req.query.placa, env)
    if (vencido) {
      await sql`insert into placas_teste_vencido (usuario_id, placa) values (${u.id}, ${placa}) on conflict do nothing`
      res.setHeader('Cache-Control', 'private, no-store')
      return res.status(200).json({ ...veiculo, bloqueado: true }) // a tela mostra a ficha e os esquemas borrados
    }
    if (placa && veiculo.origem !== 'simulado') await registrarConsulta(u, 'placa', placa)
    // rota autenticada: nada de cache compartilhado na borda, que serviria a resposta
    // a quem nao fez login. Repetir a mesma placa ja e barato pelo cache em server/placa/index.mjs.
    res.setHeader('Cache-Control', 'private, no-store')
    // ativacao: primeira placa que deu certo (aparece no /admin); so escreve uma vez
    await sql`update usuarios set primeira_placa_em = now() where id = ${u.id} and primeira_placa_em is null`
    await ativacaoMeta(u.id, req) // StartTrial para a Meta, uma vez por conta (só cadastro do site)
    await anotarApp(req, u.id, 'placa', { placa: veiculo.placa, marca: veiculo.marca, modelo: veiculo.modelo, ano: veiculo.anoModelo ?? veiculo.anoFabricacao ?? null })
    return res.status(200).json(veiculo)
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store')
    await anotarApp(req, u.id, 'placa_erro', { placa, erro: String(err.message ?? '').slice(0, 160) })
    return res.status(err.status ?? 500).json({ erro: err.message ?? 'Falha na consulta.' })
  }
}
