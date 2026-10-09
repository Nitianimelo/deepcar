// Registro de uso feito pelo SERVIDOR para o app Android (08/10/2026). O site grava pelo navegador (src/lib/log.ts →
// POST /api/sessao evento 'log'); o app Android não manda registro, mas passa por estas rotas: login, cadastro, placa,
// esquema aberto (evento 'consulta'), sessão e compra pela Play. Mesma tabela eventos_uso e mesmos tipos do site, então
// o /admin → Logs mostra tudo junto (aparelho "Android · app 1.3.0" / "Android · app antigo"). Só grava o que vem do app:
// o site já registra do lado dele. Nunca derruba quem chamou.
import { sql } from './db.js'

/** Requisição do app Android: HTTP nativo (agente Dalvik) ou o cabeçalho X-Deepcar-App do app 1.3.0+. */
export const doApp = (req) => /^Dalvik\//.test(String(req?.headers?.['user-agent'] ?? '')) || !!req?.headers?.['x-deepcar-app']

const aparelho = (req) => {
  const v = String(req?.headers?.['x-deepcar-app'] ?? '').replace(/[^\w.-]/g, '').slice(0, 20)
  // o app manda X-Deepcar-Plataforma (iPhone desde 08/10/2026); o Android antigo não manda nada
  const so = req?.headers?.['x-deepcar-plataforma'] === 'ios' ? 'iPhone' : 'Android'
  return `${so} · app ${v || 'antigo'}`
}

export async function anotarApp(req, usuarioId, tipo, detalhe = null, rota = null) {
  if (!doApp(req)) return
  try {
    let d = detalhe ? JSON.stringify(detalhe) : null
    if (d && d.length > 1500) d = JSON.stringify({ cortado: d.slice(0, 1400) })
    await sql`insert into eventos_uso (usuario_id, tipo, detalhe, rota, aparelho)
              values (${usuarioId ?? null}, ${tipo}, ${d}::jsonb, ${rota}, ${aparelho(req)})`
  } catch (err) {
    console.error('[uso] app:', err.message)
  }
}

/** "Abriu o app": a sessão é conferida a toda hora; grava no máximo uma vez a cada 30 min por conta. */
export async function anotarAberturaApp(req, usuarioId) {
  if (!doApp(req) || !usuarioId) return
  try {
    const recente = await sql`select 1 from eventos_uso where usuario_id = ${usuarioId} and tipo = 'app_aberto'
                               and em > now() - interval '30 minutes' limit 1`
    if (!recente.length) await anotarApp(req, usuarioId, 'app_aberto')
  } catch (err) {
    console.error('[uso] abertura:', err.message)
  }
}
