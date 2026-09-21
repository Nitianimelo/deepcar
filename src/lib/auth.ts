// Autenticação: a sessão vive num cookie httpOnly assinado pelo servidor (api/login.js).
// O navegador não guarda credencial nenhuma — só um retrato do perfil, para a tela
// aparecer sem esperar a rede. Quem manda é o servidor: toda rota protegida confere o cookie.
import { useEffect, useState } from 'react'

const PERFIL = 'deepcar.perfil'

export type Plano = 'free' | 'pro' | 'full'

/** Estado da assinatura na Cakto, como o navegador precisa ver. */
export type Assinatura = {
  status: string
  plano: Plano | null
  /** Próxima cobrança (ISO), quando a Cakto informa. */
  renovaEm: string | null
  /** Última cobrança falhou: o acesso continua, mas vale avisar. */
  emAtraso: boolean
}

export type Session = {
  nome: string
  email: string
  oficina: string
  plano: Plano
  papel: 'usuario' | 'admin'
  whatsapp: string | null
  /** Fim dos minutos gratuitos (ISO). Nulo = teste ainda não começou, ou plano pago. */
  freeExpiraEm: string | null
  /** Nulo = nunca assinou (ou plano dado à mão antes da integração de pagamento). */
  assinatura?: Assinatura | null
}

function guardarPerfil(s: Session | null) {
  try {
    if (s) localStorage.setItem(PERFIL, JSON.stringify(s))
    else localStorage.removeItem(PERFIL)
  } catch { /* modo anônimo */ }
}

/** Retrato do último perfil conhecido. Serve para desenhar a tela, nunca para liberar acesso. */
export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(PERFIL)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

/** Erro de API com o campo que o servidor apontou — a tela grifa o campo certo. */
export type ErroApi = Error & { campo?: string; status?: number }

async function json(url: string, init?: RequestInit) {
  let res: Response
  try {
    res = await fetch(url, { credentials: 'same-origin', ...init })
  } catch {
    throw new Error('Não foi possível falar com o servidor. Verifique sua conexão.')
  }
  const corpo = await res.json().catch(() => ({}))
  if (!res.ok) {
    const dados = corpo as { erro?: string; campo?: string }
    const err: ErroApi = new Error(dados?.erro ?? `Falha (HTTP ${res.status}).`)
    err.campo = dados?.campo
    err.status = res.status
    throw err
  }
  return corpo
}

const post = (url: string, dados: unknown) =>
  json(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) })

export async function login(email: string, senha: string): Promise<Session> {
  if (!email.trim() || !senha) throw new Error('Informe e-mail e senha.')
  const s = (await post('/api/login', { email: email.trim(), senha })) as Session
  guardarPerfil(s)
  return s
}

export async function registrar(dados: {
  nome: string
  email: string
  whatsapp: string
  senha: string
  oficina?: string
}): Promise<Session> {
  const s = (await post('/api/registrar', dados)) as Session
  guardarPerfil(s)
  return s
}

export async function logout() {
  try { await post('/api/sair', {}) } catch { /* mesmo offline, o perfil local sai */ }
  guardarPerfil(null)
}

/** Confere a sessão no servidor. Devolve o perfil ou null. */
export async function conferirSessao(): Promise<Session | null> {
  try {
    const s = (await json('/api/sessao')) as Session
    guardarPerfil(s)
    return s
  } catch {
    guardarPerfil(null)
    return null
  }
}

/**
 * Perfil para as telas: entrega o retrato local na hora e confirma com o servidor em seguida.
 * `conferindo` é true só na primeira visita, quando não há retrato.
 */
export function useSessao() {
  const [session, setSession] = useState<Session | null>(() => getSession())
  const [conferindo, setConferindo] = useState(true)

  useEffect(() => {
    let vivo = true
    conferirSessao().then((s) => {
      if (!vivo) return
      setSession(s)
      setConferindo(false)
    })
    return () => { vivo = false }
  }, [])

  return { session, conferindo }
}
