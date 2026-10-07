// Teste gratis por consultas (07/10/2026, decisao do dono): no site o teste vale CONSULTAS_TESTE consultas
// diferentes (esquema aberto ou placa encontrada), em vez de horas corridas. A pessoa nao ve o numero: quando
// acaba, o servidor encerra o teste (free_expira_em) e todo o resto ja existente cuida do bloqueio (402, esquema
// borrado, planos no inicio) no site E no app Android antigo, que so entende o prazo.
//
// - Abrir de novo o mesmo esquema ou a mesma placa nao gasta consulta (chave = tipo + item).
// - A ultima consulta recebe FOLGA_MIN minutos para ser usada; a seguinte, nova, encerra na hora.
// - Conta paga e admin tambem contam (o CRM mostra o total), mas nunca sao barradas.
// - O app Android antigo nao avisa os esquemas abertos (o acervo vem direto do R2): la so a placa conta, e o
//   prazo de horas continua (abrirJanelaFree com app = true).
import { sql, um } from './db.js'
import { freeAcabou, PAGOS } from './sessao.js'
import { avisarTesteAcabou } from './push.js'

export const CONSULTAS_TESTE = 5
const FOLGA_MIN = 30

const chaveDe = (tipo, item) => `${tipo}:${String(item).replace(/\p{Cc}/gu, '').slice(0, 240)}`
const livreDe = (u) => u.papel === 'admin' || PAGOS.has(u.plano)

/**
 * Pode abrir? Ja consultado: sim. Teste sem consulta sobrando: nao, e o teste e encerrado agora no banco
 * (a proxima conferencia da sessao trava a tela). Nao conta nada: quem conta e registrarConsulta.
 */
export async function podeConsultar(u, tipo, item) {
  if (livreDe(u)) return true
  if (freeAcabou(u)) return false
  if (await um(sql`select 1 as ok from consultas where usuario_id = ${u.id} and item = ${chaveDe(tipo, item)}`)) return true
  const linha = await um(sql`select consultas from usuarios where id = ${u.id}`)
  if ((linha?.consultas ?? 0) < CONSULTAS_TESTE) return true
  await sql`update usuarios set free_expira_em = now() where id = ${u.id} and plano = 'free'`
  await avisarTesteAcabou(u.id) // notificação no app (uma vez só)
  return false
}

/**
 * Confere e conta. `{ liberado, ultima }`: `ultima` = era a ultima consulta do teste.
 * A placa chama podeConsultar antes do provedor e esta so depois de achar o veiculo (placa nao encontrada nao gasta).
 */
export async function registrarConsulta(u, tipo, item) {
  if (!(await podeConsultar(u, tipo, item))) return { liberado: false }
  const chave = chaveDe(tipo, item)
  const livre = livreDe(u)
  const nova = await um(sql`
    insert into consultas (usuario_id, item, tipo) values (${u.id}, ${chave}, ${tipo})
    on conflict do nothing returning 1 as ok`)
  if (!nova) return { liberado: true } // duas abas abrindo o mesmo esquema juntas
  const total = await um(sql`update usuarios set consultas = consultas + 1 where id = ${u.id} returning consultas`)
  if (!livre && total.consultas >= CONSULTAS_TESTE) {
    // a ultima ainda abre; o prazo encurta para a folga (nunca estica um teste que ja acabaria antes)
    await sql`
      update usuarios set free_expira_em = least(coalesce(free_expira_em, 'infinity'), now() + ${`${FOLGA_MIN} minutes`}::interval)
       where id = ${u.id} and plano = 'free'`
    return { liberado: true, ultima: true }
  }
  return { liberado: true }
}
