// Autenticação: o servidor confere usuário e senha (POST /api/login) e a sessão fica no localStorage.
// Servidor de desenvolvimento: server/vitePlacaPlugin.mjs. Executável: server/app-local.mjs (usuários no config.json).
const KEY = 'deepcar.session'

export type Session = {
  nome: string
  email: string
  oficina: string
  plano: 'Oficina' | 'Profissional'
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY) ?? sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export async function login(usuario: string, senha: string, lembrar = true): Promise<Session> {
  if (!usuario.trim() || !senha) throw new Error('Informe usuário e senha.')
  let res: Response
  try {
    res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: usuario.trim(), senha }),
    })
  } catch {
    throw new Error('Não foi possível falar com o servidor. Verifique se o Deepcar está aberto.')
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.erro ?? `Falha no login (HTTP ${res.status}).`)
  const session = body as Session
  try {
    // "manter conectado": localStorage sobrevive ao fechar o navegador; senão, só esta aba
    ;(lembrar ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(session))
    if (!lembrar) localStorage.removeItem(KEY)
  } catch { /* ignore */ }
  return session
}

export function logout() {
  try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY) } catch { /* ignore */ }
}
