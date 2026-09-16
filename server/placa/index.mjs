// Consulta de placa → dados do veículo. Não depende do Vite: serve a Vercel (api/placa),
// o servidor de desenvolvimento (server/vitePlacaPlugin.mjs) e o Deepcar.exe (server/app-local.mjs).
//
// Provedores em ordem; vale o primeiro com credenciais no ambiente:
//   1. Falcon Data Hub   FALCON_TOKEN (opcional FALCON_BASE_URL)
//   2. Simulado          sem credenciais: só as placas de teste
// Para trocar de fornecedor: um arquivo em ./provedores com `configurado(env)` e
// `consultar(placa, env)` devolvendo montarVeiculo(...), e ajustar PROVEDORES e VARIAVEIS_PLACA.
import * as falcon from './provedores/falcon.mjs'
import * as simulado from './provedores/simulado.mjs'
import { erro, normalizarPlaca } from './veiculo.mjs'

export { normalizarPlaca }

/** Variáveis que os provedores leem. A rota da Vercel busca estas no cofre (/admin) antes do ambiente. */
export const VARIAVEIS_PLACA = ['FALCON_TOKEN', 'FALCON_BASE_URL']

const PROVEDORES = [falcon, simulado]

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
