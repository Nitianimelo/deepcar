// Links de compartilhamento de um esquema. Um link abre LIMITE vezes e depois expira.
//
//   POST /api/compartilhar            { id, titulo }  → { url, limite }   (exige sessão e o sistema no plano)
//   GET  /api/compartilhar?t=...&v=... → { esquemaId, titulo, quem, restantes } | 410 expirado | 404
//
// Uma "abertura" e um aparelho (v = id guardado no navegador de quem abre): recarregar a pagina
// no mesmo aparelho dentro de REABRIR_MS nao gasta outra. Quem criou o link confere sem gastar.
// O preview do WhatsApp nao conta: ele so le o HTML, e a abertura so acontece quando o app chama esta rota.
import { createHash, randomBytes } from 'node:crypto'
import { sql, um } from './_lib/db.js'
import { corpo, exigir, usuarioDaSessao } from './_lib/sessao.js'
import { acessoDe, secaoDoId } from './_lib/planos.js'

export const config = { runtime: 'nodejs' }

const LIMITE = 2
const REABRIR_MS = 2 * 60 * 60_000
const POR_DIA = 60

const digerir = (t) => createHash('sha256').update(t).digest('hex')
const primeiroNome = (nome) => String(nome ?? '').trim().split(/\s+/)[0] || null

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    if (req.method === 'POST') return await criar(req, res)
    if (req.method === 'GET') return await abrir(req, res)
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ erro: 'Método não suportado.' })
  } catch (err) {
    return res.status(err.status ?? 500).json({ erro: err.message ?? 'Falha no compartilhamento.' })
  }
}

async function criar(req, res) {
  const u = await exigir(req, res, { acesso: true })
  if (!u) return
  const d = corpo(req)
  const id = String(d.id ?? '').trim()
  if (!id || id.length > 400 || id.includes('..')) return res.status(400).json({ erro: 'Esquema inválido.' })
  // so compartilha o que o plano da conta abre
  if (!(await acessoDe(u)).secoes.includes(secaoDoId(id))) {
    return res.status(403).json({ erro: 'Este sistema não faz parte do seu plano.' })
  }
  const recentes = await um(sql`select count(*)::int n from compartilhamentos
                                 where usuario_id = ${u.id} and criado_em > now() - interval '1 day'`)
  if (recentes.n >= POR_DIA) return res.status(429).json({ erro: 'Limite de links de hoje atingido. Tente amanhã.' })

  const codigo = randomBytes(18).toString('base64url')
  await sql`insert into compartilhamentos (token, usuario_id, esquema_id, titulo, limite)
            values (${digerir(codigo)}, ${u.id}, ${id}, ${String(d.titulo ?? '').slice(0, 200) || null}, ${LIMITE})`
  const host = req.headers['x-forwarded-host'] ?? req.headers.host
  const proto = req.headers['x-forwarded-proto'] ?? 'https'
  return res.status(201).json({ url: `${proto}://${host}/c/${codigo}`, limite: LIMITE })
}

async function abrir(req, res) {
  const codigo = String(req.query.t ?? '')
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(codigo)) return res.status(404).json({ estado: 'inexistente' })
  const token = digerir(codigo)
  const c = await um(sql`select c.*, u.nome as quem from compartilhamentos c
                          left join usuarios u on u.id = c.usuario_id where c.token = ${token}`)
  if (!c) return res.status(404).json({ estado: 'inexistente' })

  const quem = primeiroNome(c.quem)
  const saida = (restantes) => res.status(200).json({ esquemaId: c.esquema_id, titulo: c.titulo, quem, restantes })

  // quem criou o link pode conferir o que mandou sem gastar abertura
  const dono = await usuarioDaSessao(req).catch(() => null)
  if (dono && dono.id === c.usuario_id) return saida(Math.max(0, c.limite - c.aberturas))

  const v = /^[A-Za-z0-9-]{8,64}$/.test(String(req.query.v ?? '')) ? String(req.query.v) : null
  const antes = v ? c.visitantes?.[v] : null
  if (antes && Date.now() - new Date(antes).getTime() < REABRIR_MS) return saida(Math.max(0, c.limite - c.aberturas))

  if (c.aberturas >= c.limite) return res.status(410).json({ estado: 'expirado', quem })
  // conta a abertura so se ainda houver vaga (duas pessoas abrindo juntas nao passam do limite)
  const chave = v ?? randomBytes(8).toString('hex')
  const feito = await um(sql`
    update compartilhamentos set
      aberturas = aberturas + 1,
      visitantes = visitantes || jsonb_build_object(${chave}::text, now()),
      ultima_abertura_em = now()
    where token = ${token} and aberturas < limite
    returning aberturas, limite`)
  if (!feito) return res.status(410).json({ estado: 'expirado', quem })
  return saida(feito.limite - feito.aberturas)
}
