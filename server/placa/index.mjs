// Consulta de placa → dados do veículo. Não depende do Vite: serve a Vercel (api/placa),
// o servidor de desenvolvimento (server/vitePlacaPlugin.mjs) e o Deepcar.exe (server/app-local.mjs).
//
// Provedores em ordem de preferência; vale o primeiro com credenciais no ambiente:
//   1. APIBrasil       APIBRASIL_BEARER_TOKEN + APIBRASIL_DEVICE_TOKEN   (cota grátis diária)
//   2. Consultar Placa CONSULTARPLACA_EMAIL + CONSULTARPLACA_API_KEY     (pago por consulta)
//   3. Simulado        sem credenciais: só as placas de teste
// Para trocar ou acrescentar provedor: um arquivo em ./provedores com `configurado(env)` e
// `consultar(placa, env)` devolvendo montarVeiculo(...), e uma linha em PROVEDORES.
import * as apibrasil from './provedores/apibrasil.mjs'
import * as consultarplaca from './provedores/consultarplaca.mjs'
import * as simulado from './provedores/simulado.mjs'
import { erro, normalizarPlaca } from './veiculo.mjs'

export { normalizarPlaca }

/** Variáveis que os provedores leem. A rota da Vercel busca estas no cofre (/admin) antes do ambiente. */
export const VARIAVEIS_PLACA = [
  'APIBRASIL_BEARER_TOKEN',
  'APIBRASIL_DEVICE_TOKEN',
  'APIBRASIL_BASE_URL',
  'CONSULTARPLACA_EMAIL',
  'CONSULTARPLACA_API_KEY',
]

const PROVEDORES = [apibrasil, consultarplaca, simulado]

/* Cache em memória: poupa a cota quando a mesma placa é consultada de novo na mesma instância.
   Na Vercel a instância reinicia com frequência, então isto ajuda pouco lá. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const cache = new Map() // placa → { veiculo, expira }

export async function consultarPlaca(entrada, env = process.env) {
  const placa = normalizarPlaca(entrada)
  if (!placa) throw erro('Placa inválida. Use o formato AAA0000 ou AAA0A00.', 400)

  const hit = cache.get(placa)
  if (hit && hit.expira > Date.now()) return { ...hit.veiculo, cache: true }

  const provedor = PROVEDORES.find((p) => p.configurado(env))
  const veiculo = await provedor.consultar(placa, env)
  if (veiculo.origem !== 'simulado') cache.set(placa, { veiculo, expira: Date.now() + CACHE_TTL_MS })
  return veiculo
}
