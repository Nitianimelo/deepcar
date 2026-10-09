// Senhas e sessoes.
//
// Senha: scrypt do proprio Node (sem dependencia), guardada como "scrypt$<sal>$<hash>".
// Sessao: token aleatorio de 32 bytes no cookie httpOnly; no banco fica so o sha-256 dele,
// entao um vazamento da tabela nao permite entrar como ninguem.
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { sql, um } from './db.js'
import { acessoDe, MINUTOS_TESTE_PADRAO, minutosTeste } from './planos.js'
import { conferirPlay } from './play.js'
import { conferirApple } from './apple.js'

const scryptAsync = promisify(scrypt)
const COOKIE = 'deepcar_sessao'
const DIAS = 30

/** Padrao do teste gratuito. O que vale e o /admin -> Planos (planos_acesso.minutos_teste, db/009). */
export const MINUTOS_FREE = MINUTOS_TESTE_PADRAO

/** Planos pagos: nao tem relogio de teste. */
export const PAGOS = new Set(['pro', 'full'])

/**
 * App Android ANTIGO (ate 1.2.0): HTTP nativo do Capacitor (agente Dalvik) sem o cabecalho X-Deepcar-App.
 * O app 1.3.0+ manda X-Deepcar-App (versao) e avisa os esquemas abertos, entao vale o teste por consultas do site.
 */
export const ehApp = (req) => /^Dalvik\//.test(String(req?.headers?.['user-agent'] ?? '')) && !req?.headers?.['x-deepcar-app']

/**
 * O teste do site vale SO por consultas (api/_lib/consultas.js): desde 08/10/2026 o dono tirou o prazo em dias.
 * free_expira_em continua sendo o "fim do teste" para o resto do codigo, entao no site ele nasce bem longe (10 anos)
 * e e encurtado quando as consultas acabam. O app Android antigo nao avisa os esquemas abertos, entao la o teste
 * continua por horas (minutos_teste, fora da tela do /admin). `app`: conta criada ou primeiro acesso pelo app antigo.
 */
export const DIAS_TESTE_SITE = 3650

/**
 * Comeca a contar o teste gratuito na primeira entrada (nao na criacao da conta):
 * quem cadastra hoje e so volta amanha nao perde o teste. Idempotente.
 */
export async function abrirJanelaFree(u, { app = false } = {}) {
  if (!u || u.plano !== 'free' || u.free_expira_em) return u
  const minutos = app ? await minutosTeste() : DIAS_TESTE_SITE * 1440
  const ate = new Date(Date.now() + minutos * 60_000)
  await sql`update usuarios set free_expira_em = ${ate} where id = ${u.id} and free_expira_em is null`
  return { ...u, free_expira_em: ate }
}

/**
 * Compra anual passou da data: volta para o free na hora, sem esperar evento (a Cakto nao avisa
 * o fim de uma compra unica). Plano dado a mao pelo /admin e administrador nao vencem.
 * Roda a cada sessao conferida e no login, entao ninguem fica pago um minuto alem do prazo.
 */
export async function vencerAnual(u) {
  if (!u || !PAGOS.has(u.plano) || u.assinatura_ciclo !== 'anual' || !u.plano_expira_em) return u
  if (new Date(u.plano_expira_em) > new Date() || u.papel === 'admin') return u
  if ((u.assinatura_origem ?? 'cakto') !== 'cakto') return u
  const agora = new Date()
  await sql`
    update usuarios set plano = 'free', assinatura_status = 'expirada', free_expira_em = ${agora},
           assinatura_atualizada_em = now()
     where id = ${u.id} and assinatura_ciclo = 'anual' and plano_expira_em <= now()
       and papel <> 'admin' and coalesce(assinatura_origem, 'cakto') = 'cakto'`
  return { ...u, plano: 'free', assinatura_status: 'expirada', free_expira_em: agora }
}

/** Teste gratuito ja vencido? Plano pago nunca vence. */
export const freeAcabou = (u) =>
  !PAGOS.has(u.plano) && !!u.free_expira_em && new Date(u.free_expira_em) <= new Date()

export async function cifrarSenha(senha) {
  const sal = randomBytes(16)
  const hash = await scryptAsync(senha, sal, 64)
  return `scrypt$${sal.toString('base64')}$${hash.toString('base64')}`
}

export async function conferirSenha(senha, guardada) {
  const [algo, sal, hash] = String(guardada || '').split('$')
  if (algo !== 'scrypt' || !sal || !hash) return false
  const esperado = Buffer.from(hash, 'base64')
  const obtido = await scryptAsync(senha, Buffer.from(sal, 'base64'), esperado.length)
  return esperado.length === obtido.length && timingSafeEqual(esperado, obtido)
}

const digerir = (token) => createHash('sha256').update(token).digest('hex')

