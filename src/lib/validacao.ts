// Validação do cadastro no navegador. Espelha api/_lib/validar.js — quem decide é o
// servidor; isto existe para a pessoa ver o erro antes de enviar, não depois.

export const SENHA_MINIMA = 8

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const emailValido = (v: string) => EMAIL_RE.test(v.trim())

export function nomeValido(v: string) {
  const n = v.trim()
  return n.length >= 2 && n.length <= 80 && /\p{L}/u.test(n) && !/[@\d]/.test(n)
}

/** Só os dígitos do que foi digitado, já sem o DDI. */
const local = (v: string) => {
  const d = v.replace(/\D/g, '')
  return d.startsWith('55') && d.length > 11 ? d.slice(2) : d
}

/** Máscara progressiva: 11 → (11, 119 → (11) 9, 11987654321 → (11) 98765-4321 */
export function mascararWhatsapp(bruto: string) {
  const d = local(bruto).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function whatsappValido(v: string) {
  const d = local(v)
  if (d.length !== 11) return false
  const ddd = Number(d.slice(0, 2))
  return ddd >= 11 && ddd <= 99 && d[2] === '9'
}

/** Para enviar à API: 5511987654321. */
export const whatsappParaApi = (v: string) => `55${local(v)}`

export type Forca = { nivel: 0 | 1 | 2 | 3; rotulo: string }

/** Medidor honesto: comprimento manda mais que símbolo decorativo. */
export function forcaSenha(v: string): Forca {
  if (v.length < SENHA_MINIMA) return { nivel: 0, rotulo: 'curta demais' }
  const variedade = [/[a-z]/, /[A-Z]/, /\d/, /[^\w\s]/].filter((re) => re.test(v)).length
  if (v.length >= 12 && variedade >= 3) return { nivel: 3, rotulo: 'forte' }
  if (v.length >= 10 || variedade >= 2) return { nivel: 2, rotulo: 'boa' }
  return { nivel: 1, rotulo: 'fraca' }
}
