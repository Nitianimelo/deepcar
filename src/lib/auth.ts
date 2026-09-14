// Autenticação mock: guarda a sessão no localStorage.
// Trocar por chamada real à API quando o backend existir.
const KEY = 'deepcar.session'

export type Session = {
  nome: string
  email: string
  oficina: string
  plano: 'Oficina' | 'Profissional'
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export async function login(email: string, senha: string): Promise<Session> {
  await new Promise((r) => setTimeout(r, 650))
  if (!email.includes('@') || senha.length < 4) {
    throw new Error('E-mail ou senha inválidos.')
  }
  const nome = email.split('@')[0].replace(/[._-]/g, ' ')
  const session: Session = {
    nome: nome.charAt(0).toUpperCase() + nome.slice(1),
    email,
    oficina: 'Oficina Central',
    plano: 'Profissional',
  }
  try { localStorage.setItem(KEY, JSON.stringify(session)) } catch { /* ignore */ }
  return session
}

export function logout() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
