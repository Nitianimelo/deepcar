// Notificacoes push do app Android (Firebase Cloud Messaging, API v1). Desde o app 1.3.0 (07/10/2026).
//  - O app registra o aparelho: POST /api/sessao { evento: 'push', token } -> tabela aparelhos_push.
//  - Automatica: "teste acabou", uma vez por conta (usuarios.push_teste_acabou_em): sai quando o servidor encerra o
//    teste por consultas (api/_lib/consultas.js) e no cron diario para quem venceu pelo prazo (admin/assinaturas ?acao=cron).
//  - Manuais: /admin -> Notificacoes (POST /api/admin/usuarios?acao=push).
// Token que a Google diz nao existir mais (app desinstalado) e apagado na hora.
import { sql, um } from './db.js'
import { chamarGoogle, contaDeServico, ESCOPO_FCM } from './google.js'

// funções (não consultas prontas): a consulta do neon roda quando é criada
const PUBLICOS = {
  todos: () => sql`select a.token from aparelhos_push a join usuarios u on u.id = a.usuario_id where u.ativo`,
  teste: () => sql`select a.token from aparelhos_push a join usuarios u on u.id = a.usuario_id where u.ativo and u.plano = 'free'`,
  pagos: () => sql`select a.token from aparelhos_push a join usuarios u on u.id = a.usuario_id where u.ativo and u.plano in ('pro', 'full')`,
}
export const NOMES_PUBLICO = Object.keys(PUBLICOS)

/** Manda para os tokens dados. `link`: rota do app aberta ao tocar (ex.: /conta?aba=plano). Devolve quantos entregou. */
export async function enviarPush(tokens, { titulo, texto, link = '/' }) {
  if (!tokens.length) return 0
  const sa = await contaDeServico()
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`
  let entregues = 0
  // em lotes pequenos: a API v1 manda um aparelho por chamada
  for (let i = 0; i < tokens.length; i += 20) {
    const lote = tokens.slice(i, i + 20)
    const r = await Promise.all(lote.map((token) => chamarGoogle(url, ESCOPO_FCM, {
      metodo: 'POST',
      corpo: { message: { token, notification: { title: titulo, body: texto }, data: { link }, android: { priority: 'high', notification: { channel_id: 'avisos' } } } },
    }).catch((err) => ({ ok: false, status: 0, dados: { error: { message: err.message } } }))))
    for (const [j, x] of r.entries()) {
      if (x.ok) { entregues++; continue }
      const codigo = x.dados?.error?.details?.find?.((d) => d.errorCode)?.errorCode ?? x.dados?.error?.status
      if (x.status === 404 || codigo === 'UNREGISTERED') {
        await sql`delete from aparelhos_push where token = ${lote[j]}`
      }
    }
  }
  return entregues
}

export async function tokensDoPublico(publico) {
  const q = PUBLICOS[publico]
  if (!q) throw Object.assign(new Error('Público inválido.'), { status: 400 })
  return (await q()).map((l) => l.token)
}

/** "Seu teste acabou" para uma conta, uma vez só. Nunca derruba quem chamou. */
export async function avisarTesteAcabou(usuarioId) {
  try {
    const marcou = await um(sql`update usuarios set push_teste_acabou_em = now()
                                 where id = ${usuarioId} and push_teste_acabou_em is null and plano = 'free' returning id`)
    if (!marcou) return
    const tokens = (await sql`select token from aparelhos_push where usuario_id = ${usuarioId}`).map((l) => l.token)
    await enviarPush(tokens, {
      titulo: 'Seu teste grátis acabou',
      texto: 'Assine um plano para continuar usando a Deepcar e abrir todos os esquemas.',
      link: '/conta?aba=plano',
    })
  } catch (err) {
    console.error('[push] teste acabou:', err.message)
  }
}
