// Autenticação: a sessão vive num cookie httpOnly assinado pelo servidor (api/login.js).
// O navegador não guarda credencial nenhuma — só um retrato do perfil, para a tela
// aparecer sem esperar a rede. Quem manda é o servidor: toda rota protegida confere o cookie.
import { useEffect, useState } from 'react'

const PERFIL = 'deepcar.perfil'

export type Session = {
  nome: string
  email: string
  oficina: string
  plano: 'free' | 'pro'
  papel: 'usuario' | 'admin'
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

async function json(url: string, init?: RequestInit) {
  let res: Response
  try {
    res = await fetch(url, { credentials: 'same-origin', ...init })
  } catch {
    throw new Error('Não foi possível falar com o servidor. Verifique sua conexão.')
  }
  const corpo = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((corpo as { erro?: string })?.erro ?? `Falha (HTTP ${res.status}).`)
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

export async function registrar(dados: { nome: string; email: string; senha: string; oficina?: string }): Promise<Session> {
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
