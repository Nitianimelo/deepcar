import { sql } from './api/_lib/db.js'
import { enviarPush } from './api/_lib/push.js'
const t = (await sql`select a.token from aparelhos_push a join usuarios u on u.id = a.usuario_id where u.email = 'teste.emulador@deepcar.invalid'`).map((x) => x.token)
console.log('entregues:', await enviarPush(t, { titulo: 'Teste da Deepcar', texto: 'Notificação de teste do servidor.', link: '/conta?aba=plano' }))