export async function criarSessao(usuarioId, agente) {
  const token = randomBytes(32).toString('base64url')
  const expira = new Date(Date.now() + DIAS * 86400_000)
  await sql`insert into sessoes (token, usuario_id, expira_em, agente)
            values (${digerir(token)}, ${usuarioId}, ${expira}, ${agente ?? null})`
  return { token, expira }
}

export function porCookie(res, token, expira) {
  const partes = [
    `${COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Expires=${expira.toUTCString()}`,
  ]
  res.setHeader('Set-Cookie', partes.join('; '))
}

export function limparCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`)
}

function tokenDe(req) {
  const bruto = req.headers.cookie
  if (!bruto) return null
  for (const parte of bruto.split(';')) {
    const [nome, ...resto] = parte.trim().split('=')
    if (nome === COOKIE) return resto.join('=')
  }
  return null
}

/** Usuario da requisicao, ou null. Renova nada: a sessao vale 30 dias. */
export async function usuarioDaSessao(req) {
  const token = tokenDe(req)
  if (!token) return null
  const linha = await um(sql`
    select u.id, u.email, u.nome, u.oficina, u.plano, u.papel, u.ativo, u.whatsapp, u.free_expira_em,
           u.assinatura_status, u.assinatura_plano, u.assinatura_renova_em, u.assinatura_em_atraso,
           u.assinatura_ciclo, u.plano_expira_em, u.assinatura_origem, u.play_token, u.play_expira_em, u.play_conferido_em
      from sessoes s join usuarios u on u.id = s.usuario_id
     where s.token = ${digerir(token)} and s.expira_em > now()`)
  if (!linha || !linha.ativo) return null
  // ultimo uso do aparelho (o limite de dispositivos derruba o parado ha mais tempo); no maximo 1 escrita a cada 5 min
  await sql`update sessoes set visto_em = now()
             where token = ${digerir(token)} and (visto_em is null or visto_em < now() - interval '5 minutes')`
  // assinatura da Google Play com o prazo vencido: pergunta à Google se renovou (api/_lib/play.js); da App Store,
  // vencida há mais de 2 dias sem renovação avisada, volta ao teste encerrado (api/_lib/apple.js)
  return conferirApple(await conferirPlay(await vencerAnual(linha)))
}

export async function encerrarSessao(req) {
  const token = tokenDe(req)
  if (token) await sql`delete from sessoes where token = ${digerir(token)}`
}

/**
 * Devolve o usuario ou responde 401/403/402 e devolve null.
 * `acesso: true` nas rotas que entregam conteudo: ai o teste gratuito vencido barra.
 */
export async function exigir(req, res, { admin = false, acesso = false } = {}) {
  const u = await usuarioDaSessao(req)
  if (!u) {
    res.status(401).json({ erro: 'Faca login para continuar.' })
    return null
  }
  if (admin && u.papel !== 'admin') {
    res.status(403).json({ erro: 'Area restrita ao administrador.' })
    return null
  }
  if (acesso && u.papel !== 'admin' && freeAcabou(u)) {
    res.status(402).json({
      erro: 'Seu teste gratuito terminou. Assine um plano para acessar os sistemas.',
      expirado: true,
      plano: u.plano,
    })
    return null
  }
  return u
}

/** So o que o navegador pode ver. */
export const publico = (u) => ({
  nome: u.nome,
  email: u.email,
  oficina: u.oficina,
  plano: u.plano,
  papel: u.papel,
  whatsapp: u.whatsapp ?? null,
  // nulo = teste ainda nao comecou, ou plano pago (ai nao ha relogio nenhum)
  freeExpiraEm: !PAGOS.has(u.plano) && u.free_expira_em ? new Date(u.free_expira_em).toISOString() : null,
  // o navegador so precisa saber o estado; ids de cobranca ficam no servidor
  assinatura: u.assinatura_status
    ? {
        status: u.assinatura_status,
        plano: u.assinatura_plano ?? null,
        renovaEm: u.assinatura_renova_em ? new Date(u.assinatura_renova_em).toISOString() : null,
        emAtraso: !!u.assinatura_em_atraso,
        ciclo: u.assinatura_ciclo ?? null,
        // fim do anual (ISO); nulo no mensal, que vale ate o evento de cancelamento
        validoAte: u.plano_expira_em ? new Date(u.plano_expira_em).toISOString() : null,
        // 'play' = assinada no app (gerencia/cancela na Google Play); 'cakto' ou 'manual' = pelo site/suporte
        origem: u.assinatura_origem ?? null,
      }
    : null,
})

/** `publico` mais o que o plano libera: e o que login, cadastro e /api/sessao devolvem. */
export async function publicoCompleto(u) {
  const a = await acessoDe(u)
  // testeMinutos: a duracao do teste que vale agora, para os textos ("teste de 10 horas") e o relogio cheio
  return { ...publico(u), acesso: { secoes: a.secoes, placa: a.placa, dispositivos: a.dispositivos }, testeMinutos: await minutosTeste() }
}

export const corpo = (req) => (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {}))
